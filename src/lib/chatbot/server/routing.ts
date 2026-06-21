import type { ConversationState, JobContext, RoutingDecision } from "@/lib/chatbot/domain"
import {
  additionalWorkChoices,
  documentaryAttachmentChoices,
  finalMediumChoices,
  workSiteChoices,
} from "@/lib/chatbot/domain"
import {
  complexConversationTurnThreshold,
  settledConversationTurnThreshold,
  tightDeadlineThresholdDays,
  tightishDeadlineMaxDays,
} from "@/lib/chatbot/knowledge/workflow-duration"
import { directContactPolicyMessage } from "@/lib/chatbot/knowledge/forbidden-topics"
import { estimateWorkflow } from "@/lib/chatbot/server/duration-estimator"
import {
  decideLectureTrainingRouting,
  isLectureTrainingInquiry,
} from "@/lib/chatbot/server/lecture-training"
import type { ChatbotKnowledgeSnapshot } from "@/lib/chatbot/server/notion-knowledge-sync"

export type RoutingDecisionInput = {
  jobContext: JobContext
  conversationState: ConversationState
  latestUserMessage?: string
  knowledgeSnapshot?: ChatbotKnowledgeSnapshot | null
}

export function decideRoutingFallback(input: RoutingDecisionInput): RoutingDecision {
  const { jobContext, conversationState } = input
  if (isLectureTrainingInquiry(conversationState)) {
    return decideLectureTrainingRouting({ jobContext, conversationState })
  }

  const estimate = jobContext.jobKind
    ? estimateWorkflow(jobContext, { knowledgeSnapshot: input.knowledgeSnapshot })
    : undefined

  if (estimate?.requiresDirectContact) return directContact("heavy-retouch")

  if (
    conversationState.daysUntilStart !== undefined &&
    conversationState.daysUntilStart <= tightDeadlineThresholdDays
  ) {
    return directContact("tight-deadline")
  }

  if (
    conversationState.daysUntilStart !== undefined &&
    conversationState.daysUntilStart <= tightishDeadlineMaxDays
  ) {
    return {
      kind: "continue",
      nextQuestion: "契約書条件を確認するため 1 点伸ばさせて下さい",
    }
  }

  if (conversationState.vfxCgHeavy) return directContact("vfx-cg-heavy")
  if (conversationState.editingIncomplete) return directContact("raw-edit-included")
  if (conversationState.asksPricing) return directContact("pricing")
  if (conversationState.contractDecision) return directContact("contract-decision")
  if (conversationState.personalQuestion) return directContact("personal-life")
  if (conversationState.otherClientInformation) return directContact("other-client")
  if (conversationState.confidentialTechniqueQuestion || conversationState.privateMethodNameExposure) {
    return directContact("confidential-technique")
  }
  if (conversationState.lookDecomposerDetail) return directContact("plugin-detail")
  if (conversationState.technicalQuestion) return directContact("tech-question")
  if (conversationState.workReviewRequest) return directContact("review-request")
  if (conversationState.outOfScope) return directContact("out-of-scope")
  if (conversationState.turnCount >= complexConversationTurnThreshold) return directContact("complex")

  if (
    conversationState.hasContactEmail &&
    !conversationState.hasDesiredSchedule &&
    conversationState.turnCount >= settledConversationTurnThreshold
  ) {
    return {
      kind: "to-email",
      summary: {
        subject: "チャットボット相談",
        customerEmail: conversationState.contactEmail ?? "",
        ...(conversationState.customerName ? { customerName: conversationState.customerName } : {}),
        ...(conversationState.companyName ? { companyName: conversationState.companyName } : {}),
        jobContext,
        summaryText: buildSummaryText(jobContext, conversationState),
        openQuestions: buildOpenQuestions(conversationState),
      },
    }
  }

  return continueDecision(conversationState)
}

function directContact(reason: Extract<RoutingDecision, { kind: "to-direct-contact" }>["reason"]) {
  return {
    kind: "to-direct-contact",
    reason,
    requireEmail: true,
    suggestedMessage: directContactPolicyMessage,
  } as const
}

