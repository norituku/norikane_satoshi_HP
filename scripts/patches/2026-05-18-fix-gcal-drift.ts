// 2026-05-18: BookingGroup cmp9oewo0000104ldedw6tiy0 (テスト案件) で
// DB(11:00-12:30 JST) と GCal(10:00-12:30 JST) がドリフトしていた問題を片付ける。
// 原因: PATCH /api/booking/[id] action=move が DB だけ書き換え GCal を更新しなかった。
// 修正後、既存ドリフトレコードを GCal patch で DB に合わせる。

import { config as loadDotenv } from "dotenv"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({ path: ".env.production.local", override: false, quiet: true })
loadDotenv({ path: ".env", override: false, quiet: true })

const BOOKING_GROUP_ID = "cmp9oewo0000104ldedw6tiy0"

function toJstIso(date: Date): string {
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000
  const jst = new Date(jstMs)
  const yyyy = jst.getUTCFullYear()
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(jst.getUTCDate()).padStart(2, "0")
  const hh = String(jst.getUTCHours()).padStart(2, "0")
  const mi = String(jst.getUTCMinutes()).padStart(2, "0")
  const ss = String(jst.getUTCSeconds()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`
}

async function main() {
  const calendarId = process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_BUSY_SOURCE_ID is not set")
  }

  const { prisma } = await import("../../src/lib/prisma")
  const {
    CALENDAR_TOKEN_USER_ID,
    refreshCalendarAccessToken,
    updateCalendarEvent,
  } = await import("../../src/lib/google-calendar/server")
  try {
    const group = await prisma.bookingGroup.findUnique({
      where: { id: BOOKING_GROUP_ID },
      include: { timeSlots: { orderBy: { startTime: "asc" } } },
    })
    if (!group) throw new Error(`BookingGroup ${BOOKING_GROUP_ID} not found`)
    if (!group.gcalEventId) throw new Error(`BookingGroup ${BOOKING_GROUP_ID} has no gcalEventId`)
    const slot = group.timeSlots[0]
    if (!slot) throw new Error(`BookingGroup ${BOOKING_GROUP_ID} has no timeSlots`)

    const start = toJstIso(slot.startTime)
    const end = toJstIso(slot.endTime)
    console.log(
      JSON.stringify(
        {
          bookingGroupId: group.id,
          gcalEventId: group.gcalEventId,
          db: { start, end },
        },
        null,
        2,
      ),
    )

    const stored = await prisma.calendarToken.findUnique({
      where: { userId: CALENDAR_TOKEN_USER_ID },
    })
    if (!stored) throw new Error("calendar_token_not_connected")
    const refreshed = await refreshCalendarAccessToken(stored.refreshToken)

    await updateCalendarEvent({
      calendarId,
      eventId: group.gcalEventId,
      accessToken: refreshed.accessToken,
      start,
      end,
    })
    console.log("gcal event patched")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
