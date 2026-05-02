"use client"

import { useEffect, useRef, useState } from "react"

/**
 * v5 動画モジュール: 戻せる / 戻せない (可逆性の比較)
 *
 * viewBox 1600×1000 (16:10) を 2 セル横並び (各 800×1000) に分け、
 * 左セル GAIN×GAMMA (乗算系、クリーン) と
 * 右セル LIFT×GAMMA (加算+べき乗の入れ子、くすむ) を 10 秒で 1 ループする。
 *
 * 各セル縦 4 層構造:
 *   0–80px      タイトル帯
 *   80–600px    入出力カーブ plot
 *   600–880px   数式表示帯 (層が外側に巻き付いて伸びる)
 *   880–1000px  層インジケータ + 進捗バー
 *
 * アニメーション: LOOP=10、SAMPLES=96、層境界 (2.5, 5.0, 7.5) で
 * グラフ更新 + 新規 formula token 部分の opacity 0→1 fade-in (200ms)。
 *
 * 数式は簡約せず入れ子のまま表示し、入れ子のまま評価したトーンカーブを描画する。
 * 左セルは数学的に K · x^G に集約されるためグラフは単純な x^p 系曲線、
 * 右セルは項が増え暗部 (x=0 近傍) が持ち上がる、という事実が形として見える。
 *
 * reducedMotion=true のときは layer=4 (最終形) で静止画化し、進捗バー満タン。
 */

const LOOP = 10
const W = 1600
const H = 1000
const CELL_W = 800
const SAMPLES = 96
const LAYER_DUR = 2.5
const FADE_DUR = 0.2

// セル相対レイアウト (セル原点からの相対座標)
const TITLE_Y = 50
const PLOT_X_LOCAL = 80
const PLOT_Y = 100
const PLOT_W = CELL_W - 160 // 640
const PLOT_H = 490 // 100..590
const FORMULA_CY = 740
const FORMULA_MAX_W = CELL_W - 80 // 720
const FORMULA_BASE_SIZE = 28
const PROGRESS_X_LOCAL = 80
const PROGRESS_W = CELL_W - 160 // 640
const PROGRESS_Y = 910
const PROGRESS_H = 12
const LAYER_LABEL_Y = 970

const Y_MAX = 1.4 // 左セル L4 が最大 ~1.39 なので 1.4 を上限に取る

const TEXT_PRIMARY = "rgba(28,15,110,0.95)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"
const GRID = "rgba(139,127,255,0.18)"
const Y_ONE_LINE = "rgba(139,127,255,0.32)"

// 配色 (前作 correction-control-math の TINT パレット流用)
const TINT_GAMMA = {
  curve: "rgb(45,135,120)",
  border: "rgba(108,180,170,0.85)",
  bg: "rgba(108,180,170,0.10)",
}
const TINT_LIFT = {
  curve: "rgb(55,108,180)",
  border: "rgba(120,165,225,0.85)",
  bg: "rgba(120,165,225,0.10)",
}

// === 入れ子のままの数式評価 ===
const A = 1.4
const G = 1.3
const A2 = 0.85
const G2 = 1.2
const L_LIFT = 0.18
const RG = 1.3
const L2_LIFT = 0.12
const RG2 = 1.15

function safePow(b: number, e: number) {
  return Math.pow(Math.max(0, b), e)
}

const LEFT_FNS: Array<(x: number) => number> = [
  // L1: y = a · x
  (x) => A * x,
  // L2: y = (a · x)^γ
  (x) => safePow(A * x, G),
  // L3: y = a2 · (a · x)^γ
  (x) => A2 * safePow(A * x, G),
  // L4: y = (a2 · (a · x)^γ)^γ2
  (x) => safePow(A2 * safePow(A * x, G), G2),
]

