import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    team: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

import { GET, POST } from "@/app/api/teams/route"
import { DELETE as DELETE_TEAM } from "@/app/api/teams/[teamId]/route"
import { DELETE as LEAVE_TEAM } from "@/app/api/teams/[teamId]/membership/route"

describe("GET /api/teams", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns serialized teams from Prisma for the authenticated user", async () => {
    const createdAt = new Date("2026-06-10T01:00:00.000Z")
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.team.findMany.mockResolvedValue([
      {
        id: "team_1",
        name: "Studio",
        createdAt,
        members: [
          {
            userId: "user_1",
            createdAt,
            user: {
              name: "Satoshi",
              email: "satoshi@example.com",
              image: null,
            },
          },
        ],
      },
    ])

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { members: { some: { userId: "user_1" } } },
      }),
    )
    expect(json).toEqual({
      teams: [
        {
          id: "team_1",
          name: "Studio",
          createdAt: createdAt.toISOString(),
          members: [
            {
              userId: "user_1",
              name: "Satoshi",
              email: "satoshi@example.com",
              image: null,
              joinedAt: createdAt.toISOString(),
            },
          ],
        },
      ],
    })
  })

  it("returns an empty team list for authenticated users with no channels", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.team.findMany.mockResolvedValue([])

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ teams: [] })
  })

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(mocks.prisma.team.findMany).not.toHaveBeenCalled()
  })
})

describe("POST /api/teams", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a team for the authenticated user", async () => {
    const createdAt = new Date("2026-06-10T01:00:00.000Z")
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.team.create.mockResolvedValue({ id: "team_1" })
    mocks.prisma.team.findMany.mockResolvedValue([
      {
        id: "team_1",
        name: "Studio",
        createdAt,
        members: [
          {
            userId: "user_1",
            createdAt,
            user: { name: "Satoshi", email: "satoshi@example.com", image: null },
          },
        ],
      },
    ])

    const response = await POST(new NextRequest("http://localhost/api/teams", {
      method: "POST",
      body: JSON.stringify({ name: "Studio" }),
    }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.teamId).toBe("team_1")
    expect(json.teams).toHaveLength(1)
    expect(mocks.prisma.team.create).toHaveBeenCalledWith({
      data: {
        name: "Studio",
        createdByUserId: "user_1",
        members: {
          create: { userId: "user_1" },
        },
      },
      select: { id: true },
    })
  })

  it("rejects invalid team names", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })

    const response = await POST(new NextRequest("http://localhost/api/teams", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    }))

    expect(response.status).toBe(400)
  })

  it("returns 401 when team creation is unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(new NextRequest("http://localhost/api/teams", {
      method: "POST",
      body: JSON.stringify({ name: "Studio" }),
    }))

    expect(response.status).toBe(401)
    expect(mocks.prisma.team.create).not.toHaveBeenCalled()
  })

  it("rejects malformed JSON payloads", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })

    const response = await POST(new NextRequest("http://localhost/api/teams", {
      method: "POST",
      body: "{",
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" })
  })

  it("allows duplicate team names for the same user", async () => {
    const createdAt = new Date("2026-06-10T01:00:00.000Z")
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.team.create.mockResolvedValue({ id: "team_2" })
    mocks.prisma.team.findMany.mockResolvedValue([
      {
        id: "team_1",
        name: "Studio",
        createdAt,
        members: [],
      },
      {
        id: "team_2",
        name: "Studio",
        createdAt,
        members: [],
      },
    ])

    const response = await POST(new NextRequest("http://localhost/api/teams", {
      method: "POST",
      body: JSON.stringify({ name: "Studio" }),
    }))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.teams.map((team: { name: string }) => team.name)).toEqual(["Studio", "Studio"])
  })
})

describe("team deletion routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes a team when the user is a member", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.team.findFirst.mockResolvedValue({ id: "team_1", name: "Studio" })
    mocks.prisma.team.delete.mockResolvedValue({})

    const response = await DELETE_TEAM(new Request("http://localhost/api/teams/team_1"), {
      params: Promise.resolve({ teamId: "team_1" }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "deleted" })
    expect(mocks.prisma.team.delete).toHaveBeenCalledWith({ where: { id: "team_1" } })
  })

  it("returns 401 when deleting a team unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await DELETE_TEAM(new Request("http://localhost/api/teams/team_1"), {
      params: Promise.resolve({ teamId: "team_1" }),
    })

    expect(response.status).toBe(401)
    expect(mocks.prisma.team.delete).not.toHaveBeenCalled()
  })

  it("returns 404 when deleting a team outside membership", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.team.findFirst.mockResolvedValue(null)

    const response = await DELETE_TEAM(new Request("http://localhost/api/teams/team_1"), {
      params: Promise.resolve({ teamId: "team_1" }),
    })

    expect(response.status).toBe(404)
  })

  it("leaves a team membership", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.teamMember.deleteMany.mockResolvedValue({ count: 1 })

    const response = await LEAVE_TEAM(new Request("http://localhost/api/teams/team_1/membership"), {
      params: Promise.resolve({ teamId: "team_1" }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "left" })
  })

  it("returns 401 when leaving a team unauthenticated", async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await LEAVE_TEAM(new Request("http://localhost/api/teams/team_1/membership"), {
      params: Promise.resolve({ teamId: "team_1" }),
    })

    expect(response.status).toBe(401)
    expect(mocks.prisma.teamMember.deleteMany).not.toHaveBeenCalled()
  })

  it("returns 404 when no membership is removed", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.teamMember.deleteMany.mockResolvedValue({ count: 0 })

    const response = await LEAVE_TEAM(new Request("http://localhost/api/teams/team_1/membership"), {
      params: Promise.resolve({ teamId: "team_1" }),
    })

    expect(response.status).toBe(404)
  })

  it("does not delete the Team row when the final member leaves", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user_1" } })
    mocks.prisma.teamMember.deleteMany.mockResolvedValue({ count: 1 })

    const response = await LEAVE_TEAM(new Request("http://localhost/api/teams/team_1/membership"), {
      params: Promise.resolve({ teamId: "team_1" }),
    })

    expect(response.status).toBe(200)
    expect(mocks.prisma.team.delete).not.toHaveBeenCalled()
  })
})
