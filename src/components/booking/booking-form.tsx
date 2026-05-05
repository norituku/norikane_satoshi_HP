"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"

import {
  bookingFormSchema,
  durationOptions,
  type BookingFormData,
  type BookingSlot,
  workScopeOptions,
} from "@/lib/booking/form-schema"

type BookingFormProps = {
  formData: BookingFormData
  selectedSlot: BookingSlot | null
  onChange: (data: BookingFormData) => void
  onValidityChange: (isValid: boolean) => void
  onReselectDate: () => void
}

function formatSlot(slot: BookingSlot | null): string {
  if (!slot) return "日時未選択"

  const start = new Date(slot.start)
  const end = new Date(slot.end)
  return `${start.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

export function BookingForm({
  formData,
  selectedSlot,
  onChange,
  onValidityChange,
  onReselectDate,
}: BookingFormProps) {
  const {
    formState: { errors, isValid },
    register,
    watch,
  } = useForm<BookingFormData>({
    defaultValues: formData,
    mode: "onChange",
    resolver: zodResolver(bookingFormSchema),
    values: formData,
  })

  const bookingKind = watch("bookingKind")
  const workScopes = watch("workScopes")

  useEffect(() => {
    const subscription = watch((value) => onChange(value as BookingFormData))
    return () => subscription.unsubscribe()
  }, [onChange, watch])

  useEffect(() => {
    onValidityChange(isValid)
  }, [isValid, onValidityChange])

  return (
    <div className="booking-form">
      <div className="booking-form__slot-row">
        <span className="glass-badge booking-form__slot-pill">{formatSlot(selectedSlot)}</span>
        <button className="booking-form__text-link" type="button" onClick={onReselectDate}>
          日時を選び直す
        </button>
      </div>

      <fieldset className="booking-form__group">
        <legend className="booking-form__label">予約種別</legend>
        <label className="booking-choice glass-flat">
          <input type="radio" value="confirmed" {...register("bookingKind")} />
          <span>本予約</span>
        </label>
        <label className="booking-choice glass-flat">
          <input type="radio" value="tentative" {...register("bookingKind")} />
          <span>仮キープ</span>
        </label>
        {bookingKind === "tentative" ? (
          <p className="booking-form__callout glass-flat">
            仮キープは候補日の先抑え枠です。後から他の方の本予約が入った場合、3 日以内に本予約化または応答が必要で、無応答時は上書きされます
          </p>
        ) : null}
      </fieldset>

      <label className="booking-form__group">
        <span className="booking-form__label">案件名</span>
        <input className="glass-input booking-form__control" maxLength={100} {...register("projectTitle")} />
        {errors.projectTitle ? <span className="booking-form__error">{errors.projectTitle.message}</span> : null}
      </label>

      <fieldset className="booking-form__group">
        <legend className="booking-form__label">作業内容</legend>
        <div className="booking-form__checkbox-grid">
          {workScopeOptions.map((option) => (
            <label className="booking-choice glass-flat" key={option}>
              <input type="checkbox" value={option} {...register("workScopes")} />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {workScopes?.includes("その他") ? (
          <textarea className="glass-input booking-form__control" rows={3} {...register("otherWorkDetail")} />
        ) : null}
      </fieldset>

      <label className="booking-form__group">
        <span className="booking-form__label">想定作業時間</span>
        <select className="glass-input booking-form__control" {...register("estimatedDuration")}>
          {durationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="booking-form__grid">
        <label className="booking-form__group">
          <span className="booking-form__label">納期</span>
          <input className="glass-input booking-form__control" type="date" {...register("dueDate")} />
        </label>
        <label className="booking-form__group">
          <span className="booking-form__label">会社名</span>
          <input className="glass-input booking-form__control" {...register("companyName")} />
        </label>
      </div>

      <div className="booking-form__grid">
        <label className="booking-form__group">
          <span className="booking-form__label">担当者氏名</span>
          <input className="glass-input booking-form__control" {...register("contactName")} />
          {errors.contactName ? <span className="booking-form__error">{errors.contactName.message}</span> : null}
        </label>
        <label className="booking-form__group">
          <span className="booking-form__label">メールアドレス</span>
          <input className="glass-input booking-form__control booking-form__control--readonly" readOnly {...register("sessionEmail")} />
        </label>
      </div>

      <div className="booking-form__grid">
        <label className="booking-form__group">
          <span className="booking-form__label">連絡用メール</span>
          <input className="glass-input booking-form__control" type="email" {...register("contactEmail")} />
          {errors.contactEmail ? <span className="booking-form__error">{errors.contactEmail.message}</span> : null}
        </label>
        <label className="booking-form__group">
          <span className="booking-form__label">電話番号</span>
          <input className="glass-input booking-form__control" type="tel" {...register("phone")} />
        </label>
      </div>

      <label className="booking-form__group">
        <span className="booking-form__label">補足メモ</span>
        <textarea className="glass-input booking-form__control" maxLength={1000} rows={5} {...register("memo")} />
        {errors.memo ? <span className="booking-form__error">{errors.memo.message}</span> : null}
      </label>

      <label className="booking-choice booking-choice--terms glass-flat">
        <input type="checkbox" {...register("agreed")} />
        <span>
          <a href="#" onClick={(event) => event.preventDefault()}>
            利用規約
          </a>
          に同意します
        </span>
      </label>
      {errors.agreed ? <span className="booking-form__error">{errors.agreed.message}</span> : null}
    </div>
  )
}