const RIGHT_FNS: Array<(x: number) => number> = [
  // L1: y = x + L · (1 − x)
  (x) => x + L_LIFT * (1 - x),
  // L2: y = (x + L · (1 − x))^γ
  (x) => safePow(x + L_LIFT * (1 - x), RG),
  // L3: y = (x + L · (1 − x))^γ + L2 · (1 − ((x + L · (1 − x))^γ))
  (x) => {
    const u = safePow(x + L_LIFT * (1 - x), RG)
    return u + L2_LIFT * (1 - u)
  },
  // L4: y = ((x + L · (1 − x))^γ + L2 · (1 − ((x + L · (1 − x))^γ)))^γ2
  (x) => {
    const u = safePow(x + L_LIFT * (1 - x), RG)
    const v = u + L2_LIFT * (1 - u)
    return safePow(v, RG2)
  },
]

// === 数式トークン (1 トークン = 1 <text> 要素) ===
// appearLayer: そのトークンが初登場する層 (1..4)。currentLayer 以下のトークンが visible。
// 表示順は文字列上の出現順 (display order)。層番号は出現順とは独立で、
// 内側 (a · x) は L1 で出現、外側の () は L2/L4 で後から巻き付く構造。
type Token = { text: string; sup?: boolean; appearLayer: number }

const LEFT_TOKENS: Token[] = [
  { text: "y = ", appearLayer: 1 },
  { text: "(", appearLayer: 4 }, // 最外 (
  { text: "a₂ · ", appearLayer: 3 },
  { text: "(", appearLayer: 2 }, // 内側 (
  { text: "a · x", appearLayer: 1 },
  { text: ")", appearLayer: 2 }, // 内側 )
  { text: "γ", sup: true, appearLayer: 2 },
  { text: ")", appearLayer: 4 }, // 最外 )
  { text: "γ₂", sup: true, appearLayer: 4 },
]

const RIGHT_TOKENS: Token[] = [
  { text: "y = ", appearLayer: 1 },
  { text: "(", appearLayer: 4 }, // 最外 (
  { text: "(", appearLayer: 2 }, // L2 の (
  { text: "x + L · (1 − x)", appearLayer: 1 },
  { text: ")", appearLayer: 2 }, // L2 の )
  { text: "γ", sup: true, appearLayer: 2 },
  { text: " + L₂ · (1 − ((x + L · (1 − x))", appearLayer: 3 },
  { text: "γ", sup: true, appearLayer: 3 },
  { text: "))", appearLayer: 3 },
  { text: ")", appearLayer: 4 }, // 最外 )
  { text: "γ₂", sup: true, appearLayer: 4 },
]

const LEFT_TITLE = "ゲイン × ガンマ（乗算系）"
const RIGHT_TITLE = "リフト × ガンマ（加算+べき乗の入れ子）"

// === レイアウトユーティリティ ===
// monospace 想定で文字幅を baseSize × 0.6 と概算。sup は 0.7em の縮小サイズ。
function tokensTotalWidth(tokens: Token[], baseSize: number) {
  const charW = baseSize * 0.6
  const supCharW = baseSize * 0.7 * 0.6
  let total = 0
  for (const t of tokens) {
    total += t.text.length * (t.sup ? supCharW : charW)
  }
  return total
}

function fitFontSize(tokens: Token[], maxWidth: number, baseSize: number) {
  const w = tokensTotalWidth(tokens, baseSize)
  if (w <= maxWidth) return baseSize
  return baseSize * (maxWidth / w)
}

function FormulaTokens({
  tokens,
  currentLayer,
  fadeOpacity,
  cx,
  cy,
  fill,
}: {
  tokens: Token[]
  currentLayer: number // 1..4
  fadeOpacity: number
  cx: number
  cy: number
  fill: string
}) {
  const visible = tokens.filter((t) => t.appearLayer <= currentLayer)
  const fontSize = fitFontSize(visible, FORMULA_MAX_W, FORMULA_BASE_SIZE)
  const charW = fontSize * 0.6
  const supSize = fontSize * 0.7
  const supCharW = supSize * 0.6

  const widths = visible.map(
    (t) => t.text.length * (t.sup ? supCharW : charW)
  )
  const totalW = widths.reduce((a, b) => a + b, 0)
  let cursor = cx - totalW / 2

  return (
    <>
      {visible.map((t, i) => {
        const x = cursor
        const w = widths[i]
        cursor += w
        const localFontSize = t.sup ? supSize : fontSize
        const offsetY = t.sup ? -fontSize * 0.42 : 0
        const opacity = t.appearLayer === currentLayer ? fadeOpacity : 1
        return (
          <text
            key={`${i}-${t.text}-${t.sup ? "s" : "n"}`}
            x={x}
            y={cy + offsetY}
            fontSize={localFontSize}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight={500}
            fill={fill}
            opacity={opacity}
            dominantBaseline="middle"
          >
            {t.text}
          </text>
        )
      })}
    </>
  )
}

