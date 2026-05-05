"use client"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction"
import timeGridPlugin from "@fullcalendar/timegrid"
import jaLocale from "@fullcalendar/core/locales/ja"
import type {
  DateSelectArg,
  DayCellContentArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core"
import { format } from "date-fns"
import { Lock } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getHolidayName } from "@/lib/booking/holidays"

type CalendarView = "dayGridMonth" | "timeGridWeek"

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

export function BookingCalendar() {
  const [view, setView] = useState<CalendarView>("dayGridMonth")
  const calendarRef = useRef<FullCalendar | null>(null)
  const selectedViewRef = useRef<CalendarView>("dayGridMonth")
  const busySlotCacheRef = useRef<Map<string, BusySlot[]>>(new Map())

  useEffect(() => {
    selectedViewRef.current = view
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi && calendarApi.view.type !== view) {
      calendarApi.changeView(view)
      calendarApi.refetchEvents()
    }
  }, [view])

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
    console.debug("booking dateClick", arg.dateStr)
  }

  const handleSelect = (arg: DateSelectArg) => {
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

  const dayCellContent = (arg: DayCellContentArg) => {
    const holidayName = getHolidayName(arg.date)
    return (
      <div className="booking-calendar__day-cell">
        <span className="booking-calendar__day-number">{arg.dayNumberText}</span>
        {holidayName ? <span className="booking-calendar__holiday-label">{holidayName}</span> : null}
      </div>
    )
  }

  const eventContent = (arg: EventContentArg) => {
    const props = arg.event.extendedProps as Partial<BusyEventProps>
    if (props.kind !== "busy" || arg.view.type !== "dayGridMonth") return undefined

    return (
      <span className="booking-calendar__busy-pill-content">
        <Lock aria-hidden="true" size={16} strokeWidth={2.4} />
        <span>{props.label}</span>
        <span>予約済み</span>
      </span>
    )
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
              className={`booking-calendar__tab ${isActive ? "glass-inset text-hp" : "glass-flat text-hp-muted"}`}
              aria-pressed={isActive}
              onClick={() => {
                selectedViewRef.current = option.value
                setView(option.value)
              }}
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
          initialView={view}
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
          eventSources={eventSources}
          eventContent={eventContent}
          dayCellClassNames={dayCellClassNames}
          dayCellContent={dayCellContent}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
        />
      </div>
    </div>
  )
}
