"use client"

import { useState } from "react"

import type { SurveyChoiceSet } from "@/lib/chatbot/domain/survey-choice"
import {
  CHATBOT_CONVERSATION_CONTENT_CLASS_NAME,
  CHATBOT_CONVERSATION_CONTENT_STYLE,
} from "./conversationTypography"

type ChoicePanelProps = {
  choiceSet: SurveyChoiceSet
  onSelect: (selectedIds: string[]) => void
  allowMultiple?: boolean
}

export function ChoicePanel({ choiceSet, onSelect, allowMultiple = false }: ChoicePanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleSelect = (choiceId: string) => {
    const nextSelectedIds = allowMultiple
      ? toggleMultipleChoice(selectedIds, choiceId)
      : [choiceId]

    setSelectedIds(nextSelectedIds)
    if (!allowMultiple) {
      onSelect(nextSelectedIds)
    }
  }

  const handleConfirm = () => {
    if (selectedIds.length === 0) return
    onSelect(selectedIds)
  }

  return (
    <section className="glass-inset space-y-3 p-4" aria-label={choiceSet.question}>
      <p
        className={`${CHATBOT_CONVERSATION_CONTENT_CLASS_NAME} text-sm text-hp`}
        style={CHATBOT_CONVERSATION_CONTENT_STYLE}
      >
        {choiceSet.question}
      </p>
      <div className="flex flex-wrap gap-2">
        {choiceSet.choices.map((choice) => {
          const isSelected = selectedIds.includes(choice.id)
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => handleSelect(choice.id)}
              className={[
                "glass-btn px-3 py-2 text-xs font-semibold",
                isSelected ? "border-[var(--accent-primary)] text-hp" : "text-hp-muted",
              ].join(" ")}
              aria-pressed={isSelected}
            >
              {choice.label}
            </button>
          )
        })}
      </div>
      {allowMultiple ? (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selectedIds.length === 0}
          className="glass-btn px-3 py-2 text-xs font-semibold text-hp disabled:cursor-not-allowed disabled:opacity-50"
        >
          選択を送信
        </button>
      ) : null}
    </section>
  )
}

function toggleMultipleChoice(selectedIds: string[], choiceId: string): string[] {
  if (choiceId === "none") return selectedIds.includes("none") ? [] : ["none"]

  const withoutNone = selectedIds.filter((id) => id !== "none")
  return withoutNone.includes(choiceId)
    ? withoutNone.filter((id) => id !== choiceId)
    : [...withoutNone, choiceId]
}
