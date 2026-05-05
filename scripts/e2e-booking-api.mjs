import fs from "node:fs/promises"

import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@prisma/client"
import { config as loadDotenv } from "dotenv"
import { google } from "googleapis"
import { chromium } from "playwright"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({ path: ".env", override: false, quiet: true })

const BASE_URL = process.env.E2E_BOOKING_BASE_URL ?? "http://localhost:41237"
const TEST_USER_EMAIL = "norikane.satoshi@gmail.com"
const TITLE_PREFIX = "E2E Booking API"
const STATE_PATH = "/tmp/norikane-booking-api-e2e-state.json"
const CALENDAR_TOKEN_USER_ID = "satoshi-calendar-owner"

function createPrisma() {
  return new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  })
}

function createOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  )
  return client
}

async function deleteCalendarEvent(eventId) {
  const prisma = createPrisma()
  try {
    const token = await prisma.calendarToken.findUnique({ where: { userId: CALENDAR_TOKEN_USER_ID } })
    if (!token || !process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID) return false

    const oauth2Client = createOAuthClient()
    oauth2Client.setCredentials({ refresh_token: token.refreshToken })
    const { token: accessToken } = await oauth2Client.getAccessToken()
    if (!accessToken) return false

    oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID,
      eventId,
    })
    return true
  } catch {
    return false
  } finally {
    await prisma.$disconnect()
  }
}

async function deleteStaleE2eBookings(prisma) {
  const stale = await prisma.booking.findMany({
    where: { title: { startsWith: TITLE_PREFIX } },
    select: { id: true, gcalEventId: true },
  })

  for (const booking of stale) {
    if (booking.gcalEventId) await deleteCalendarEvent(booking.gcalEventId)
  }

  if (stale.length > 0) {
    await prisma.booking.deleteMany({
      where: { id: { in: stale.map((booking) => booking.id) } },
    })
  }
}

function slot(daysFromNow, hour = 1) {
  const start = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  start.setUTCHours(hour, 0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

function payload(runId, name, selectedSlot, bookingKind = "confirmed") {
  return {
    bookingKind,
    projectTitle: `${TITLE_PREFIX} ${runId} ${name}`,
    workScopes: ["カラーグレーディング"],
    otherWorkDetail: "",
    estimatedDuration: "consult",
    dueDate: "",
    companyName: "",
    contactName: "Booking API Tester",
    sessionEmail: TEST_USER_EMAIL,
    contactEmail: "",
    phone: "",
    memo: "",
    agreed: true,
    selectedSlot,
  }
}

async function postBooking(page, body) {
  return page.evaluate(async ({ apiUrl, requestBody }) => {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
    const json = await response.json().catch(() => ({}))
    return { status: response.status, json }
  }, { apiUrl: `${BASE_URL}/api/booking`, requestBody: body })
}

async function main() {
  const prisma = createPrisma()
  const runId = String(Date.now())
  const results = {}

  try {
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER_EMAIL },
      select: {
        id: true,
        customer: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            companyName: true,
            notes: true,
          },
        },
      },
    })
    if (!user) throw new Error("Test user is missing")

    await deleteStaleE2eBookings(prisma)
    await fs.writeFile(STATE_PATH, JSON.stringify({ userId: user.id, previousCustomer: user.customer }, null, 2))

    const browser = await chromium.launch({ headless: true })
    try {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto(`${BASE_URL}/api/dev/auth-bypass`, { waitUntil: "networkidle" })

      const e1Slot = slot(90, 1)
      const e1First = await postBooking(page, payload(runId, "e1", e1Slot))
      const e1Second = await postBooking(page, payload(runId, "e1-duplicate", e1Slot))
      results.e1 = [e1First.status, e1Second.status]

      const e2Slot = slot(91, 1)
      const e2Tentative = await postBooking(page, payload(runId, "e2-tentative", e2Slot, "tentative"))
      const e2Confirmed = await postBooking(page, payload(runId, "e2-confirmed", e2Slot, "confirmed"))
      const e2Rows = await prisma.booking.findMany({
        where: {
          title: { startsWith: `${TITLE_PREFIX} ${runId} e2` },
        },
        select: { status: true, gcalEventId: true },
      })
      results.e2 = {
        statuses: [e2Tentative.status, e2Confirmed.status],
        pendingCount: e2Rows.filter((row) => row.status === "PENDING_CONFIRMATION").length,
        confirmedCount: e2Rows.filter((row) => row.status === "CONFIRMED").length,
        gcalEventCount: e2Rows.filter((row) => row.gcalEventId).length,
      }

      const e3Slot = slot(92, 1)
      const e3Confirmed = await postBooking(page, payload(runId, "e3-confirmed", e3Slot, "confirmed"))
      const e3Tentative = await postBooking(page, payload(runId, "e3-tentative", e3Slot, "tentative"))
      results.e3 = [e3Confirmed.status, e3Tentative.status]

      const e4 = await fetch(`${BASE_URL}/api/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(runId, "e4", slot(93, 1))),
      })
      results.e4 = e4.status

      const e5 = await postBooking(page, {
        ...payload(runId, "e5", slot(94, 1)),
        selectedSlot: { start: "invalid", end: "invalid" },
      })
      results.e5 = e5.status
    } finally {
      await browser.close()
    }

    const pass =
      results.e1[0] >= 200 &&
      results.e1[0] < 300 &&
      results.e1[1] === 409 &&
      results.e2.statuses.every((status) => status >= 200 && status < 300) &&
      results.e2.pendingCount === 1 &&
      results.e2.confirmedCount === 1 &&
      results.e2.gcalEventCount === 2 &&
      results.e3[0] >= 200 &&
      results.e3[0] < 300 &&
      results.e3[1] === 409 &&
      results.e4 === 401 &&
      results.e5 === 400

    console.log(JSON.stringify({ ok: pass, results }, null, 2))
    if (!pass) process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
