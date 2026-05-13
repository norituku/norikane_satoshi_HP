import type { BookingSlot } from "@/lib/booking/domain/form-schema"

type BookingDoneProps = {
  selectedSlots: BookingSlot[]
}

function formatSlot(slot: BookingSlot): string {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  return `${start.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

function formatSlots(slots: BookingSlot[]): string {
  if (slots.length === 0) return "日時未選択"
  return slots.map((slot) => formatSlot(slot)).join(" / ")
}

export function BookingDone({ selectedSlots }: BookingDoneProps) {
  return (
    <div className="booking-done glass-card-sm">
      <h2 className="booking-done__title">予約を受け付けました</h2>
      <p className="text-hp-muted">確認メールをお送りしました（PR-C で本実装予定）</p>
      <span className="glass-badge booking-done__slot">{formatSlots(selectedSlots)}</span>
    </div>
  )
}