function buildPolyline(
  fn: (x: number) => number,
  plotXAbs: number,
  plotY: number,
  plotW: number,
  plotH: number
) {
  const points: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = i / SAMPLES
    const y = fn(x)
    const sx = plotXAbs + x * plotW
    const sy = plotY + plotH * (1 - y / Y_MAX)
    points.push(`${sx.toFixed(2)},${sy.toFixed(2)}`)
  }
  return points.join(" ")
}

type Tint = typeof TINT_GAMMA

function Cell({
  cellX,
  title,
  tint,
  tokens,
  fns,
  layerIdx,
  fadeOpacity,
  progress,
  clipId,
}: {
  cellX: number
  title: string
  tint: Tint
  tokens: Token[]
  fns: Array<(x: number) => number>
  layerIdx: number // 0..3
  fadeOpacity: number
  progress: number
  clipId: string
}) {
  const currentLayer = layerIdx + 1
  const fn = fns[layerIdx]

  const plotXAbs = cellX + PLOT_X_LOCAL
  const polyPoints = buildPolyline(fn, plotXAbs, PLOT_Y, PLOT_W, PLOT_H)

  const yOneScreen = PLOT_Y + PLOT_H * (1 - 1.0 / Y_MAX)
  const yHalfScreen = PLOT_Y + PLOT_H * (1 - 0.5 / Y_MAX)

  const progressXAbs = cellX + PROGRESS_X_LOCAL

  return (
    <g>
      {/* セル背景 (色カテゴリ識別) */}
      <rect
        x={cellX + 14}
        y={14}
        width={CELL_W - 28}
        height={H - 28}
        rx={20}
        ry={20}
        fill={tint.bg}
        stroke={tint.border}
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      <rect
        x={cellX + 14}
        y={14}
        width={CELL_W - 28}
        height={H - 28}
        rx={20}
        ry={20}
        fill="rgba(255,255,255,0.55)"
      />

      {/* タイトル (中央寄せ) */}
      <text
        x={cellX + CELL_W / 2}
        y={TITLE_Y}
        fontSize={26}
        fontWeight={700}
        fill={tint.curve}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {title}
      </text>

      {/* plot 枠 */}
      <rect
        x={plotXAbs}
        y={PLOT_Y}
        width={PLOT_W}
        height={PLOT_H}
        rx={4}
        ry={4}
        fill="rgba(255,255,255,0.4)"
        stroke={GRID}
        strokeWidth={1}
      />

      {/* y=x 参照線 (極めて薄い) */}
      <line
        x1={plotXAbs}
        y1={PLOT_Y + PLOT_H}
        x2={plotXAbs + PLOT_W * (1 / Y_MAX)}
        y2={PLOT_Y}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="2 6"
      />

      {/* y=0.5 参照線 */}
      <line
        x1={plotXAbs}
        y1={yHalfScreen}
        x2={plotXAbs + PLOT_W}
        y2={yHalfScreen}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="4 6"
      />

      {/* y=1.0 参照線 (オーバーシュート判定の目安) */}
      <line
        x1={plotXAbs}
        y1={yOneScreen}
        x2={plotXAbs + PLOT_W}
        y2={yOneScreen}
        stroke={Y_ONE_LINE}
        strokeWidth={1.2}
        strokeDasharray="6 6"
      />
      <text
        x={plotXAbs + PLOT_W - 6}
        y={yOneScreen - 6}
        fontSize={13}
        fill={TEXT_MUTED}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        textAnchor="end"
      >
        y = 1
      </text>

      {/* 入出力カーブ (plot 領域でクリップ、層変化時は即時更新) */}
      <g clipPath={`url(#${clipId})`}>
        <polyline
          points={polyPoints}
          fill="none"
          stroke={tint.curve}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* 数式表示 (新規層トークンが fade-in) */}
      <FormulaTokens
        tokens={tokens}
        currentLayer={currentLayer}
        fadeOpacity={fadeOpacity}
        cx={cellX + CELL_W / 2}
        cy={FORMULA_CY}
        fill={TEXT_PRIMARY}
      />

      {/* 進捗バー track */}
      <rect
        x={progressXAbs}
        y={PROGRESS_Y}
        width={PROGRESS_W}
        height={PROGRESS_H}
        rx={PROGRESS_H / 2}
        ry={PROGRESS_H / 2}
        fill="rgba(255,255,255,0.7)"
        stroke={tint.border}
        strokeOpacity={0.55}
        strokeWidth={1.2}
      />
      {/* 進捗バー fill */}
      <rect
        x={progressXAbs}
        y={PROGRESS_Y}
        width={PROGRESS_W * progress}
        height={PROGRESS_H}
        rx={PROGRESS_H / 2}
        ry={PROGRESS_H / 2}
        fill={tint.curve}
        opacity={0.85}
      />
      {/* 層境界マーカー (25% / 50% / 75%) */}
      {[0.25, 0.5, 0.75].map((p) => (
        <circle
          key={p}
          cx={progressXAbs + PROGRESS_W * p}
          cy={PROGRESS_Y + PROGRESS_H / 2}
          r={3.5}
          fill="rgba(255,255,255,0.95)"
          stroke={tint.border}
          strokeWidth={1.2}
        />
      ))}

      {/* N / 4 層 ラベル */}
      <text
        x={cellX + CELL_W / 2}
        y={LAYER_LABEL_Y}
        fontSize={20}
        fontWeight={600}
        fill={TEXT_PRIMARY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {currentLayer} / 4 層
      </text>
    </g>
  )
}

