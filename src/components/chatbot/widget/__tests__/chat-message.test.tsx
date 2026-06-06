// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ChatMessage } from "@/components/chatbot/widget/ChatMessage"

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

  it("shows edit controls only for persisted user messages and saves changed text", () => {
    const onEdit = vi.fn()
    render(<ChatMessage id="msg_1" role="user" content="劇場公開作品です。" onEdit={onEdit} />)

    fireEvent.click(screen.getByRole("button", { name: "メッセージを編集" }))
    fireEvent.change(screen.getByLabelText("編集内容"), { target: { value: "Web CM です。" } })
    fireEvent.click(screen.getByRole("button", { name: /保存/ }))

    expect(onEdit).toHaveBeenCalledWith("msg_1", "Web CM です。")
  })

  it("does not show edit controls for assistant or system messages", () => {
    const onEdit = vi.fn()
    render(
      <>
        <ChatMessage id="assistant_1" role="assistant" content="質問します。" onEdit={onEdit} />
        <ChatMessage role="system" content="通信に失敗しました。" onEdit={onEdit} />
      </>,
    )

    expect(screen.queryByRole("button", { name: "メッセージを編集" })).not.toBeInTheDocument()
  })
})
