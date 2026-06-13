import { describe, expect, it } from "vitest"

import {
  parseBookingPrefillJson,
  parseChatbotAgentToolCallJson,
  parseChatbotJsonObject,
  parseChatbotToolCallJson,
} from "@/lib/chatbot/server/tool-json"

describe("chatbot tool JSON parsing", () => {
  it("keeps booking prefill embedded-object extraction compatible", () => {
    expect(
      parseBookingPrefillJson(
        '了解です。\n{"contactName":" テスト太郎 ","companyName":"テスト株式会社","contactEmail":"test@example.com","dueDate":"2026-07-31"}',
      ),
    ).toEqual({
      contactName: "テスト太郎",
      companyName: "テスト株式会社",
      contactEmail: "test@example.com",
      dueDate: "2026-07-31",
    })
  })

  it("rejects explanatory text for strict tool calls", () => {
    expect(parseChatbotToolCallJson('呼び出します: {"tool":"get_estimate","args":{}}')).toBeNull()
  })

  it("rejects fenced tool calls", () => {
    expect(parseChatbotToolCallJson('```json\n{"tool":"get_estimate","args":{}}\n```')).toBeNull()
  })

  it("accepts a single strict tool-call object", () => {
    expect(parseChatbotToolCallJson('{"tool":"get_estimate","args":{"jobContext":{"jobKind":"cm-30s"}}}')).toEqual({
      tool: "get_estimate",
      args: { jobContext: { jobKind: "cm-30s" } },
    })
  })

  it("requires strict tool-call schema keys", () => {
    expect(parseChatbotToolCallJson('{"tool":"get_estimate","args":{},"text":"extra"}')).toBeNull()
    expect(parseChatbotToolCallJson('{"tool":"get_estimate"}')).toBeNull()
  })

  it("can parse an embedded agent tool call without changing strict parsing", () => {
    const rawText = [
      "工程目安を確認します。",
      "```json",
      '{"tool":"get_estimate","args":{"jobContext":{"jobKind":"cm-30s"}}}',
      "```",
    ].join("\n")

    expect(parseChatbotToolCallJson(rawText)).toBeNull()
    expect(parseChatbotAgentToolCallJson(rawText)).toEqual({
      tool: "get_estimate",
      args: { jobContext: { jobKind: "cm-30s" } },
    })
  })

  it("can parse an exact JSON object without accepting arrays", () => {
    expect(parseChatbotJsonObject('{"a":1}', { mode: "strict-object" })).toEqual({ a: 1 })
    expect(parseChatbotJsonObject("[1,2]", { mode: "strict-object" })).toBeNull()
  })
})
