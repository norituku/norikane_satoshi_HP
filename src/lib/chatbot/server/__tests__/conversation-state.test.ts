import { describe, expect, it } from "vitest"

import type { ChatbotConversation, ChatbotMessage, JobContext } from "@/lib/chatbot/domain"
import { buildConversationState, deriveUserTurnCount } from "@/lib/chatbot/server/conversation-state"

function conversation(overrides: Partial<ChatbotConversation> = {}): ChatbotConversation {
  return {
    id: "conv_1",
    startedAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    status: "open",
    context: { sessionId: "session_1" },
    messages: [{ id: "user_1", role: "user", content: "Web CM 30秒です。", createdAt: "2026-06-21T00:00:00.000Z" }],
    ...overrides,
  }
}

function userMessage(): ChatbotMessage {
  return {
    id: "user_2",
    role: "user",
    content: "追加作業はありません。基本工程は？",
    createdAt: "2026-06-21T00:01:00.000Z",
  }
}

const baseJobContext: JobContext = {
  finalMedium: "web",
  jobKind: "cm-30s",
  projectLengthMinutes: 0.5,
  workSite: "remote-grading",
  documentaryAttachment: { kind: "none" },
}

describe("buildConversationState", () => {
  it("merges stored, input, active choice, and duration state without replacing flexible LLM context", () => {
    const state = buildConversationState({
      conversation: conversation({
        context: {
          sessionId: "session_1",
          conversationState: {
            hasFinalMedium: false,
            hasJobKind: false,
            hasAdditionalWork: false,
            hasDocumentaryAttachments: false,
            hasWorkSite: false,
            hasReferenceUrls: false,
            hasContactEmail: false,
            hasDesiredSchedule: false,
            turnCount: 1,
            otherChoiceComments: { "final-medium": "YouTube広告" },
          },
        },
      }),
      userMessage: userMessage(),
      inputConversationState: {
        hasContactEmail: true,
        contactEmail: "client@example.test",
        otherChoiceComments: { "production-options": "字幕と軽いテロップ" },
      },
      activeChoiceConversationState: {
        hasAdditionalWork: true,
        otherChoiceComments: { "additional-work": "簡単な肌補正" },
      },
      jobContext: baseJobContext,
      durationStatePatch: {
        durationContext: {
          workflowFacts: {
            finalMedium: "web",
            jobKind: "cm-30s",
            projectLengthMinutes: 0.5,
          },
          workflowEstimate: { totalMinDays: 1, totalMaxDays: 2, riskFlags: [] },
          snapshotStatus: "current",
        },
      },
    })

    expect(state).toMatchObject({
      hasFinalMedium: true,
      hasJobKind: true,
      hasProjectLength: true,
      hasAdditionalWork: true,
      hasContactEmail: true,
      contactEmail: "client@example.test",
      turnCount: 2,
      durationContext: {
        workflowFacts: {
          finalMedium: "web",
          jobKind: "cm-30s",
          projectLengthMinutes: 0.5,
        },
        workflowEstimate: { totalMinDays: 1, totalMaxDays: 2, riskFlags: [] },
        snapshotStatus: "current",
      },
      otherChoiceComments: {
        "final-medium": "YouTube広告",
        "production-options": "字幕と軽いテロップ",
        "additional-work": "簡単な肌補正",
      },
    })
  })

  it("treats turnCount as derived from the persisted message history and the current user turn", () => {
    const state = buildConversationState({
      conversation: conversation({
        context: {
          sessionId: "session_1",
          conversationState: {
            hasFinalMedium: false,
            hasJobKind: false,
            hasAdditionalWork: false,
            hasDocumentaryAttachments: false,
            hasWorkSite: false,
            hasReferenceUrls: false,
            hasContactEmail: false,
            hasDesiredSchedule: false,
            turnCount: 99,
          },
        },
        messages: [
          { id: "u1", role: "user", content: "最初です。", createdAt: "2026-06-21T00:00:00.000Z" },
          { id: "a1", role: "assistant", content: "確認します。", createdAt: "2026-06-21T00:00:10.000Z" },
          { id: "u2", role: "user", content: "次です。", createdAt: "2026-06-21T00:01:00.000Z" },
        ],
      }),
      userMessage: userMessage(),
      inputConversationState: { turnCount: 42 },
      activeChoiceConversationState: { turnCount: 7 },
      jobContext: baseJobContext,
      durationStatePatch: { turnCount: 3 },
    })

    expect(state.turnCount).toBe(3)
  })

  it("derives only user turns for routing thresholds", () => {
    expect(
      deriveUserTurnCount(
        [
          { id: "u1", role: "user", content: "最初です。", createdAt: "2026-06-21T00:00:00.000Z" },
          { id: "s1", role: "system", content: "内部メモ", createdAt: "2026-06-21T00:00:05.000Z" },
          { id: "a1", role: "assistant", content: "確認します。", createdAt: "2026-06-21T00:00:10.000Z" },
        ],
        userMessage(),
      ),
    ).toBe(2)
  })
})