export default function CorrectionReversibility({
  isPlaying,
  reducedMotion,
}: {
  isPlaying: boolean
  reducedMotion: boolean
}) {
  const [animT, setAnimT] = useState(0)
  const lastRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (reducedMotion || !isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastRef.current = null
      return
    }
    const tick = (now: number) => {
      if (lastRef.current == null) lastRef.current = now
      const dt = (now - lastRef.current) / 1000
      lastRef.current = now
      setAnimT((prev) => (prev + dt) % LOOP)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [isPlaying, reducedMotion])

  let layerIdx: number
  let fadeOpacity: number
  let progress: number
  if (reducedMotion) {
    layerIdx = 3
    fadeOpacity = 1
    progress = 1
  } else {
    const t = animT
    layerIdx = Math.min(3, Math.floor(t / LAYER_DUR))
    const localT = t - layerIdx * LAYER_DUR
    fadeOpacity = Math.min(1, localT / FADE_DUR)
    progress = t / LOOP
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="cr-plot-left">
          <rect
            x={PLOT_X_LOCAL}
            y={PLOT_Y}
            width={PLOT_W}
            height={PLOT_H}
          />
        </clipPath>
        <clipPath id="cr-plot-right">
          <rect
            x={CELL_W + PLOT_X_LOCAL}
            y={PLOT_Y}
            width={PLOT_W}
            height={PLOT_H}
          />
        </clipPath>
      </defs>

      {/* セル境界線 (中央、薄い破線) */}
      <line
        x1={CELL_W}
        y1={20}
        x2={CELL_W}
        y2={H - 20}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="6 8"
      />

      <Cell
        cellX={0}
        title={LEFT_TITLE}
        tint={TINT_GAMMA}
        tokens={LEFT_TOKENS}
        fns={LEFT_FNS}
        layerIdx={layerIdx}
        fadeOpacity={fadeOpacity}
        progress={progress}
        clipId="cr-plot-left"
      />
      <Cell
        cellX={CELL_W}
        title={RIGHT_TITLE}
        tint={TINT_LIFT}
        tokens={RIGHT_TOKENS}
        fns={RIGHT_FNS}
        layerIdx={layerIdx}
        fadeOpacity={fadeOpacity}
        progress={progress}
        clipId="cr-plot-right"
      />
    </svg>
  )
}
