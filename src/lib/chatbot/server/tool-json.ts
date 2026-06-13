import type { ChatbotBookingPrefill } from "@/lib/chatbot/domain"

export type ChatbotJsonObject = Record<string, unknown>

export type ChatbotToolCallJson = {
  tool: string
  args: ChatbotJsonObject
}

type JsonObjectParseMode = "embedded-object" | "strict-object"

export function parseChatbotJsonObject(
  rawText: string,
  options: { mode: JsonObjectParseMode },
): ChatbotJsonObject | null {
  const jsonText =
    options.mode === "embedded-object"
      ? rawText.match(/\{[\s\S]*\}/u)?.[0]
      : exactJsonObjectText(rawText)

  if (!jsonText) return null

  try {
    const parsed = JSON.parse(jsonText) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as ChatbotJsonObject
  } catch {
    return null
  }
}

export function parseChatbotToolCallJson(rawText: string): ChatbotToolCallJson | null {
  const parsed = parseChatbotJsonObject(rawText, { mode: "strict-object" })
  if (!parsed) return null

  const keys = Object.keys(parsed)
  if (!keys.every((key) => key === "tool" || key === "args")) return null
  if (typeof parsed.tool !== "string") return null

  const tool = parsed.tool.trim()
  if (!tool || tool.length > 80) return null

  const args = parsed.args
  if (!args || typeof args !== "object" || Array.isArray(args)) return null

  return {
    tool,
    args: args as ChatbotJsonObject,
  }
}

export function parseBookingPrefillJson(rawText: string): ChatbotBookingPrefill {
  const parsed = parseChatbotJsonObject(rawText, { mode: "embedded-object" })
  if (!parsed) return {}

  return {
    ...stringField(parsed.contactName, 80, "contactName"),
    ...stringField(parsed.companyName, 120, "companyName"),
    ...emailField(parsed.contactEmail),
    ...dateField(parsed.dueDate),
  }
}

function exactJsonObjectText(rawText: string): string | null {
  const trimmed = rawText.trim()
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null
  if (/^(`{3,}|~{3,})/u.test(trimmed)) return null
  return trimmed
}

function stringField(
  value: unknown,
  maxLength: number,
  key: "contactName" | "companyName",
): Pick<ChatbotBookingPrefill, typeof key> | Record<string, never> {
  if (typeof value !== "string") return {}
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) return {}
  if (/^(?:未入力|未定|不明|なし|null|undefined)$/iu.test(trimmed)) return {}
  return { [key]: trimmed } as Pick<ChatbotBookingPrefill, typeof key>
}

function emailField(value: unknown): Pick<ChatbotBookingPrefill, "contactEmail"> | Record<string, never> {
  if (typeof value !== "string") return {}
  const trimmed = value.trim()
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu.test(trimmed)) return {}
  return { contactEmail: trimmed }
}

function dateField(value: unknown): Pick<ChatbotBookingPrefill, "dueDate"> | Record<string, never> {
  if (typeof value !== "string") return {}
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 40) return {}
  if (/^(?:未入力|未定|不明|なし|null|undefined)$/iu.test(trimmed)) return {}
  return { dueDate: trimmed }
}
