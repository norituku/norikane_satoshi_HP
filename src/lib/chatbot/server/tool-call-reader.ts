import type { ChatbotMessageRole, ConversationState, JobContext } from "@/lib/chatbot/domain"
import type { ChatbotLlmRequest } from "@/lib/chatbot/server/llm-client"
import { formatChatbotToolRegistryForPrompt } from "@/lib/chatbot/server/tool-dispatcher"

export function createChatbotToolCallReadRequest(input: {
  messages: ReadonlyArray<{ role: ChatbotMessageRole; content: string }>
  conversationState: ConversationState
  jobContext: JobContext
  latestUserMessage?: string
}): ChatbotLlmRequest {
  return {
    systemPrompt: [
      "会話全体を読み取り、必要な場合だけツール呼び出しJSONを1つ返してください。",
      "返す形式は {\"tool\":\"...\",\"args\":{...}} のJSONオブジェクト単体だけです。",
      "ツール不要または判断不能なら {\"tool\":\"none\",\"args\":{}} を返してください。",
      "説明文、Markdown、コードフェンス、複数JSONは禁止です。",
      "利用可能ツール:",
      formatChatbotToolRegistryForPrompt(),
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
