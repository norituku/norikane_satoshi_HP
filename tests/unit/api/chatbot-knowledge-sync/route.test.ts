import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

function signedRequest(body: unknown, timestamp: number, secret = "revalidate_secret") {
  const rawBody = JSON.stringify(body)
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
  return new NextRequest("http://localhost/api/chatbot/knowledge/notion-sync", {
    method: "POST",
    headers: {
      "x-cc-notion-timestamp": String(timestamp),
      "x-cc-notion-signature": `sha256=${signature}`,
    },
    body: rawBody,
  })
}

async function loadRoute() {
  vi.resetModules()
  vi.stubEnv("REVALIDATE_SECRET", "revalidate_secret")
  vi.stubEnv("NOTION_TOKEN", "notion_token")
  const syncChatbotNotionKnowledge = vi.fn().mockResolvedValue({
    ok: true,
    usedFallback: false,
    snapshot: {
      syncedAt: "2026-06-19T01:00:00.000Z",
      manifestPageId: "manifest",
      entries: [],
      workflowDurations: { presets: [] },
    },
  })
  vi.doMock("@/lib/chatbot/server/notion-knowledge-sync", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/chatbot/server/notion-knowledge-sync")>()),
    syncChatbotNotionKnowledge,
  }))
  const route = await import("@/app/api/chatbot/knowledge/notion-sync/route")
  return { POST: route.POST, syncChatbotNotionKnowledge }
}

describe("POST /api/chatbot/knowledge/notion-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-19T01:00:00.000Z"))
  })

  it("runs the signed Notion knowledge sync trigger", async () => {
    const route = await loadRoute()
    const now = Math.floor(Date.now() / 1000)

    const response = await route.POST(signedRequest({ changedPageId: "source_page", reason: "page_update" }, now))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      usedFallback: false,
    })
    expect(route.syncChatbotNotionKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({
        changedPageId: "source_page",
        reason: "page_update",
      }),
    )
  })
})
