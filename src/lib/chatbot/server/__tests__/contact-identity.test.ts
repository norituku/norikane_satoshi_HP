import { describe, expect, it } from "vitest"

import type { ConversationState } from "@/lib/chatbot/domain"
import {
  extractContactIdentityFromUserText,
  mergeContactIdentityFromUserText,
} from "@/lib/chatbot/server/contact-identity"

function baseState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    hasFinalMedium: false,
    hasJobKind: false,
    hasAdditionalWork: false,
    hasDocumentaryAttachments: false,
    hasWorkSite: false,
    hasReferenceUrls: false,
    hasContactEmail: false,
    hasDesiredSchedule: false,
    turnCount: 1,
    ...overrides,
  }
}

describe("contact identity extraction", () => {
  it("extracts labeled customer name, company name, and valid email from normal intake text", () => {
    expect(
      extractContactIdentityFromUserText(
        "担当者名は山田太郎です。会社名はテスト株式会社です。メールは client@example.jp です。",
      ),
    ).toEqual({
      customerName: "山田太郎",
      companyName: "テスト株式会社",
      contactEmail: "client@example.jp",
    })
  })

  it("does not save non-email contact values as contactEmail", () => {
    expect(
      extractContactIdentityFromUserText("担当者名は山田太郎です。メールは 090-1234-5678 です。"),
    ).toEqual({
      customerName: "山田太郎",
    })
  })

  it("merges extracted identity into conversation state flags", () => {
    expect(
      mergeContactIdentityFromUserText(
        baseState(),
        "会社名: Example Studio\n担当者: Jane Doe\nemail: jane@example.com",
      ),
    ).toMatchObject({
      hasCustomerIdentity: true,
      customerName: "Jane Doe",
      companyName: "Example Studio",
      hasContactEmail: true,
      contactEmail: "jane@example.com",
    })
  })
})
