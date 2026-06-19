import { createHmac, timingSafeEqual } from "node:crypto"

export const CC_NOTION_SIGNATURE_HEADER = "x-cc-notion-signature"
export const CC_NOTION_TIMESTAMP_HEADER = "x-cc-notion-timestamp"
export const CC_NOTION_REPLAY_WINDOW_SECONDS = 300

export type SignedRequestVerificationResult =
  | { ok: true; timestamp: number }
  | { ok: false; error: "invalid_timestamp" | "stale_request" | "invalid_signature" }

export function verifyCcNotionSignedRequest(input: {
  rawBody: string
  signatureHeader: string
  timestampHeader: string | null
  secret: string
  nowSeconds?: number
}): SignedRequestVerificationResult {
  const timestamp = Number(input.timestampHeader)
  if (!input.timestampHeader || !Number.isFinite(timestamp)) {
    return { ok: false, error: "invalid_timestamp" }
  }

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > CC_NOTION_REPLAY_WINDOW_SECONDS) {
    return { ok: false, error: "stale_request" }
  }

  if (!verifySignature(input.rawBody, timestamp, input.signatureHeader, input.secret)) {
    return { ok: false, error: "invalid_signature" }
  }

  return { ok: true, timestamp }
}

function verifySignature(rawBody: string, timestamp: number, header: string, secret: string): boolean {
  const prefix = "sha256="
  if (!header.startsWith(prefix)) return false
  const hex = header.slice(prefix.length).trim()
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
  const a = Buffer.from(hex, "hex")
  const b = Buffer.from(expected, "hex")
  if (a.length === 0 || a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
