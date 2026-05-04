import { auth } from "@/auth"

export default async function BookingPage() {
  const session = await auth()

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12 py-12 md:py-16">
      <div className="neu-raised p-8 md:p-10 xl:p-14">
        <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">
          Booking
        </p>
        <h1 className="mt-2 text-4xl font-bold text-neu md:text-5xl xl:text-6xl">
          予約カレンダー（仮）
        </h1>
        <dl className="mt-8 space-y-4 text-base md:text-lg text-neu-muted">
          <div>
            <dt className="text-xs uppercase tracking-[0.22em] text-neu-muted">
              Name
            </dt>
            <dd className="mt-1 font-semibold text-neu">
              {session?.user?.name ?? "(name 未設定)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.22em] text-neu-muted">
              Email
            </dt>
            <dd className="mt-1 font-semibold text-neu">
              {session?.user?.email ?? "(email 未設定)"}
            </dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
