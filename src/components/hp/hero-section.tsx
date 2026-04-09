import { SITE_BRAND_NAME, SITE_OWNER_NAME } from "@/lib/site-brand"

export function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12">
      <div className="neu-raised overflow-hidden p-8 md:p-10 xl:p-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] xl:gap-16">
          <div className="text-center md:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/35 px-4 py-2 text-[11px] font-semibold tracking-[0.28em] text-neu-muted backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[var(--neu-accent)]" />
              Freelance Colorist
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-neu-muted">
              Visual Tone Direction
            </p>
            <h1 className="font-[var(--font-inter)] text-4xl font-bold leading-tight tracking-tight text-neu md:text-5xl xl:text-6xl">
              {SITE_BRAND_NAME}
              <br />
              <span className="text-2xl md:text-3xl xl:text-4xl text-neu-muted">{SITE_OWNER_NAME}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-neu-muted md:text-lg">
              映像の色で物語を翻訳する。
              <br />
              DaVinci Resolve / Baselight を駆使し、映画・CM・MVのカラーグレーディングを手がけるフリーランスカラリスト。
            </p>
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
              <div className="neu-inset px-5 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">Focus</p>
                <p className="mt-2 text-sm font-semibold text-neu">Narrative Color</p>
              </div>
              <div className="neu-inset px-5 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">Workflow</p>
                <p className="mt-2 text-sm font-semibold text-neu">Remote / On-site</p>
              </div>
              <div className="neu-inset px-5 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">Tools</p>
                <p className="mt-2 text-sm font-semibold text-neu">Resolve / Baselight</p>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute inset-x-[12%] top-[8%] h-32 rounded-full bg-[color:var(--neu-accent-soft)] blur-3xl md:h-40" />
            <div className="relative flex aspect-[4/5] w-full max-w-[420px] items-end justify-between overflow-hidden rounded-[32px] border border-white/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.7),rgba(214,231,233,0.92))] p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.75),transparent_45%),linear-gradient(160deg,transparent_0%,rgba(121,199,199,0.16)_100%)]" />
              <div className="relative space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">Color Language</p>
                <p className="max-w-[16rem] text-xl font-semibold leading-snug text-neu">
                  硬すぎない透明感で、映像に空気を残す。
                </p>
              </div>
              <div className="relative neu-inset flex h-28 w-28 items-center justify-center rounded-[28px] text-neu-muted md:h-32 md:w-32">
                <span className="text-sm">Photo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
