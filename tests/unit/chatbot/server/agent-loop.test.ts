import { describe, expect, it, vi } from "vitest"

import type { ChatbotLlmRequest, ChatbotLlmResponse } from "@/lib/chatbot/server/llm-client"
import { runChatbotAgentLoop } from "@/lib/chatbot/server/agent-loop"

const jobContext = {
  jobKind: "cm-30s",
  finalMedium: "web",
  workSite: "remote-grading",
  documentaryAttachment: { kind: "none" },
} as const

const conversationState = {
  hasFinalMedium: true,
  hasJobKind: true,
  hasProjectLength: true,
  hasMaterialHandoff: true,
  hasAdditionalWork: true,
  hasDocumentaryAttachments: true,
  hasWorkSite: true,
  hasReferenceUrls: true,
  hasContactEmail: true,
  hasDesiredSchedule: true,
  turnCount: 3,
} as const

const baseRequest: ChatbotLlmRequest = {
  systemPrompt: "base prompt",
  messages: [{ role: "user", content: "工程目安を知りたいです" }],
  conversationState,
  jobContext,
  latestUserMessage: "工程目安を知りたいです",
  temperature: 0.2,
  maxOutputTokens: 900,
}

const continueRouting = {
  kind: "continue",
  nextQuestion: "次の質問",
} as const

