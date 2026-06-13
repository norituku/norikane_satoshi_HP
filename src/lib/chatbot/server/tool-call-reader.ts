import type { ChatbotMessageRole, ConversationState, JobContext } from "@/lib/chatbot/domain"
import type { ChatbotLlmRequest } from "@/lib/chatbot/server/llm-client"
import {
  formatChatbotToolRegistryForPrompt,
  type ChatbotToolName,
} from "@/lib/chatbot/server/tool-dispatcher"

const phaseTwoToolNames: ReadonlyArray<ChatbotToolName> = [
  "create_booking",
  "show_booking_card",
  "get_estimate",
]

export function createChatbotToolCallReadRequest(input: {
  messages: ReadonlyArray<{ role: ChatbotMessageRole; content: string }>
  conversationState: ConversationState
  jobContext: JobContext
  latestUserMessage?: string
}): ChatbotLlmRequest {
  return {
    systemPrompt: [
      "これは外部ツール実行ではなく、アプリ内部dispatcher用の分類JSONを作るタスクです。",
      "あなた自身は予約作成・Notion更新・外部操作を実行しません。",
      "会話全体を読み取り、アプリ内部dispatcherへ渡せる状態ならJSONを1つ返してください。",
      "返す形式は {\"tool\":\"create_booking\",\"args\":{...}} または {\"tool\":\"show_booking_card\",\"args\":{...}} または {\"tool\":\"get_estimate\",\"args\":{...}} のJSONオブジェクト単体だけです。",
      "ツール不要または必須項目不足なら {\"tool\":\"none\",\"args\":{}} を返してください。",
      "説明文、Markdown、コードフェンス、複数JSONは禁止です。",
      "利用可能ツール:",
      formatChatbotToolRegistryForPrompt(undefined, { enabledToolNames: phaseTwoToolNames }),
    ].join("\n"),
    messages: input.messages,
    notionAiThread: {},
    forceFullPrompt: true,
    conversationState: input.conversationState,
    jobContext: input.jobContext,
    latestUserMessage: input.latestUserMessage,
    temperature: 0,
    maxOutputTokens: 260,
  }
}
