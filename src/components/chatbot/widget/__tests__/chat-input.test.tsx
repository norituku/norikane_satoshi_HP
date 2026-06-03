// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ChatInput } from "@/components/chatbot/widget/ChatInput"

describe("ChatInput", () => {
  afterEach(() => cleanup())

  it("renders the custom placeholder", () => {
    render(<ChatInput onSubmit={vi.fn()} placeholder="案件内容を書いてください" />)

    expect(screen.getByPlaceholderText("案件内容を書いてください")).toBeInTheDocument()
  })

  it("submits trimmed text and clears the input", async () => {
    const onSubmit = vi.fn()
    render(<ChatInput onSubmit={onSubmit} />)

    const input = screen.getByLabelText("相談内容")
    fireEvent.change(input, { target: { value: "  10月公開です  " } })
    fireEvent.click(screen.getByRole("button", { name: "送信" }))

    expect(onSubmit).toHaveBeenCalledWith("10月公開です")
    await waitFor(() => expect(input).toHaveValue(""))
  })

  it("keeps Enter as a newline and submits with Cmd Enter", async () => {
    const onSubmit = vi.fn()
    render(<ChatInput onSubmit={onSubmit} />)

    const input = screen.getByLabelText("相談内容")
    fireEvent.change(input, { target: { value: "1行目" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: "1行目\n2行目" } })
    fireEvent.keyDown(input, { key: "Enter", metaKey: true })

    expect(onSubmit).toHaveBeenCalledWith("1行目\n2行目")
    await waitFor(() => expect(input).toHaveValue(""))
  })

  it("uses a growing textarea with an internal scroll ceiling", () => {
    render(<ChatInput onSubmit={vi.fn()} />)

    const input = screen.getByLabelText("相談内容")
    expect(input.tagName).toBe("TEXTAREA")
    expect(input).toHaveClass("max-h-40")
    expect(input).toHaveClass("overflow-y-auto")
  })
})
