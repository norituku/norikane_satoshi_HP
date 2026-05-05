"use client"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction"
import timeGridPlugin from "@fullcalendar/timegrid"
import jaLocale from "@fullcalendar/core/locales/ja"
import type {
  DateSelectArg,
  DayCellContentArg,
  DayCellMountArg,
  EventClickArg,
  EventMountArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core"
import { format } from "date-fns"
import { useCallback, useMemo, useRef, useState } from "react"

import { getHolidayName } from "@/lib/booking/holidays"

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay"

type BusySlot = {
  start: string
  end: string
}

type FreeBusyResponse = {
  busy?: BusySlot[]
}

type BusyEventProps = {
  kind: "busy"
  label: string
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
    title: isMonthView ? `${label} 予約済み` : "予約済み",
    start: slot.start,
    end: slot.end,
    allDay,
    display: isMonthView ? "block" : "background",
    classNames: isMonthView
      ? ["booking-calendar__busy-pill"]
      : ["booking-calendar__busy"],
    extendedProps,
  }
}

async function fetchBusySlots(arg: EventSourceFuncArg): Promise<BusySlot[]> {
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

  const data = (await response.json()) as FreeBusyResponse
  return data.busy ?? []
}

type BookingCalendarProps = {
  onSlotSelect?: (slot: { start: Date; end: Date }) => void
}

export function BookingCalendar({ onSlotSelect }: BookingCalendarProps) {
  const [view, setView] = useState<CalendarView>("dayGridMonth")
  const calendarRef = useRef<FullCalendar | null>(null)
  const selectedViewRef = useRef<CalendarView>("dayGridMonth")
  const busySlotCacheRef = useRef<Map<string, BusySlot[]>>(new Map())

  const changeCalendarView = useCallback((nextView: CalendarView, dateStr?: string) => {
    selectedViewRef.current = nextView
    setView(nextView)
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.changeView(nextView, dateStr)
      calendarApi.refetchEvents()
    }
  }, [])

  const fetchCachedBusyEvents = useCallback(async (arg: EventSourceFuncArg): Promise<EventInput[]> => {
    const cacheKey = `${arg.startStr}|${arg.endStr}`
    let slots = busySlotCacheRef.current.get(cacheKey)
    if (!slots) {
      slots = await fetchBusySlots(arg)
      busySlotCacheRef.current.set(cacheKey, slots)
    }

    return slots.map((slot) => toBusyEvent(slot, selectedViewRef.current))
  }, [])

  const eventSources = useMemo(
    () => [
      {
        id: "google-calendar-busy",
        events: fetchCachedBusyEvents,
      },
    ],
    [fetchCachedBusyEvents],
  )

  const handleDateClick = (arg: DateClickArg) => {
    if (arg.view.type === "dayGridMonth") {
      changeCalendarView("timeGridDay", arg.dateStr)
      return
    }

    const end = new Date(arg.date)
    end.setHours(end.getHours() + 1)
    onSlotSelect?.({ start: arg.date, end })
  }

  const handleSelect = (arg: DateSelectArg) => {
    onSlotSelect?.({ start: arg.start, end: arg.end })
    console.debug("booking select", { start: arg.startStr, end: arg.endStr })
  }

  const handleEventClick = (arg: EventClickArg) => {
    console.debug("booking eventClick", arg.event.id)
  }

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
    const props = arg.event.extendedProps as Partial<BusyEventProps>
    if (props.kind !== "busy" || arg.view.type !== "dayGridMonth") return

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

    const status = document.createElement("span")
    status.textContent = "予約済み"

    const content = document.createElement("span")
    content.className = "booking-calendar__busy-pill-content"
    content.append(icon, label, status)
    eventMain.appendChild(content)
  }

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
          nowIndicator
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          navLinks
          navLinkDayClick={(date) => changeCalendarView("timeGridDay", toDateKey(date))}
          eventSources={eventSources}
          eventDidMount={handleEventDidMount}
          dayCellClassNames={dayCellClassNames}
          dayCellDidMount={handleDayCellDidMount}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
        />
      </div>
    </div>
  )
}
