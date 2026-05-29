// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { SecurityNote } from "@/components/chatbot/widget/SecurityNote"

describe("SecurityNote", () => {
  afterEach(() => cleanup())

  it("hides details by default when defaultOpen is false", () => {
    render(<SecurityNote defaultOpen={false} />)

    expect(screen.getByRole("button", { name: "安全に扱います" })).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("1 週間", { exact: false })).not.toBeInTheDocument()
  })

  it("shows security details after the button is clicked", () => {
    render(<SecurityNote defaultOpen={false} />)

    fireEvent.click(screen.getByRole("button", { name: "安全に扱います" }))

    expect(screen.getByText("チャットログは 1 週間で自動削除します。")).toBeInTheDocument()
    expect(screen.getByText("カレンダーは予約が埋まっている時間帯だけを空き状況確認に使います。")).toBeInTheDocument()
  })
})
