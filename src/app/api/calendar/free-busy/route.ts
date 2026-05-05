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
  const timeMin = request.nextUrl.searchParams.get("timeMin")
  const timeMax = request.nextUrl.searchParams.get("timeMax")
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

    const busy = await getFreeBusy(calendarId, timeMin, timeMax, refreshed.accessToken)
    return NextResponse.json({ busy })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Google Calendar Free/Busy" },
      { status: 500 },
    )
  }
}
