import { z } from "zod"

export type BookingStep = "calendar" | "form" | "confirm" | "done"

export type BookingSlot = {
  start: string
  end: string
}

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().email().safeParse(value).success, {
    message: "メールアドレスの形式で入力してください",
  })

export const workScopeOptions = [
  "カラーグレーディング",
  "オンライン編集",
  "試写立ち会い",
  "その他",
] as const

export const durationOptions = [
  { value: "1h", label: "1 時間" },
  { value: "half-day", label: "半日" },
  { value: "full-day", label: "1 日" },
  { value: "consult", label: "応相談" },
] as const

export const bookingFormSchema = z.object({
  bookingKind: z.enum(["confirmed", "tentative"], {
    message: "予約種別を選択してください",
  }),
  projectTitle: z.string().trim().min(1, "案件名を入力してください").max(100, "100 字以内で入力してください"),
  workScopes: z.array(z.enum(workScopeOptions)),
  otherWorkDetail: z.string().trim().max(300, "300 字以内で入力してください"),
  estimatedDuration: z.enum(["1h", "half-day", "full-day", "consult"]),
  dueDate: z.string(),
  companyName: z.string().trim().max(100, "100 字以内で入力してください"),
  contactName: z.string().trim().min(1, "担当者氏名を入力してください").max(100, "100 字以内で入力してください"),
  sessionEmail: z.string().email("認証済みメールアドレスを確認できません"),
  contactEmail: optionalEmail,
  phone: z.string().trim().max(50, "50 字以内で入力してください"),
  memo: z.string().trim().max(1000, "1000 字以内で入力してください"),
  agreed: z.boolean().refine((value) => value, {
    message: "規約への同意が必要です",
  }),
})

export type BookingFormData = z.infer<typeof bookingFormSchema>

export function createDefaultBookingFormData(sessionEmail: string): BookingFormData {
  return {
    bookingKind: "confirmed",
    projectTitle: "",
    workScopes: [],
    otherWorkDetail: "",
    estimatedDuration: "consult",
    dueDate: "",
    companyName: "",
    contactName: "",
    sessionEmail,
    contactEmail: "",
    phone: "",
    memo: "",
    agreed: false,
  }
}

export function getDurationLabel(value: BookingFormData["estimatedDuration"]): string {
  return durationOptions.find((option) => option.value === value)?.label ?? value
}
