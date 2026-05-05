type BookingColor = "available" | "tentative" | "confirmed" | "unavailable" | "transparent"

type BookingLike = {
  status: string
  hasAttendance?: boolean
}

function getBookingColor(booking: BookingLike): BookingColor {
  if (booking.status === "CANCELLED") return "transparent"
  if (booking.status === "AVAILABLE") return "available"
  if (booking.status === "TENTATIVE") return "tentative"
  if (booking.status === "CONFIRMED") return "confirmed"
  return "unavailable"
}

export function getBookingCSSColor(booking: BookingLike): string {
  const colorMap: Record<BookingColor, string> = {
    available: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
    tentative: "color-mix(in srgb, var(--accent-secondary) 18%, transparent)",
    confirmed: "var(--accent-primary)",
    unavailable: "color-mix(in srgb, var(--text-primary) 18%, transparent)",
    transparent: "transparent",
  }
  return colorMap[getBookingColor(booking)]
}

export function getBookingColorLabel(booking: BookingLike): string {
  if (booking.status === "TENTATIVE") return "仮キープ"
  if (booking.status === "CANCELLED") return "キャンセル"
  if (booking.status === "CONFIRMED" && booking.hasAttendance) return "確定（立会いあり）"
  if (booking.status === "CONFIRMED") return "確定"
  if (booking.status === "HOLIDAY") return "休暇・NG"
  if (booking.status === "MEETING") return "社内"
  return "予定"
}

export interface BookingBlockStyle {
  backgroundColor: string
  borderLeft: string
  borderRight: string
  borderTop: string
  borderBottom: string
  label: string | null
  opacity?: string
  className: "glass-card-sm" | "glass-inset" | "glass-flat"
}

const noBorder = {
  borderLeft: "none",
  borderRight: "none",
  borderTop: "none",
  borderBottom: "none",
}

export function getBookingBlockStyle(
  booking: BookingLike,
  options?: { isActualDisplayed?: boolean; isActualPending?: boolean },
): BookingBlockStyle {
  const isTentative = booking.status === "TENTATIVE"
  const isCancelled = booking.status === "CANCELLED"
  const isUnavailable = getBookingColor(booking) === "unavailable"
  const result: BookingBlockStyle = {
    backgroundColor: isCancelled
      ? "transparent"
      : isUnavailable
        ? "color-mix(in srgb, var(--text-primary) 18%, transparent)"
        : getBookingCSSColor(booking),
    ...noBorder,
    label: isTentative ? "仮" : booking.hasAttendance ? "立会い" : null,
    className: isTentative || options?.isActualDisplayed ? "glass-inset" : "glass-card-sm",
  }

  if (isCancelled) {
    result.className = "glass-flat"
  }

  if (options?.isActualPending) {
    result.opacity = "0.4"
  }

  return result
}
