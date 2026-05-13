import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  Resend: vi.fn(),
  send: vi.fn(),
}))

vi.mock("resend", () => ({
  Resend: mocks.Resend,
}))

describe("booking email sender", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
    mocks.Resend.mockImplementation(function Resend() {
      return {
        emails: { send: mocks.send },
      }
    })
  })

  it("skips sending when Resend is not configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { sendBookingConfirmedEmail } = await import("@/lib/booking/email")

    await expect(sendBookingConfirmedEmail({
      to: "satoshi@example.com",
      projectTitle: "Project",
      start: "2026-06-10T01:00:00.000Z",
      end: "2026-06-10T02:00:00.000Z",
      workScopes: [],
      otherWorkDetail: "",
      estimatedDuration: "consult",
    })).resolves.toEqual({ skipped: true })

    expect(warn).toHaveBeenCalledWith("[email skipped] tag=confirmed to=satoshi@example.com")
    expect(mocks.Resend).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it("sends confirmed booking mail with custom sender and escaped HTML", async () => {
    process.env.RESEND_API_KEY = "resend_key"
    process.env.RESEND_FROM_EMAIL = "booking@norikane.studio"
    mocks.send.mockResolvedValue({ data: { id: "email_1" }, error: null })
    const { sendBookingConfirmedEmail, getResendClient } = await import("@/lib/booking/email")

    await expect(sendBookingConfirmedEmail({
      to: "client@example.com",
      projectTitle: "<Project>",
      start: new Date("2026-06-10T01:00:00.000Z"),
      end: new Date("2026-06-10T02:00:00.000Z"),
      workScopes: ["grading", "online"],
      otherWorkDetail: "detail & note",
      estimatedDuration: "consult",
    })).resolves.toEqual({ skipped: false, id: "email_1" })

    expect(getResendClient()).toBe(getResendClient())
    expect(mocks.Resend).toHaveBeenCalledTimes(1)
    expect(mocks.Resend).toHaveBeenCalledWith("resend_key")
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      from: "のりかね映像設計室 <booking@norikane.studio>",
      to: "client@example.com",
      subject: expect.stringContaining("【予約確定】<Project>"),
      text: expect.stringContaining("grading / online\ndetail & note"),
      html: expect.stringContaining("&lt;Project&gt;"),
    }))
  })

  it("raises Resend errors", async () => {
    process.env.RESEND_API_KEY = "resend_key"
    mocks.send.mockResolvedValue({ data: null, error: { message: "rate limited" } })
    const { sendBookingConfirmedEmail } = await import("@/lib/booking/email")

    await expect(sendBookingConfirmedEmail({
      to: "client@example.com",
      projectTitle: "Project",
      start: "2026-06-10T01:00:00.000Z",
      end: "2026-06-10T02:00:00.000Z",
      workScopes: ["grading"],
    })).rejects.toThrow("Resend send failed: rate limited")
  })
})
