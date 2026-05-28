import type { TierAttemptEvent } from "@/lib/chatbot/server/llm-orchestrator"

export type ChatbotTierAttemptLogEvent = {
  event: "chatbot_llm_tier_attempt"
  tier: TierAttemptEvent["tier"]
  phase: TierAttemptEvent["phase"]
  outcome: TierAttemptEvent["outcome"]
  latencyMs: number
  error?: {
    name: string
    code?: string
    message: string
  }
}

export function formatChatbotTierAttemptLogEvent(event: TierAttemptEvent): ChatbotTierAttemptLogEvent {
  return {
    event: "chatbot_llm_tier_attempt",
    tier: event.tier,
    phase: event.phase,
    outcome: event.outcome,
    latencyMs: event.latencyMs,
    error: event.error
      ? {
          name: event.error.name,
          code: "code" in event.error ? String(event.error.code) : undefined,
          message: event.error.message,
        }
      : undefined,
  }
}

export function createLocalChatbotTierAttemptLogger(): ((event: TierAttemptEvent) => void) | undefined {
  if (!shouldLogChatbotTierAttempts()) return undefined

  return (event) => {
    console.info(JSON.stringify(formatChatbotTierAttemptLogEvent(event)))
  }
}

function shouldLogChatbotTierAttempts(): boolean {
  if (process.env.CHATBOT_TIER_ATTEMPT_LOGS === "0") return false
  if (process.env.CHATBOT_TIER_ATTEMPT_LOGS === "1") return true
  if (process.env.NODE_ENV === "test") return false

  return process.env.VERCEL_ENV !== "production"
}
