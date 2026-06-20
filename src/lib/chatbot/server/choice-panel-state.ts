import type {
  ConversationState,
  DocumentaryAttachment,
  DocumentaryAttachmentItem,
  JobContext,
  SurveyChoice,
  SurveyChoiceSet,
  WorkSite,
} from "@/lib/chatbot/domain"

type ChoicePanelPatch = {
  choiceSetId: SurveyChoiceSet["id"]
  choiceId: SurveyChoice["id"]
  choiceIds: SurveyChoice["id"][]
  conversationState: Partial<ConversationState>
  jobContext: Partial<JobContext>
}

const choicePrefixPattern = /^\s*選択\s*[:：]\s*/u
const otherCommentPrefixPattern = /^\s*その他(?:コメント|の内容)?\s*[:：]\s*/u

export function applyActiveChoiceAnswer(input: {
  activeChoices?: SurveyChoiceSet
  message: string
}): ChoicePanelPatch | null {
  const choices = resolveChoices(input.activeChoices, input.message)
  const choice = choices[0]
  if (!input.activeChoices || !choice) return null
  const otherCommentPatch = toOtherChoiceCommentPatch(input.activeChoices, choices, input.message)

  switch (input.activeChoices.id) {
    case "final-medium":
      return {
        choiceSetId: input.activeChoices.id,
        choiceId: choice.id,
        choiceIds: [choice.id],
        conversationState: { hasFinalMedium: true, ...otherCommentPatch },
        jobContext: { finalMedium: choice.id as JobContext["finalMedium"] },
      }
    case "additional-work":
      if (choices.some((item) => item.id === "none")) {
        return {
          choiceSetId: input.activeChoices.id,
          choiceId: "none",
          choiceIds: ["none"],
          conversationState: { hasAdditionalWork: true },
          jobContext: { additionalWork: undefined },
        }
      }

      return {
        choiceSetId: input.activeChoices.id,
        choiceId: choice.id,
        choiceIds: choices.map((item) => item.id),
        conversationState: { hasAdditionalWork: true, ...otherCommentPatch },
        jobContext: { additionalWork: choices.map((item) => item.id as AdditionalWork) },
      }
    case "documentary-attachment":
      if (choices.some((item) => item.id === "none")) {
        return {
          choiceSetId: input.activeChoices.id,
          choiceId: "none",
          choiceIds: ["none"],
          conversationState: { hasDocumentaryAttachments: true },
          jobContext: { documentaryAttachment: { kind: "none" } },
        }
      }

      return {
        choiceSetId: input.activeChoices.id,
        choiceId: choice.id,
        choiceIds: choices.map((item) => item.id),
        conversationState: { hasDocumentaryAttachments: true, ...otherCommentPatch },
        jobContext: {
          documentaryAttachment: toDocumentaryAttachment(
            choices.map((item) => item.id),
            otherCommentPatch.otherChoiceComments?.[input.activeChoices.id],
          ),
        },
      }
    case "work-site":
      return {
        choiceSetId: input.activeChoices.id,
        choiceId: choice.id,
        choiceIds: [choice.id],
        conversationState: { hasWorkSite: true, ...otherCommentPatch },
        jobContext: { workSite: toWorkSite(choice.id) },
      }
    case "production-options":
      if (choices.some((item) => item.id === "none")) {
        return {
          choiceSetId: input.activeChoices.id,
          choiceId: "none",
          choiceIds: ["none"],
          conversationState: { hasProductionOptions: true, productionOptions: [] },
          jobContext: {},
        }
      }

      return {
        choiceSetId: input.activeChoices.id,
        choiceId: choice.id,
        choiceIds: choices.map((item) => item.id),
        conversationState: {
          hasProductionOptions: true,
          productionOptions: choices.map((item) => item.id as ProductionOption),
          ...otherCommentPatch,
        },
        jobContext: {},
      }
    default:
      return null
  }
}

export function isSatisfiedChoicePanel(
  choiceSet: SurveyChoiceSet | undefined,
  conversationState: ConversationState,
): boolean {
  switch (choiceSet?.id) {
    case "final-medium":
      return conversationState.hasFinalMedium
    case "additional-work":
      return conversationState.hasAdditionalWork
    case "documentary-attachment":
      return conversationState.hasDocumentaryAttachments
    case "work-site":
      return conversationState.hasWorkSite
    case "production-options":
      return Boolean(conversationState.hasProductionOptions)
    default:
      return false
  }
}

function resolveChoices(activeChoices: SurveyChoiceSet | undefined, message: string): SurveyChoice[] {
  if (!activeChoices) return []
  const selectedText = extractSelectedChoiceText(message)
  const normalizedMessages = selectedText
    .replace(choicePrefixPattern, "")
    .split(/[,、\n]/u)
    .map(normalizeChoiceText)
    .filter(Boolean)
  const messages = normalizedMessages.length > 0 ? normalizedMessages : [normalizeChoiceText(message)]

  return messages
    .map((normalizedMessage) =>
      activeChoices.choices.find((choice) => normalizeChoiceText(choice.id) === normalizedMessage) ??
      activeChoices.choices.find((choice) => normalizeChoiceText(choice.label) === normalizedMessage) ??
      null,
    )
    .filter((choice): choice is SurveyChoice => Boolean(choice))
}

type AdditionalWork = NonNullable<JobContext["additionalWork"]>[number]
type ProductionOption = NonNullable<ConversationState["productionOptions"]>[number]

function toDocumentaryAttachment(choiceIds: string[], otherComment?: string): DocumentaryAttachment {
  const attachments = choiceIds.map((choiceId) => toDocumentaryAttachmentItem(choiceId, otherComment))
  if (attachments.length === 1) return attachments[0]
  return { kind: "mixed", items: attachments }
}

function toDocumentaryAttachmentItem(choiceId: string, otherComment?: string): DocumentaryAttachmentItem {
  if (choiceId === "digest" || choiceId === "interview" || choiceId === "bonus" || choiceId === "making") {
    return { kind: choiceId, count: 1 }
  }
  return { kind: "other", count: 1, note: otherComment ?? "" }
}

function toWorkSite(choiceId: string): WorkSite {
  if (choiceId === "satoshi-studio" || choiceId === "remote-grading") return choiceId
  if (choiceId === "client-facility-attended" || choiceId === "on-site-post-production") return "on-site"
  return "remote-grading"
}

function normalizeChoiceText(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/gu, " ")
}

function extractSelectedChoiceText(message: string): string {
  return message
    .split(/\r?\n/u)
    .find((line) => choicePrefixPattern.test(line)) ?? message
}

function extractOtherComment(message: string): string | undefined {
  const comment = message
    .split(/\r?\n/u)
    .map((line) => line.replace(otherCommentPrefixPattern, "").trim())
    .find((line, index) => otherCommentPrefixPattern.test(message.split(/\r?\n/u)[index]) && line.length > 0)
  return comment
}

function toOtherChoiceCommentPatch(
  activeChoices: SurveyChoiceSet,
  choices: SurveyChoice[],
  message: string,
): Pick<ConversationState, "otherChoiceComments"> | Record<string, never> {
  if (!choices.some((choice) => choice.id === "other")) return {}
  const otherComment = extractOtherComment(message)
  if (!otherComment) return {}
  return { otherChoiceComments: { [activeChoices.id]: otherComment } }
}
