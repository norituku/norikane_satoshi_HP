import fs from "node:fs/promises"

import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@prisma/client"
import { config as loadDotenv } from "dotenv"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({ path: ".env", override: false, quiet: true })

const BASE_URL = process.env.E2E_BOOKING_BASE_URL ?? "http://localhost:41237"
const DEV_LOG_PATH = process.env.E2E_BOOKING_DEV_LOG ?? "/tmp/booking-calendar-dev.log"
const TEST_EMAIL_PREFIX = "booking-cron-expire-e2e"
const TEST_EMAIL_DOMAIN = "norikane.studio"
const TITLE_PREFIX = "E2E Cron Expire"

function createPrisma() {
  return new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  })
}

function nowMinus(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function futureSlot(daysFromNow, hour) {
  const start = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  start.setUTCHours(hour, 0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { start, end }
}

function dummyEventId(runId, suffix) {
  return `cron${Number(runId).toString(32)}${suffix}`
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
  return [...chunk.matchAll(/\[email skipped\]\s+tag=([a-z_]+)\s+to=([^\s]+)/g)].map((match) => ({
    tag: match[1],
    to: match[2],
  }))
}

function parseGcalDeleteSkippedLogs(chunk) {
  return [...chunk.matchAll(/\[gcal delete skipped\]\s+eventId=([^\s]+)\s+([^\n]+)/g)].map((match) => ({
    eventId: match[1],
    detail: match[2].trim(),
  }))
}

async function expectLogs(offset, expectedEmailTags, expectedGcalCount) {
  const deadline = Date.now() + 3000
  let last = { emailSkipped: [], gcalDeleteSkipped: [], nextOffset: offset }

  do {
    const { chunk, nextOffset } = await readLogChunk(offset)
    last = {
      emailSkipped: parseEmailSkippedLogs(chunk),
      gcalDeleteSkipped: parseGcalDeleteSkippedLogs(chunk),
      nextOffset,
    }
    if (last.emailSkipped.length >= expectedEmailTags.length && last.gcalDeleteSkipped.length >= expectedGcalCount) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  } while (Date.now() < deadline)

  const actualTags = last.emailSkipped.map((log) => log.tag).sort()
  const expectedSorted = [...expectedEmailTags].sort()
  const emailPass =
    actualTags.length === expectedSorted.length && actualTags.every((tag, index) => tag === expectedSorted[index])
  if (!emailPass) {
    throw new Error(
      `Expected [email skipped] tags ${expectedSorted.join(",") || "(none)"} but got ${
        actualTags.join(",") || "(none)"
      }`,
    )
  }
  if (last.gcalDeleteSkipped.length !== expectedGcalCount) {
    throw new Error(
      `Expected [gcal delete skipped] count ${expectedGcalCount} but got ${last.gcalDeleteSkipped.length}`,
    )
  }

  return last
}

async function deleteTestRows(prisma) {
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    select: { id: true },
  })
  if (testUsers.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: testUsers.map((user) => user.id) } } })
  }
  await prisma.booking.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } })
}

async function assertNoNonTestExpiredTargets(prisma) {
  const count = await prisma.booking.count({
    where: {
      status: { in: ["TENTATIVE", "PENDING_CONFIRMATION"] },
      tentativeDeadlineAt: { lt: new Date() },
      NOT: { title: { startsWith: TITLE_PREFIX } },
    },
  })
  if (count > 0) {
    throw new Error(`Refusing cron E2E: ${count} non-test expired tentative booking(s) would be processed`)
  }
}

async function seedCustomer(prisma, runId, label) {
  const email = `${TEST_EMAIL_PREFIX}+${runId}-${label}@${TEST_EMAIL_DOMAIN}`
  const user = await prisma.user.create({
    data: {
      email,
      name: `E2E Cron ${label}`,
      emailVerified: new Date(),
      customer: {
        create: {
          displayName: `E2E Cron ${label}`,
        },
      },
    },
    include: { customer: true },
  })
  if (!user.customer) throw new Error("Failed to create test customer")
  return { user, customer: user.customer }
}

async function seedBooking(prisma, customerId, runId, label, status, eventIdSuffix) {
  const slot = futureSlot(120, label === "t2-confirmed" ? 3 : 2)
  return prisma.booking.create({
    data: {
      customerId,
      startTime: slot.start,
      endTime: slot.end,
      title: `${TITLE_PREFIX} ${runId} ${label}`,
      memo: "",
      status,
      tentativeNotifiedAt: nowMinus(4),
      tentativeDeadlineAt: nowMinus(1),
      gcalEventId: eventIdSuffix ? dummyEventId(runId, eventIdSuffix) : null,
    },
  })
}

