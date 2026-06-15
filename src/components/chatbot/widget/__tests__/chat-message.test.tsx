// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ChatMessage } from "@/components/chatbot/widget/ChatMessage"
import {
  CHATBOT_CONVERSATION_CONTENT_CLASS_NAME,
  CHATBOT_CONVERSATION_CONTENT_STYLE,
} from "@/components/chatbot/widget/conversationTypography"

const conversationContentClasses = CHATBOT_CONVERSATION_CONTENT_CLASS_NAME.split(" ")

describe("ChatMessage", () => {
  afterEach(() => cleanup())

  it("renders assistant content and timestamp", () => {
    render(
      <ChatMessage
        role="assistant"
        content="案件内容を整理します。"
        createdAt={new Date("2026-05-26T12:34:00.000+09:00")}
      />,
    )

    expect(screen.getByText("AI アシスタント")).toBeInTheDocument()
    expect(screen.getByText("案件内容を整理します。")).toBeInTheDocument()
    expect(screen.getByText("12:34")).toBeInTheDocument()
  })

  it("renders user content with the customer label", () => {
    render(<ChatMessage role="user" content="劇場公開作品です。" />)

    expect(screen.getByText("お客さま")).toBeInTheDocument()
    expect(screen.getByText("劇場公開作品です。")).toBeInTheDocument()
  })

  it("uses sans typography only for the message body content", () => {
    render(<ChatMessage role="assistant" content="補足メモを整理します。" />)

    const content = screen.getByText("補足メモを整理します。")
    expect(content).toHaveClass(...conversationContentClasses)
    expect(content).toHaveStyle({ fontFamily: CHATBOT_CONVERSATION_CONTENT_STYLE.fontFamily })
    expect(screen.getByText("AI アシスタント")).not.toHaveClass(...conversationContentClasses)
  })
})
