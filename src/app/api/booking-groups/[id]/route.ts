import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { enforceBodyLimit } from "@/lib/api/server/body-limit"
import { isAdmin } from "@/lib/auth/server/is-admin"
import { normalizeBookingDateKeys } from "@/lib/booking/domain/form-schema"
import {
  buildRequestedDateCalendarEventIntents,
  cancelBookingGroupCalendarEvents,
  replaceBookingGroupCalendarEventIntents,
} from "@/lib/booking/server/calendar-event-lifecycle"
import { getCachedCalendarAccessToken } from "@/lib/booking/server/calendar-free-busy/google-token-cache"
import { findAccessibleBookingGroup, type AccessibleBookingGroup } from "@/lib/booking/server/edit-access"
import { CALENDAR_TOKEN_USER_ID } from "@/lib/google-calendar/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const rescheduleSchema = z.object({
  requestedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1)
    .transform((dates) => normalizeBookingDateKeys(dates)),
})

type AccessibleGroupResult =
  | { response: NextResponse; group?: never; userId?: never }
  | { response?: never; group: AccessibleBookingGroup; userId: string }

async function accessibleGroup(id: string): Promise<AccessibleGroupResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) }
  const group = await findAccessibleBookingGroup(id, userId, isAdmin(session.user?.email))
  if (!group) return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) }
  if (group.scope === "team") return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) }
  return { group, userId }
}

function groupDescription(group: Awaited<ReturnType<typeof findAccessibleBookingGroup>>): string {
  if (!group) return ""
  return [
    ["案件名", group.details.projectTitle],
    ["氏名", group.details.contactName],
    ["メール", group.details.customerEmail],
    ["会社名", group.details.companyName],
    ["TEL", group.details.phone],
    ["補足", group.details.memo],
  ].map(([label, value]) => `${label}: ${value?.trim() || "-"}`).join("\n")
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const access = await accessibleGroup(id)
  if (access.response) return access.response
  const mode = request.nextUrl.searchParams.get("mode") ?? "cancel"
  if (mode !== "cancel" && mode !== "hard") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }
  if (mode === "hard" && access.group.scope !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const calendarId = process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID
  if (!calendarId) return NextResponse.json({ error: "calendar_unavailable" }, { status: 503 })
  const { token } = await getCachedCalendarAccessToken(CALENDAR_TOKEN_USER_ID)
  const cancellation = await cancelBookingGroupCalendarEvents({
    bookingGroupId: access.group.bookingGroupId,
    calendarId,
    accessToken: token,
  })
  if (!cancellation.complete) {
    return NextResponse.json(
      { status: "pending_reconcile", bookingGroupId: access.group.bookingGroupId },
      { status: 202, headers: { "Retry-After": "60" } },
    )
  }
  if (mode === "hard") {
    await prisma.bookingGroup.delete({ where: { id: access.group.bookingGroupId } })
  }
  return NextResponse.json({ status: "ok", mode, bookingGroupId: access.group.bookingGroupId })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const bodyLimit = enforceBodyLimit(request)
  if (bodyLimit) return bodyLimit
  const { id } = await context.params
  const access = await accessibleGroup(id)
  if (access.response) return access.response
  if (access.group.timeSlots.length > 0) {
    return NextResponse.json({ error: "timed_booking_requires_slot_route" }, { status: 409 })
  }
  const parsed = rescheduleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || parsed.data.requestedDates.length === 0) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }
  const calendarId = process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID
  if (!calendarId) return NextResponse.json({ error: "calendar_unavailable" }, { status: 503 })
  const intents = buildRequestedDateCalendarEventIntents({
    bookingGroupId: access.group.bookingGroupId,
    dates: parsed.data.requestedDates,
    summary: `【仮キープ】${access.group.details.projectTitle} / ${access.group.details.contactName}`,
    description: groupDescription(access.group),
    notionTaskType: "仮押さえ",
  })
  const { token } = await getCachedCalendarAccessToken(CALENDAR_TOKEN_USER_ID)
  const replacement = await replaceBookingGroupCalendarEventIntents({
    bookingGroupId: access.group.bookingGroupId,
    intents,
    calendarId,
    accessToken: token,
  })
  return NextResponse.json(
    {
      status: replacement.complete ? "ok" : "pending_reconcile",
      bookingGroupId: access.group.bookingGroupId,
      requestedDates: parsed.data.requestedDates,
    },
    replacement.complete
      ? { status: 200 }
      : { status: 202, headers: { "Retry-After": "60" } },
  )
}
