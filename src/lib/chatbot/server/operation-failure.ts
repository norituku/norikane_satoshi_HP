import { NextResponse } from "next/server"

type ChatbotOperation = "message" | "submit-inquiry" | "create-booking-from-chat"

type ChatbotFailureStage =
  | "request-parse"
  | "server-handler"
  | "conversation-load"
  | "conversation-save"
  | "tier-orchestrator"
  | "booking-save"
  | "notification-send"

type ChatbotOperationFailureInput = {
  operation: ChatbotOperation
  stage: ChatbotFailureStage
  error: unknown
  status?: number
  requestSummary?: Record<string, unknown>
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause instanceof Error
        ? { name: error.cause.name, message: error.cause.message, stack: error.cause.stack }
        : undefined,
    }
  }

  return { name: typeof error, message: String(error) }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

export function logChatbotOperationFailure(input: ChatbotOperationFailureInput): void {
  const status = input.status ?? 500
  console.error(
    "[CHATBOT_OPERATION_FAILURE]",
    JSON.stringify({
      event: "chatbot_operation_failure",
      operation: input.operation,
      stage: input.stage,
      status,
      retryable: isRetryableStatus(status),
      fallback: "tier4-inquiry-form",
      requestSummary: input.requestSummary ?? {},
      error: serializeError(input.error),
    }),
  )
}

export function respondChatbotOperationFailure(input: ChatbotOperationFailureInput): NextResponse {
  const status = input.status ?? 500
  logChatbotOperationFailure({ ...input, status })
  return NextResponse.json(
    {
      error: "chatbot_operation_failed",
      operation: input.operation,
      failure: {
        stage: input.stage,
        retryable: isRetryableStatus(status),
        fallback: "tier4-inquiry-form",
      },
    },
    { status },
  )
}
