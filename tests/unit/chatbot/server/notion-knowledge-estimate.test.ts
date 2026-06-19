import { describe, expect, it } from "vitest"

import type { JobContext } from "@/lib/chatbot/domain"
import { estimateWorkflow } from "@/lib/chatbot/server/duration-estimator"
import { createStaticChatbotKnowledgeSnapshot } from "@/lib/chatbot/server/notion-knowledge-sync"

function jobContext(overrides: Partial<JobContext>): JobContext {
  return {
    jobKind: "live-60m",
    finalMedium: "live",
    workSite: "satoshi-studio",
    documentaryAttachment: { kind: "none" },
    ...overrides,
  }
}

describe("chatbot duration estimator synced knowledge", () => {
  it("uses the last successful Notion workflow-duration snapshot when available", () => {
    const snapshot = createStaticChatbotKnowledgeSnapshot("2026-06-19T00:00:00.000Z")
    snapshot.workflowDurations.presets = snapshot.workflowDurations.presets.map((preset) =>
      preset.id === "live-60m"
        ? { ...preset, minDays: 8, maxDays: 9, source: "notion-sync" }
        : preset,
    )

    const result = estimateWorkflow(jobContext({ projectLengthMinutes: 60 }), { knowledgeSnapshot: snapshot })

    expect(result.totalMinDays).toBe(8)
    expect(result.totalMaxDays).toBe(9)
  })

  it("keeps the existing live 60m 7-8 day estimate without a synced snapshot", () => {
    const result = estimateWorkflow(jobContext({ projectLengthMinutes: 60 }))

    expect(result.totalMinDays).toBe(7)
    expect(result.totalMaxDays).toBe(8)
  })
})
