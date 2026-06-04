export function HeroSection() {
  return (
    <section
      id="home"
      className="hp-hero-stage relative w-full -mt-24 overflow-hidden md:-mt-28"
      aria-label="主要メッセージ"
    >
      <div className="relative mx-auto flex min-h-[clamp(520px,76dvh,780px)] w-full max-w-[1440px] flex-col justify-end px-6 pb-12 pt-28 md:px-10 md:pb-16 md:pt-32 xl:px-14">
        <p className="hp-hero-kicker text-white/68">デモリール準備中</p>

        <div className="mt-auto grid grid-cols-1 gap-10 md:grid-cols-[1fr_auto] md:items-end md:gap-12">
          <div>
            <p className="text-sm text-white/70 md:text-base">則兼 智志</p>
            <h1 className="hp-display-heading mt-2 font-[var(--font-sans)] text-5xl font-bold text-white md:text-7xl xl:text-8xl">
              フリーランスカラリスト
            </h1>
          </div>
          <div className="text-left font-[var(--font-sans)] md:text-right">
            <p className="text-xs text-white/58">東京・2026年〜</p>
          </div>
        </div>
      </div>
    </section>
  )
}
