import type { ChatbotConversation, ChatbotMessage, ConversationState, JobContext } from "@/lib/chatbot/domain"

export function buildConversationState(input: {
  conversation: ChatbotConversation
  userMessage: ChatbotMessage
  inputConversationState?: Partial<ConversationState>
  activeChoiceConversationState?: Partial<ConversationState>
  jobContext: JobContext
  durationStatePatch?: Partial<ConversationState>
}): ConversationState {
  const userTurnCount =
    input.conversation.messages.filter((message) => message.role === "user").length +
    (input.userMessage.role === "user" ? 1 : 0)
  const stored = input.conversation.context.conversationState ?? {}
  const inputState = input.inputConversationState ?? {}
  const activeChoiceState = input.activeChoiceConversationState ?? {}
  const durationState = input.durationStatePatch ?? {}

  const state: ConversationState = {
    hasFinalMedium: false,
    hasJobKind: false,
    hasAdditionalWork: false,
    hasDocumentaryAttachments: false,
    hasWorkSite: false,
    hasReferenceUrls: false,
    hasContactEmail: false,
    hasDesiredSchedule: false,
    turnCount: userTurnCount,
    ...stored,
    ...inputState,
    ...activeChoiceState,
    ...durationState,
  }
  const otherChoiceComments = {
    ...(stored.otherChoiceComments ?? {}),
    ...(inputState.otherChoiceComments ?? {}),
    ...(activeChoiceState.otherChoiceComments ?? {}),
  }

  return {
    ...state,
    ...(Object.keys(otherChoiceComments).length > 0 ? { otherChoiceComments } : {}),
    ...(input.jobContext.finalMedium !== "other" ? { hasFinalMedium: true } : {}),
    ...(input.jobContext.jobKind ? { hasJobKind: true } : {}),
    ...(typeof input.jobContext.projectLengthMinutes === "number" ? { hasProjectLength: true } : {}),
  }
}
