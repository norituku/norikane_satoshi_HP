"use client"

import { FormEvent, KeyboardEvent, useLayoutEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import {
  CHATBOT_CONVERSATION_CONTENT_CLASS_NAME,
  CHATBOT_CONVERSATION_CONTENT_STYLE,
} from "./conversationTypography"

type ChatInputProps = {
  onSubmit: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSubmit, disabled = false, placeholder = "案件内容を書く" }: ChatInputProps) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [text])

  const submitCurrentText = () => {
    const trimmedText = text.trim()
    if (disabled || !trimmedText) return false
    onSubmit(trimmedText)
    setText("")
    return true
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitCurrentText()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return
    event.preventDefault()
    submitCurrentText()
  }

  return (
    <form className="border-t border-[var(--glass-border)] p-4" onSubmit={handleSubmit}>
      <div className="glass-card-sm flex items-end gap-2 px-3 py-2 focus-within:border-[var(--accent-primary)]">
        <textarea
          ref={textareaRef}
          className={`${CHATBOT_CONVERSATION_CONTENT_CLASS_NAME} max-h-40 min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm leading-5 text-hp outline-none placeholder:text-hp-muted`}
          style={CHATBOT_CONVERSATION_CONTENT_STYLE}
          placeholder={placeholder}
          aria-label="相談内容"
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="submit"
          className="glass-btn flex h-9 w-9 shrink-0 items-center justify-center hover:shadow-[0_0_24px_rgba(139,127,255,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] disabled:opacity-50"
          aria-label="送信"
          disabled={disabled}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}
