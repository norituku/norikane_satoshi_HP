import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const contactSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  body: z.string().min(10, "お問い合わせ内容は10文字以上で入力してください"),
  website: z.string().optional(),
})

// In-memory rate limiter (resets on server restart - adequate for personal site)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_MAX = 1 // 1 request per window

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count++
  return false
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "送信回数の上限に達しました。5分後にお試しください。" },
      { status: 429 }
    )
  }

  let data: unknown
  try {
    data = await request.json()
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 })
  }

  const result = contactSchema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "入力内容を確認してください"
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const { name, email, body, website } = result.data

  // Honeypot: if website field is filled, silently accept (bot)
  if (website) {
    return NextResponse.json({ ok: true })
  }

  // Phase 1: log to console. Email notification will be added later.
  console.log("[Contact Form Submission]", {
    name,
    email,
    body: body.substring(0, 200),
    ip,
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
