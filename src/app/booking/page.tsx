import { auth } from "@/auth"
import { BookingCalendar } from "@/components/booking/booking-calendar"
import { redirect } from "next/navigation"

export default async function BookingPage() {
  const session = await auth()
  if (!session?.user) redirect("/api/auth/signin")

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12 py-12 md:py-16">
      <div className="neu-raised p-8 md:p-10 xl:p-14">
        <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">
          Booking
        </p>
        <h1 className="mt-2 text-4xl font-bold text-neu md:text-5xl xl:text-6xl">
          予約カレンダー
        </h1>
        <div className="mt-8">
          <BookingCalendar />
        </div>
      </div>
    </section>
  )
}
