import fs from "node:fs/promises"

import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@prisma/client"
import { config as loadDotenv } from "dotenv"
import { google } from "googleapis"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({ path: ".env", override: false, quiet: true })

const TITLE_PREFIXES = ["E2E Booking API", "E2E Booking Console"]
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
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  )
}

async function deleteCalendarEvent(eventId, refreshToken) {
  if (!process.env.GOOGLE_CALENDAR_BUSY_SOURCE_ID) return false

  try {
    const oauth2Client = createOAuthClient()
    oauth2Client.setCredentials({ refresh_token: refreshToken })
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
  }
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, "utf8"))
  } catch {
    return null
  }
}

async function main() {
  const prisma = createPrisma()

  try {
    const state = await readState()
    const token = await prisma.calendarToken.findUnique({ where: { userId: CALENDAR_TOKEN_USER_ID } })
    const bookings = await prisma.booking.findMany({
      where: {
        OR: TITLE_PREFIXES.map((prefix) => ({ title: { startsWith: prefix } })),
      },
      select: {
        id: true,
        gcalEventId: true,
      },
    })

    let gcalResidualCount = 0
    for (const booking of bookings) {
      if (!booking.gcalEventId) continue
      const deleted = token ? await deleteCalendarEvent(booking.gcalEventId, token.refreshToken) : false
      if (!deleted) gcalResidualCount += 1
    }

    if (bookings.length > 0) {
      await prisma.booking.deleteMany({
        where: { id: { in: bookings.map((booking) => booking.id) } },
      })
    }

    if (state?.userId && state.previousCustomer) {
      await prisma.customer.update({
        where: { userId: state.userId },
        data: {
          displayName: state.previousCustomer.displayName,
          phone: state.previousCustomer.phone,
          companyName: state.previousCustomer.companyName,
          notes: state.previousCustomer.notes,
        },
      }).catch(() => undefined)
    } else if (state?.userId) {
      const customer = await prisma.customer.findUnique({
        where: { userId: state.userId },
        include: { bookings: { select: { id: true } } },
      })
      if (customer && customer.bookings.length === 0) {
        await prisma.customer.delete({ where: { id: customer.id } })
      }
    }

    const dbResidualCount = await prisma.booking.count({
      where: {
        OR: TITLE_PREFIXES.map((prefix) => ({ title: { startsWith: prefix } })),
      },
    })
    await fs.rm(STATE_PATH, { force: true })

    const result = {
      ok: dbResidualCount === 0 && gcalResidualCount === 0,
      dbResidualCount,
      gcalResidualCount,
    }
    console.log(JSON.stringify(result, null, 2))
    if (!result.ok) process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
