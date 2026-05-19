import { describe, expect, it } from "vitest"

import { shouldAllowBufferEdge } from "@/components/booking/booking-calendar"

const bookingStart = "2099-05-18T01:00:00.000Z"
const bookingEnd = "2099-05-18T02:00:00.000Z"

describe("shouldAllowBufferEdge", () => {
  it("allows before-buffer resize when the lower edge stays locked to the booking start", () => {
    expect(
      shouldAllowBufferEdge(
        { side: "before", bookingStart, bookingEnd },
        {
          start: new Date("2099-05-18T00:30:00.000Z"),
          end: new Date(bookingStart),
        },
        true,
      ),
    ).toBe(true)
  })

  it("rejects before-buffer resize when the lower edge moves away from the booking start", () => {
    expect(
      shouldAllowBufferEdge(
        { side: "before", bookingStart, bookingEnd },
        {
          start: new Date("2099-05-18T00:30:00.000Z"),
          end: new Date("2099-05-18T01:30:00.000Z"),
        },
        true,
      ),
    ).toBe(false)
  })

  it("allows after-buffer resize when the upper edge stays locked to the booking end", () => {
    expect(
      shouldAllowBufferEdge(
        { side: "after", bookingStart, bookingEnd },
        {
          start: new Date(bookingEnd),
          end: new Date("2099-05-18T02:30:00.000Z"),
        },
        true,
      ),
    ).toBe(true)
  })

  it("rejects after-buffer resize when the upper edge moves away from the booking end", () => {
    expect(
      shouldAllowBufferEdge(
        { side: "after", bookingStart, bookingEnd },
        {
          start: new Date("2099-05-18T01:30:00.000Z"),
          end: new Date("2099-05-18T02:30:00.000Z"),
        },
        true,
      ),
    ).toBe(false)
  })
})
