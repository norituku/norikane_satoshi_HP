type BookingColor = "accent" | "muted" | "transparent"

type BookingLike = {
  status: string
  hasAttendance?: boolean
}

function getBookingColor(booking: BookingLike): BookingColor {
  if (booking.status === "CANCELLED") return "transparent"
  if (booking.status === "CONFIRMED" || booking.status === "TENTATIVE") return "accent"
  return "muted"
}

export function getBookingCSSColor(booking: BookingLike): string {
  const colorMap: Record<BookingColor, string> = {
    accent: "var(--neu-accent)",
    muted: "var(--neu-shadow-dark)",
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
  className: "neu-raised-sm" | "neu-inset" | "neu-flat"
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
  const result: BookingBlockStyle = {
    backgroundColor: isCancelled ? "transparent" : "var(--neu-bg)",
    ...noBorder,
    label: isTentative ? "仮" : booking.hasAttendance ? "立会い" : null,
    className: isTentative || options?.isActualDisplayed ? "neu-inset" : "neu-raised-sm",
  }

  if (isCancelled) {
    result.className = "neu-flat"
  }

  if (options?.isActualPending) {
    result.opacity = "0.4"
  }

  return result
}
