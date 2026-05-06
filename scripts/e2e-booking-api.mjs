import fs from "node:fs/promises"

import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@prisma/client"
import { config as loadDotenv } from "dotenv"
import { google } from "googleapis"
import { chromium } from "playwright"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({ path: ".env", override: false, quiet: true })

const BASE_URL = process.env.E2E_BOOKING_BASE_URL ?? "http://localhost:41237"
const DEV_LOG_PATH = process.env.E2E_BOOKING_DEV_LOG ?? "/tmp/booking-calendar-dev.log"
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

async function getLogOffset() {
  try {
    const stat = await fs.stat(DEV_LOG_PATH)
    return stat.size
  } catch {
    return 0
  }
}

async function readLogChunk(offset) {
  try {
    const file = await fs.open(DEV_LOG_PATH, "r")
    try {
      const stat = await file.stat()
      const length = Math.max(0, stat.size - offset)
      if (length === 0) return { chunk: "", nextOffset: stat.size }
      const buffer = Buffer.alloc(length)
      await file.read(buffer, 0, length, offset)
      return { chunk: buffer.toString("utf8"), nextOffset: stat.size }
    } finally {
      await file.close()
    }
  } catch {
    return { chunk: "", nextOffset: offset }
  }
}

function parseEmailSkippedLogs(chunk) {
  return [...chunk.matchAll(/\[email skipped\]\s+tag=([a-z]+)\s+to=([^\s]+)/g)].map((match) => ({
    tag: match[1],
    to: match[2],
  }))
}

async function expectEmailSkippedLogs(offset, expectedTags) {
  const deadline = Date.now() + 2000
  let last = { logs: [], nextOffset: offset }

  do {
    const { chunk, nextOffset } = await readLogChunk(offset)
    const logs = parseEmailSkippedLogs(chunk)
    last = { logs, nextOffset }
    if (logs.length >= expectedTags.length) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  } while (Date.now() < deadline)

  const actualTags = last.logs.map((log) => log.tag).sort()
  const expectedSorted = [...expectedTags].sort()
  const pass =
    actualTags.length === expectedSorted.length &&
    actualTags.every((tag, index) => tag === expectedSorted[index])

  if (!pass) {
    throw new Error(
      `Expected [email skipped] tags ${expectedSorted.join(",") || "(none)"} but got ${
        actualTags.join(",") || "(none)"
      }`,
    )
  }

  return last
}

async function main() {
  const prisma = createPrisma()
  const runId = String(Date.now())
  const results = {}
  const emailSkipped = {}

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
      let logOffset = await getLogOffset()

      const e1Slot = slot(90, 1)
      const e1 = await postBooking(page, payload(runId, "e1", e1Slot))
      const e1Email = await expectEmailSkippedLogs(logOffset, ["confirmed"])
      logOffset = e1Email.nextOffset
      results.e1 = {
        status: e1.status,
        error: e1.json.error ?? null,
      }
      emailSkipped.e1 = e1Email.logs

      const e2Slot = slot(91, 1)
      const e2Tentative = await postBooking(page, payload(runId, "e2-tentative", e2Slot, "tentative"))
      const e2Email = await expectEmailSkippedLogs(logOffset, ["tentative"])
      logOffset = e2Email.nextOffset
      const e2Rows = await prisma.booking.findMany({
        where: {
          title: { startsWith: `${TITLE_PREFIX} ${runId} e2` },
        },
        select: { status: true, gcalEventId: true },
      })
      results.e2 = {
        status: e2Tentative.status,
        tentativeCount: e2Rows.filter((row) => row.status === "TENTATIVE").length,
        gcalEventCount: e2Rows.filter((row) => row.gcalEventId).length,
      }
      emailSkipped.e2 = e2Email.logs

      const e3Slot = slot(92, 1)
      const e3Tentative = await postBooking(page, payload(runId, "e3-tentative", e3Slot, "tentative"))
      const e3TentativeEmail = await expectEmailSkippedLogs(logOffset, ["tentative"])
      logOffset = e3TentativeEmail.nextOffset
      const e3Confirmed = await postBooking(page, payload(runId, "e3-confirmed", e3Slot, "confirmed"))
      const e3ConfirmedEmail = await expectEmailSkippedLogs(logOffset, ["confirmed", "overwrite"])
      logOffset = e3ConfirmedEmail.nextOffset
      const e3Rows = await prisma.booking.findMany({
        where: {
          title: { startsWith: `${TITLE_PREFIX} ${runId} e3` },
        },
        select: { status: true, gcalEventId: true },
      })
      results.e3 = {
        statuses: [e3Tentative.status, e3Confirmed.status],
        pendingCount: e3Rows.filter((row) => row.status === "PENDING_CONFIRMATION").length,
        confirmedCount: e3Rows.filter((row) => row.status === "CONFIRMED").length,
        gcalEventCount: e3Rows.filter((row) => row.gcalEventId).length,
      }
      emailSkipped.e3 = e3ConfirmedEmail.logs

      const e4 = await fetch(`${BASE_URL}/api/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const e4Json = await e4.json().catch(() => ({}))
      const e4Email = await expectEmailSkippedLogs(logOffset, [])
      logOffset = e4Email.nextOffset
      results.e4 = {
        status: e4.status,
        error: e4Json.error ?? null,
      }
      emailSkipped.e4 = e4Email.logs

      const e5 = await postBooking(page, {
        ...payload(runId, "e5", slot(94, 1)),
        selectedSlot: { start: "invalid", end: "invalid" },
      })
      const e5Email = await expectEmailSkippedLogs(logOffset, [])
      results.e5 = {
        status: e5.status,
        error: e5.json.error ?? null,
      }
      emailSkipped.e5 = e5Email.logs
    } finally {
      await browser.close()
    }

    const pass =
      results.e1.status >= 200 &&
      results.e1.status < 300 &&
      results.e2.status >= 200 &&
      results.e2.status < 300 &&
      results.e2.tentativeCount === 1 &&
      results.e2.gcalEventCount === 1 &&
      results.e3.statuses.every((status) => status >= 200 && status < 300) &&
      results.e3.pendingCount === 1 &&
      results.e3.confirmedCount === 1 &&
      results.e3.gcalEventCount === 2 &&
      results.e4.status === 401 &&
      results.e4.error === "unauthorized" &&
      results.e5.status === 400 &&
      results.e5.error === "invalid_request"

    console.log(JSON.stringify({ ok: pass, results, emailSkipped }, null, 2))
    if (!pass) process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
