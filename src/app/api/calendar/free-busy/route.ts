import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import {
  CALENDAR_TOKEN_USER_ID,
  getFreeBusy,
  refreshCalendarAccessToken,
} from "@/lib/google-calendar"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isValidDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

export async function GET(request: NextRequest) {
  const timeMin = request.nextUrl.searchParams.get("timeMin") ?? request.nextUrl.searchParams.get("start")
  const timeMax = request.nextUrl.searchParams.get("timeMax") ?? request.nextUrl.searchParams.get("end")
  const calendarId = process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin or timeMax" }, { status: 400 })
  }
  if (!isValidDateTime(timeMin) || !isValidDateTime(timeMax)) {
    return NextResponse.json({ error: "Invalid timeMin or timeMax" }, { status: 400 })
  }
  if (!calendarId) {
    return NextResponse.json({ error: "Missing GOOGLE_CALENDAR_BUSY_SOURCE_ID" }, { status: 500 })
  }

  try {
    const { prisma } = await import("@/lib/prisma")
    const storedToken = await prisma.calendarToken.findUnique({
      where: { userId: CALENDAR_TOKEN_USER_ID },
    })

    if (!storedToken) {
      return NextResponse.json({ error: "Google Calendar token is not connected" }, { status: 404 })
    }

    const refreshed = await refreshCalendarAccessToken(storedToken.refreshToken)
    await prisma.calendarToken.update({
      where: { userId: CALENDAR_TOKEN_USER_ID },
      data: {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
        scope: refreshed.scope,
      },
    })

    const startDate = new Date(timeMin)
    const endDate = new Date(timeMax)

    const [busy, dbBookings] = await Promise.all([
      getFreeBusy(calendarId, timeMin, timeMax, refreshed.accessToken),
      prisma.booking.findMany({
        where: {
          startTime: { lt: endDate },
          endTime: { gt: startDate },
          status: { in: ["CONFIRMED", "TENTATIVE", "PENDING_CONFIRMATION"] },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          title: true,
          status: true,
        },
      }),
    ])

    const bookings = dbBookings.map((booking) => ({
      id: booking.id,
      start: booking.startTime.toISOString(),
      end: booking.endTime.toISOString(),
      title: booking.title,
      status: booking.status,
    }))

    const bookingTimePairs = new Set(
      bookings.map((booking) => `${booking.start}|${booking.end}`),
    )
    const busyDeduped = busy.filter(
      (slot) => !bookingTimePairs.has(`${slot.start}|${slot.end}`),
    )

    return NextResponse.json({ busy: busyDeduped, bookings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Google Calendar Free/Busy" },
      { status: 500 },
    )
  }
}
