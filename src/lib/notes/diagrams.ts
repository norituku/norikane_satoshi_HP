/**
 * Notion 本文に [[diagram:<slug>]] という marker paragraph を置くと、
 * RenderBlocks が NoteDiagram コンポーネントへ差し替える。
 *
 * grading / filmlook 等を追加するときは、画像 (public/notes/diagrams/<slug>.webp)
 * と meta (public/notes/diagrams/<slug>.meta.json) を生成したうえで
 * このオブジェクトに 1 エントリ足すだけで済むようにしている。
 */

export type DiagramConfig = {
  /** 本文 marker の slug。public/notes/diagrams/<slug>.webp と一致させる。 */
  slug: string
  /** 図解タイトル (figcaption の見出し)。 */
  title: string
  /** 1 行説明。図解の意図を本文の流れと繋ぐ。 */
  caption: string
  /** スクリーンリーダー向け代替テキスト。 */
  alt: string
  /** 画像の横:縦 比 (next/image の sizes 用)。 */
  aspect: { width: number; height: number }
  /** 図解の左側 (整理前) に並ぶ要素ラベル。 */
  chaosLabels: string[]
  /** 図解の右側 (整理後) に並ぶ階層ラベル。上から順に。 */
  structuredLayers: string[]
  /** 左右ブロックの上に出す小見出し。 */
  chaosHeading: string
  structuredHeading: string
}

export const DIAGRAM_REGISTRY: Record<string, DiagramConfig> = {
  "correction-factor-map": {
    slug: "correction-factor-map",
    title: "カラーコレクションの因数分解マップ",
    caption:
      "5000カットの迷宮を、5段の粒度に畳み直す。ライブのカラコレでは、要因を粒度で分けて管理することがそのまま作業効率になる。",
    alt: "左側に色温度や肌、シーントーンなどが混線したカオス、右側にカメラ単位からシーン単位までの5段レイヤーへ整理された状態を示す横長図解",
    aspect: { width: 1536, height: 1024 },
    chaosHeading: "整理前 — 混線した補正要因",
    chaosLabels: [
      "カメラ差",
      "露出揺れ",
      "色温度",
      "肌",
      "大気",
      "シーントーン",
      "作品ルック",
    ],
    structuredHeading: "整理後 — 5段の粒度レイヤー",
    structuredLayers: [
      "カメラ単位",
      "フレーム単位",
      "アングル単位",
      "シーン単位",
      "作品単位",
    ],
  },
}

const MARKER_RE = /^\[\[diagram:([a-z0-9_-]+)\]\]$/i

export function parseDiagramMarker(text: string): string | null {
  const m = text.trim().match(MARKER_RE)
  return m ? m[1] : null
}

export function getDiagramConfig(slug: string): DiagramConfig | null {
  return DIAGRAM_REGISTRY[slug] ?? null
}
