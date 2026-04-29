/**
 * Notion 本文に [[diagram:<slug>]] という marker paragraph を置くと、
 * RenderBlocks が NoteDiagram コンポーネントへ差し替える。
 *
 * grading / filmlook 等を追加するときは、画像 (public/notes/diagrams/<slug>.webp)
 * と meta (public/notes/diagrams/<slug>.meta.json) を生成したうえで
 * このオブジェクトに 1 エントリ足すだけで済むようにしている。
 *
 * layout は 5 種類:
 *   - "chaos-vs-structured": 左右対比 (correction-factor-map / filmlook-density-mixture)
 *   - "centered-axes":       中心ルック + 4方向軸 (grading-look-decomposition)
 *   - "horizontal-flow":     左→右 4 列ステップ (grading-words-to-knobs)
 *   - "horizontal-flow-8":   8 段ステップ (filmlook-physics-flow)。desktop は md:grid-cols-4 で 4×2、mobile は 1 列。
 *   - "keypoint-row":        2〜5 項目の番号付きキーポイント (5秒で腹落ち用)
 */

type DiagramBase = {
  slug: string
  title: string
  caption: string
  alt: string
  aspect: { width: number; height: number }
  /**
   * 図に入る前の「5秒で何を読み取るか」一行宣言。
   * keypoint-row では必須、その他 layout では任意 (与えれば Body 冒頭で表示)。
   */
  intro?: string
}

