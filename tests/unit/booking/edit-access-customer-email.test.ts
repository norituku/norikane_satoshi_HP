import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  prisma: {
    bookingTimeSlot: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

import { findAccessibleSlot } from "@/lib/booking/server/edit-access"

describe("findAccessibleSlot customerEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns customerEmail and does not expose contactEmail", async () => {
    mocks.prisma.bookingTimeSlot.findUnique.mockResolvedValue({
      id: "slot_1",
      bookingGroupId: "group_1",
      bookingGroup: {
        id: "group_1",
        projectTitle: "Project",
        contactName: "Customer",
        customerEmail: "customer@example.com",
        phone: null,
        companyName: null,
        memo: null,
        dueDate: null,
        teamId: null,
        status: "CONFIRMED",
        gcalEventId: null,
        customer: { userId: "customer_user" },
        team: null,
        timeSlots: [{
          id: "slot_1",
          startTime: new Date("2099-05-18T01:00:00.000Z"),
          endTime: new Date("2099-05-18T02:00:00.000Z"),
          status: "CONFIRMED",
        }],
      },
    })

    const booking = await findAccessibleSlot("slot_1", "customer_user", false)

    expect(booking?.details.customerEmail).toBe("customer@example.com")
    expect(booking?.details).not.toHaveProperty("contactEmail")
    expect(mocks.prisma.bookingTimeSlot.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          bookingGroup: expect.objectContaining({
            select: expect.objectContaining({
              customerEmail: true,
            }),
          }),
        }),
      }),
    )
  })
})
