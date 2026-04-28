/**
 * Notion 本文に [[diagram:<slug>]] という marker paragraph を置くと、
 * RenderBlocks が NoteDiagram コンポーネントへ差し替える。
 *
 * grading / filmlook 等を追加するときは、画像 (public/notes/diagrams/<slug>.webp)
 * と meta (public/notes/diagrams/<slug>.meta.json) を生成したうえで
 * このオブジェクトに 1 エントリ足すだけで済むようにしている。
 *
 * layout は 3 種類:
 *   - "chaos-vs-structured": 左=混線/右=構造化レイヤー (correction)
 *   - "centered-axes":       中心ルック + 4方向軸 (grading 4軸マップ)
 *   - "horizontal-flow":     左→右の物理連鎖 (filmlook)
 */

type DiagramBase = {
  slug: string
  title: string
  caption: string
  alt: string
  aspect: { width: number; height: number }
}

export type ChaosStructuredDiagram = DiagramBase & {
  layout: "chaos-vs-structured"
  chaosHeading: string
  chaosLabels: string[]
  structuredHeading: string
  structuredLayers: string[]
}

export type CenteredAxesDiagram = DiagramBase & {
  layout: "centered-axes"
  centerLabel: string
  centerSubLabel: string
  axesHeading: string
  axes: { label: string; sublabel: string }[]
  hintHeading: string
  hints: string[]
}

export type HorizontalFlowDiagram = DiagramBase & {
  layout: "horizontal-flow"
  flowHeading: string
  steps: { label: string; sublabel: string }[]
  takeaway: string
}

export type DiagramConfig =
  | ChaosStructuredDiagram
  | CenteredAxesDiagram
  | HorizontalFlowDiagram

export const DIAGRAM_REGISTRY: Record<string, DiagramConfig> = {
  "correction-factor-map": {
    slug: "correction-factor-map",
    layout: "chaos-vs-structured",
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
  "grading-look-decomposition": {
    slug: "grading-look-decomposition",
    layout: "centered-axes",
    title: "Look Decomposition 4軸マップ",
    caption:
      "抽象的な言葉を、4つの調整軸に落とす。中心の作品ルックから「色の広がり・転がり」「濃度」「カーブ」「RGBカラーバランス」へ手が伸びる足場。",
    alt: "中心に作品のルックを置き、色の広がり・転がり、濃度、カーブ、RGBカラーバランスの4軸が放射状に分かれることを示す抽象図解",
    aspect: { width: 1536, height: 1024 },
    centerLabel: "作品のルック",
    centerSubLabel: "監督の言葉が、ノードに落ちる場所",
    axesHeading: "4つの調整軸 — Look Decomposition",
    axes: [
      {
        label: "色の広がり・転がり",
        sublabel: "色相の回転と彩度。グレーも輝度も動かさない",
      },
      {
        label: "濃度",
        sublabel: "色ごとの輝度。立体感はここで決まる",
      },
      {
        label: "カーブ",
        sublabel: "グレースケールの明暗設計",
      },
      {
        label: "RGBカラーバランス",
        sublabel: "全体グレーのズレ。最下層の色温度",
      },
    ],
    hintHeading: "監督の言葉 → 軸の対応",
    hints: [
      "「もう少し暖かく」 → 色の広がり・転がり",
      "「もう少し抜けを」 → カーブ",
      "「青を深く」 → 濃度",
      "「映画っぽく」 → 4軸の合成",
    ],
  },
  "filmlook-physics-flow": {
    slug: "filmlook-physics-flow",
    layout: "horizontal-flow",
    title: "フィルムルックを作る物理の流れ",
    caption:
      "フィルムルックは雰囲気ではなく、露光、染料層、曲線、光、粒の物理連鎖として読み直せる。デジタル信号が左から流れ、最終ルックへ収束する。",
    alt: "デジタル信号が露光、3層の染料、分光密度曲線、S字カーブ、プリンターライト、グレインを通って最終的なフィルムルックへ収束する流れの図解",
    aspect: { width: 1536, height: 1024 },
    flowHeading: "物理連鎖 — 8段のパイプライン",
    steps: [
      { label: "デジタル信号", sublabel: "scene-linear の入力" },
      { label: "露光", sublabel: "光がフィルム面に当たる" },
      { label: "3層の染料", sublabel: "シアン・マゼンタ・イエロー" },
      { label: "分光密度曲線", sublabel: "波長ごとの吸収応答" },
      { label: "S字カーブ", sublabel: "トー・ストレート・ショルダー" },
      { label: "プリンターライト", sublabel: "RGB光で印刷" },
      { label: "グレイン", sublabel: "非一様な粒子分布" },
      { label: "最終ルック", sublabel: "映画的な1フレーム" },
    ],
    takeaway: "フィルムルックは物理で読める。",
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
