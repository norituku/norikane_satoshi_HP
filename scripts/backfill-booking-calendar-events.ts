import { config as loadDotenv } from "dotenv"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({ path: ".env", override: false, quiet: true })

let disconnectPrisma = async () => {}

function sanitizeEventId(value: string): string {
  return value.toLowerCase().replace(/[^a-v0-9]/g, "")
}

function belongsToGroup(
  event: { id: string; bookingGroupId?: string },
  groupId: string,
  legacyPrimaryId: string,
): boolean {
  if (event.bookingGroupId === groupId) return true
  const base = sanitizeEventId(groupId)
  return event.id === legacyPrimaryId
    || event.id === base
    || new RegExp(`^${base}\\d{8}$`).test(event.id)
}

function nextDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function requestedDateKeysFromMemo(memo: string | null, primaryStart: string): string[] {
  if (!memo || !/^\d{4}-\d{2}-\d{2}$/.test(primaryStart)) return []
  const parts = Array.from(memo.matchAll(/(?<!\d)(\d{1,2})\/(\d{1,2})(?:\([^)]*\))?/g))
  if (parts.length === 0) return []
  let year = Number(primaryStart.slice(0, 4))
  let previousMonth = Number(parts[0]?.[1])
  return parts.flatMap((match, index) => {
    const month = Number(match[1])
    const day = Number(match[2])
    if (index > 0 && month < previousMonth) year += 1
    previousMonth = month
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const parsed = new Date(`${dateKey}T00:00:00.000Z`)
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() + 1 === month
      && parsed.getUTCDate() === day
      ? [dateKey]
      : []
  })
}

function rangeStartDateKeys(dateKeys: string[]): string[] {
  return dateKeys.filter((dateKey, index) => index === 0 || nextDateKey(dateKeys[index - 1]) !== dateKey)
}

function dateRanges(dateKeys: string[]): Array<{ start: string; end: string }> {
  const starts = new Set(rangeStartDateKeys(dateKeys))
  const ranges: Array<{ start: string; end: string }> = []
  let start = ""
  for (const dateKey of dateKeys) {
    if (starts.has(dateKey)) {
      if (start && ranges.length > 0) ranges[ranges.length - 1].end = dateKey
      ranges.push({ start: dateKey, end: nextDateKey(dateKey) })
      start = dateKey
      continue
    }
    ranges[ranges.length - 1].end = nextDateKey(dateKey)
  }
  return ranges
}

