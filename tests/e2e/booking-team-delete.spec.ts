import { expect, test } from "@playwright/test"

import {
  addSessionCookie,
  cleanupBookingE2E,
  createBookingForUser,
  createTeamWithMembers,
  e2eCurrentWeekRange,
  e2eCurrentWeekdayOffset,
  e2eSlot,
  hasBooking,
  jsonRequest,
  prismaForE2E,
  sessionCookieFor,
  upsertUser,
  type BookingJson,
} from "./booking-test-utils"

const prefix = `booking-delete-${Date.now()}`
const bookingWeek = e2eCurrentWeekRange()
const bookingDayOffset = e2eCurrentWeekdayOffset()
const bookingSlotA = e2eSlot(bookingDayOffset, 9)
const bookingSlotB = e2eSlot(bookingDayOffset, 11)

test.describe("booking team delete", () => {
  test("channel deletion removes the shared channel while preserving personal histories", async ({ page, request }) => {
    const prisma = prismaForE2E()
    const userA = await upsertUser(prisma, `${prefix}-a@example.com`, "Delete A")
    const userB = await upsertUser(prisma, `${prefix}-b@example.com`, "Delete B")

    try {
      const team = await createTeamWithMembers(prisma, {
        name: `${prefix} channel`,
        owner: userA,
        members: [userB],
      })
      const bookingA = await createBookingForUser(prisma, userA, {
        prefix,
        label: "A team booking",
        start: bookingSlotA.start,
        end: bookingSlotA.end,
        teamId: team.id,
      })
      const bookingB = await createBookingForUser(prisma, userB, {
        prefix,
        label: "B personal booking",
        start: bookingSlotB.start,
        end: bookingSlotB.end,
      })

      await addSessionCookie(page.context(), userA)
      await page.goto("/booking/settings")
      await expect(page.locator("#team-select")).toContainText(team.name)
      await page.getByRole("button", { name: "削除" }).click()
      await expect(page.getByRole("dialog")).toContainText("チャンネルは消える")
      await expect(page.getByRole("dialog")).toContainText("チャンネル表示からメンバーの案件は消える")
      await expect(page.getByRole("dialog")).toContainText("各自の個人履歴には案件が残る")
      await page.getByRole("button", { name: "削除する" }).click()
      await expect(page.getByText("チャンネルを削除しました。")).toBeVisible()
      await expect(page.locator("#team-select")).not.toContainText(team.name)

      const deletedTeam = await prisma.team.findUnique({ where: { id: team.id } })
      const detachedBooking = await prisma.bookingGroup.findUnique({ where: { id: bookingA.id } })
      expect(deletedTeam).toBeNull()
      expect(detachedBooking?.teamId).toBeNull()

      const cookieA = await sessionCookieFor(userA)
      const oldTeamScope = await jsonRequest(
        request,
        "get",
        `/api/calendar/free-busy?start=${bookingWeek.startIso}&end=${bookingWeek.endIso}&teamId=${team.id}`,
        cookieA,
      )
      expect(oldTeamScope.response.status()).toBe(404)

      const cookieB = await sessionCookieFor(userB)
      const personalB = await jsonRequest(
        request,
        "get",
        `/api/calendar/free-busy?start=${bookingWeek.startIso}&end=${bookingWeek.endIso}`,
        cookieB,
      )
      expect(personalB.response.status()).toBe(200)
      expect(hasBooking((personalB.json as BookingJson).bookings, bookingB.id)).toBe(true)
    } finally {
      await cleanupBookingE2E(prisma, { prefix, emails: [userA.email, userB.email] })
      await prisma.$disconnect()
    }
  })
})
