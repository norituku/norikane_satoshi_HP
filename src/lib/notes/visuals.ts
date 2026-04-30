/**
 * v5 説明ビジュアル レジストリ (図解仕様書 v5 / notion-117 準拠)。
 *
 * 旧 [[diagram:slug]] 記法を流用し、slug ごとに「動画」または「静止画」種別と
 * 表示メタデータだけをここで宣言する。実際の描画モジュールは
 * src/components/notes/visuals/<slug>.tsx に分離して dynamic import する。
 *
 * v3 の NoteDiagram (公文書ダンプ + AI 画像) とは別系統で、
 *   - 動画: React+SVG で時間進行を表現する説明アニメ。視界連動でのみ再生。
 *   - 静止画: React+SVG の構造図。常時表示。
 * v5 が登録されていない slug は従来の v3 DIAGRAM_REGISTRY にフォールバックする
 * (移行が完了するまでの一時的な接続)。
 */

export type VisualKind = "video" | "static" | "placeholder"

export type VisualConfig = {
  slug: string
  kind: VisualKind
  title: string
  /** 図の役割を 1〜2 行で。NoteDiagram の caption 相当 */
  caption: string
  /** スクリーンリーダー用の代替テキスト */
  alt: string
  /** 図領域のアスペクト比 (w/h) */
  aspect: { width: number; height: number }
  /** 「5 秒で何を読み取るか」の前置き 1 行 */
  intro?: string
  /** 動画のループ秒数。video のときのみ意味を持つ */
  loopSec?: number
}

export const VISUAL_REGISTRY: Record<string, VisualConfig> = {
  // ---- correction (PoC: 統合動画 1 + placeholder 4) ------------------------
  "correction-labyrinth-to-factor": {
    slug: "correction-labyrinth-to-factor",
    kind: "video",
    title: "迷宮 → 因数分解",
    caption:
      "9 つの混線要因が上空でふわふわ混ざり、フレーム → アングル → カメラ → シーン → 作品 の 5 列に落下して整列する。20 秒で 1 ループ。",
    alt: "9 つの混線要因が上空でふわふわ漂い、フレーム → アングル → カメラ → シーン → 作品 の 5 列に落下して整列するループアニメーション",
    aspect: { width: 16, height: 5 },
    intro: "頭の中の混線が、5 段の粒度に並び直る。",
    loopSec: 20,
  },
  // ---- placeholder (本フェーズでは図そのものは未実装。本文に slug が来てもエラーにしない) ----
  "correction-control-math": {
    slug: "correction-control-math",
    kind: "placeholder",
    title: "操作の数学（オペとノブの対応）",
    caption: "v5 仕様書 ID: correction-control-math。本フェーズでは未実装。",
    alt: "correction-control-math の placeholder",
    aspect: { width: 16, height: 10 },
  },
  "correction-reversibility": {
    slug: "correction-reversibility",
    kind: "placeholder",
    title: "戻せる / 戻せない（可逆性の比較）",
    caption: "v5 仕様書 ID: correction-reversibility。本フェーズでは未実装。",
    alt: "correction-reversibility の placeholder",
    aspect: { width: 16, height: 10 },
  },
  "correction-space-choice": {
    slug: "correction-space-choice",
    kind: "placeholder",
    title: "作業空間の選択（Log / Linear / Gamma）",
    caption: "v5 仕様書 ID: correction-space-choice。本フェーズでは未実装。",
    alt: "correction-space-choice の placeholder",
    aspect: { width: 16, height: 10 },
  },
  "correction-failure-modes": {
    slug: "correction-failure-modes",
    kind: "placeholder",
    title: "失敗モード（粒度の取り違え）",
    caption: "v5 仕様書 ID: correction-failure-modes。本フェーズでは未実装。",
    alt: "correction-failure-modes の placeholder",
    aspect: { width: 16, height: 10 },
  },
}

export function getVisualConfig(slug: string): VisualConfig | null {
  return VISUAL_REGISTRY[slug] ?? null
}