async function callCron(auth = true) {
  const response = await fetch(`${BASE_URL}/api/cron/expire-tentative`, {
    headers: auth ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  })
  const json = await response.json().catch(() => ({}))
  return { status: response.status, json }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const prisma = createPrisma()
  const runId = String(Date.now())
  const results = {}
  const logSummary = {}

  try {
    if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET is not set")
    await deleteTestRows(prisma)
    await assertNoNonTestExpiredTargets(prisma)

    let logOffset = await getLogOffset()

    const t1Seed = await seedCustomer(prisma, runId, "t1")
    const t1Booking = await seedBooking(prisma, t1Seed.customer.id, runId, "t1", "TENTATIVE", "t1")
    const t1 = await callCron(true)
    const t1Row = await prisma.booking.findUnique({ where: { id: t1Booking.id }, select: { status: true } })
    const t1Logs = await expectLogs(logOffset, ["expired"], 1)
    logOffset = t1Logs.nextOffset
    assert(t1.status === 200, `t1 expected 200, got ${t1.status}`)
    assert(t1.json.ok === true, "t1 expected ok=true")
    assert(t1.json.expired?.tentative === 1, `t1 expected tentative=1, got ${t1.json.expired?.tentative}`)
    assert(t1.json.expired?.pendingConfirmation === 0, "t1 expected pendingConfirmation=0")
    assert(Array.isArray(t1.json.errors) && t1.json.errors.length === 0, "t1 expected errors=[]")
    assert(t1Row?.status === "CANCELLED", `t1 expected CANCELLED, got ${t1Row?.status}`)
    results.t1 = { status: t1.status, response: t1.json, dbStatus: t1Row?.status }
    logSummary.t1 = { emailSkipped: t1Logs.emailSkipped, gcalDeleteSkipped: t1Logs.gcalDeleteSkipped }

    const t2Seed = await seedCustomer(prisma, runId, "t2")
    const t2Pending = await seedBooking(
      prisma,
      t2Seed.customer.id,
      runId,
      "t2-pending",
      "PENDING_CONFIRMATION",
      "t2",
    )
    const t2Confirmed = await seedBooking(prisma, t2Seed.customer.id, runId, "t2-confirmed", "CONFIRMED", null)
    const t2 = await callCron(true)
    const t2Rows = await prisma.booking.findMany({
      where: { id: { in: [t2Pending.id, t2Confirmed.id] } },
      select: { id: true, status: true },
    })
    const t2Logs = await expectLogs(logOffset, ["expired"], 1)
    logOffset = t2Logs.nextOffset
    const t2PendingStatus = t2Rows.find((row) => row.id === t2Pending.id)?.status
    const t2ConfirmedStatus = t2Rows.find((row) => row.id === t2Confirmed.id)?.status
    assert(t2.status === 200, `t2 expected 200, got ${t2.status}`)
    assert(t2.json.ok === true, "t2 expected ok=true")
    assert(t2.json.expired?.tentative === 0, "t2 expected tentative=0")
    assert(
      t2.json.expired?.pendingConfirmation === 1,
      `t2 expected pendingConfirmation=1, got ${t2.json.expired?.pendingConfirmation}`,
    )
    assert(Array.isArray(t2.json.errors) && t2.json.errors.length === 0, "t2 expected errors=[]")
    assert(t2PendingStatus === "OVERWRITTEN", `t2 expected OVERWRITTEN, got ${t2PendingStatus}`)
    assert(t2ConfirmedStatus === "CONFIRMED", `t2 expected CONFIRMED unchanged, got ${t2ConfirmedStatus}`)
    results.t2 = {
      status: t2.status,
      response: t2.json,
      pendingStatus: t2PendingStatus,
      confirmedStatus: t2ConfirmedStatus,
    }
    logSummary.t2 = { emailSkipped: t2Logs.emailSkipped, gcalDeleteSkipped: t2Logs.gcalDeleteSkipped }

    const t3 = await callCron(false)
    const t3Logs = await expectLogs(logOffset, [], 0)
    logOffset = t3Logs.nextOffset
    assert(t3.status === 401, `t3 expected 401, got ${t3.status}`)
    assert(t3.json.error === "unauthorized", `t3 expected unauthorized, got ${t3.json.error}`)
    results.t3 = { status: t3.status, response: t3.json }
    logSummary.t3 = { emailSkipped: t3Logs.emailSkipped, gcalDeleteSkipped: t3Logs.gcalDeleteSkipped }

    const t4 = await callCron(true)
    const t4Logs = await expectLogs(logOffset, [], 0)
    assert(t4.status === 200, `t4 expected 200, got ${t4.status}`)
    assert(t4.json.ok === true, "t4 expected ok=true")
    assert(t4.json.expired?.tentative === 0, "t4 expected tentative=0")
    assert(t4.json.expired?.pendingConfirmation === 0, "t4 expected pendingConfirmation=0")
    assert(Array.isArray(t4.json.errors) && t4.json.errors.length === 0, "t4 expected errors=[]")
    results.t4 = { status: t4.status, response: t4.json }
    logSummary.t4 = { emailSkipped: t4Logs.emailSkipped, gcalDeleteSkipped: t4Logs.gcalDeleteSkipped }

    const emailSkippedByTag = {}
    const gcalDeleteSkippedByDetail = {}
    for (const logs of Object.values(logSummary)) {
      for (const log of logs.emailSkipped) {
        emailSkippedByTag[log.tag] = (emailSkippedByTag[log.tag] ?? 0) + 1
      }
      for (const log of logs.gcalDeleteSkipped) {
        gcalDeleteSkippedByDetail[log.detail] = (gcalDeleteSkippedByDetail[log.detail] ?? 0) + 1
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          results,
          emailSkippedByTag,
          gcalDeleteSkippedByDetail,
          logs: logSummary,
        },
        null,
        2,
      ),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
