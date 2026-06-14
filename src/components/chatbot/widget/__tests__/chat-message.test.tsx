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

  it("renders assistant bold markdown as strong text", () => {
    render(<ChatMessage role="assistant" content="メールは **qj9n9not6bov@yahoo.co.jp** で合っていますか？" />)

    const boldText = screen.getByText("qj9n9not6bov@yahoo.co.jp")
    expect(boldText.tagName).toBe("STRONG")
    expect(screen.queryByText("**qj9n9not6bov@yahoo.co.jp**")).not.toBeInTheDocument()
  })

  it("renders user content with the customer label", () => {
    render(<ChatMessage role="user" content="劇場公開作品です。" />)

    expect(screen.getByText("お客さま")).toBeInTheDocument()
    expect(screen.getByText("劇場公開作品です。")).toBeInTheDocument()
  })

  it("asks for confirmation before saving changed text", () => {
    const onEdit = vi.fn()
    render(<ChatMessage id="msg_1" role="user" content="劇場公開作品です。" onEdit={onEdit} />)

    fireEvent.click(screen.getByRole("button", { name: "メッセージを編集" }))
    fireEvent.change(screen.getByLabelText("編集内容"), { target: { value: "Web CM です。" } })
    fireEvent.click(screen.getByRole("button", { name: /保存/ }))

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByText("保存すると、これより後のやり取りは削除されます。")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument()
  })

  it("renders an icon-only edit control that is revealed by hover or focus styles", () => {
    const onEdit = vi.fn()
    const { container } = render(<ChatMessage id="msg_1" role="user" content="劇場公開作品です。" onEdit={onEdit} />)

    const editButton = screen.getByRole("button", { name: "メッセージを編集" })
    expect(screen.queryByText("編集")).not.toBeInTheDocument()
    expect(editButton).toHaveClass("h-8")
    expect(editButton).toHaveClass("w-8")
    expect(editButton).toHaveClass("opacity-0")
    expect(editButton).toHaveClass("group-hover:opacity-100")
    expect(editButton).toHaveClass("group-focus-within:opacity-100")
    expect(container.querySelector("article")).toHaveClass("group")
  })

  it("saves changed text once after confirmation", () => {
    const onEdit = vi.fn()
    render(<ChatMessage id="msg_1" role="user" content="劇場公開作品です。" onEdit={onEdit} />)

    fireEvent.click(screen.getByRole("button", { name: "メッセージを編集" }))
    fireEvent.change(screen.getByLabelText("編集内容"), { target: { value: "Web CM です。" } })
    fireEvent.click(screen.getByRole("button", { name: /保存/ }))
    fireEvent.click(screen.getByRole("button", { name: "OK" }))

    expect(onEdit).toHaveBeenCalledWith("msg_1", "Web CM です。")
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it("returns to the normal edit controls when confirmation is canceled", () => {
    const onEdit = vi.fn()
    render(<ChatMessage id="msg_1" role="user" content="劇場公開作品です。" onEdit={onEdit} />)

    fireEvent.click(screen.getByRole("button", { name: "メッセージを編集" }))
    fireEvent.change(screen.getByLabelText("編集内容"), { target: { value: "Web CM です。" } })
    fireEvent.click(screen.getByRole("button", { name: /保存/ }))
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }))

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByText("保存すると、これより後のやり取りは削除されます。")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /保存/ })).toBeInTheDocument()
  })

  it("shows the confirmation every time save is requested", () => {
    const onEdit = vi.fn()
    const { rerender } = render(<ChatMessage id="msg_1" role="user" content="劇場公開作品です。" onEdit={onEdit} />)

    fireEvent.click(screen.getByRole("button", { name: "メッセージを編集" }))
    fireEvent.change(screen.getByLabelText("編集内容"), { target: { value: "Web CM です。" } })
    fireEvent.click(screen.getByRole("button", { name: /保存/ }))
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }))
    fireEvent.click(screen.getByRole("button", { name: /保存/ }))

    expect(screen.getByText("保存すると、これより後のやり取りは削除されます。")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "OK" }))
    expect(onEdit).toHaveBeenCalledTimes(1)

    rerender(<ChatMessage id="msg_1" role="user" content="Web CM です。" onEdit={onEdit} />)
    fireEvent.click(screen.getByRole("button", { name: "メッセージを編集" }))
    fireEvent.change(screen.getByLabelText("編集内容"), { target: { value: "展示映像です。" } })
    fireEvent.click(screen.getByRole("button", { name: /保存/ }))

    expect(screen.getByText("保存すると、これより後のやり取りは削除されます。")).toBeInTheDocument()
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
