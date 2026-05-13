import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type ConflictBooking = Prisma.BookingTimeSlotGetPayload<{
  include: {
    bookingGroup: {
      include: {
        customer: {
          select: {
            displayName: true
            user: { select: { email: true } }
          }
        }
      }
    }
  }
}>

export async function findConflictingBookings(
  start: Date,
  end: Date,
  options: { excludeBookingId?: string } = {},
): Promise<ConflictBooking[]> {
  const slots = await prisma.bookingTimeSlot.findMany({
    where: {
      ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      startTime: { lt: end },
      endTime: { gt: start },
      status: "CONFIRMED",
    },
    include: {
      bookingGroup: {
        include: {
          customer: {
            select: {
              displayName: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return slots.filter((slot) => slot.bookingGroup.status === "CONFIRMED")
}
