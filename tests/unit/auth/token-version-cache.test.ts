import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

async function loadCache() {
  vi.resetModules()
  const mod = await import("@/lib/auth/server/token-version-cache")
  return mod
}

describe("token-version-cache", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-20T00:00:00.000Z"))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("fetches from the database on the first request", async () => {
    const { getTokenVersion } = await loadCache()
    mocks.prisma.user.findUnique.mockResolvedValue({ tokenVersion: 3 })

    await expect(getTokenVersion("user_1")).resolves.toBe(3)

    expect(mocks.prisma.user.findUnique).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { tokenVersion: true },
    })
  })

  it("uses the cached value within the TTL", async () => {
    const { getTokenVersion } = await loadCache()
    mocks.prisma.user.findUnique.mockResolvedValue({ tokenVersion: 4 })

    await expect(getTokenVersion("user_1")).resolves.toBe(4)
    await expect(getTokenVersion("user_1")).resolves.toBe(4)

    expect(mocks.prisma.user.findUnique).toHaveBeenCalledTimes(1)
  })

  it("shares a single in-flight database request across parallel calls", async () => {
    const { getTokenVersion } = await loadCache()
    mocks.prisma.user.findUnique.mockResolvedValue({ tokenVersion: 5 })

    const values = await Promise.all(
      Array.from({ length: 10 }, () => getTokenVersion("user_1")),
    )

    expect(values).toEqual(Array(10).fill(5))
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledTimes(1)
  })

  it("fetches again after invalidation", async () => {
    const { getTokenVersion, invalidateTokenVersion } = await loadCache()
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce({ tokenVersion: 1 })
      .mockResolvedValueOnce({ tokenVersion: 2 })

    await expect(getTokenVersion("user_1")).resolves.toBe(1)
    invalidateTokenVersion("user_1")
    await expect(getTokenVersion("user_1")).resolves.toBe(2)

    expect(mocks.prisma.user.findUnique).toHaveBeenCalledTimes(2)
  })

  it("fetches again after the TTL expires", async () => {
    const { getTokenVersion } = await loadCache()
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce({ tokenVersion: 1 })
      .mockResolvedValueOnce({ tokenVersion: 2 })

    await expect(getTokenVersion("user_1")).resolves.toBe(1)
    vi.advanceTimersByTime(60_001)
    await expect(getTokenVersion("user_1")).resolves.toBe(2)

    expect(mocks.prisma.user.findUnique).toHaveBeenCalledTimes(2)
  })
})
