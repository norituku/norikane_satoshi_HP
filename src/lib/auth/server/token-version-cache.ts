import { prisma } from "@/lib/prisma"

const TTL_MS = 60_000

const cache = new Map<string, { value: number; expiresAt: number }>()
const inflight = new Map<string, Promise<number>>()

export async function getTokenVersion(userId: string): Promise<number> {
  const now = Date.now()
  const hit = cache.get(userId)
  if (hit && hit.expiresAt > now) return hit.value

  const pending = inflight.get(userId)
  if (pending) return pending

  const p = prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  }).then((user) => {
    const value = user?.tokenVersion ?? 0
    cache.set(userId, { value, expiresAt: Date.now() + TTL_MS })
    return value
  }).finally(() => {
    inflight.delete(userId)
  })

  inflight.set(userId, p)
  return p
}

export function invalidateTokenVersion(userId: string): void {
  cache.delete(userId)
}
