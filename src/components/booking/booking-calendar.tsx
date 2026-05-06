"use client"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin, {
  type DateClickArg,
  type EventResizeDoneArg,
} from "@fullcalendar/interaction"
import timeGridPlugin from "@fullcalendar/timegrid"
import jaLocale from "@fullcalendar/core/locales/ja"
import type {
  DateSelectArg,
  DayCellContentArg,
  DayCellMountArg,
  EventClickArg,
  EventDropArg,
  EventInput,
  EventMountArg,
  EventSourceFuncArg,
} from "@fullcalendar/core"
import { format } from "date-fns"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { mapErrorCodeToJa, type BookingConflictsResponse } from "@/lib/booking/api-schema"
import { getHolidayName } from "@/lib/booking/holidays"

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay"

type BusySlot = {
  start: string
  end: string
}

type BookingFromApi = {
  id: string
  start: string
  end: string
  title: string
  status: "CONFIRMED" | "TENTATIVE" | "PENDING_CONFIRMATION" | string
}

type FreeBusyResponse = {
  busy?: BusySlot[]
  bookings?: BookingFromApi[]
}

type BookingKind = "confirmed" | "tentative"

type BusyEventProps = {
  kind: "busy"
  label: string
  status?: "CONFIRMED" | "TENTATIVE" | "PENDING_CONFIRMATION"
  bookingId?: string
}

type DraftEventProps = {
  kind: "draft"
  draftId: string
  sourceKind?: BookingKind
}

type AnyEventProps = {
  kind?: "draft" | "busy"
  label?: string
  status?: "CONFIRMED" | "TENTATIVE" | "PENDING_CONFIRMATION"
  bookingId?: string
  draftId?: string
  sourceKind?: BookingKind
}

type DraftEvent = {
  id: string
  start: string
  end: string
  sourceKind?: BookingKind
}

const VIEW_OPTIONS: { label: string; value: CalendarView }[] = [
  { label: "月", value: "dayGridMonth" },
  { label: "週", value: "timeGridWeek" },
  { label: "日", value: "timeGridDay" },
]

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function hasTimePart(value: string): boolean {
  return /T\d{2}:\d{2}/.test(value)
}

function isFullDayBusySlot(slot: BusySlot): boolean {
  if (!hasTimePart(slot.start) || !hasTimePart(slot.end)) return true

  const start = new Date(slot.start)
  const end = new Date(slot.end)
  const startsAtMidnight = start.getHours() === 0 && start.getMinutes() === 0
  const endsAtMidnight = end.getHours() === 0 && end.getMinutes() === 0
  const durationMs = end.getTime() - start.getTime()

  return startsAtMidnight && endsAtMidnight && durationMs >= 24 * 60 * 60 * 1000
}

function getBusyLabel(slot: BusySlot): string {
  if (isFullDayBusySlot(slot)) return "終日"

  return `${format(new Date(slot.start), "HH:mm")}-${format(new Date(slot.end), "HH:mm")}`
}

function toBusyEvent(slot: BusySlot, view: CalendarView): EventInput {
  const isMonthView = view === "dayGridMonth"
  const allDay = isFullDayBusySlot(slot)
  const label = getBusyLabel(slot)
  const extendedProps: BusyEventProps = {
    kind: "busy",
    label,
  }

  return {
    id: `busy-${slot.start}-${slot.end}`,
    title: label,
    start: slot.start,
    end: slot.end,
    allDay,
    display: isMonthView ? "block" : "background",
    classNames: isMonthView
      ? ["booking-calendar__busy-pill"]
      : ["booking-calendar__busy"],
    editable: false,
    startEditable: false,
    durationEditable: false,
    extendedProps,
  }
}

function toBookingEvent(
  booking: BookingFromApi,
  view: CalendarView,
): EventInput {
  const isMonthView = view === "dayGridMonth"
  const label = `${format(new Date(booking.start), "HH:mm")}-${format(new Date(booking.end), "HH:mm")}`
  const status = (booking.status as BusyEventProps["status"]) ?? "CONFIRMED"
  const extendedProps: BusyEventProps = {
    kind: "busy",
    label,
    status,
    bookingId: booking.id,
  }
  return {
    id: `booking-${booking.id}`,
    title: label,
    start: booking.start,
    end: booking.end,
    allDay: false,
    display: isMonthView ? "block" : "auto",
    classNames: isMonthView
      ? ["booking-calendar__busy-pill"]
      : ["booking-calendar__busy"],
    editable: true,
    startEditable: true,
    durationEditable: false,
    extendedProps,
  }
}

