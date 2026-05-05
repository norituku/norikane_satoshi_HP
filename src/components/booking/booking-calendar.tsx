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
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core"
import { useMemo, useState } from "react"

import { getHolidayName } from "@/lib/booking/holidays"

type CalendarView = "dayGridMonth" | "timeGridWeek"

type BusySlot = {
  start: string
  end: string
}

type FreeBusyResponse = {
  busy?: BusySlot[]
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

async function fetchBusyEvents(arg: EventSourceFuncArg): Promise<EventInput[]> {
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
  return (data.busy ?? []).map((slot) => ({
    start: slot.start,
    end: slot.end,
    display: "background",
    classNames: ["booking-calendar__busy"],
  }))
}

export function BookingCalendar() {
  const [view, setView] = useState<CalendarView>("dayGridMonth")

  const eventSources = useMemo(
    () => [
      {
        id: "google-calendar-busy",
        events: fetchBusyEvents,
      },
    ],
    [],
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

  return (
    <div className="booking-calendar">
      <div className="booking-calendar__tabs" aria-label="カレンダー表示切替">
        {VIEW_OPTIONS.map((option) => {
          const isActive = view === option.value
          return (
            <button
              key={option.value}
              type="button"
              className={`booking-calendar__tab ${isActive ? "neu-inset text-neu" : "neu-flat text-neu-muted"}`}
              aria-pressed={isActive}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <div className="booking-calendar__surface neu-inset">
        <FullCalendar
          key={view}
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