describe("chatbot agent loop", () => {
  it("executes an embedded tool JSON and feeds the result back to the LLM", async () => {
    const generate = vi
      .fn(async (request: ChatbotLlmRequest): Promise<ChatbotLlmResponse> => {
        void request
        return response("")
      })
      .mockResolvedValueOnce(
        response(
          [
            "工程目安を計算します。",
            JSON.stringify({ tool: "get_estimate", args: { jobContext } }),
          ].join("\n"),
        ),
      )
      .mockResolvedValueOnce(response("作業目安は1〜2日です。"))
    const logger = vi.fn()

    const result = await runChatbotAgentLoop({
      request: baseRequest,
      orchestrator: { generate, isHealthy: vi.fn() },
      generate,
      resolveRoutingDecision: vi.fn().mockResolvedValue(continueRouting),
      conversationState,
      jobContext,
      latestUserMessage: "工程目安を知りたいです",
      toolContext: {},
      logger,
    })

    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[0]?.[0].systemPrompt).toContain("エージェントモード")
    expect(generate.mock.calls[1]?.[0].messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "system", content: expect.stringContaining("tool_result:") }),
      ]),
    )
    expect(result.steps).toEqual([{ step: 1, tool: "get_estimate", dispatchStatus: "executed" }])
    expect(result.toolDispatchResult).toMatchObject({ status: "executed", tool: "get_estimate" })
    expect(result.llmResponse.rawText).toBe("作業目安は1〜2日です。")
    expect(logger).toHaveBeenCalledWith("[agent-loop] step=1 tool=get_estimate dispatch=executed")
  })

  it("does not repeat create_booking when the follow-up LLM emits the same side-effect tool", async () => {
    const createBookingFromApiInput = vi.fn().mockResolvedValue({
      status: 200,
      body: { bookingGroupId: "booking_group_1" },
    })
    const toolCall = JSON.stringify({ tool: "create_booking", args: { input: bookingInput() } })
    const generate = vi.fn(async (request: ChatbotLlmRequest): Promise<ChatbotLlmResponse> => {
      void request
      return response(toolCall)
    })

    const result = await runChatbotAgentLoop({
      request: baseRequest,
      orchestrator: { generate, isHealthy: vi.fn() },
      generate,
      resolveRoutingDecision: vi.fn().mockResolvedValue({
        kind: "to-booking-inline",
        suggestedSlots: [],
        jobContext,
      }),
      conversationState,
      jobContext,
      latestUserMessage: "予約します",
      toolContext: {
        userId: "user_1",
        userEmail: "customer@example.com",
        createBookingFromApiInput,
      },
    })

    expect(createBookingFromApiInput).toHaveBeenCalledTimes(1)
    expect(result.steps).toEqual([
      { step: 1, tool: "create_booking", dispatchStatus: "executed" },
      {
        step: 2,
        tool: "create_booking",
        dispatchStatus: "fallback",
        fallbackReason: "duplicate-side-effect",
      },
    ])
  })

  it("keeps an executed side-effect tool result when final feedback times out", async () => {
    const createBookingFromApiInput = vi.fn().mockResolvedValue({
      status: 200,
      body: { bookingGroupId: "booking_group_1" },
    })
    const generate = vi
      .fn(async (request: ChatbotLlmRequest): Promise<ChatbotLlmResponse> => {
        void request
        return response("")
      })
      .mockResolvedValueOnce(response(JSON.stringify({ tool: "create_booking", args: { input: bookingInput() } })))
      .mockImplementationOnce(() => new Promise<ChatbotLlmResponse>(() => undefined))
    const logger = vi.fn()

    const result = await runChatbotAgentLoop({
      request: baseRequest,
      orchestrator: { generate, isHealthy: vi.fn() },
      generate,
      resolveRoutingDecision: vi.fn().mockResolvedValue({
        kind: "to-booking-inline",
        suggestedSlots: [],
        jobContext,
      }),
      conversationState,
      jobContext,
      latestUserMessage: "予約します",
      toolContext: {
        userId: "user_1",
        userEmail: "customer@example.com",
        createBookingFromApiInput,
      },
      logger,
      timeoutMs: 1,
    })

    expect(createBookingFromApiInput).toHaveBeenCalledTimes(1)
    expect(result.toolDispatchResult).toMatchObject({ status: "executed", tool: "create_booking" })
    expect(logger).toHaveBeenCalledWith("[agent-loop] feedback-timeout reason=chatbot_agent_loop_timeout")
  })

  it("reuses the created Notion AI thread for isolated tool reads and feedback", async () => {
    const generate = vi
      .fn(async (request: ChatbotLlmRequest): Promise<ChatbotLlmResponse> => {
        void request
        return response("")
      })
      .mockResolvedValueOnce(
        response("候補を確認します。", {
          notionAiThreadId: "thread-created-a",
          notionAiThreadCreated: true,
        }),
      )
      .mockResolvedValueOnce(response(JSON.stringify({ tool: "get_estimate", args: { jobContext } })))
      .mockResolvedValueOnce(response("作業目安は1〜2日です。"))

    await runChatbotAgentLoop({
      request: { ...baseRequest, notionAiThread: {} },
      orchestrator: { generate, isHealthy: vi.fn() },
      generate,
      resolveRoutingDecision: vi.fn().mockResolvedValue(continueRouting),
      conversationState,
      jobContext,
      latestUserMessage: "工程目安を知りたいです",
      toolContext: {},
    })

    expect(generate.mock.calls[1]?.[0].notionAiThread).toEqual({ threadId: "thread-created-a" })
    expect(generate.mock.calls[2]?.[0].notionAiThread).toEqual({ threadId: "thread-created-a" })
  })

  it("rejects when the loop exceeds its timeout", async () => {
    const generate = vi.fn(
      () => new Promise<ChatbotLlmResponse>(() => undefined),
    )

    await expect(
      runChatbotAgentLoop({
        request: baseRequest,
        orchestrator: { generate, isHealthy: vi.fn() },
        generate,
        resolveRoutingDecision: vi.fn().mockResolvedValue(continueRouting),
        conversationState,
        jobContext,
        latestUserMessage: "相談です",
        toolContext: {},
        timeoutMs: 1,
      }),
    ).rejects.toThrow("chatbot_agent_loop_timeout")
  })
})

function response(rawText: string, diagnostics?: Record<string, unknown>): ChatbotLlmResponse {
  return {
    rawText,
    tier: "tier-1-chrome-notion-ai",
    ...(diagnostics ? { diagnostics } : {}),
  }
}

function bookingInput() {
  return {
    projectTitle: "テスト案件",
    dueDate: "2026-07-31",
    companyName: "テスト株式会社",
    contactName: "テスト太郎",
    sessionEmail: "customer@example.com",
    phone: "",
    memo: "",
    agreed: true,
    selectedSlots: [
      {
        start: "2026-06-15T01:00:00.000Z",
        end: "2026-06-15T02:00:00.000Z",
      },
    ],
  }
}
