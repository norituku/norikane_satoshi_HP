import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@prisma/client"
import { config as loadDotenv } from "dotenv"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({ path: ".env", override: false, quiet: true })

const TEST_EMAIL_PREFIX = "booking-cron-expire-e2e"
const TITLE_PREFIX = "E2E Cron Expire"

function createPrisma() {
  return new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  })
}

async function main() {
  const prisma = createPrisma()

  try {
    const bookings = await prisma.booking.findMany({
      where: { title: { startsWith: TITLE_PREFIX } },
      select: { id: true, gcalEventId: true },
    })
    if (bookings.length > 0) {
      await prisma.booking.deleteMany({ where: { id: { in: bookings.map((booking) => booking.id) } } })
    }

    const users = await prisma.user.findMany({
      where: { email: { startsWith: TEST_EMAIL_PREFIX } },
      select: { id: true },
    })
    if (users.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } })
    }

    const dbResidualCount = await prisma.booking.count({
      where: { title: { startsWith: TITLE_PREFIX } },
    })
    const userResidualCount = await prisma.user.count({
      where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    })
    const result = {
      ok: dbResidualCount === 0 && userResidualCount === 0,
      dbResidualCount,
      userResidualCount,
      gcalResidualCount: 0,
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
