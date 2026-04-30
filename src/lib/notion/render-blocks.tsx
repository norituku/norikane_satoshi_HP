import type { ReactNode } from "react"
import Link from "next/link"
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client"
import { NoteDiagram } from "@/components/notes/note-diagram"
import { getDiagramConfig, parseDiagramMarker } from "@/lib/notes/diagrams"

const LINK_CLASS =
  "underline underline-offset-4 decoration-[rgba(139,127,255,0.5)] hover:text-[var(--accent-primary)] hover:decoration-[var(--accent-primary)] transition-colors"

function normalizeId(id: string): string {
  return id.replace(/-/g, "").toLowerCase()
}

export type SlugIndex = Map<string, string>

export function buildSlugIndex(
  notes: { id: string; slug: string }[]
): SlugIndex {
  const m = new Map<string, string>()
  for (const n of notes) m.set(normalizeId(n.id), n.slug)
  return m
}

function applyAnnotations(
  text: string,
  r: RichTextItemResponse,
  key: string
): ReactNode {
  let node: ReactNode = text
  const a = r.annotations
  if (a.code) {
    node = (
      <code
        key={`${key}-c`}
        className="rounded bg-[rgba(139,127,255,0.10)] px-1.5 py-0.5 font-[var(--font-geist-mono)] text-[0.9em] text-hp"
      >
        {node}
      </code>
    )
  }
  if (a.italic) {
    node = (
      <em key={`${key}-i`} className="italic">
        {node}
      </em>
    )
  }
  if (a.bold) {
    node = (
      <strong key={`${key}-b`} className="font-semibold text-hp">
        {node}
      </strong>
    )
  }
  return node
}

function renderRichText(
  rich: RichTextItemResponse[],
  keyPrefix: string,
  slugIndex: SlugIndex
): ReactNode[] {
  return rich.map((r, i): ReactNode => {
    const key = `${keyPrefix}-${i}`

    if (r.type === "mention" && r.mention.type === "page") {
      const targetId = normalizeId(r.mention.page.id)
      const targetSlug = slugIndex.get(targetId)
      const label = r.plain_text
      if (targetSlug) {
        return (
          <Link key={key} href={`/notes/${targetSlug}`} className={LINK_CLASS}>
            {applyAnnotations(label, r, `${key}-m`)}
          </Link>
        )
      }
      return (
        <strong key={key} className="font-semibold text-hp">
          {label}
        </strong>
      )
    }

    const node = applyAnnotations(r.plain_text, r, key)
    const href = r.href
    if (href) {
      const isInternal = href.startsWith("/") && !href.startsWith("//")
      if (isInternal) {
        return (
          <Link key={key} href={href} className={LINK_CLASS}>
            {node}
          </Link>
        )
      }
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {node}
        </a>
      )
    }
    return <span key={key}>{node}</span>
  })
}

function richToPlain(rich: RichTextItemResponse[]): string {
  return rich.map((r) => r.plain_text).join("")
}

function isEmptyParagraph(block: BlockObjectResponse): boolean {
  if (block.type !== "paragraph") return false
  const rich = block.paragraph.rich_text
  return rich.length === 0 || richToPlain(rich).trim() === ""
}

export function RenderBlocks({
  blocks,
  slugIndex,
}: {
  blocks: BlockObjectResponse[]
  slugIndex: SlugIndex
}) {
  const out: ReactNode[] = []

  blocks.forEach((block, i) => {
    const key = `b-${i}-${block.id.slice(0, 8)}`

    // Notion exposes heading_1 / heading_2 / heading_3. We render them as
    // h2 / h3 / h4 respectively — the page's <h1> is the article title.
    if (block.type === "heading_1") {
      out.push(
        <h2
          key={key}
          className="mt-10 mb-5 text-xl font-semibold text-hp md:text-2xl"
        >
          {renderRichText(block.heading_1.rich_text, key, slugIndex)}
        </h2>
      )
      return
    }
    if (block.type === "heading_2") {
      out.push(
        <h3
          key={key}
          className="mt-8 mb-4 text-lg font-semibold text-hp md:text-xl"
        >
          {renderRichText(block.heading_2.rich_text, key, slugIndex)}
        </h3>
      )
      return
    }
    if (block.type === "heading_3") {
      out.push(
        <h4
          key={key}
          className="mt-6 mb-3 text-base font-semibold text-hp md:text-lg"
        >
          {renderRichText(block.heading_3.rich_text, key, slugIndex)}
        </h4>
      )
      return
    }
    if (block.type === "paragraph") {
      if (isEmptyParagraph(block)) {
        out.push(<div key={key} className="h-4 md:h-6" aria-hidden="true" />)
        return
      }
      // [[diagram:<slug>]] のみで構成された paragraph は図解コンポーネントに差し替える。
      // 認識できない slug や誤記は通常の paragraph として描画して raw marker を残す
      // (ただし本文側で誤記に気付ける程度に visible にする方を優先する)。
      const plain = richToPlain(block.paragraph.rich_text)
      const diagramSlug = parseDiagramMarker(plain)
      if (diagramSlug) {
        const config = getDiagramConfig(diagramSlug)
        if (config) {
          out.push(<NoteDiagram key={key} config={config} />)
          return
        }
      }
      out.push(
        <p key={key} className="leading-relaxed md:leading-[1.9]">
          {renderRichText(block.paragraph.rich_text, key, slugIndex)}
        </p>
      )
      return
    }
    if (block.type === "divider") {
      out.push(
        <hr
          key={key}
          className="my-10 border-0 border-t border-t-[rgba(139,127,255,0.2)] md:my-12"
        />
      )
      return
    }
    // image block は HP 側では描画しない。
    // - HP は [[diagram:<slug>]] marker を NoteDiagram に差し替えて表示しているため、
    //   Notion 下書きに参考プレビューとして挿入された image block を出すと二重描画になる。
    // - cc-notion 同期パイプラインが挿入する preview image block は caption 接頭辞
    //   `__preview__:<slug>` または file/external URL `/notes/diagrams/<slug>.preview.png`
    //   を持つ。ここで明示的にスキップ判定し、将来 image block 全般を render するように
    //   なっても preview block だけは確実に除外できるようにする。
    // - 旧仕様の "HP図解プレビュー: <slug>" caption も preview とみなして skip する
    //   (insert-preview.mjs 由来、過去ページに残っている可能性)。
    if (block.type === "image") {
      return
    }
    // Unsupported block types are intentionally skipped.
  })

  return (
    <div className="space-y-5 text-base text-hp md:text-[1.05rem]">{out}</div>
  )
}
