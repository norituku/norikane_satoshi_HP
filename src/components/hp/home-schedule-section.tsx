import { auth } from "@/auth"
import { BookingSection } from "@/components/booking/booking-section"
import { isAdmin } from "@/lib/auth/server/is-admin"
import Link from "next/link"

export async function HomeScheduleSection() {
  const session = await auth()
  const isCalendarAdmin = isAdmin(session?.user?.email)

  return (
    <section
      id="schedule"
      className="mx-auto w-full max-w-[1440px] px-6 md:px-10 xl:px-14 scroll-mt-24 md:scroll-mt-28"
    >
      <div className="glass-card glass-card--hp-schedule hp-shadow-sync-surface hp-shadow-sync-surface--schedule glass-refraction-edge glass-distortion-surface p-8 md:p-10 xl:p-14">
        <div className="glass-distortion-foreground hp-shadow-sync-foreground">
          <p className="hp-shadow-sync-text hp-schedule-text-shadow text-xs uppercase tracking-[0.22em] text-hp-muted">
            Schedule
          </p>
          <h2 className="hp-shadow-sync-text hp-schedule-text-shadow mt-2 text-2xl font-semibold text-hp md:text-3xl">
            予約カレンダー
          </h2>

          <div className="mt-8">
            {session?.user?.id ? (
              <div className="hp-shadow-sync-element hp-schedule-widget-shadow">
                <BookingSection
                  isCalendarAdmin={isCalendarAdmin}
                  userId={session.user.id}
                  userEmail={session.user.email ?? ""}
                />
              </div>
            ) : (
              <div className="hp-shadow-sync-element hp-schedule-widget-shadow flex flex-col items-center justify-center text-center">
                <p className="hp-shadow-sync-text hp-schedule-text-shadow text-base text-hp-muted">
                  予約フォームのご利用にはログインが必要です。
                </p>
                <Link
                  href="/api/auth/signin?callbackUrl=/"
                  className="glass-btn hp-shadow-sync-element px-6 py-3 text-sm font-medium text-hp inline-flex items-center justify-center gap-2 mt-6"
                >
                  ログインして予約に進む
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
