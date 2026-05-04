"use client"

import { useEffect, useRef, useState } from "react"

/**
 * v5 動画モジュール: 破綻の 2 型 — 暗部の濁り / 色のひっくり返り
 *
 * viewBox 1600×1000 (16:10) を 2 セル横並び (各 800×1000)。LOOP = 8s。
 *
 * 左セル「暗部の濁り」= 加算 × べき乗の入れ子が原因。
 *   2 サブプロット (正規スタック / 入れ子) を縦に並べ、同じ入力に対する
 *   RGB 3 chan の応答を比較。正規 (a · x^γ) は 3 chan 同期で y=x 近傍。
 *   入れ子 (((x + L_c)^γ1 + b_c)^γ2) は ch 毎に L, b が違うため、暗部で
 *   3 chan が分離して y=x から浮き上がる (= グレーが色付きで濁る)。
 *
 * 右セル「色のひっくり返り」= 過度な加算で RGB 信号順位が反転。
 *   4 つの高彩度サンプル (赤主 / 緑主 / 青主 / 黄主) を縦 1 列ずつ並べ、
 *   各 ch に偏った加算 (offsetMax × u) を 0 → 強 → 0 とランプ。
 *   ある閾値を超えると主成分が入れ替わり、chip 色が hue ジャンプする様を
 *   現在 swatch + 起点 swatch + RGB バー + 順位ラベル + ひっくり返りバッジで可視化。
 *
 * SSR 設計: render は t=0 / isPlaying=false の純関数。
 * IntersectionObserver / matchMedia / requestAnimationFrame は useEffect 内のみ。
 * reducedMotion 時は u を中央値 0.65 で固定して静止画化。
 *
 * 配色: 既存 4 マーカー (labyrinth-to-factor / control-math / reversibility) と
 * AW 実装 (space-choice) で使用済みの TINT を全て除外。本モジュールは破綻が
 * テーマなので muted ・ warning 寄りで揃える。
 *   左 (暗部の濁り) → dusty taupe / shadow gray 系
 *   右 (色のひっくり返り) → faded crimson 系
 */

const LOOP = 8.0
const W = 1600
const H = 1000
const CELL_W = 800

const TEXT_PRIMARY = "rgba(28,15,110,0.95)"
const TEXT_MUTED = "rgba(28,15,110,0.55)"
const GRID = "rgba(139,127,255,0.18)"
const REF_LINE = "rgba(28,15,110,0.30)"

const TINT_SHADOW = {
  border: "rgba(125,115,105,0.85)",
  bg: "rgba(125,115,105,0.10)",
  curve: "rgb(95,85,75)",
}
const TINT_FLIP = {
  border: "rgba(190,100,100,0.85)",
  bg: "rgba(190,100,100,0.10)",
  curve: "rgb(160,70,70)",
}

// RGB 3 chan 表示色 (信号比較用、TINT とは別系統で意味は固定の R/G/B)
const CHAN_COLORS: Record<"R" | "G" | "B", string> = {
  R: "rgb(214,80,80)",
  G: "rgb(60,150,90)",
  B: "rgb(80,100,200)",
}

const SAMPLES = 128

function umphase(t: number) {
  // 0 → 1 → 0 を 1 ループで走る対称ランプ
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / LOOP)
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// ============================================================================
// 左セル: 暗部の濁り
// ============================================================================

const SHADOW_HEADER_X = 38
const SHADOW_HEADER_Y = 64
const SHADOW_SUB_Y_A = 156
const SHADOW_SUB_Y_B = 548
const SHADOW_PLOT_X = 70
const SHADOW_PLOT_W = 660
const SHADOW_PLOT_H = 320
const SHADOW_PLOT_Y_A = 180
const SHADOW_PLOT_Y_B = 572
const VALUE_Y = 956

function curveNormal(x: number, u: number) {
  // y = a · x^γ。RGB 3 chan 同じ a, γ なので 3 本が完全に重なる (= 1 本に見える)。
  const a = 1.05 + 0.2 * u
  const g = 0.88 + 0.18 * u
  return a * Math.pow(Math.max(0, x), g)
}

const NESTED_PARAMS = {
  R: { L: 0.05, b: 0.02 },
  G: { L: 0.08, b: -0.02 },
  B: { L: 0.03, b: 0.04 },
} as const
const NESTED_GAMMA1 = 0.7
const NESTED_GAMMA2 = 1.4

