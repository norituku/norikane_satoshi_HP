import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ChatbotRequestCancelledError,
  isChatbotRequestCancelledError,
  submitChatbotMessage,
} from "@/components/chatbot/widget/api"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("submitChatbotMessage", () => {
  it("passes AbortSignal to fetch and converts AbortError into cancellation", async () => {
    const controller = new AbortController()
    const abortError = new DOMException("Aborted", "AbortError")
    const fetchMock = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      submitChatbotMessage({ message: "止めます" }, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(ChatbotRequestCancelledError)

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chatbot/message",
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it("identifies chatbot cancellation errors", () => {
    expect(isChatbotRequestCancelledError(new ChatbotRequestCancelledError())).toBe(true)
    expect(isChatbotRequestCancelledError(new Error("AbortError"))).toBe(false)
  })
})
