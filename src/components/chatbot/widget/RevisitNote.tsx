"use client"

import {
  CHATBOT_CONVERSATION_CONTENT_CLASS_NAME,
  CHATBOT_CONVERSATION_CONTENT_STYLE,
} from "./conversationTypography"

type RevisitNoteProps = {
  customerName?: string
}

export function RevisitNote({ customerName }: RevisitNoteProps) {
  const displayName = customerName?.trim() || "同じアカウント"

  return (
    <aside className="glass-inset p-4 text-sm leading-relaxed text-hp" aria-label="再訪案内">
      <p
        className={CHATBOT_CONVERSATION_CONTENT_CLASS_NAME}
        style={CHATBOT_CONVERSATION_CONTENT_STYLE}
      >
        {displayName}で次回も続きから確認できます。
      </p>
      <p
        className={`${CHATBOT_CONVERSATION_CONTENT_CLASS_NAME} mt-1 text-xs text-hp-muted`}
        style={CHATBOT_CONVERSATION_CONTENT_STYLE}
      >
        次回も同じアカウントでカレンダーが見えますよ。
      </p>
    </aside>
  )
}
