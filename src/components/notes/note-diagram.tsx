import Image from "next/image"
import type {
  CenteredAxesDiagram,
  ChaosStructuredDiagram,
  DiagramConfig,
  HorizontalFlowDiagram,
} from "@/lib/notes/diagrams"

/**
 * 記事本文に埋め込む横長図解。
 *
 * AGENTS.md (HP Design Skill) の制約:
 *   - 親 <article> が既に glass-card なので、ここでは blur を持たない
 *     "情報ブロック" 表現 (半透明白 + border のみ) を使う (= 入れ子 blur 禁止)。
 *   - 角丸は --radius (16px) 固定。新しい影を発明しない。
 *   - 文字は HTML/CSS で重ねる。AI 生成画像は背景・構造のみ。
 */
export function NoteDiagram({ config }: { config: DiagramConfig }) {
  const src = `/notes/diagrams/${config.slug}.webp`
  return (
    <figure className="my-8 overflow-hidden rounded-[16px] border border-white/55 bg-white/35 md:my-10">
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${config.aspect.width} / ${config.aspect.height}`,
        }}
      >
        <Image
          src={src}
          alt={config.alt}
          fill
          sizes="(min-width: 1280px) 960px, (min-width: 768px) 90vw, 100vw"
          className="object-cover"
          priority={false}
        />
      </div>
      <div className="px-5 py-5 md:px-7 md:py-6">
        <p className="text-xs uppercase tracking-[0.22em] text-hp-muted">
          Diagram
        </p>
        <h4 className="mt-1 text-base font-semibold text-hp md:text-lg">
          {config.title}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-hp-muted md:text-[0.95rem]">
          {config.caption}
        </p>
        <div className="mt-5">
          <DiagramBody config={config} />
        </div>
      </div>
    </figure>
  )
}

function DiagramBody({ config }: { config: DiagramConfig }) {
  switch (config.layout) {
    case "chaos-vs-structured":
      return <ChaosStructuredBody config={config} />
    case "centered-axes":
      return <CenteredAxesBody config={config} />
    case "horizontal-flow":
      return <HorizontalFlowBody config={config} />
  }
}

function ChaosStructuredBody({ config }: { config: ChaosStructuredDiagram }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-hp-muted">
          {config.chaosHeading}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {config.chaosLabels.map((label) => (
            <li
              key={label}
              className="rounded-full border border-white/55 bg-white/40 px-2.5 py-1 text-xs text-hp md:text-[0.8rem]"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-hp-muted">
          {config.structuredHeading}
        </p>
        <ol className="mt-2 space-y-1.5">
          {config.structuredLayers.map((layer, i) => (
            <li
              key={layer}
              className="flex items-center gap-2 rounded-[12px] border border-white/55 bg-white/40 px-3 py-1.5 text-xs text-hp md:text-[0.85rem]"
            >
              <span className="font-[var(--font-geist-mono)] text-[10px] text-hp-muted md:text-[11px]">
                L{i + 1}
              </span>
              <span>{layer}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function CenteredAxesBody({ config }: { config: CenteredAxesDiagram }) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-6">
      <div className="rounded-[12px] border border-white/55 bg-white/40 px-4 py-4 md:px-5 md:py-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-hp-muted">
          中心
        </p>
        <p className="mt-1 text-sm font-semibold text-hp md:text-[0.95rem]">
          {config.centerLabel}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-hp-muted md:text-[0.8rem]">
          {config.centerSubLabel}
        </p>
        <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-hp-muted">
          {config.axesHeading}
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1.5">
          {config.axes.map((axis, i) => (
            <li
              key={axis.label}
              className="rounded-[12px] border border-white/55 bg-white/35 px-2.5 py-2"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-hp md:text-[0.8rem]">
                <span className="font-[var(--font-geist-mono)] text-[10px] text-hp-muted md:text-[11px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {axis.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-hp-muted md:text-[0.72rem]">
                {axis.sublabel}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-hp-muted">
          {config.hintHeading}
        </p>
        <ul className="mt-2 space-y-1.5">
          {config.hints.map((hint) => (
            <li
              key={hint}
              className="rounded-[12px] border border-white/55 bg-white/40 px-3 py-1.5 text-xs leading-relaxed text-hp md:text-[0.85rem]"
            >
              {hint}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function HorizontalFlowBody({ config }: { config: HorizontalFlowDiagram }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.22em] text-hp-muted">
        {config.flowHeading}
      </p>
      <ol className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-4">
        {config.steps.map((step, i) => (
          <li
            key={step.label}
            className="rounded-[12px] border border-white/55 bg-white/40 px-2.5 py-2"
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-hp md:text-[0.8rem]">
              <span className="font-[var(--font-geist-mono)] text-[10px] text-hp-muted md:text-[11px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {step.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-hp-muted md:text-[0.72rem]">
              {step.sublabel}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs font-semibold text-hp md:text-[0.85rem]">
        {config.takeaway}
      </p>
    </div>
  )
}
