import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  limitByIp: vi.fn(),
  getClientIp: vi.fn(),
}))

vi.mock("@/lib/rate-limit/server", () => ({
  limitByIp: mocks.limitByIp,
}))

vi.mock("@/lib/security/server/client-ip", () => ({
  getClientIp: mocks.getClientIp,
}))

import { POST } from "@/app/api/csp-report/route"

function cspReportRequest(body: unknown, contentType: string) {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body)
  return new NextRequest("http://localhost/api/csp-report", {
    method: "POST",
    body: rawBody,
    headers: {
      "content-type": contentType,
      "content-length": String(new TextEncoder().encode(rawBody).byteLength),
      "user-agent": "vitest-agent",
      "x-forwarded-for": "203.0.113.9",
    },
  })
}

const reportBody = {
  documentURL: "https://example.com/notes",
  violatedDirective: "script-src",
  effectiveDirective: "script-src",
  blockedURL: "https://cdn.example/script.js",
  sourceFile: "https://example.com/app.js",
  lineNumber: 12,
  columnNumber: 34,
  disposition: "report",
  referrer: "https://referrer.example",
}

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    mocks.limitByIp.mockResolvedValue({ limited: false, headers: new Headers() })
    mocks.getClientIp.mockReturnValue("203.0.113.9")
  })

  it("accepts application/csp-report bodies and returns 204 with an empty body", async () => {
    const response = await POST(cspReportRequest({ report: reportBody }, "application/csp-report"))
    const text = await response.text()

    expect(response.status).toBe(204)
    expect(response.headers.get("Content-Length")).toBe("0")
    expect(text).toBe("")
    expect(mocks.limitByIp).toHaveBeenCalledWith(
      "cspReportIp",
      expect.any(NextRequest),
      "too many reports",
    )
  })

  it("accepts application/reports+json arrays and returns 204", async () => {
    const response = await POST(
      cspReportRequest([{ type: "csp-violation", body: reportBody }], "application/reports+json"),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get("Content-Length")).toBe("0")
  })

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(cspReportRequest("{", "application/csp-report"))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: "invalid json" })
  })

  it("returns 415 for unknown content types", async () => {
    const response = await POST(cspReportRequest({ report: reportBody }, "application/json"))
    const json = await response.json()

    expect(response.status).toBe(415)
    expect(json).toEqual({ error: "unsupported media type" })
  })

  it("returns 429 when the CSP report IP limit is exceeded", async () => {
    mocks.limitByIp.mockResolvedValue({
      limited: true,
      headers: new Headers({ "Retry-After": "60" }),
      response: NextResponse.json(
        { error: "too many reports" },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    })

    const response = await POST(cspReportRequest({ report: reportBody }, "application/csp-report"))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("60")
    expect(json).toEqual({ error: "too many reports" })
  })

  it("logs CSP violations with the expected prefix and structured fields", async () => {
    await POST(cspReportRequest({ report: reportBody }, "application/csp-report"))

    expect(console.warn).toHaveBeenCalledWith("[CSP Violation]", {
      documentURL: "https://example.com/notes",
      violatedDirective: "script-src",
      effectiveDirective: "script-src",
      blockedURL: "https://cdn.example/script.js",
      sourceFile: "https://example.com/app.js",
      lineNumber: 12,
      columnNumber: 34,
      disposition: "report",
      referrer: "https://referrer.example",
      userAgent: "vitest-agent",
      ip: "203.0.113.9",
    })
  })
})
