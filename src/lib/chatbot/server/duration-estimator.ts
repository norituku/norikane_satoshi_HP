import type {
  DocumentaryAttachment,
  FinalMedium,
  JobContext,
  JobKind,
  WorkflowEstimate,
  WorkSite,
} from "@/lib/chatbot/domain"
import {
  additionalWorkDurationRules,
  strictDeliveryMediums,
  workflowDurationJobKindMap,
  workSiteDurationRules,
} from "@/lib/chatbot/knowledge/workflow-duration"
import {
  getWorkflowDurationPresetsFromSnapshot,
  type ChatbotKnowledgeSnapshot,
} from "@/lib/chatbot/server/notion-knowledge-sync"

type DurationRange = {
  minDays: number
  maxDays: number
}

type BaseDurationRange = DurationRange & {
  note?: string
}

type AdditionalWorkDurationRange = DurationRange & {
  heavyRetouch: boolean
}

type WorkSiteDurationRange = DurationRange & {
  note?: string
  canSkipFinalCheck?: boolean
}

type DurationEstimatorOptions = {
  knowledgeSnapshot?: ChatbotKnowledgeSnapshot | null
}

export type { JobKind }

export function estimateBaseDuration(
  jobKind: JobKind,
  lengthMinutes?: number,
  options: DurationEstimatorOptions = {},
): BaseDurationRange {
  const jobKindRule = workflowDurationJobKindMap[jobKind]
  const workflowDurationPresets = getWorkflowDurationPresetsFromSnapshot(options.knowledgeSnapshot)
  const preset = workflowDurationPresets.find((item) => item.id === jobKindRule.presetId)

  if (!preset) {
    throw new Error(`Unknown workflow duration preset: ${jobKindRule.presetId}`)
  }

  return {
    minDays: preset.minDays,
    maxDays: preset.maxDays,
    ...(lengthMinutes !== undefined &&
    jobKindRule.baselineMinutes !== undefined &&
    lengthMinutes !== jobKindRule.baselineMinutes
      ? { note: "尺が基準と異なるため要相談" }
      : {}),
  }
}

export function applyAdditionalWorkAdjustment(
  base: DurationRange,
  jobContext: JobContext,
): AdditionalWorkDurationRange {
  if (jobContext.heavyRetouch) {
    return {
      ...base,
      heavyRetouch: true,
    }
  }

  const retouchDays = hasRetouchWork(jobContext)
    ? (jobContext.retouchCutCount ?? additionalWorkDurationRules.noAdditionalDays) /
      additionalWorkDurationRules.retouchCutsPerDay
    : additionalWorkDurationRules.noAdditionalDays
  const documentaryDays =
    getDocumentaryAttachmentCount(jobContext.documentaryAttachment) *
    additionalWorkDurationRules.documentaryAttachmentDaysPerVideo
  const strictDeliveryDays = isStrictDeliveryMedium(jobContext.finalMedium)
    ? additionalWorkDurationRules.strictMediumAdditionalDays
    : additionalWorkDurationRules.noAdditionalDays
  const addedDays = retouchDays + documentaryDays + strictDeliveryDays

  return {
    minDays: base.minDays + addedDays,
    maxDays: base.maxDays + addedDays,
    heavyRetouch: false,
  }
}

export function applyWorkSiteAdjustment(
  adjusted: DurationRange,
  workSite: WorkSite,
): WorkSiteDurationRange {
  const rule = workSiteDurationRules[workSite]

  return {
    minDays: adjusted.minDays + rule.travelMinDays,
    maxDays: adjusted.maxDays + rule.travelMaxDays,
    ...(workSite === "remote-grading" ? { note: "案件ごと上乗せ議論" } : {}),
    ...(rule.canSkipFinalCheckDayWithLocalHandoff ? { canSkipFinalCheck: true } : {}),
  }
}

export function estimateWorkflow(
  jobContext: JobContext,
  options: DurationEstimatorOptions = {},
): WorkflowEstimate {
  if (!jobContext.jobKind) {
    throw new Error("jobKind is required to estimate chatbot workflow duration")
  }

  const base = estimateBaseDuration(jobContext.jobKind, jobContext.projectLengthMinutes, options)
  const adjusted = applyAdditionalWorkAdjustment(base, jobContext)
  const workSiteAdjusted = applyWorkSiteAdjustment(adjusted, jobContext.workSite)
  const riskFlags: WorkflowEstimate["riskFlags"] = []

  if (adjusted.heavyRetouch) {
    riskFlags.push(additionalWorkDurationRules.heavyRetouchFlag)
  }
  if (isStrictDeliveryMedium(jobContext.finalMedium)) {
    riskFlags.push("strict-delivery")
  }
  if (workSiteAdjusted.canSkipFinalCheck) {
    riskFlags.push("on-site-transfer")
  }

  return {
    stages: [
      {
        stage: "attended",
        minDays: workSiteAdjusted.minDays,
        maxDays: workSiteAdjusted.maxDays,
        note: [base.note, workSiteAdjusted.note].filter(Boolean).join(" / ") || undefined,
      },
    ],
    totalMinDays: workSiteAdjusted.minDays,
    totalMaxDays: workSiteAdjusted.maxDays,
    riskFlags,
    ...(adjusted.heavyRetouch ? { requiresDirectContact: true } : {}),
  }
}

function hasRetouchWork(jobContext: JobContext): boolean {
  return Boolean(
    jobContext.additionalWork?.some((item) => item === "retouch" || item === "skin-retouch"),
  )
}

function getDocumentaryAttachmentCount(attachment: DocumentaryAttachment): number {
  if (attachment.kind === "none") return additionalWorkDurationRules.noAdditionalDays
  return attachment.count ?? additionalWorkDurationRules.defaultDocumentaryAttachmentCount
}

function isStrictDeliveryMedium(finalMedium: FinalMedium): boolean {
  return (strictDeliveryMediums as readonly FinalMedium[]).includes(finalMedium)
}