export type ChaosStructuredDiagram = DiagramBase & {
  layout: "chaos-vs-structured"
  chaosHeading: string
  chaosLabels: string[]
  structuredHeading: string
  // structuredLayers は { label, sublabel? } で受ける。
  // 仕様書 v3 では correction-factor-map のように label + 1行説明が対になる
  // ケースと、filmlook-density-mixture のように label のみのケースが両方ある。
  structuredLayers: { label: string; sublabel?: string }[]
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

/**
 * horizontal-flow-8: 8 段の物理パイプライン (filmlook-physics-flow 専用)。
 * desktop は md:grid-cols-4 で 4×2 派生、mobile は 1 列縦積み。
 * group は仕様書 v3 の塊 (入力 1-2 / 内部 3-7 / 出力 8) を表し、
 * note-diagram.tsx 側で行替えなしの薄い区切り線として描く。
 */
export type HorizontalFlow8Group = "input" | "internal" | "output"
export type HorizontalFlow8Diagram = DiagramBase & {
  layout: "horizontal-flow-8"
  flowHeading: string
  steps: { label: string; sublabel: string; group: HorizontalFlow8Group }[]
  takeaway: string
}

/**
 * keypoint-row: 2〜5 項目の番号付きキーポイント図解。
 * 各項目は1つの「読み解きの軸」を表し、glyph で軽い視覚アイコンを与える。
 * 図に入る前の一行宣言は DiagramBase.intro を使う。takeaway = 出口の一行。
 */
export type KeypointRowGlyph =
  | "scope"
  | "word-axis-knob"
  | "density"
  | "mixture"
export type KeypointRowDiagram = DiagramBase & {
  layout: "keypoint-row"
  itemsHeading: string
  items: {
    label: string
    sublabel: string
    glyph: KeypointRowGlyph
  }[]
  takeaway: string
}

export type DiagramConfig =
  | ChaosStructuredDiagram
  | CenteredAxesDiagram
  | HorizontalFlowDiagram
  | HorizontalFlow8Diagram
  | KeypointRowDiagram

export const DIAGRAM_REGISTRY: Record<string, DiagramConfig> = {
  "correction-factor-map": {
    slug: "correction-factor-map",
    layout: "chaos-vs-structured",
    title: "カラーコレクションの因数分解マップ",
    caption:
      "ライブのカラコレでは、補正要因が同じ画に重なる。混ざったままでは戻せないが、粒度に分ければ独立に制御できる。",
    alt: "左半分に補正要因が緩く混ざるカオス、右半分にカメラ単位から作品単位までの5段に整列した状態を示す左右対比の横長図解",
    aspect: { width: 1536, height: 1024 },
    intro: "混ぜたら迷う。粒度に分けると制御できる。",
    chaosHeading: "混ざると迷宮",
    chaosLabels: [
      "カメラの種類",
      "露出",
      "色温度",
      "VEさんのアイリスフォロー",
      "肌色の一貫性",
      "スモークで生まれる大気の色",
      "作品全体のトーン",
      "曲ごとの方向性",
    ],
    structuredHeading: "分けると制御できる",
    structuredLayers: [
      { label: "カメラ単位", sublabel: "カメラ差を揃える" },
      { label: "フレーム単位", sublabel: "露出を追う" },
      { label: "アングル単位", sublabel: "色味を揃える" },
      { label: "シーン単位", sublabel: "トーンを設計する" },
      { label: "作品単位", sublabel: "ルックを当てる" },
    ],
  },
  "grading-look-decomposition": {
    slug: "grading-look-decomposition",
    layout: "centered-axes",
    title: "Look Decomposition 4軸マップ",
    caption:
      "ルックは独立した4軸の合成。中心の作品ルックから、色相弧・濃度バー・S曲線・RGB3ビームへ等しい重みで手が伸びる足場。",
    alt: "中心に作品のルックを置き、色相弧・濃度バー・S曲線・RGB3ビームの4軸が等重みで放射状に分かれることを示す抽象図解",
    aspect: { width: 1536, height: 1024 },
    intro: "中心 → 4軸の順で読む。ルックは独立した4軸の合成として扱える。",
    centerLabel: "作品のルック",
    centerSubLabel: "監督の言葉が、ここに落ちる",
    axesHeading: "4 軸（等重み）",
    axes: [
      {
        label: "色相弧",
        sublabel: "色の広がり・転がり",
      },
      {
        label: "濃度バー",
        sublabel: "どこをどれだけ重く",
      },
      {
        label: "S 曲線",
        sublabel: "トーンの肩・トー",
      },
      {
        label: "RGB 3 ビーム",
        sublabel: "カラーバランス",
      },
    ],
    hintHeading: "軸独立性",
    hints: [
      "軸同士は交差しない",
      "色だけで意味を区別しない（軸位置と末端表象で区別）",
    ],
  },
  "filmlook-physics-flow": {
    slug: "filmlook-physics-flow",
    layout: "horizontal-flow-8",
    title: "フィルムルックを作る物理の 8 段フロー",
    caption:
      "フィルムルックは雰囲気ではなく、入力 → 内部 → 出力の物理連鎖として読み直せる。デジタル信号と露光が左、フィルム内部の 5 段が中央、最終ルックが右に収束する。",
    alt: "デジタル信号と露光の入力 2 段、3 層の染料・分光密度曲線・S 字カーブ・プリンタ光・グレインのフィルム内部 5 段、最終ルックの出力 1 段が左から右へ等間隔で並ぶ 8 段フロー図解",
    aspect: { width: 1536, height: 1024 },
    intro: "左→右で読む。入力 2 段 → フィルム内部 5 段 → 出力 1 段の物理パイプライン。",
    flowHeading: "物理の 8 段フロー",
    steps: [
      { label: "デジタル信号", sublabel: "入力", group: "input" },
      { label: "露光", sublabel: "入力", group: "input" },
      { label: "3 層の染料", sublabel: "フィルム内部", group: "internal" },
      { label: "分光密度曲線", sublabel: "フィルム内部", group: "internal" },
      { label: "S 字カーブ", sublabel: "フィルム内部", group: "internal" },
      { label: "プリンタ光", sublabel: "フィルム内部", group: "internal" },
      { label: "グレイン", sublabel: "フィルム内部", group: "internal" },
      { label: "最終ルック", sublabel: "出力", group: "output" },
    ],
    takeaway: "フィルムルックは、物理の流れで読める。",
  },
  "correction-scope-map": {
    slug: "correction-scope-map",
    layout: "keypoint-row",
    title: "粒度 = 適用範囲",
    caption:
      "同じ補正でも、どこまで効くかは粒度ごとに違う。5段を並べると、混ぜてはいけない理由が分かる。",
    alt: "カメラ単位、フレーム単位、アングル単位、シーン単位、作品単位の5段それぞれが支配する適用範囲を、5段の同心円クラスタで示すヒーロービジュアルに並ぶキーポイント図解",
    aspect: { width: 1536, height: 1024 },
    intro: "粒度 = 適用範囲。",
    itemsHeading: "粒度 = 適用範囲",
    items: [
      {
        glyph: "scope",
        label: "カメラ単位",
        sublabel: "同じカメラ全カットに効く",
      },
      {
        glyph: "scope",
        label: "フレーム単位",
        sublabel: "同条件 ±EV の 1 枚ぶん",
      },
      {
        glyph: "scope",
        label: "アングル単位",
        sublabel: "同アングル別テイクに効く",
      },
      {
        glyph: "scope",
        label: "シーン単位",
        sublabel: "シーン全体のトーンに効く",
      },
      {
        glyph: "scope",
        label: "作品単位",
        sublabel: "作品全体のルックに効く",
      },
    ],
    takeaway: "粒度を取り違えると、迷宮に戻る。",
  },
  "grading-words-to-knobs": {
    slug: "grading-words-to-knobs",
    layout: "horizontal-flow",
    title: "言葉 → 軸 → 操作",
    caption:
      "立ち会いで投げられる抽象的な一言を、4軸のどれに落とすかで返す。言葉 → 軸 → 操作の 3 段ホップで、抽象を具体に変換する。",
    alt: "「もう少し暖かく」「もう少し抜けを」「青を深く」「映画っぽく」の4つの言葉を、それぞれ対応する軸と操作にマッピングする横フロー図解",
    aspect: { width: 1536, height: 1024 },
    intro: "左 → 右で読む。監督の一言が、4 軸のどこに落ちるかを掴む。",
    flowHeading: "言葉 → 軸 → 操作",
    steps: [
      {
        label: "「もう少し暖かく」",
        sublabel: "色相弧の方向に振る",
      },
      {
        label: "「もう少し抜けを」",
        sublabel: "濃度バーで暗部を整理する",
      },
      {
        label: "「青を深く」",
        sublabel: "RGB 3 ビームで青のバランスを下げる",
      },
      {
        label: "「映画っぽく」",
        sublabel: "S 曲線の肩を作る",
      },
    ],
    takeaway: "監督の言葉は、4 軸のどこかに落ちる。",
  },
  "filmlook-density-mixture": {
    slug: "filmlook-density-mixture",
    layout: "chaos-vs-structured",
    title: "フィルムらしさ = 濃度 + 色の混ざり",
    caption:
      "フィルム固有の差は、ルック 4 軸のうち縦軸 (濃度) と横軸 (色の混ざり) の二軸に集約される。残り 2 軸は結果として動くだけ。",
    alt: "左半分に縦方向の濃度 wedge と S 字カーブ、右半分に 3 層染料のヴェン状重なりと RGB 3 ビームを置き、濃度と色の混ざりの 2 軸を左右で対比する図解",
    aspect: { width: 1536, height: 1024 },
    intro: "フィルムの正体は、二軸に絞れる。",
    chaosHeading: "濃度（縦軸）",
    chaosLabels: ["暗部の粘り", "S 字の肩", "対数応答"],
    structuredHeading: "色の混ざり（横軸）",
    structuredLayers: [
      { label: "3 層染料" },
      { label: "分光密度曲線" },
      { label: "DIR カプラー" },
      { label: "プリンター光" },
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
