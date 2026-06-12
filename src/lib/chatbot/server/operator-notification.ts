import type { ChatbotMessage, ConversationState, JobContext } from "@/lib/chatbot/domain"
import { formatConsultationSummary } from "@/lib/chatbot/domain/consultation-summary"
import { getResendClient } from "@/lib/booking/server/email"

export const CHATBOT_OPERATOR_NOTIFICATION_EMAIL = "norikane.satoshi@gmail.com"
export const OPERATOR_NOTIFICATION_SENT_MARKER = "[chatbot-operator-notification:sent]"

const shopName = "のりかね映像設計室"
const siteUrl = "https://norikane.studio"
const defaultFromEmail = "noreply@norikane.studio"

export type OperatorNotificationResult =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; reason: "missing-resend-api-key" }
  | { status: "failed"; reason: "send-failed" }

export type OperatorNotificationInput = {
  trigger: "chat-completed" | "inquiry-form" | "booking-submitted"
  jobContext?: Partial<JobContext>
  conversationState?: Partial<ConversationState>
  fallback?: Parameters<typeof formatConsultationSummary>[0]["fallback"]
  freeText?: string
}

export function hasSentOperatorNotification(messages: ChatbotMessage[]): boolean {
  return messages.some((message) => message.role === "system" && message.content.includes(OPERATOR_NOTIFICATION_SENT_MARKER))
}

export async function sendOperatorConsultationNotification(
  input: OperatorNotificationInput,
): Promise<OperatorNotificationResult> {
  const resend = getResendClient()
  if (!resend) {
    console.warn(`[chatbot operator email skipped] to=${CHATBOT_OPERATOR_NOTIFICATION_EMAIL}`)
    return { status: "skipped", reason: "missing-resend-api-key" }
  }

  const lines = buildOperatorNotificationLines(input)

  try {
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to: CHATBOT_OPERATOR_NOTIFICATION_EMAIL,
      replyTo: input.conversationState?.contactEmail ?? input.fallback?.contactEmail,
      subject: buildSubject(input),
      text: lines.join("\n"),
      html: paragraphsToHtml(lines),
    })

    if (error) {
      console.warn("[chatbot operator email failed]", error.message)
      return { status: "failed", reason: "send-failed" }
    }

    return { status: "sent", id: data?.id ?? null }
  } catch (error) {
    console.warn("[chatbot operator email failed]", error instanceof Error ? error.message : "send_failed")
    return { status: "failed", reason: "send-failed" }
  }
}

function buildOperatorNotificationLines(input: OperatorNotificationInput): string[] {
  const summary = formatConsultationSummary({
    jobContext: input.jobContext,
    conversationState: input.conversationState,
    fallback: input.fallback,
  })
  return [
    summary,
    ...(input.freeText?.trim() ? ["", "自由記述:", input.freeText.trim()] : []),
    "",
    shopName,
    siteUrl,
  ]
}

function buildSubject(input: OperatorNotificationInput): string {
  const triggerLabel = input.trigger === "booking-submitted"
    ? "予約送信"
    : input.trigger === "chat-completed" ? "相談完了" : "問い合わせフォーム"
  const contact = input.conversationState?.customerName ?? input.fallback?.customerName
  return `【チャットボット${triggerLabel}通知】${contact ? `${contact} 様` : "相談内容"}`
}

function getFrom(): string {
  const email = process.env.RESEND_FROM_EMAIL ?? defaultFromEmail
  return `${shopName} <${email}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function paragraphsToHtml(lines: string[]): string {
  return lines
    .map((line) => {
      if (line === "") return "<br>"
      return `<p>${escapeHtml(line).replaceAll("\n", "<br>")}</p>`
    })
    .join("")
}
