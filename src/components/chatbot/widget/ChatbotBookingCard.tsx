"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"

import { DemoStage } from "@/components/chatbot/demo"
import { ChatbotLoginCard } from "@/components/chatbot/widget/ChatbotLoginCard"
import { mapErrorCodeToJa } from "@/lib/booking/domain/api-schema"
import { bookingOnboardingDemoScript } from "@/lib/chatbot/demo"
import type { CandidateWindow, WorkflowEstimate } from "@/lib/chatbot/domain/workflow-estimate"

type BookingResult = {
  bookingGroupId: string
  bookingIds?: string[]
}

type ChatbotBookingCardProps = {
  conversationId?: string
  estimate?: WorkflowEstimate
  candidates: CandidateWindow[]
  defaultProjectTitle?: string
  defaultContactName?: string
  defaultCompanyName?: string
  defaultDueDate?: string
  defaultMemo?: string
  showDemo?: boolean
  onBooked?: (result: BookingResult) => void
  onRequireLogin?: () => void
}

type ApiResponse = {
  error?: string
  bookingGroupId?: string
  bookingIds?: string[]
}

const API_PATH = "/api/chatbot/create-booking-from-chat"
const MAX_VISIBLE_CANDIDATES = 31
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

function parseApiResponse(value: unknown): ApiResponse {
  if (!value || typeof value !== "object") return {}
  return value as ApiResponse
}

function estimateText(estimate?: WorkflowEstimate): string | null {
  if (!estimate) return null
  return `工程目安 ${estimate.totalMinDays}〜${estimate.totalMaxDays} 日`
}

function formatCandidateDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(date)
}

function isMultiDayCandidate(start: Date, end: Date): boolean {
  return formatCandidateDate(start.toISOString()) !== formatCandidateDate(end.toISOString())
}

function jstDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : ""
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  return [
    String(jst.getUTCFullYear()),
    String(jst.getUTCMonth() + 1).padStart(2, "0"),
    String(jst.getUTCDate()).padStart(2, "0"),
  ].join("-")
}

function jstDateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day) - JST_OFFSET_MS)
}

function addJstDays(date: Date, days: number): Date {
  const key = jstDateKey(date)
  const [year, month, day] = key.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days) - JST_OFFSET_MS)
}

function formatCalendarDayLabel(key: string): string {
  const date = jstDateFromKey(key)
  if (Number.isNaN(date.getTime())) return key
  return new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(date)
}

function formatCalendarMonthLabel(key: string): string {
  const date = jstDateFromKey(key)
  if (Number.isNaN(date.getTime())) return "候補カレンダー"
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
  }).format(date)
}

function buildMonthKeys(candidates: CandidateWindow[]) {
  const firstKey = candidates[0] ? jstDateKey(candidates[0].start) : jstDateKey(new Date())
  const firstDate = jstDateFromKey(firstKey)
  const jst = new Date(firstDate.getTime() + JST_OFFSET_MS)
  const monthStart = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - JST_OFFSET_MS)
  const nextMonthStart = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + 1, 1) - JST_OFFSET_MS)
  const keys: string[] = []

  for (let cursor = monthStart; cursor.getTime() < nextMonthStart.getTime(); cursor = addJstDays(cursor, 1)) {
    keys.push(jstDateKey(cursor))
  }

  return keys
}

function buildCandidateCalendar(candidates: CandidateWindow[]) {
  const candidateByStartDate = new Map<string, { candidate: CandidateWindow; index: number }>()

  candidates.forEach((candidate, index) => {
    if (candidate.available === false) return
    candidateByStartDate.set(jstDateKey(candidate.start), { candidate, index })
  })

  return {
    monthLabel: formatCalendarMonthLabel(candidates[0]?.start ?? new Date().toISOString()),
    dayKeys: buildMonthKeys(candidates),
    candidateByStartDate,
  }
}

function selectedDateKeys(candidate: CandidateWindow | null) {
  if (!candidate) return new Set<string>()
  const start = new Date(candidate.start)
  const end = new Date(candidate.end)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return new Set<string>()
  const keys = new Set<string>()
  const last = isMultiDayCandidate(start, end) ? addJstDays(end, -1) : start

  for (let cursor = start; cursor.getTime() <= last.getTime(); cursor = addJstDays(cursor, 1)) {
    keys.add(jstDateKey(cursor))
  }

  return keys
}