function curveNested(x: number, u: number, ch: "R" | "G" | "B") {
  const { L, b } = NESTED_PARAMS[ch]
  const inner = Math.pow(Math.max(0, x) + L * u, NESTED_GAMMA1) + b * u
  return Math.pow(Math.max(0, inner), NESTED_GAMMA2)
}

function buildCurvePoints(
  fn: (x: number) => number,
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number
) {
  const yMax = 1.0
  const points: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = i / SAMPLES
    const y = fn(x)
    const sx = plotX + x * plotW
    const yClamp = Math.max(-0.05, Math.min(yMax + 0.05, y))
    const sy = plotY + plotH - (yClamp / yMax) * plotH
    points.push(`${sx.toFixed(2)},${sy.toFixed(2)}`)
  }
  return points.join(" ")
}

function ShadowSubPlot({
  cellX,
  plotY,
  subY,
  title,
  curves,
  clipId,
}: {
  cellX: number
  plotY: number
  subY: number
  title: string
  curves: Array<{ ch: "R" | "G" | "B"; fn: (x: number) => number }>
  clipId: string
}) {
  const plotX = cellX + SHADOW_PLOT_X
  const refStartX = plotX
  const refStartY = plotY + SHADOW_PLOT_H
  const refEndX = plotX + SHADOW_PLOT_W
  const refEndY = plotY
  return (
    <g>
      <text
        x={cellX + SHADOW_HEADER_X + 10}
        y={subY}
        fontSize={20}
        fontWeight={600}
        fill={TEXT_PRIMARY}
      >
        {title}
      </text>
      <rect
        x={plotX}
        y={plotY}
        width={SHADOW_PLOT_W}
        height={SHADOW_PLOT_H}
        rx={4}
        ry={4}
        fill="rgba(255,255,255,0.45)"
        stroke={GRID}
        strokeWidth={1}
      />
      {/* 暗部帯 (x ∈ [0, 0.18]) */}
      <rect
        x={plotX}
        y={plotY}
        width={SHADOW_PLOT_W * 0.18}
        height={SHADOW_PLOT_H}
        fill="rgba(28,15,110,0.06)"
      />
      <text
        x={plotX + 10}
        y={plotY + 22}
        fontSize={12}
        fill={TEXT_MUTED}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        暗部
      </text>
      {/* 識別線 y = x */}
      <line
        x1={refStartX}
        y1={refStartY}
        x2={refEndX}
        y2={refEndY}
        stroke={REF_LINE}
        strokeWidth={1.2}
        strokeDasharray="4 6"
      />
      {/* RGB 3 chan カーブ (plot 領域でクリップ) */}
      <g clipPath={`url(#${clipId})`}>
        {curves.map(({ ch, fn }) => (
          <polyline
            key={ch}
            points={buildCurvePoints(
              fn,
              plotX,
              plotY,
              SHADOW_PLOT_W,
              SHADOW_PLOT_H
            )}
            fill="none"
            stroke={CHAN_COLORS[ch]}
            strokeWidth={3.2}
            strokeOpacity={0.88}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </g>
  )
}

function ShadowCell({
  cellX,
  t,
  reducedMotion,
}: {
  cellX: number
  t: number
  reducedMotion: boolean
}) {
  const u = reducedMotion ? 0.65 : umphase(t)
  return (
    <g>
      {/* セル背景 */}
      <rect
        x={cellX + 18}
        y={18}
        width={CELL_W - 36}
        height={H - 36}
        rx={24}
        ry={24}
        fill={TINT_SHADOW.bg}
        stroke={TINT_SHADOW.border}
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      <rect
        x={cellX + 18}
        y={18}
        width={CELL_W - 36}
        height={H - 36}
        rx={24}
        ry={24}
        fill="rgba(255,255,255,0.55)"
      />
      {/* Header */}
      <text
        x={cellX + SHADOW_HEADER_X}
        y={SHADOW_HEADER_Y}
        fontSize={28}
        fontWeight={700}
        fill={TINT_SHADOW.curve}
      >
        暗部の濁り
      </text>
      <text
        x={cellX + SHADOW_HEADER_X}
        y={SHADOW_HEADER_Y + 32}
        fontSize={16}
        fontWeight={500}
        fill={TEXT_MUTED}
      >
        加算 × べき乗の入れ子が、暗部で RGB を分離させる
      </text>
      {/* Sub plot A: 正規スタック */}
      <ShadowSubPlot
        cellX={cellX}
        plotY={SHADOW_PLOT_Y_A}
        subY={SHADOW_SUB_Y_A}
        title="正規スタック  y = a · x^γ"
        clipId="cfm-clip-shadow-a"
        curves={[
          { ch: "R", fn: (x) => curveNormal(x, u) },
          { ch: "G", fn: (x) => curveNormal(x, u) },
          { ch: "B", fn: (x) => curveNormal(x, u) },
        ]}
      />
      {/* Sub plot B: 入れ子 */}
      <ShadowSubPlot
        cellX={cellX}
        plotY={SHADOW_PLOT_Y_B}
        subY={SHADOW_SUB_Y_B}
        title="入れ子  y = ((x + Lₖ)^γ₁ + bₖ)^γ₂"
        clipId="cfm-clip-shadow-b"
        curves={[
          { ch: "R", fn: (x) => curveNested(x, u, "R") },
          { ch: "G", fn: (x) => curveNested(x, u, "G") },
          { ch: "B", fn: (x) => curveNested(x, u, "B") },
        ]}
      />
      {/* 強度 readout */}
      <text
        x={cellX + CELL_W - SHADOW_HEADER_X}
        y={VALUE_Y}
        textAnchor="end"
        fill={TEXT_PRIMARY}
        fontSize={22}
        fontWeight={600}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        強度 u = {u.toFixed(2)}
      </text>
    </g>
  )
}

// ============================================================================
// 右セル: 色のひっくり返り
// ============================================================================

const FLIP_HEADER_X = 38
const FLIP_HEADER_Y = 64

type RGB = [number, number, number]

function rgbCss(rgb: RGB) {
  const r = Math.round(clamp01(rgb[0]) * 255)
  const g = Math.round(clamp01(rgb[1]) * 255)
  const b = Math.round(clamp01(rgb[2]) * 255)
  return `rgb(${r}, ${g}, ${b})`
}

function rankSignature(rgb: RGB) {
  // 順位を文字列化 (例: "RGB" / "BRG")。≈ は無視して厳密順位で比較。
  const arr: Array<{ ch: "R" | "G" | "B"; v: number }> = [
    { ch: "R", v: rgb[0] },
    { ch: "G", v: rgb[1] },
    { ch: "B", v: rgb[2] },
  ]
  arr.sort((a, b) => b.v - a.v)
  return arr.map((x) => x.ch).join("")
}

function rankLabel(rgb: RGB) {
  // 表示用: 近接 (< 0.04) を ≈ で繋ぐ
  const arr: Array<{ ch: "R" | "G" | "B"; v: number }> = [
    { ch: "R", v: rgb[0] },
    { ch: "G", v: rgb[1] },
    { ch: "B", v: rgb[2] },
  ]
  arr.sort((a, b) => b.v - a.v)
  const parts: string[] = [arr[0].ch]
  for (let i = 1; i < arr.length; i++) {
    const sep = Math.abs(arr[i - 1].v - arr[i].v) < 0.04 ? "≈" : ">"
    parts.push(sep)
    parts.push(arr[i].ch)
  }
  return parts.join(" ")
}

type ChipSpec = {
  base: RGB
  offsetMax: RGB
  label: string
}

const CHIPS: ChipSpec[] = [
  { base: [0.95, 0.1, 0.05], offsetMax: [0.05, 0.5, 0.92], label: "赤主" },
  { base: [0.1, 0.92, 0.05], offsetMax: [0.92, 0.05, 0.5], label: "緑主" },
  { base: [0.05, 0.18, 0.95], offsetMax: [0.85, 0.5, 0.05], label: "青主" },
  { base: [0.92, 0.85, 0.1], offsetMax: [0.05, 0.1, 0.92], label: "黄主" },
]

function chipCurrent(spec: ChipSpec, u: number): RGB {
  return [
    spec.base[0] + spec.offsetMax[0] * u,
    spec.base[1] + spec.offsetMax[1] * u,
    spec.base[2] + spec.offsetMax[2] * u,
  ]
}

const FLIP_COL_W = 170
const FLIP_COL_GAP = 30
const FLIP_COLS = 4
const FLIP_GRID_W = FLIP_COL_W * FLIP_COLS + FLIP_COL_GAP * (FLIP_COLS - 1)
const FLIP_GRID_X0 = (CELL_W - FLIP_GRID_W) / 2

const FLIP_LABEL_Y = 142
const FLIP_SWATCH_Y = 158
const FLIP_SWATCH_SIZE = 150
const FLIP_INSET_SIZE = 42
const FLIP_INSET_LABEL_OFFSET = 6
const FLIP_BAR_Y0 = 332
const FLIP_BAR_W = 150
const FLIP_BAR_H = 22
const FLIP_BAR_GAP = 10
const FLIP_RANK_BASE_Y = 432
const FLIP_RANK_NOW_Y = 472
const FLIP_BADGE_Y = 522

function FlipColumn({
  cellX,
  col,
  spec,
  u,
}: {
  cellX: number
  col: number
  spec: ChipSpec
  u: number
}) {
  const colX = cellX + FLIP_GRID_X0 + col * (FLIP_COL_W + FLIP_COL_GAP)
  const cur = chipCurrent(spec, u)
  const baseRank = rankLabel(spec.base)
  const curRank = rankLabel(cur)
  const flipped = rankSignature(spec.base) !== rankSignature(cur)
  const swatchX = (FLIP_COL_W - FLIP_SWATCH_SIZE) / 2
  const insetX = swatchX + FLIP_SWATCH_SIZE - FLIP_INSET_SIZE - 6
  const insetY = FLIP_SWATCH_Y + FLIP_SWATCH_SIZE - FLIP_INSET_SIZE - 6
  return (
    <g transform={`translate(${colX}, 0)`}>
      {/* Chip ラベル */}
      <text
        x={FLIP_COL_W / 2}
        y={FLIP_LABEL_Y}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill={TEXT_MUTED}
      >
        {spec.label}
      </text>
      {/* 現在 swatch (大) */}
      <rect
        x={swatchX}
        y={FLIP_SWATCH_Y}
        width={FLIP_SWATCH_SIZE}
        height={FLIP_SWATCH_SIZE}
        rx={12}
        ry={12}
        fill={rgbCss(cur)}
        stroke="rgba(28,15,110,0.18)"
        strokeWidth={1.4}
      />
      {/* 起点 inset (右下、白縁付き) */}
      <text
        x={insetX + FLIP_INSET_SIZE / 2}
        y={insetY - FLIP_INSET_LABEL_OFFSET}
        textAnchor="middle"
        fontSize={10}
        fill="rgba(255,255,255,0.95)"
        fontWeight={700}
      >
        起点
      </text>
      <rect
        x={insetX}
        y={insetY}
        width={FLIP_INSET_SIZE}
        height={FLIP_INSET_SIZE}
        rx={6}
        ry={6}
        fill={rgbCss(spec.base)}
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={2}
      />
      {/* RGB bars */}
      {(["R", "G", "B"] as const).map((ch, i) => {
        const v = cur[i]
        const baseV = spec.base[i]
        const barX = (FLIP_COL_W - FLIP_BAR_W) / 2
        const barY = FLIP_BAR_Y0 + i * (FLIP_BAR_H + FLIP_BAR_GAP)
        const isClipped = v >= 0.999
        return (
          <g key={ch}>
            <text
              x={barX - 8}
              y={barY + FLIP_BAR_H - 6}
              textAnchor="end"
              fontSize={13}
              fontWeight={700}
              fill={CHAN_COLORS[ch]}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {ch}
            </text>
            <rect
              x={barX}
              y={barY}
              width={FLIP_BAR_W}
              height={FLIP_BAR_H}
              rx={4}
              ry={4}
              fill="rgba(255,255,255,0.7)"
              stroke="rgba(28,15,110,0.16)"
              strokeWidth={1}
            />
            {/* 起点値 (薄め) */}
            <rect
              x={barX}
              y={barY}
              width={FLIP_BAR_W * clamp01(baseV)}
              height={FLIP_BAR_H}
              rx={4}
              ry={4}
              fill={CHAN_COLORS[ch]}
              fillOpacity={0.22}
            />
            {/* 現在値 */}
            <rect
              x={barX}
              y={barY}
              width={FLIP_BAR_W * clamp01(v)}
              height={FLIP_BAR_H}
              rx={4}
              ry={4}
              fill={CHAN_COLORS[ch]}
              fillOpacity={0.85}
            />
            {/* clip マーカー */}
            {isClipped ? (
              <line
                x1={barX + FLIP_BAR_W}
                y1={barY - 2}
                x2={barX + FLIP_BAR_W}
                y2={barY + FLIP_BAR_H + 2}
                stroke="rgb(180,60,80)"
                strokeWidth={2}
              />
            ) : null}
            <text
              x={barX + FLIP_BAR_W + 8}
              y={barY + FLIP_BAR_H - 6}
              fontSize={12}
              fill={TEXT_MUTED}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {v.toFixed(2)}
            </text>
          </g>
        )
      })}
      {/* 順位ラベル (起点) */}
      <text
        x={FLIP_COL_W / 2}
        y={FLIP_RANK_BASE_Y}
        textAnchor="middle"
        fontSize={13}
        fill={TEXT_MUTED}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        起点  {baseRank}
      </text>
      {/* 順位ラベル (現在) */}
      <text
        x={FLIP_COL_W / 2}
        y={FLIP_RANK_NOW_Y}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill={flipped ? "rgb(180,60,80)" : TEXT_PRIMARY}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        現在  {curRank}
      </text>
      {/* ひっくり返りバッジ */}
      {flipped ? (
        <g transform={`translate(${FLIP_COL_W / 2}, ${FLIP_BADGE_Y})`}>
          <rect
            x={-52}
            y={-18}
            width={104}
            height={28}
            rx={14}
            ry={14}
            fill="rgba(180,60,80,0.18)"
            stroke="rgba(180,60,80,0.65)"
            strokeWidth={1.2}
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill="rgb(180,60,80)"
          >
            ひっくり返り
          </text>
        </g>
      ) : null}
    </g>
  )
}

function FlipCell({
  cellX,
  t,
  reducedMotion,
}: {
  cellX: number
  t: number
  reducedMotion: boolean
}) {
  const u = reducedMotion ? 0.65 : umphase(t)
  return (
    <g>
      <rect
        x={cellX + 18}
        y={18}
        width={CELL_W - 36}
        height={H - 36}
        rx={24}
        ry={24}
        fill={TINT_FLIP.bg}
        stroke={TINT_FLIP.border}
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      <rect
        x={cellX + 18}
        y={18}
        width={CELL_W - 36}
        height={H - 36}
        rx={24}
        ry={24}
        fill="rgba(255,255,255,0.55)"
      />
      <text
        x={cellX + FLIP_HEADER_X}
        y={FLIP_HEADER_Y}
        fontSize={28}
        fontWeight={700}
        fill={TINT_FLIP.curve}
      >
        色のひっくり返り
      </text>
      <text
        x={cellX + FLIP_HEADER_X}
        y={FLIP_HEADER_Y + 32}
        fontSize={16}
        fontWeight={500}
        fill={TEXT_MUTED}
      >
        加算が偏ると、ある閾値で RGB 順位が反転して hue が跳ぶ
      </text>
      {CHIPS.map((spec, col) => (
        <FlipColumn
          key={col}
          cellX={cellX}
          col={col}
          spec={spec}
          u={u}
        />
      ))}
      <text
        x={cellX + CELL_W - FLIP_HEADER_X}
        y={VALUE_Y}
        textAnchor="end"
        fill={TEXT_PRIMARY}
        fontSize={22}
        fontWeight={600}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        加算強度 u = {u.toFixed(2)}
      </text>
    </g>
  )
}

// ============================================================================

export default function CorrectionFailureModes({
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

  const t = animT

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="cfm-clip-shadow-a">
          <rect
            x={SHADOW_PLOT_X}
            y={SHADOW_PLOT_Y_A}
            width={SHADOW_PLOT_W}
            height={SHADOW_PLOT_H}
          />
        </clipPath>
        <clipPath id="cfm-clip-shadow-b">
          <rect
            x={SHADOW_PLOT_X}
            y={SHADOW_PLOT_Y_B}
            width={SHADOW_PLOT_W}
            height={SHADOW_PLOT_H}
          />
        </clipPath>
      </defs>
      {/* セル境界 */}
      <line
        x1={CELL_W}
        y1={28}
        x2={CELL_W}
        y2={H - 28}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="6 8"
      />
      <ShadowCell cellX={0} t={t} reducedMotion={reducedMotion} />
      <FlipCell cellX={CELL_W} t={t} reducedMotion={reducedMotion} />
    </svg>
  )
}
