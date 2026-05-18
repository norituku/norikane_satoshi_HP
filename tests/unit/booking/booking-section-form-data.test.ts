import { describe, expect, it } from "vitest"

import { createDefaultBookingFormData, mergeBookingFormData } from "@/lib/booking/domain/form-schema"

describe("BookingSection form data merge", () => {
  it("preserves session email when a partial form watch update omits it", () => {
    const current = {
      ...createDefaultBookingFormData("customer@example.com"),
      projectTitle: "Project",
    }

    const next = mergeBookingFormData(current, { contactName: "Customer" }, "customer@example.com")

    expect(next.contactName).toBe("Customer")
    expect(next.sessionEmail).toBe("customer@example.com")
  })
})
