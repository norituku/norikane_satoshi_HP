import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { createHmac, timingSafeEqual } from "node:crypto"

const SIGNATURE_HEADER = "x-cc-notion-signature"

type Payload = {
  slug: string
  reason?: string
}

function verifySignature(rawBody: string, header: string, secret: string): boolean {
  const prefix = "sha256="
  if (!header.startsWith(prefix)) return false
  const hex = header.slice(prefix.length).trim()
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const a = Buffer.from(hex, "hex")
  const b = Buffer.from(expected, "hex")
  if (a.length === 0 || a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function parsePayload(raw: string): Payload | null {
  try {
    const obj = JSON.parse(raw) as unknown
    if (!obj || typeof obj !== "object") return null
    const slug = (obj as { slug?: unknown }).slug
    const reason = (obj as { reason?: unknown }).reason
    if (typeof slug !== "string" || !slug) return null
    if (!/^[a-z0-9-]+$/.test(slug)) return null
    return {
      slug,
      reason: typeof reason === "string" ? reason : undefined,
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "server misconfigured: REVALIDATE_SECRET not set" },
      { status: 500 }
    )
  }

  const rawBody = await request.text()
  const header = request.headers.get(SIGNATURE_HEADER) ?? ""
  if (!verifySignature(rawBody, header, secret)) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 401 }
    )
  }

  const payload = parsePayload(rawBody)
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "invalid payload" },
      { status: 400 }
    )
  }

  revalidatePath(`/notes/${payload.slug}`, "page")
  revalidateTag("notes", "max")
  revalidatePath("/", "page")

  return NextResponse.json({
    ok: true,
    revalidated: {
      path: `/notes/${payload.slug}`,
      tag: "notes",
      home: true,
    },
    reason: payload.reason ?? null,
  })
}
