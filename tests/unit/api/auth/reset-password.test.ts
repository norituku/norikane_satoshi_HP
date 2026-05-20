import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  hash: vi.fn(),
  invalidateTokenVersion: vi.fn(),
  prisma: {
    passwordResetToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }))
vi.mock("@/lib/auth/server/token-version-cache", () => ({
  invalidateTokenVersion: mocks.invalidateTokenVersion,
}))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/reset-password/token_1", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

function ctx(token = "token_1") {
  return { params: Promise.resolve({ token }) }
}

async function loadPost() {
  vi.resetModules()
  const route = await import("@/app/api/auth/reset-password/[token]/route")
  return route.POST
}

describe("POST /api/auth/reset-password/[token]", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.setSystemTime(new Date("2026-05-20T00:00:00.000Z"))
    mocks.hash.mockResolvedValue("hashed_password")
    mocks.prisma.passwordResetToken.findUnique.mockResolvedValue({
      identifier: "satoshi@example.com",
      token: "token_1",
      expires: new Date("2026-05-20T00:10:00.000Z"),
    })
    mocks.prisma.user.update.mockResolvedValue({ id: "user_1" })
    mocks.prisma.passwordResetToken.delete.mockResolvedValue({})
    mocks.prisma.session.deleteMany.mockResolvedValue({ count: 1 })
    mocks.prisma.$transaction.mockImplementation((callback) => callback(mocks.prisma))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("increments tokenVersion on successful reset", async () => {
    const POST = await loadPost()

    const response = await POST(request({ password: "new-password" }), ctx())

    expect(response.status).toBe(200)
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { email: "satoshi@example.com" },
      data: {
        passwordHash: "hashed_password",
        emailVerified: expect.any(Date),
        tokenVersion: { increment: 1 },
      },
      select: { id: true },
    })
  })

  it("invalidates the tokenVersion cache after the transaction", async () => {
    const order: string[] = []
    mocks.prisma.$transaction.mockImplementation(async (callback) => {
      const result = await callback(mocks.prisma)
      order.push("transaction")
      return result
    })
    mocks.invalidateTokenVersion.mockImplementation(() => {
      order.push("invalidate")
    })
    const POST = await loadPost()

    const response = await POST(request({ password: "new-password" }), ctx())

    expect(response.status).toBe(200)
    expect(mocks.invalidateTokenVersion).toHaveBeenCalledWith("user_1")
    expect(order).toEqual(["transaction", "invalidate"])
  })

  it("returns 400 for expired tokens", async () => {
    mocks.prisma.passwordResetToken.findUnique.mockResolvedValue({
      identifier: "satoshi@example.com",
      token: "token_1",
      expires: new Date("2026-05-19T23:59:59.000Z"),
    })
    const POST = await loadPost()

    const response = await POST(request({ password: "new-password" }), ctx())

    expect(response.status).toBe(400)
    expect(mocks.prisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { token: "token_1" },
    })
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid tokens", async () => {
    mocks.prisma.passwordResetToken.findUnique.mockResolvedValue(null)
    const POST = await loadPost()

    const response = await POST(request({ password: "new-password" }), ctx())

    expect(response.status).toBe(400)
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
  })

  it("returns 400 for passwords shorter than 8 characters", async () => {
    const POST = await loadPost()

    const response = await POST(request({ password: "short" }), ctx())

    expect(response.status).toBe(400)
    expect(mocks.prisma.passwordResetToken.findUnique).not.toHaveBeenCalled()
  })
})
