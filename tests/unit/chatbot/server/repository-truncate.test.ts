import { beforeEach, describe, expect, it, vi } from "vitest"

const { prismaMock, txMock } = vi.hoisted(() => ({
  txMock: {
    chatbotMessage: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    chatbotConversation: {
      update: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
  },
  prismaMock: {
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { truncateConversationFromMessage } from "@/lib/chatbot/server/repository"

describe("truncateConversationFromMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock))
    txMock.chatbotMessage.findMany.mockResolvedValue([
      { id: "msg_keep" },
      { id: "msg_edit" },
      { id: "msg_after" },
    ])
    txMock.chatbotMessage.deleteMany.mockResolvedValue({ count: 2 })
  })

  it("deletes the target message and all following messages by index-ordered ids", async () => {
    const result = await truncateConversationFromMessage({
      conversationId: "conv_1",
      messageId: "msg_edit",
    })

    expect(txMock.chatbotMessage.findMany).toHaveBeenCalledWith({
      where: { conversationId: "conv_1" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    })
    expect(txMock.chatbotMessage.deleteMany).toHaveBeenCalledWith({
      where: {
        conversationId: "conv_1",
        id: { in: ["msg_edit", "msg_after"] },
      },
    })
    expect(result).toEqual({ deletedCount: 2 })
  })

  it("resets accumulated routing and job context fields after truncating", async () => {
    await truncateConversationFromMessage({
      conversationId: "conv_1",
      messageId: "msg_edit",
    })

    expect(txMock.chatbotConversation.update).toHaveBeenCalledWith({
      where: { id: "conv_1" },
      data: {
        routingDecision: "continue",
        finalMedium: null,
        jobType: null,
        mainDuration: null,
        workSite: null,
        attachments: null,
        additionalWork: null,
        referenceUrls: null,
      },
    })
    expect(txMock.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("currentQuestion = NULL"),
      "conv_1",
    )
  })

  it("fails closed when the target message is not in the conversation", async () => {
    await expect(
      truncateConversationFromMessage({
        conversationId: "conv_1",
        messageId: "missing",
      }),
    ).rejects.toThrow("chatbot_edit_target_not_found")

    expect(txMock.chatbotMessage.deleteMany).not.toHaveBeenCalled()
    expect(txMock.chatbotConversation.update).not.toHaveBeenCalled()
  })
})