export function ChatbotBookingCard({
  conversationId,
  estimate,
  candidates,
  defaultProjectTitle = "",
  defaultContactName = "",
  defaultCompanyName = "",
  defaultDueDate = "",
  defaultMemo = "",
  showDemo = false,
  onBooked,
  onRequireLogin,
}: ChatbotBookingCardProps) {
  const visibleCandidates = useMemo(() => candidates.slice(0, MAX_VISIBLE_CANDIDATES), [candidates])
  const candidateCalendar = useMemo(() => buildCandidateCalendar(visibleCandidates), [visibleCandidates])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(visibleCandidates.length === 1 ? 0 : null)
  const [projectTitle, setProjectTitle] = useState(defaultProjectTitle)
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [companyName, setCompanyName] = useState(defaultCompanyName)
  const [contactName, setContactName] = useState(defaultContactName)
  const [phone, setPhone] = useState("")
  const [memo, setMemo] = useState(defaultMemo)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loginRequired, setLoginRequired] = useState(false)
  const [booked, setBooked] = useState<BookingResult | null>(null)
  const projectTitleRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedSlot = selectedIndex === null ? null : visibleCandidates[selectedIndex] ?? null
  const selectedKeys = useMemo(() => selectedDateKeys(selectedSlot), [selectedSlot])
  const canSubmit = Boolean(selectedSlot && projectTitle.trim() && contactName.trim() && agreed && !submitting)

  useEffect(() => {
    const textarea = projectTitleRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [projectTitle])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || !selectedSlot) return

    setSubmitting(true)
    setErrorMessage(null)
    setLoginRequired(false)

    try {
      const response = await fetch(API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          projectTitle: projectTitle.trim(),
          contactName: contactName.trim(),
          companyName: companyName.trim(),
          phone: phone.trim(),
          dueDate,
          memo: memo.trim(),
          agreed,
          selectedSlot: {
            start: selectedSlot.start,
            end: selectedSlot.end,
          },
          workflowEstimate: estimate,
        }),
      })
      const payload = parseApiResponse(await response.json().catch(() => ({})))

      if (response.status === 401) {
        setLoginRequired(true)
        setErrorMessage("ログインして予約に進んでください")
        onRequireLogin?.()
        return
      }

      if (!response.ok) {
        setErrorMessage(mapErrorCodeToJa(payload.error ?? "unknown"))
        return
      }

      if (!payload.bookingGroupId) {
        setErrorMessage(mapErrorCodeToJa("unknown"))
        return
      }

      const result = {
        bookingGroupId: payload.bookingGroupId,
        bookingIds: payload.bookingIds,
      }
      setBooked(result)
      onBooked?.(result)
    } catch {
      setErrorMessage(mapErrorCodeToJa("unknown"))
    } finally {
      setSubmitting(false)
    }
  }

  const body = (
    <section className="glass-card space-y-5 p-5" aria-label="チャット内予約">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-hp-muted">Booking</p>
        <h2 className="mt-1 text-base font-semibold text-hp">候補日時から予約する</h2>
        <p className="mt-2 text-sm leading-relaxed text-hp-muted">
          素材搬入時期と納品希望日が決まっている場合は、候補を仮キープして予約内容を送信できます。
        </p>
        {estimateText(estimate) ? (
          <p className="mt-2 text-xs font-medium text-hp-muted">{estimateText(estimate)}</p>
        ) : null}
      </div>

      {booked ? (
        <div className="glass-inset space-y-2 p-4" role="status">
          <p className="text-sm font-semibold text-hp">予約を受け付けました</p>
          <p className="break-all text-xs text-hp-muted">予約番号: {booked.bookingGroupId}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-hp">仮キープ候補</legend>
          <div className="rounded-[16px] border border-white/55 bg-white/35 p-3" aria-label="仮キープ候補のカレンダー選択">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-hp">{candidateCalendar.monthLabel}</p>
              <p className="text-xs text-hp-muted">空き日だけ選択できます</p>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-hp-muted" aria-hidden="true">
              {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {candidateCalendar.dayKeys.map((dateKey) => {
                const slot = candidateCalendar.candidateByStartDate.get(dateKey)
                const selected = Boolean(slot && selectedIndex === slot.index)
                const inSelectedRange = selectedKeys.has(dateKey)

                if (!slot) {
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled
                      className={[
                        "min-h-11 rounded-[12px] border px-1.5 py-2 text-xs text-hp-muted",
                        inSelectedRange
                          ? "border-[var(--accent-primary)] bg-white/55 opacity-70"
                          : "border-white/45 bg-white/25 opacity-35",
                      ].join(" ")}
                      data-selected-range={inSelectedRange ? "true" : undefined}
                      aria-label={`${dateKey} 空きなし`}
                      aria-disabled="true"
                    >
                      {formatCalendarDayLabel(dateKey)}
                    </button>
                  )
                }

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={[
                      "min-h-11 rounded-[12px] border px-1.5 py-2 text-xs transition",
                      selected || inSelectedRange
                        ? "border-[var(--accent-primary)] bg-white/80 text-hp shadow-[0_0_24px_rgba(117,104,214,0.22)]"
                        : "border-white/65 bg-white/55 text-hp hover:bg-white/75",
                    ].join(" ")}
                    data-selected-range={inSelectedRange ? "true" : undefined}
                    aria-label={`${dateKey} 空き`}
                    aria-pressed={selected}
                    onClick={() => setSelectedIndex(slot.index)}
                  >
                    <span className="block font-semibold">{formatCalendarDayLabel(dateKey)}</span>
                    <span className="block text-[10px] text-hp-muted">空き</span>
                  </button>
                )
              })}
            </div>
            {selectedSlot ? (
              <p className="mt-3 text-xs leading-relaxed text-hp-muted" aria-live="polite">
                選択中: {selectedSlot.label}
              </p>
            ) : null}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-hp">
            案件名（必須）
            <textarea
              ref={projectTitleRef}
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
              className="glass-input mt-2 min-h-12 w-full resize-none overflow-hidden px-4 py-3 text-sm leading-relaxed"
              placeholder="作品名または案件名（イニシャル表記も可）"
              required
            />
          </label>
          <label className="block text-sm font-medium text-hp">
            納期（任意）
            <input
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="glass-input mt-2 w-full px-4 py-3 text-sm"
              placeholder="2026-06-30"
            />
          </label>
          <label className="block text-sm font-medium text-hp">
            会社名（任意）
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="glass-input mt-2 w-full px-4 py-3 text-sm"
              placeholder="会社名"
            />
          </label>
          <label className="block text-sm font-medium text-hp">
            担当者氏名（必須）
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="glass-input mt-2 w-full px-4 py-3 text-sm"
              placeholder="氏名"
              required
            />
          </label>
          <label className="block text-sm font-medium text-hp sm:col-span-2">
            電話番号（任意）
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="glass-input mt-2 w-full px-4 py-3 text-sm"
              placeholder="連絡可能な電話番号"
            />
          </label>
          <label className="block text-sm font-medium text-hp sm:col-span-2">
            補足ノート（任意）
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="glass-input mt-2 min-h-24 w-full px-4 py-3 text-sm"
              placeholder="入力欄に入りきらない共有事項"
            />
          </label>
        </div>

        <label className="glass-inset flex items-start gap-3 p-3 text-sm text-hp">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-1"
          />
          <span>利用規約と予約内容に同意します（必須）。</span>
        </label>

        {errorMessage ? (
          <p className="text-sm text-red-500" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {loginRequired ? <ChatbotLoginCard callbackUrl="/booking" /> : null}

        <button type="submit" disabled={!canSubmit} className="glass-btn w-full px-4 py-3 text-sm font-medium disabled:opacity-50">
          {submitting ? "送信中..." : "予約内容を送信"}
        </button>
      </form>
    </section>
  )

  if (!showDemo) return body

  return (
    <DemoStage script={bookingOnboardingDemoScript} cursorLabel="予約デモ" active autoPlay>
      {body}
    </DemoStage>
  )
}
