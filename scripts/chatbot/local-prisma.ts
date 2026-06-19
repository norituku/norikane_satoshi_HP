import { homedir } from "node:os"
import path from "node:path"

import { PrismaClient } from "@prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { config as loadDotenv } from "dotenv"

loadDotenv({ path: ".env.local", override: false, quiet: true })
loadDotenv({
  path: path.join(homedir(), "projects", "norikane_satoshi_HP", ".env.local"),
  override: false,
  quiet: true,
})
loadDotenv({ path: ".env", override: false, quiet: true })

type LocalPrismaEnv = {
  TURSO_DATABASE_URL?: string
  TURSO_AUTH_TOKEN?: string
  PRISMA_MIGRATE_DATABASE_URL?: string
}

type LocalPrismaConfig = {
  url: string
  authToken?: string
}

export function createLocalPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql(
    resolveLocalPrismaConfig({
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
      PRISMA_MIGRATE_DATABASE_URL: process.env.PRISMA_MIGRATE_DATABASE_URL,
    }),
  )
  return new PrismaClient({ adapter })
}

export function resolveLocalPrismaConfig(env: LocalPrismaEnv): LocalPrismaConfig {
  const tursoUrl = present(env.TURSO_DATABASE_URL)
  if (tursoUrl) {
    const authToken = present(env.TURSO_AUTH_TOKEN)
    return authToken ? { url: tursoUrl, authToken } : { url: tursoUrl }
  }

  return {
    url: present(env.PRISMA_MIGRATE_DATABASE_URL) ?? "file:./dev.db",
  }
}

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
