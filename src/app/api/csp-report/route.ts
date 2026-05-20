import { NextResponse, type NextRequest } from "next/server"
import { limitByIp } from "@/lib/rate-limit/server"
import { getClientIp } from "@/lib/security/server/client-ip"

const MAX_BODY_BYTES = 65_536

type ReportRecord = Record<string, unknown>

function field(report: ReportRecord, camelKey: string, legacyKey: string) {
  return report[camelKey] ?? report[legacyKey]
}

function logViolation(report: ReportRecord, request: NextRequest) {
  console.warn("[CSP Violation]", {
    documentURL: field(report, "documentURL", "document-uri"),
    violatedDirective: field(report, "violatedDirective", "violated-directive"),
    effectiveDirective: field(report, "effectiveDirective", "effective-directive"),
    blockedURL: field(report, "blockedURL", "blocked-uri"),
    sourceFile: field(report, "sourceFile", "source-file"),
    lineNumber: field(report, "lineNumber", "line-number"),
    columnNumber: field(report, "columnNumber", "column-number"),
    disposition: report.disposition,
    referrer: report.referrer,
    userAgent: request.headers.get("user-agent"),
    ip: getClientIp(request),
  })
}

function isRecord(value: unknown): value is ReportRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseContentType(request: NextRequest) {
  return request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? ""
}

function noContent() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Content-Length": "0" },
  })
}

export async function POST(request: NextRequest) {
  const limit = await limitByIp("cspReportIp", request, "too many reports")
  if (limit.limited) {
    return limit.response
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 })
  }

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 })
  }

  const contentType = parseContentType(request)
  if (contentType !== "application/csp-report" && contentType !== "application/reports+json") {
    return NextResponse.json({ error: "unsupported media type" }, { status: 415 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (contentType === "application/csp-report") {
    if (!isRecord(payload)) {
      return NextResponse.json({ error: "invalid report" }, { status: 400 })
    }
    const report = payload.report ?? payload["csp-report"]
    if (!isRecord(report)) {
      return NextResponse.json({ error: "invalid report" }, { status: 400 })
    }
    logViolation(report, request)
    return noContent()
  }

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "invalid report" }, { status: 400 })
  }

  for (const item of payload) {
    if (!isRecord(item) || !isRecord(item.body)) {
      continue
    }
    logViolation(item.body, request)
  }

  return noContent()
}
