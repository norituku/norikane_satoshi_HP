import { NextResponse, type NextRequest } from "next/server"

import {
  CC_NOTION_SIGNATURE_HEADER,
  CC_NOTION_TIMESTAMP_HEADER,
  verifyCcNotionSignedRequest,
} from "@/lib/api/server/signed-request"
import {
  defaultChatbotKnowledgeManifestPageId,
  loadLatestChatbotKnowledgeSnapshot,
  syncChatbotNotionKnowledge,
} from "@/lib/chatbot/server/notion-knowledge-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Payload = {
  changedPageId?: string
  reason?: string
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "server misconfigured: REVALIDATE_SECRET not set" },
      { status: 500 },
    )
  }

  const rawBody = await request.text()
  const verified = verifyCcNotionSignedRequest({
    rawBody,
    timestampHeader: request.headers.get(CC_NOTION_TIMESTAMP_HEADER),
    signatureHeader: request.headers.get(CC_NOTION_SIGNATURE_HEADER) ?? "",
    secret,
  })
  if (!verified.ok) return NextResponse.json({ ok: false, error: verified.error }, { status: 403 })

  const payload = parsePayload(rawBody)
  if (!payload) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })

  const result = await syncChatbotNotionKnowledge({
    manifestPageId: process.env.CHATBOT_KNOWLEDGE_MANIFEST_PAGE_ID ?? defaultChatbotKnowledgeManifestPageId,
    changedPageId: payload.changedPageId,
    reason: payload.reason,
  })

  return NextResponse.json({
    ok: result.ok,
    usedFallback: result.usedFallback,
    error: result.ok ? null : result.error,
    syncedAt: result.snapshot.syncedAt,
    manifestPageId: result.snapshot.manifestPageId,
    entries: result.snapshot.entries.map((entry) => ({
      pageId: entry.pageId,
      usage: entry.usage,
      referenceRange: entry.referenceRange,
      status: entry.status,
      lastSyncedAt: entry.lastSyncedAt ?? null,
      lastError: entry.lastError ?? null,
    })),
  })
}

export async function GET() {
  const snapshot = await loadLatestChatbotKnowledgeSnapshot()

  return NextResponse.json({
    ok: true,
    syncedAt: snapshot.syncedAt,
    manifestPageId: snapshot.manifestPageId,
    entries: snapshot.entries,
  })
}

function parsePayload(rawBody: string): Payload | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const changedPageId = (parsed as { changedPageId?: unknown }).changedPageId
    const reason = (parsed as { reason?: unknown }).reason
    return {
      changedPageId: typeof changedPageId === "string" ? changedPageId : undefined,
      reason: typeof reason === "string" ? reason : undefined,
    }
  } catch {
    return null
  }
}
