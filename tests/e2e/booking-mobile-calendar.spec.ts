import { expect, test, type Page } from "@playwright/test"

import { prismaForE2E, testUserEmail, upsertUser } from "./booking-test-utils"

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return isoDate(new Date(Date.UTC(year, month - 1, day + days)))
}

function displayDateKey(dateKey: string) {
  const [, month, day] = dateKey.split("-").map(Number)
  return `${month}/${day}`
}

function buildDailyBusySlots(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const busy = []
  for (let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); cursor < end; cursor = addDays(cursor, 1)) {
    const date = isoDate(cursor)
    busy.push({
      start: `${date}T13:00:00`,
      end: `${date}T13:30:00`,
      summary: "E2E unavailable",
      bufferBeforeHours: 0,
      bufferAfterHours: 0,
    })
  }
  return busy
}

async function stubBookingCalendarApis(page: Page, options: { dailyBusy?: boolean } = {}) {
  await page.route("**/api/calendar/free-busy**", async (route) => {
    const url = new URL(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        busy: options.dailyBusy ? buildDailyBusySlots(url.searchParams.get("start") ?? "", url.searchParams.get("end") ?? "") : [],
        bookings: [],
      }),
    })
  })
  await page.route("**/api/booking/conflicts", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ verdict: "ok" }),
    })
  })
}

async function openAuthenticatedBooking(page: Page, options: { dailyBusy?: boolean; path?: string } = {}) {
  await stubBookingCalendarApis(page, options)
  const prisma = prismaForE2E()
  await upsertUser(prisma, testUserEmail, "E2E Satoshi")
  await prisma.$disconnect()
  const authResponse = await page.goto("/api/dev/auth-bypass")
  expect(authResponse?.status()).toBe(200)
  await page.goto(options.path ?? "/booking")
  await expect(page.getByTestId("booking-month-skeleton")).toHaveCount(0)
  await expect(page.locator(".fc-daygrid-day-number").first()).toBeVisible()
}

test.describe("booking calendar mobile layout and selection", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })

  test("uses month-only mobile flow and toggles non-contiguous date requests", async ({ page }) => {
    await openAuthenticatedBooking(page, { dailyBusy: true })

    await expect(page.getByRole("button", { name: "週" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "日", exact: true })).toHaveCount(0)
    const dayNumberTexts = await page.locator(".fc-daygrid-day-number").allTextContents()
    expect(dayNumberTexts.length).toBeGreaterThan(0)
    expect(dayNumberTexts.every((text) => !text.includes("日"))).toBe(true)
    const calendarSurfaceBox = await page.locator(".booking-calendar__surface").boundingBox()
    expect(calendarSurfaceBox).not.toBeNull()
    expect(calendarSurfaceBox!.width).toBeGreaterThanOrEqual(374)

    const targetDay = page.locator(".fc-daygrid-day:not(.fc-day-other)").first()
    const targetDate = await targetDay.getAttribute("data-date")
    if (!targetDate) throw new Error("target date was not available")
    await targetDay.locator(".fc-daygrid-day-number").click()

    await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible()
    await expect(page.getByTestId("booking-date-request-panel")).toBeVisible()
    await expect(page.getByTestId("booking-month-slot-option")).toHaveCount(0)
    await expect(page.getByTestId("booking-action-panel")).toHaveCount(0)

    const skippedDate = addDaysToDateKey(targetDate, 1)
    const laterDate = addDaysToDateKey(targetDate, 2)
    await page.locator(`.fc-daygrid-day[data-date="${laterDate}"] .fc-daygrid-day-number`).click()

    await expect(page.getByTestId("booking-date-request-summary")).toContainText("2日間")
    await expect(page.getByTestId("booking-date-request-summary")).not.toContainText(displayDateKey(skippedDate))
    await expect(page.locator(".booking-calendar__selected-date")).toHaveCount(2)
    await expect(page.locator(`.fc-daygrid-day[data-date="${skippedDate}"].booking-calendar__selected-date`)).toHaveCount(0)
    await expect(page.getByTestId("booking-date-request-chip")).toHaveCount(2)

    await page.locator(`.fc-daygrid-day[data-date="${targetDate}"] .fc-daygrid-day-number`).click()
    await expect(page.getByTestId("booking-date-request-summary")).toContainText("1日間")
    await expect(page.locator(".booking-calendar__selected-date")).toHaveCount(1)
    await page.locator(`.fc-daygrid-day[data-date="${targetDate}"] .fc-daygrid-day-number`).click()
    await expect(page.getByTestId("booking-date-request-summary")).toContainText("2日間")
    await expect(page.locator(".booking-calendar__selected-date")).toHaveCount(2)
    const panelBox = await page.getByTestId("booking-date-request-panel").boundingBox()
    expect(panelBox).not.toBeNull()
    expect(panelBox!.width).toBeGreaterThanOrEqual(374)
    await page.getByRole("button", { name: "この日程で相談する" }).click()
    await expect(page.getByLabel("案件名")).toBeVisible()
  })
})

test("booking calendar desktop hides view tabs and reaches the booking form from month candidates", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openAuthenticatedBooking(page)
  await expect(page.getByRole("button", { name: "週" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "日", exact: true })).toHaveCount(0)
  const targetDay = page.locator(".fc-daygrid-day:not(.fc-day-other)").first()
  await targetDay.locator(".fc-daygrid-day-number").click()
  await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible()
  await expect(page.getByTestId("booking-date-request-panel")).toBeVisible()
  await expect(page.getByTestId("booking-month-slot-option")).toHaveCount(0)
  const targetDate = await targetDay.getAttribute("data-date")
  if (!targetDate) throw new Error("target date was not available")
  await page.locator(`.fc-daygrid-day[data-date="${addDaysToDateKey(targetDate, 1)}"] .fc-daygrid-day-number`).click()
  await expect(page.getByTestId("booking-date-request-summary")).toContainText("2日間")
  await expect(page.locator(".booking-calendar__selected-date")).toHaveCount(2)
  await page.getByRole("button", { name: "この日程で相談する" }).click()
  await expect(page.getByLabel("案件名")).toBeVisible()
})

test("LINE LIFF booking entry uses the same month-only candidate flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openAuthenticatedBooking(page, { dailyBusy: true, path: "/line/booking" })
  await expect(page.getByRole("button", { name: "週" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "日", exact: true })).toHaveCount(0)
  await page.locator(".fc-daygrid-day:not(.fc-day-other)").first().locator(".fc-daygrid-day-number").click()
  await expect(page.locator(".fc-dayGridMonth-view")).toBeVisible()
  await expect(page.getByTestId("booking-date-request-panel")).toBeVisible()
  await expect(page.getByTestId("booking-month-slot-option")).toHaveCount(0)
  const calendarSurfaceBox = await page.locator(".booking-calendar__surface").boundingBox()
  expect(calendarSurfaceBox).not.toBeNull()
  expect(calendarSurfaceBox!.width).toBeGreaterThanOrEqual(374)
  await expect(page.getByTestId("booking-date-request-summary")).toContainText("1日間")
  await page.getByRole("button", { name: "この日程で相談する" }).click()
  await expect(page.getByLabel("案件名")).toBeVisible()
})