function continueDecision(conversationState: ConversationState): RoutingDecision {
  if (!conversationState.hasFinalMedium) {
    return {
      kind: "continue",
      nextQuestion: "最終媒体は何になりますか？",
      presentChoices: finalMediumChoices,
    }
  }

  if (!conversationState.hasJobKind) {
    return {
      kind: "continue",
      nextQuestion: "案件種別と尺を教えてください",
    }
  }

  if (!conversationState.hasAdditionalWork) {
    return {
      kind: "continue",
      nextQuestion: "カラグレ以外の追加作業はありますか？",
      presentChoices: additionalWorkChoices,
    }
  }

  if (!conversationState.hasDocumentaryAttachments) {
    return {
      kind: "continue",
      nextQuestion: "付随する映像はありますか？",
      presentChoices: documentaryAttachmentChoices,
    }
  }

  if (!conversationState.hasWorkSite) {
    return {
      kind: "continue",
      nextQuestion: "作業場所のご希望はありますか？",
      presentChoices: workSiteChoices,
    }
  }

  if (!conversationState.hasReferenceUrls) {
    return {
      kind: "continue",
      nextQuestion: "事前に把握しておきたい参考URLがあれば教えてください",
    }
  }

  if (!conversationState.hasDesiredSchedule) {
    return {
      kind: "continue",
      nextQuestion: "作業や立ち会いはいつごろできそうですか",
    }
  }

  return {
    kind: "continue",
    nextQuestion: "ご連絡先メールを教えてください",
  }
}

function buildSummaryText(jobContext: JobContext, conversationState: ConversationState): string {
  const jobKind = jobContext.jobKind ?? "案件種別未確認"
  const schedule = conversationState.hasDesiredSchedule ? "日程あり" : "日程未定"
  const detailSegments = buildChoiceDetailSegments(jobContext, conversationState)

  return [`${jobKind} / ${jobContext.finalMedium} / ${jobContext.workSite} / ${schedule}`, ...detailSegments].join(" / ")
}

function buildChoiceDetailSegments(jobContext: JobContext, conversationState: ConversationState): string[] {
  const otherComments = conversationState.otherChoiceComments ?? {}
  const segments: string[] = []

  if (jobContext.additionalWork?.length) {
    segments.push(
      `追加作業:${jobContext.additionalWork
        .map((item) => labelChoice(item, otherComments["additional-work"]))
        .join("・")}`,
    )
  }
  const attachment = labelDocumentaryAttachmentSummary(jobContext.documentaryAttachment)
  if (attachment) segments.push(`付随素材:${attachment}`)
  if (conversationState.productionOptions?.length) {
    segments.push(
      `制作オプション:${conversationState.productionOptions
        .map((item) => labelChoice(item, otherComments["production-options"]))
        .join("・")}`,
    )
  }

  return segments
}

function labelChoice(value: string, otherComment?: string): string {
  return value === "other" && otherComment ? `その他(${otherComment})` : value
}

function labelDocumentaryAttachmentSummary(value: JobContext["documentaryAttachment"] | undefined): string | undefined {
  if (!value || value.kind === "none") return undefined
  if (value.kind === "mixed") {
    return value.items
      .map((item) => (item.kind === "other" && item.note.trim() ? `その他(${item.note.trim()})` : item.kind))
      .join("・")
  }
  return value.kind === "other" && value.note.trim() ? `その他(${value.note.trim()})` : value.kind
}

function buildOpenQuestions(conversationState: ConversationState): string[] {
  return [
    conversationState.hasFinalMedium ? undefined : "最終媒体未確認",
    conversationState.hasJobKind ? undefined : "案件種別・尺未確認",
    conversationState.hasAdditionalWork ? undefined : "追加作業未確認",
    conversationState.hasDocumentaryAttachments ? undefined : "付随映像未確認",
    conversationState.hasWorkSite ? undefined : "作業場所未確認",
    conversationState.hasReferenceUrls ? undefined : "参考URL未確認",
    conversationState.hasDesiredSchedule ? undefined : "作業・立ち会い日程未確認",
  ].filter((item): item is string => Boolean(item))
}
