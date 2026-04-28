/**
 * Notion 本文に [[diagram:<slug>]] という marker paragraph を置くと、
 * RenderBlocks が NoteDiagram コンポーネントへ差し替える。
 *
 * grading / filmlook 等を追加するときは、画像 (public/notes/diagrams/<slug>.webp)
 * と meta (public/notes/diagrams/<slug>.meta.json) を生成したうえで
 * このオブジェクトに 1 エントリ足すだけで済むようにしている。
 *
 * layout は 4 種類:
 *   - "chaos-vs-structured": 左=混線/右=構造化レイヤー (correction)
 *   - "centered-axes":       中心ルック + 4方向軸 (grading 4軸マップ)
 *   - "horizontal-flow":     左→右の物理連鎖 (filmlook)
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
  | KeypointRowDiagram

export const DIAGRAM_REGISTRY: Record<string, DiagramConfig> = {
  "correction-factor-map": {
    slug: "correction-factor-map",
    layout: "chaos-vs-structured",
    title: "カラーコレクションの因数分解マップ",
    caption:
      "5000カットの迷宮を、5段の粒度に畳み直す。ライブのカラコレでは、要因を粒度で分けて管理することがそのまま作業効率になる。",
    alt: "左側に色温度や肌、シーントーンなどが混線したカオス、右側にカメラ単位からシーン単位までの5段レイヤーへ整理された状態を示す横長図解",
    aspect: { width: 1536, height: 1024 },
    intro: "左→右で読む。混線していた要因が、5段の粒度に整列するところを掴む。",
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
    intro: "中心 → 4軸の順で読む。「映画っぽく」が、4軸のどれかに落ちる仕組みを掴む。",
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
    intro: "左→右で読む。デジタル信号が、染料・曲線・光・粒を通って最終ルックに変わる8段。",
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
  "correction-scope-map": {
    slug: "correction-scope-map",
    layout: "keypoint-row",
    title: "粒度ごとの「適用範囲」ミニ図",
    caption:
      "「どの粒度で動かすか」は、「どの範囲を一度に動かすか」と同じこと。粒度を取り違えると、戻したい範囲を戻せなくなる。",
    alt: "カメラ単位、フレーム単位、アングル単位、シーン単位、作品単位の5段階それぞれが、どこまでの範囲を支配するかを並べたキーポイント図解",
    aspect: { width: 1536, height: 1024 },
    intro: "粒度 = 適用範囲。並べて見ると、混ぜてはいけない理由が分かる。",
    itemsHeading: "5段の粒度 — 何を支配するか",
    items: [
      {
        glyph: "scope",
        label: "カメラ単位",
        sublabel: "同じカメラの全カットに効く。センサー差・レンズ個体差を均す。",
      },
      {
        glyph: "scope",
        label: "フレーム単位",
        sublabel: "1カット内のフレームごとに動く。露出揺れ・雲の流れに追従する。",
      },
      {
        glyph: "scope",
        label: "アングル単位",
        sublabel: "同アングルの別テイクに揃う。色温度・スモーク量の差を吸収する。",
      },
      {
        glyph: "scope",
        label: "シーン単位",
        sublabel: "同シーンの全カットに乗る。空気感・トーンの一貫性を担う。",
      },
      {
        glyph: "scope",
        label: "作品単位",
        sublabel: "全カットの基底に効く。ルック全体のベースを置く。",
      },
    ],
    takeaway: "粒度を取り違えると、戻したい範囲だけを戻せなくなる。",
  },
  "grading-words-to-knobs": {
    slug: "grading-words-to-knobs",
    layout: "keypoint-row",
    title: "監督の言葉 → 軸 → 操作",
    caption:
      "立ち会いで投げられる抽象的な一言を、4軸のどれに落とし、どのノブを動かすかで返す。言葉が手の届く場所に変わる。",
    alt: "「もう少し暖かく」「もう少し抜けを」「青を深く」「映画っぽく」という4つの監督の言葉を、それぞれの軸と具体的操作にマッピングしたキーポイント図解",
    aspect: { width: 1536, height: 1024 },
    intro: "言葉 → 軸 → 操作。3段ホップで、抽象を具体に落とす。",
    itemsHeading: "4つの言葉 — その先の軸と操作",
    items: [
      {
        glyph: "word-axis-knob",
        label: "「もう少し暖かく」",
        sublabel: "色の広がり・転がり / 色相を暖色側へ回し、彩度を一段。",
      },
      {
        glyph: "word-axis-knob",
        label: "「もう少し抜けを」",
        sublabel: "カーブ / S字を立て、肩を持ち上げる。",
      },
      {
        glyph: "word-axis-knob",
        label: "「青を深く」",
        sublabel: "濃度 / 青の輝度だけを独立に落とす。",
      },
      {
        glyph: "word-axis-knob",
        label: "「映画っぽく」",
        sublabel: "4軸の合成 / 仕込みで秘伝のタレを引き出す。",
      },
    ],
    takeaway: "言葉が、ノードに落ちる。",
  },
  "filmlook-density-mixture": {
    slug: "filmlook-density-mixture",
    layout: "keypoint-row",
    title: "フィルムらしさ = 濃度 + 色の混ざり",
    caption:
      "ルックは4軸あるが、フィルムを通したかどうかは、ほぼ二軸で見分けがつく。残り2軸は結果として動くだけ。",
    alt: "フィルムルックの正体を「濃度」と「色の混ざり」の2軸に絞って示すキーポイント図解",
    aspect: { width: 1536, height: 1024 },
    intro: "4軸の重みは均等ではない。フィルム固有の差は、二軸に集まる。",
    itemsHeading: "二軸 — フィルムの正体",
    items: [
      {
        glyph: "density",
        label: "濃度",
        sublabel:
          "どの明るさがどれだけ沈むか。暗部の粘り・S字の肩・対数で効くハイライトのロールオフ。",
      },
      {
        glyph: "mixture",
        label: "色の混ざり",
        sublabel:
          "どの色がどの色に寄るか。3層染料・分光密度曲線・DIRカプラー・プリンター光が決める。",
      },
    ],
    takeaway: "フィルムの正体は、二軸に絞れる。",
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