async function main() {
  const [
    { BOOKING_CALENDAR_EVENT_STATUS },
    { getCachedCalendarAccessToken },
    { CALENDAR_TOKEN_USER_ID, getCalendarEvent, listManagedCalendarEvents },
    { prisma },
  ] = await Promise.all([
    import("../src/lib/booking/server/calendar-event-lifecycle"),
    import("../src/lib/booking/server/calendar-free-busy/google-token-cache"),
    import("../src/lib/google-calendar/server"),
    import("../src/lib/prisma"),
  ])
  disconnectPrisma = () => prisma.$disconnect()
  const apply = process.argv.includes("--apply")
  const calendarId = process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID
  if (!calendarId) throw new Error("GOOGLE_CALENDAR_BUSY_SOURCE_ID is not set")
  const { token } = await getCachedCalendarAccessToken(CALENDAR_TOKEN_USER_ID)
  const [groups, managedEvents] = await Promise.all([
    prisma.bookingGroup.findMany({
      where: {
        OR: [
          { gcalEventId: { not: null } },
          { calendarEvents: { some: {} } },
        ],
      },
      select: {
        id: true,
        status: true,
        projectTitle: true,
        contactName: true,
        memo: true,
        gcalEventId: true,
        timeSlots: {
          orderBy: { startTime: "asc" },
          select: { startTime: true, endTime: true },
        },
        calendarEvents: { select: { eventId: true } },
      },
    }),
    listManagedCalendarEvents({ calendarId, accessToken: token }),
  ])
  const primarySnapshots = await Promise.all(groups.map(async (group) => {
    if (!group.gcalEventId) return null
    return getCalendarEvent({
      calendarId,
      eventId: group.gcalEventId,
      accessToken: token,
    })
  }))
  const toCandidateEvent = (event: (typeof primarySnapshots)[number]) => {
    if (!event?.start || !event.end) return []
    return [{
      id: event.id,
      start: event.start,
      end: event.end,
      dateOnly: event.dateOnly ?? false,
      summary: event.summary ?? "",
      description: event.description ?? "",
      colorId: event.colorId ?? "9",
      notionTaskType: event.notionTaskType,
      transparency: event.transparency,
      bookingGroupId: event.privateProperties.booking_group_id,
      privateProperties: event.privateProperties,
    }]
  }
  const primaryEvents = primarySnapshots.flatMap(toCandidateEvent)
  const derivedDescriptors = groups.flatMap((group, index) => {
    const primary = primarySnapshots[index]
    if (!primary?.dateOnly || !primary.start || !group.memo) return []
    const ranges = dateRanges(requestedDateKeysFromMemo(group.memo, primary.start))
    return ranges.slice(1).map((range) => ({
      groupId: group.id,
      eventId: `${sanitizeEventId(group.id)}${range.start.replaceAll("-", "")}`,
      range,
      primary,
    }))
  })
  const derivedEvents = (await Promise.all(derivedDescriptors.map(async ({ eventId }) => (
    getCalendarEvent({ calendarId, eventId, accessToken: token })
  )))).flatMap(toCandidateEvent)
  const candidateEvents = Array.from(new Map(
    [...managedEvents, ...primaryEvents, ...derivedEvents].map((event) => [event.id, event]),
  ).values())

  const confirmedPlans = groups.flatMap((group) => {
    const primaryId = group.gcalEventId ?? ""
    const known = new Set(group.calendarEvents.map((event) => event.eventId))
    return candidateEvents
      .filter((event) => belongsToGroup(event, group.id, primaryId) && !known.has(event.id))
      .map((event) => ({
        groupId: group.id,
        event,
        targetStatus: BOOKING_CALENDAR_EVENT_STATUS.confirmed,
      }))
  })
  const knownOrDiscoveredEventIds = new Set([
    ...candidateEvents.map((event) => event.id),
    ...groups.flatMap((group) => group.calendarEvents.map((event) => event.eventId)),
  ])
  const pendingCreatePlans = derivedDescriptors
    .filter(({ eventId }) => !knownOrDiscoveredEventIds.has(eventId))
    .map(({ groupId, eventId, range, primary }) => ({
      groupId,
      event: {
        id: eventId,
        start: range.start,
        end: range.end,
        dateOnly: true,
        summary: primary.summary ?? "【仮キープ】予約希望日",
        description: primary.description ?? "",
        colorId: primary.colorId ?? "4",
        notionTaskType: primary.notionTaskType === "本予約" ? "本予約" : "仮押さえ",
        transparency: "transparent" as const,
      },
      targetStatus: BOOKING_CALENDAR_EVENT_STATUS.pendingCreate,
    }))
  const now = new Date()
  const cancelledTombstones = groups.flatMap((group, index) => {
    if (!group.gcalEventId || primarySnapshots[index] || group.calendarEvents.length > 0) return []
    const primarySlot = group.timeSlots[0]
    if (!primarySlot || group.timeSlots.some((slot) => slot.endTime > now)) return []
    return [{
      groupId: group.id,
      event: {
        id: group.gcalEventId,
        start: primarySlot.startTime.toISOString(),
        end: primarySlot.endTime.toISOString(),
        dateOnly: false,
        summary: `【予約履歴】${group.projectTitle} / ${group.contactName}`,
        description: "既存データ移行時にGoogle Calendar上で削除済みと確認",
        colorId: "9",
        notionTaskType: undefined,
        transparency: undefined,
      },
      targetStatus: BOOKING_CALENDAR_EVENT_STATUS.cancelled,
    }]
  })
  const plans = [...confirmedPlans, ...pendingCreatePlans, ...cancelledTombstones]
  const matchedEventIds = new Set(plans.map((plan) => plan.event.id))
  for (const group of groups) {
    for (const event of group.calendarEvents) matchedEventIds.add(event.eventId)
  }
  const orphanEvents = managedEvents.filter((event) => !matchedEventIds.has(event.id))
  const unresolvedGroups = groups.filter((group) => {
    const existingCount = group.calendarEvents.length
    const plannedCount = plans.filter((plan) => plan.groupId === group.id).length
    return existingCount + plannedCount === 0
  })
  const unresolvedByStatus = Object.fromEntries(Array.from(new Set(
    unresolvedGroups.map((group) => group.status),
  )).sort().map((status) => [
    status,
    unresolvedGroups.filter((group) => group.status === status).length,
  ]))
  const unresolvedWithFutureSlots = unresolvedGroups.filter((group) => (
    group.timeSlots.some((slot) => slot.endTime > now)
  )).length

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    groupCount: groups.length,
    managedEventCount: managedEvents.length,
    primaryEventCount: primaryEvents.length,
    derivedEventCount: derivedEvents.length,
    createCount: plans.length,
    confirmedCreateCount: confirmedPlans.length,
    pendingCreateCount: pendingCreatePlans.length,
    cancelledTombstoneCount: cancelledTombstones.length,
    unresolvedGroupCount: unresolvedGroups.length,
    unresolvedByStatus,
    unresolvedWithFutureSlots,
    orphanEventCount: orphanEvents.length,
  }))
  if (!apply) return

  if (unresolvedGroups.length > 0 || orphanEvents.length > 0) {
    throw new Error(
      `backfill requires review: unresolved_groups=${unresolvedGroups.length} orphan_events=${orphanEvents.length}`,
    )
  }

  for (const plan of plans) {
    const event = plan.event
    await prisma.bookingCalendarEvent.upsert({
      where: { eventId: event.id },
      create: {
        bookingGroupId: plan.groupId,
        eventId: event.id,
        startValue: event.start,
        endValue: event.end,
        dateOnly: event.dateOnly,
        summary: event.summary,
        description: event.description,
        colorId: event.colorId,
        notionTaskType: event.notionTaskType ?? null,
        transparency: event.transparency ?? null,
        status: plan.targetStatus,
        lastVerifiedAt: new Date(),
      },
      update: {
        bookingGroupId: plan.groupId,
        startValue: event.start,
        endValue: event.end,
        dateOnly: event.dateOnly,
        summary: event.summary,
        description: event.description,
        colorId: event.colorId,
        notionTaskType: event.notionTaskType ?? null,
        transparency: event.transparency ?? null,
        status: plan.targetStatus,
        lastErrorCode: null,
        lastVerifiedAt: new Date(),
      },
    })
  }
  console.log(JSON.stringify({ ok: true, createdOrUpdated: plans.length }))
}

main().finally(() => disconnectPrisma()).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "booking calendar event backfill failed")
    process.exit(1)
  })
