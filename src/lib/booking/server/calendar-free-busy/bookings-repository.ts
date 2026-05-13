export type CalendarBookingFromApi = {
  id: string
  bookingGroupId: string
  start: string
  end: string
  title: string
  status: string
}

export async function listBookings(
  timeMin: string,
  timeMax: string,
  userIds: string[],
): Promise<CalendarBookingFromApi[]> {
  const { prisma } = await import("@/lib/prisma")
  const startDate = new Date(timeMin)
  const endDate = new Date(timeMax)
  const dbBookings = await prisma.bookingTimeSlot.findMany({
    where: {
      startTime: { lt: endDate },
      endTime: { gt: startDate },
      status: "CONFIRMED",
      bookingGroup: {
        customer: {
          userId: { in: userIds },
        },
      },
    },
    select: {
      id: true,
      bookingGroupId: true,
      startTime: true,
      endTime: true,
      status: true,
      bookingGroup: {
        select: {
          projectTitle: true,
          status: true,
        },
      },
    },
  })

  return dbBookings.map((booking) => ({
    id: booking.id,
    bookingGroupId: booking.bookingGroupId,
    start: booking.startTime.toISOString(),
    end: booking.endTime.toISOString(),
    title: booking.bookingGroup.projectTitle,
    status: booking.bookingGroup.status,
  }))
}
