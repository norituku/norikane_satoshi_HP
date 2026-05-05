"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { BookingCalendar } from "@/components/booking/booking-calendar"
import { BookingConfirm } from "@/components/booking/booking-confirm"
import { BookingDone } from "@/components/booking/booking-done"
import { BookingFooter } from "@/components/booking/booking-footer"
import { BookingForm } from "@/components/booking/booking-form"
import { BookingProgressBar } from "@/components/booking/booking-progress-bar"
import { mapErrorCodeToJa } from "@/lib/booking/api-schema"
import { clearDraft, hasDraft, loadDraft, saveDraft } from "@/lib/booking/draft-storage"
import {
  createDefaultBookingFormData,
  type BookingFormData,
  type BookingSlot,
  type BookingStep,
} from "@/lib/booking/form-schema"

type BookingSectionProps = {
  userId: string
  userEmail: string
}

const steps: BookingStep[] = ["calendar", "form", "confirm", "done"]

function getStepFromUrl(): BookingStep {
  if (typeof window === "undefined") return "calendar"

  const value = new URLSearchParams(window.location.search).get("step")
  return steps.includes(value as BookingStep) ? (value as BookingStep) : "calendar"
}

function getNextStep(step: BookingStep): BookingStep {
  if (step === "calendar") return "form"
  if (step === "form") return "confirm"
  if (step === "confirm") return "done"
  return "done"
}

function getPreviousStep(step: BookingStep): BookingStep {
  if (step === "done") return "confirm"
  if (step === "confirm") return "form"
  if (step === "form") return "calendar"
  return "calendar"
}

function hasDraftContent(formData: BookingFormData, selectedSlot: BookingSlot | null, step: BookingStep): boolean {
  return (
    step !== "calendar" ||
    selectedSlot !== null ||
    formData.projectTitle.trim() !== "" ||
    formData.contactName.trim() !== "" ||
    formData.workScopes.length > 0 ||
    formData.memo.trim() !== ""
  )
}

function pushStep(step: BookingStep): void {
  const url = new URL(window.location.href)
  url.search = `?step=${step}`
  window.history.pushState({ step }, "", url.toString())
}

export function BookingSection({ userId, userEmail }: BookingSectionProps) {
  const defaultFormData = useMemo(() => createDefaultBookingFormData(userEmail), [userEmail])
  const [step, setStep] = useState<BookingStep>("calendar")
  const [formData, setFormData] = useState<BookingFormData>(defaultFormData)
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [formValid, setFormValid] = useState(false)
  const [localDraftAvailable, setLocalDraftAvailable] = useState(false)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const applyDraft = useCallback(
    (draft: ReturnType<typeof loadDraft>, restoreStep = false) => {
      if (!draft) return
      setFormData({
        ...defaultFormData,
        ...draft.formData,
        sessionEmail: userEmail,
      })
      setSelectedSlot(draft.selectedSlot)
      if (restoreStep && draft.step !== "done") setStep(draft.step)
    },
    [defaultFormData, userEmail],
  )

  useEffect(() => {
    const initialStep = getStepFromUrl()
    setStep(initialStep)

    const sessionDraft = loadDraft(userId, "session")
    if (sessionDraft) applyDraft(sessionDraft)
    setLocalDraftAvailable(!sessionDraft && hasDraft(userId))
    setDraftHydrated(true)

    const handlePopState = () => setStep(getStepFromUrl())
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [applyDraft, userId])

  useEffect(() => {
    if (!draftHydrated) return

    if (step === "done") {
      clearDraft(userId)
      setLocalDraftAvailable(false)
      return
    }

    if (!hasDraftContent(formData, selectedSlot, step)) return

    const timeout = window.setTimeout(() => {
      saveDraft(userId, { formData, selectedSlot, step })
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [draftHydrated, formData, selectedSlot, step, userId])

  const goToStep = useCallback((nextStep: BookingStep) => {
    setSubmitError(null)
    setStep(nextStep)
    pushStep(nextStep)
  }, [])

  const handleContinueDraft = () => {
    applyDraft(loadDraft(userId, "local"), true)
    setLocalDraftAvailable(false)
  }

  const handleDiscardDraft = () => {
    clearDraft(userId)
    setFormData(defaultFormData)
    setSelectedSlot(null)
    setLocalDraftAvailable(false)
    goToStep("calendar")
  }

  const handleSlotSelect = (slot: { start: Date; end: Date }) => {
    setSubmitError(null)
    setSelectedSlot({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
    })
  }

  const handleReset = () => {
    clearDraft(userId)
    setFormData(defaultFormData)
    setSelectedSlot(null)
    setFormValid(false)
    setSubmitError(null)
    goToStep("calendar")
  }

  const handleSubmitBooking = async () => {
    if (!selectedSlot || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          selectedSlot,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (response.ok) {
        clearDraft(userId)
        setLocalDraftAvailable(false)
        goToStep("done")
        return
      }

      setSubmitError(mapErrorCodeToJa(payload.error))
    } catch {
      setSubmitError(mapErrorCodeToJa("unknown"))
    } finally {
      setSubmitting(false)
    }
  }

  const canGoNext =
    (step === "calendar" && selectedSlot !== null) ||
    (step === "form" && selectedSlot !== null && formValid) ||
    step === "confirm"

  const body = (
    <>
      <div className={step === "calendar" ? "booking-section__pane" : "booking-section__pane booking-section__pane--hidden"}>
        <BookingCalendar onSlotSelect={handleSlotSelect} />
      </div>
      <div className={step === "form" ? "booking-section__pane" : "booking-section__pane booking-section__pane--hidden"}>
        <BookingForm
          formData={formData}
          selectedSlot={selectedSlot}
          onChange={setFormData}
          onValidityChange={setFormValid}
          onReselectDate={() => goToStep("calendar")}
        />
      </div>
      <div className={step === "confirm" ? "booking-section__pane" : "booking-section__pane booking-section__pane--hidden"}>
        <BookingConfirm
          formData={formData}
          selectedSlot={selectedSlot}
          submitError={submitError}
          onDismissSubmitError={() => setSubmitError(null)}
          onReselectDate={() => goToStep("calendar")}
        />
      </div>
      <div className={step === "done" ? "booking-section__pane" : "booking-section__pane booking-section__pane--hidden"}>
        <BookingDone selectedSlot={selectedSlot} />
      </div>
    </>
  )

  return (
    <div className="booking-section">
      <BookingProgressBar currentStep={step} />
      {localDraftAvailable && step !== "done" ? (
        <div className="booking-section__draft-banner glass-inset">
          <span>入力途中の予約申込があります（24 時間以内）</span>
          <div className="booking-section__draft-actions">
            <button className="booking-section__text-button" type="button" onClick={handleContinueDraft}>
              続きから入力する
            </button>
            <button className="booking-section__text-button" type="button" onClick={handleDiscardDraft}>
              破棄する
            </button>
          </div>
        </div>
      ) : null}
      <div className="booking-section__body">{body}</div>
      <BookingFooter
        step={step}
        canGoNext={canGoNext}
        submitting={step === "confirm" && submitting}
        onBack={() => goToStep(getPreviousStep(step))}
        onNext={() => {
          if (step === "confirm") {
            void handleSubmitBooking()
            return
          }
          goToStep(getNextStep(step))
        }}
        onReset={handleReset}
      />
    </div>
  )
}
