import Image from "next/image"
import type { DiagramConfig } from "@/lib/notes/diagrams"

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
      <div className="relative w-full" style={{ aspectRatio: `${config.aspect.width} / ${config.aspect.height}` }}>
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
        <div className="mt-5 grid gap-4 md:grid-cols-2 md:gap-6">
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
      </div>
    </figure>
  )
}