function toDraftEventInput(
  draft: DraftEvent,
  isActive: boolean,
): EventInput {
  const extendedProps: DraftEventProps = {
    kind: "draft",
    draftId: draft.id,
    sourceKind: draft.sourceKind,
  }
  const classes = ["booking-calendar__draft"]
  if (isActive) classes.push("booking-calendar__draft--active")
  return {
    id: draft.id,
    title: "選択中",
    start: draft.start,
    end: draft.end,
    allDay: false,
    classNames: classes,
    editable: true,
    startEditable: true,
    durationEditable: true,
    extendedProps,
  }
}

async function fetchFreeBusy(arg: EventSourceFuncArg): Promise<FreeBusyResponse> {
  const params = new URLSearchParams({
    start: arg.startStr,
    end: arg.endStr,
  })
  const response = await fetch(`/api/calendar/free-busy?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`free-busy request failed: ${response.status}`)
  }

  return (await response.json()) as FreeBusyResponse
}

function makeDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

type BookingCalendarProps = {
  initialSlot?: { start: string; end: string } | null
  onCommit: (slot: { start: string; end: string }, kind: BookingKind) => void
}

export function BookingCalendar({ initialSlot, onCommit }: BookingCalendarProps) {
  const [view, setView] = useState<CalendarView>("dayGridMonth")
  const calendarRef = useRef<FullCalendar | null>(null)
  const selectedViewRef = useRef<CalendarView>("dayGridMonth")

  const initialDraft = useMemo<DraftEvent | null>(() => {
    if (!initialSlot) return null
    return { id: makeDraftId(), start: initialSlot.start, end: initialSlot.end }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [drafts, setDrafts] = useState<DraftEvent[]>(initialDraft ? [initialDraft] : [])
  const [activeDraftId, setActiveDraftId] = useState<string | null>(initialDraft?.id ?? null)

  const [warningModal, setWarningModal] = useState<
    { kind: BookingKind; message: string; slot: { start: string; end: string } } | null
  >(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [preflighting, setPreflighting] = useState(false)

  const activeDraft = useMemo(
    () => drafts.find((draft) => draft.id === activeDraftId) ?? null,
    [drafts, activeDraftId],
  )

  const changeCalendarView = useCallback((nextView: CalendarView, dateStr?: string) => {
    selectedViewRef.current = nextView
    setView(nextView)
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.changeView(nextView, dateStr)
      calendarApi.refetchEvents()
    }
  }, [])

  const fetchedRef = useRef<Map<string, FreeBusyResponse>>(new Map())
  const fetchEvents = useCallback(async (arg: EventSourceFuncArg): Promise<EventInput[]> => {
    const cacheKey = `${arg.startStr}|${arg.endStr}`
    let data = fetchedRef.current.get(cacheKey)
    if (!data) {
      data = await fetchFreeBusy(arg)
      fetchedRef.current.set(cacheKey, data)
    }
    const currentView = selectedViewRef.current
    const busyEvents = (data.busy ?? []).map((slot) => toBusyEvent(slot, currentView))
    const bookingEvents = (data.bookings ?? []).map((booking) =>
      toBookingEvent(booking, currentView),
    )
    return [...busyEvents, ...bookingEvents]
  }, [])

  const draftEventInputs = useMemo<EventInput[]>(
    () => drafts.map((draft) => toDraftEventInput(draft, draft.id === activeDraftId)),
    [drafts, activeDraftId],
  )

  const eventSources = useMemo(
    () => [
      {
        id: "remote-events",
        events: fetchEvents,
      },
    ],
    [fetchEvents],
  )

  const upsertDraft = useCallback((draft: DraftEvent, makeActive = true) => {
    setDrafts((prev) => {
      const existing = prev.findIndex((item) => item.id === draft.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = draft
        return next
      }
      return [...prev, draft]
    })
    if (makeActive) setActiveDraftId(draft.id)
    setActionError(null)
  }, [])

  const removeDraft = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== draftId))
    setActiveDraftId((current) => (current === draftId ? null : current))
  }, [])

  const cancelActiveDraft = useCallback(() => {
    if (!activeDraftId) return
    removeDraft(activeDraftId)
    setActionError(null)
  }, [activeDraftId, removeDraft])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && activeDraftId !== null) {
        cancelActiveDraft()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [activeDraftId, cancelActiveDraft])

  const handleSelect = useCallback((arg: DateSelectArg) => {
    const draft: DraftEvent = {
      id: makeDraftId(),
      start: arg.start.toISOString(),
      end: arg.end.toISOString(),
    }
    upsertDraft(draft, true)
    const calendarApi = calendarRef.current?.getApi()
    calendarApi?.unselect()
  }, [upsertDraft])

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      if (arg.view.type === "dayGridMonth") {
        changeCalendarView("timeGridDay", arg.dateStr)
        return
      }
      const start = new Date(arg.date)
      const end = new Date(start)
      end.setHours(end.getHours() + 1)
      const draft: DraftEvent = {
        id: makeDraftId(),
        start: start.toISOString(),
        end: end.toISOString(),
      }
      upsertDraft(draft, true)
    },
    [changeCalendarView, upsertDraft],
  )

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const props = arg.event.extendedProps as AnyEventProps
    if (props.kind === "draft" && props.draftId) {
      setActiveDraftId(props.draftId)
      setActionError(null)
    }
  }, [])

  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      const props = arg.event.extendedProps as AnyEventProps
      const isCopy = arg.jsEvent.altKey
      const newStart = arg.event.start
      const newEnd = arg.event.end
      if (!newStart || !newEnd) {
        arg.revert()
        return
      }

      if (props.kind === "draft" && props.draftId) {
        if (isCopy) {
          arg.revert()
          const newDraft: DraftEvent = {
            id: makeDraftId(),
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
            sourceKind: props.sourceKind,
          }
          upsertDraft(newDraft, true)
          return
        }
        setDrafts((prev) =>
          prev.map((draft) =>
            draft.id === props.draftId
              ? { ...draft, start: newStart.toISOString(), end: newEnd.toISOString() }
              : draft,
          ),
        )
        setActiveDraftId(props.draftId)
        setActionError(null)
        return
      }

      if (props.kind === "busy" && props.bookingId) {
        arg.revert()
        if (!isCopy) return
        const inferredKind: BookingKind | undefined =
          props.status === "TENTATIVE" ? "tentative" : "confirmed"
        const newDraft: DraftEvent = {
          id: makeDraftId(),
          start: newStart.toISOString(),
          end: newEnd.toISOString(),
          sourceKind: inferredKind,
        }
        upsertDraft(newDraft, true)
        return
      }

      arg.revert()
    },
    [upsertDraft],
  )

  const handleEventResize = useCallback((arg: EventResizeDoneArg) => {
    const props = arg.event.extendedProps as AnyEventProps
    const newStart = arg.event.start
    const newEnd = arg.event.end
    if (!newStart || !newEnd) {
      arg.revert()
      return
    }
    if (props.kind === "draft" && props.draftId) {
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === props.draftId
            ? { ...draft, start: newStart.toISOString(), end: newEnd.toISOString() }
            : draft,
        ),
      )
      setActiveDraftId(props.draftId)
      setActionError(null)
      return
    }
    arg.revert()
  }, [])

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) calendarApi.refetchEvents()
  }, [draftEventInputs])

  const dayCellClassNames = (arg: DayCellContentArg): string[] => {
    const classes: string[] = []
    const day = arg.date.getDay()
    if (day === 0 || day === 6) classes.push("booking-calendar__weekend")
    if (getHolidayName(arg.date)) classes.push("booking-calendar__holiday")
    return classes
  }

  const handleDayCellDidMount = (arg: DayCellMountArg) => {
    if (arg.view.type !== "dayGridMonth") return

    const holidayName = getHolidayName(arg.date)
    const cellTop = arg.el.querySelector<HTMLElement>(".fc-daygrid-day-top")
    const dayNumber = arg.el.querySelector<HTMLElement>(".fc-daygrid-day-number")

    cellTop?.classList.add("booking-calendar__day-cell")
    dayNumber?.classList.add("booking-calendar__day-number")

    if (holidayName && cellTop && !cellTop.querySelector(".booking-calendar__holiday-label")) {
      const holidayLabel = document.createElement("span")
      holidayLabel.className = "booking-calendar__holiday-label"
      holidayLabel.textContent = holidayName
      cellTop.appendChild(holidayLabel)
    }
  }

  const handleEventDidMount = (arg: EventMountArg) => {
    const props = arg.event.extendedProps as AnyEventProps
    if (props.kind !== "busy") return
    if (arg.view.type !== "dayGridMonth") return

    const eventMain = arg.el.querySelector<HTMLElement>(".fc-event-main")
    if (!eventMain) return

    eventMain.textContent = ""
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    icon.setAttribute("aria-hidden", "true")
    icon.setAttribute("width", "16")
    icon.setAttribute("height", "16")
    icon.setAttribute("viewBox", "0 0 24 24")
    icon.setAttribute("fill", "none")
    icon.setAttribute("stroke", "currentColor")
    icon.setAttribute("stroke-width", "2.4")
    icon.setAttribute("stroke-linecap", "round")
    icon.setAttribute("stroke-linejoin", "round")

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    rect.setAttribute("width", "18")
    rect.setAttribute("height", "11")
    rect.setAttribute("x", "3")
    rect.setAttribute("y", "11")
    rect.setAttribute("rx", "2")
    rect.setAttribute("ry", "2")

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "M7 11V7a5 5 0 0 1 10 0v4")

    icon.append(rect, path)

    const label = document.createElement("span")
    label.textContent = props.label ?? ""

    const content = document.createElement("span")
    content.className = "booking-calendar__busy-pill-content"
    content.append(icon, label)

    if (props.status === "TENTATIVE") {
      const tentativeBadge = document.createElement("span")
      tentativeBadge.className = "booking-calendar__busy-pill-tag"
      tentativeBadge.textContent = "仮"
      content.appendChild(tentativeBadge)
    }

    eventMain.appendChild(content)
  }

  const runPreflight = useCallback(
    async (slot: { start: string; end: string }, kind: BookingKind): Promise<BookingConflictsResponse> => {
      const response = await fetch("/api/booking/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingKind: kind,
          start: slot.start,
          end: slot.end,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(mapErrorCodeToJa(payload.error ?? "unknown"))
      }
      return (await response.json()) as BookingConflictsResponse
    },
    [],
  )

  const startCommit = useCallback(
    async (kind: BookingKind) => {
      if (!activeDraft || preflighting) return
      const slot = { start: activeDraft.start, end: activeDraft.end }
      setPreflighting(true)
      setActionError(null)
      try {
        const verdict = await runPreflight(slot, kind)
        if (verdict.verdict === "block") {
          setActionError(verdict.message)
          return
        }
        if (verdict.verdict === "warn") {
          setWarningModal({ kind, message: verdict.message, slot })
          return
        }
        onCommit(slot, kind)
      } catch (error) {
        const message = error instanceof Error ? error.message : "予約の重なり確認に失敗しました"
        setActionError(message)
      } finally {
        setPreflighting(false)
      }
    },
    [activeDraft, onCommit, preflighting, runPreflight],
  )

  const confirmAfterWarning = useCallback(() => {
    if (!warningModal) return
    onCommit(warningModal.slot, warningModal.kind)
    setWarningModal(null)
  }, [onCommit, warningModal])

  return (
    <div className="booking-calendar">
      <div className="booking-calendar__tabs" aria-label="カレンダー表示切替">
        {VIEW_OPTIONS.map((option) => {
          const isActive = view === option.value
          return (
            <button
              key={option.value}
              type="button"
              data-view={option.value === "dayGridMonth" ? "month" : option.value === "timeGridWeek" ? "week" : "day"}
              className={`booking-calendar__tab ${isActive ? "glass-inset text-hp" : "glass-flat text-hp-muted"}`}
              aria-pressed={isActive}
              onClick={() => changeCalendarView(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {activeDraft ? (
        <div className="booking-calendar__action-panel glass-flat" data-testid="booking-action-panel">
          <div className="booking-calendar__action-panel-info">
            <span className="booking-calendar__action-panel-label">選択中</span>
            <span className="booking-calendar__action-panel-range">
              {formatRange(activeDraft.start, activeDraft.end)}
            </span>
          </div>
          <div className="booking-calendar__action-panel-buttons">
            <button
              type="button"
              className="booking-calendar__action-button booking-calendar__action-button--primary"
              onClick={() => startCommit("confirmed")}
              disabled={preflighting}
            >
              {preflighting ? "確認中…" : "確定"}
            </button>
            <button
              type="button"
              className="booking-calendar__action-button"
              onClick={() => startCommit("tentative")}
              disabled={preflighting}
            >
              仮キープ
            </button>
            <button
              type="button"
              className="booking-calendar__action-button booking-calendar__action-button--ghost"
              onClick={cancelActiveDraft}
              disabled={preflighting}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}
      {actionError ? (
        <div className="booking-calendar__action-error glass-flat" role="alert">
          {actionError}
        </div>
      ) : null}
      <div className="booking-calendar__surface glass-flat">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={jaLocale}
          firstDay={0}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{
            today: "今日",
          }}
          height="auto"
          selectable
          selectMirror
          unselectAuto={false}
          editable={false}
          eventStartEditable
          eventDurationEditable
          nowIndicator
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          navLinks
          navLinkDayClick={(date) => changeCalendarView("timeGridDay", toDateKey(date))}
          eventSources={eventSources}
          events={draftEventInputs}
          eventDidMount={handleEventDidMount}
          dayCellClassNames={dayCellClassNames}
          dayCellDidMount={handleDayCellDidMount}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
        />
      </div>
      {warningModal ? (
        <div
          className="booking-calendar__modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-warning-title"
        >
          <div className="booking-calendar__modal-card glass-flat">
            <h2 id="booking-warning-title" className="booking-calendar__modal-title">
              重なりがあります
            </h2>
            <p className="booking-calendar__modal-message">{warningModal.message}</p>
            <div className="booking-calendar__modal-actions">
              <button
                type="button"
                className="booking-calendar__action-button booking-calendar__action-button--ghost"
                onClick={() => setWarningModal(null)}
              >
                やめる
              </button>
              <button
                type="button"
                className="booking-calendar__action-button booking-calendar__action-button--primary"
                onClick={confirmAfterWarning}
              >
                {warningModal.kind === "tentative" ? "仮キープして進む" : "確定して進む"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
