"use client"

import { useEffect, useRef, useState } from "react"

/**
 * v5 動画モジュール: 作業空間の選択 (Log / Linear / Gamma) — 横一列 3 セル
 *
 * viewBox 1620×1000 (≒16:10) を 3 セル横並び (各 540×1000) に分け、
 * 同じ強さのパラメータ揺れを各空間の自然な操作で当てたときの
 * トーンカーブの応答を 6.5 秒ループで比較する。
 *
 * 各セルは縦 3 層構造:
 *   上段 — 空間名 (Log / Linear / Gamma) と当てる操作 (＋ オフセット / × ゲイン)
 *   中段 — トーンカーブの plot (x, y ∈ [0, 1.4] × [0, 1.5])。0..1 を超えた領域は
 *          薄い赤帯で「out of range」を示す。識別線として y=x を点線。
 *   下段 — 物理 (光物理に乗るか) / レンジ (0..1 信号レンジに収まるか) の二判定 + 数値
 *
 *   Log:    y = log2(7x + 1) / 3 + b,  b(t) = 0.30 · sin(2π t / 6.5)         ∈ [-0.30, 0.30]
 *   Linear: y = a · x,                  a(t) = 1.25 + 0.75 · sin(2π t / 6.5)   ∈ [ 0.50, 2.00]
 *   Gamma:  y = a · x^(1/2.4),          a(t) (Linear と共通)                   ∈ [ 0.50, 2.00]
 *
 * reducedMotion 時はパラメータを range 中央値で固定して静止画化する
 * (Log: b=0 / Linear,Gamma: a=1.25)。
 *
 * 配色は既存 4 マーカー (labyrinth-to-factor / control-math / reversibility) で
 * 使用済みの TINT_VIOLET / AMBER / CORAL / ROSE / SKY / TEAL / PLUM / LIME / INDIGO /
 * GAIN / GAMMA / OFFSET / LIFT と重複しない 3 色を選定。
 *   Log     → bronze
 *   Linear  → cobalt
 *   Gamma   → emerald
 */

const LOOP = 6.5
const W = 1620
const H = 1000
const CELL_W = 540
const CELL_H = H

// セル内レイアウト (セル相対座標)
const HEADER_X = 40
const HEADER_Y = 78
const SUB_Y = 124

const PLOT_X = 56
const PLOT_Y = 184
const PLOT_W = 428
const PLOT_H = 612
const PLOT_X_MAX = 1.4
const PLOT_Y_MAX = 1.5

const TICK_LABEL_Y = PLOT_Y + PLOT_H + 30

const VERDICT_Y = 858
const PILL_W = 198
const PILL_H = 60
const VALUE_Y = 974

const TEXT_PRIMARY = "rgba(28,15,110,0.95)"
const TEXT_MUTED = "rgba(28,15,110,0.55)"
const GRID = "rgba(139,127,255,0.18)"
const REF_LINE = "rgba(28,15,110,0.30)"
const OUT_OF_RANGE_FILL = "rgba(214,95,95,0.10)"
const OUT_OF_RANGE_STROKE = "rgba(214,95,95,0.45)"

// 配色 (前作 4 マーカーの TINT パレットと重複しない 3 色)
const TINT_LOG = {
  border: "rgba(170,115,75,0.85)",
  bg: "rgba(170,115,75,0.10)",
  curve: "rgb(135,80,40)",
}
const TINT_LINEAR = {
  border: "rgba(75,110,200,0.85)",
  bg: "rgba(75,110,200,0.10)",
  curve: "rgb(50,80,180)",
}
const TINT_GAMMA = {
  border: "rgba(60,150,110,0.85)",
  bg: "rgba(60,150,110,0.10)",
  curve: "rgb(35,120,80)",
}

type Tint = typeof TINT_LOG
type Verdict = "ok" | "warn" | "ng"

const VERDICT_GLYPH: Record<Verdict, string> = {
  ok: "○",
  warn: "△",
  ng: "✗",
}
const VERDICT_COLOR: Record<Verdict, string> = {
  ok: "rgb(35,120,80)",
  warn: "rgb(170,115,75)",
  ng: "rgb(180,60,80)",
}

function paramA(t: number) {
  // gain in [0.5, 2.0]
  return 1.25 + 0.75 * Math.sin((2 * Math.PI * t) / LOOP)
}
function paramB(t: number) {
  // offset in [-0.3, 0.3]
  return 0.3 * Math.sin((2 * Math.PI * t) / LOOP)
}

function curveLinear(x: number, a: number) {
  return a * x
}
function curveLog(x: number, b: number) {
  // log encode: y = log2(7x + 1) / 3 で y(0)=0 / y(1)=1。x∈[0,1.4] → y∈[0,1.13]。
  return Math.log2(7 * Math.max(0, x) + 1) / 3 + b
}
function curveGamma(x: number, a: number) {
  return a * Math.pow(Math.max(0, x), 1 / 2.4)
}

type CellSpec = {
  cellX: number
  spaceLabel: string
  operationLabel: string
  paramSymbol: string
  param: (t: number) => number
  curve: (x: number, p: number) => number
  reducedValue: number
  formatValue: (p: number) => string
  tint: Tint
  verdictPhysics: Verdict
  verdictRange: Verdict
  clipId: string
}

const CELLS: CellSpec[] = [
  {
    cellX: 0,
    spaceLabel: "Log",
    operationLabel: "＋ オフセット",
    paramSymbol: "b",
    param: paramB,
    curve: curveLog,
    reducedValue: 0,
    formatValue: (b) => `${b >= 0 ? "+" : "−"}${Math.abs(b).toFixed(2)}`,
    tint: TINT_LOG,
    verdictPhysics: "warn",
    verdictRange: "ok",
    clipId: "csc-clip-log",
  },
  {
    cellX: CELL_W,
    spaceLabel: "Linear",
    operationLabel: "× ゲイン",
    paramSymbol: "a",
    param: paramA,
    curve: curveLinear,
    reducedValue: 1.25,
    formatValue: (a) => a.toFixed(2),
    tint: TINT_LINEAR,
    verdictPhysics: "ok",
    verdictRange: "ng",
    clipId: "csc-clip-linear",
  },
  {
    cellX: CELL_W * 2,
    spaceLabel: "Gamma",
    operationLabel: "× ゲイン",
    paramSymbol: "a",
    param: paramA,
    curve: curveGamma,
    reducedValue: 1.25,
    formatValue: (a) => a.toFixed(2),
    tint: TINT_GAMMA,
    verdictPhysics: "ok",
    verdictRange: "ok",
    clipId: "csc-clip-gamma",
  },
]

const SAMPLES = 96

function buildPolyline(
  curve: (x: number, p: number) => number,
  p: number,
  plotX: number,
  plotY: number
) {
  const points: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = (i / SAMPLES) * PLOT_X_MAX
    const y = curve(x, p)
    const sx = plotX + (x / PLOT_X_MAX) * PLOT_W
    const sy = plotY + PLOT_H - (y / PLOT_Y_MAX) * PLOT_H
    points.push(`${sx.toFixed(2)},${sy.toFixed(2)}`)
  }
  return points.join(" ")
}

function VerdictPill({
  label,
  verdict,
  x,
}: {
  label: string
  verdict: Verdict
  x: number
}) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <rect
        x={0}
        y={0}
        width={PILL_W}
        height={PILL_H}
        rx={PILL_H / 2}
        ry={PILL_H / 2}
        fill="rgba(255,255,255,0.78)"
        stroke="rgba(28,15,110,0.18)"
        strokeWidth={1.2}
      />
      <text
        x={28}
        y={PILL_H / 2 + 7}
        fontSize={22}
        fontWeight={600}
        fill={TEXT_MUTED}
      >
        {label}
      </text>
      <text
        x={PILL_W - 36}
        y={PILL_H / 2 + 14}
        textAnchor="middle"
        fontSize={36}
        fontWeight={700}
        fill={VERDICT_COLOR[verdict]}
      >
        {VERDICT_GLYPH[verdict]}
      </text>
    </g>
  )
}

function Cell({
  spec,
  t,
  reducedMotion,
}: {
  spec: CellSpec
  t: number
  reducedMotion: boolean
}) {
  const p = reducedMotion ? spec.reducedValue : spec.param(t)
  const cellX = spec.cellX
  const plotX = cellX + PLOT_X
  const plotY = PLOT_Y
  const polyPoints = buildPolyline(spec.curve, p, plotX, plotY)

  // y=1 (信号レンジ天井) の screen y
  const ySignalTop = plotY + PLOT_H - (1.0 / PLOT_Y_MAX) * PLOT_H
  // 識別線 y = x を plot 内で。x = min(PLOT_X_MAX, PLOT_Y_MAX) で打ち止め。
  const refEndNorm = Math.min(PLOT_X_MAX, PLOT_Y_MAX)
  const refStartX = plotX
  const refStartY = plotY + PLOT_H
  const refEndX = plotX + (refEndNorm / PLOT_X_MAX) * PLOT_W
  const refEndY = plotY + PLOT_H - (refEndNorm / PLOT_Y_MAX) * PLOT_H
  // x = 1 の tick 位置
  const xOneScreen = plotX + (1.0 / PLOT_X_MAX) * PLOT_W

  return (
    <g>
      {/* セル背景 (色カテゴリ識別) */}
      <rect
        x={cellX + 18}
        y={18}
        width={CELL_W - 36}
        height={CELL_H - 36}
        rx={24}
        ry={24}
        fill={spec.tint.bg}
        stroke={spec.tint.border}
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      <rect
        x={cellX + 18}
        y={18}
        width={CELL_W - 36}
        height={CELL_H - 36}
        rx={24}
        ry={24}
        fill="rgba(255,255,255,0.55)"
      />

      {/* Header: 空間名 (大) */}
      <text
        x={cellX + HEADER_X}
        y={HEADER_Y}
        fontSize={48}
        fontWeight={700}
        fill={spec.tint.curve}
      >
        {spec.spaceLabel}
      </text>
      {/* 操作 + パラメータ記号 (小、italic) */}
      <text
        x={cellX + HEADER_X}
        y={SUB_Y}
        fontSize={22}
        fontWeight={600}
        fill={TEXT_PRIMARY}
        fontStyle="italic"
      >
        {spec.operationLabel} {spec.paramSymbol}
      </text>

      {/* plot 枠 */}
      <rect
        x={plotX}
        y={plotY}
        width={PLOT_W}
        height={PLOT_H}
        rx={6}
        ry={6}
        fill="rgba(255,255,255,0.45)"
        stroke={GRID}
        strokeWidth={1}
      />

      {/* y > 1 の out-of-range 帯 */}
      <rect
        x={plotX}
        y={plotY}
        width={PLOT_W}
        height={ySignalTop - plotY}
        fill={OUT_OF_RANGE_FILL}
      />
      <line
        x1={plotX}
        y1={ySignalTop}
        x2={plotX + PLOT_W}
        y2={ySignalTop}
        stroke={OUT_OF_RANGE_STROKE}
        strokeWidth={1.4}
        strokeDasharray="6 6"
      />
      <text
        x={plotX + PLOT_W - 12}
        y={plotY + 28}
        textAnchor="end"
        fontSize={14}
        fill="rgba(180,60,80,0.88)"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        out of range
      </text>
      <text
        x={plotX + PLOT_W - 12}
        y={ySignalTop + 22}
        textAnchor="end"
        fontSize={13}
        fill={TEXT_MUTED}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        y = 1
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

      {/* 入出力カーブ */}
      <g clipPath={`url(#${spec.clipId})`}>
        <polyline
          points={polyPoints}
          fill="none"
          stroke={spec.tint.curve}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* x = 1 tick */}
      <line
        x1={xOneScreen}
        y1={plotY + PLOT_H}
        x2={xOneScreen}
        y2={plotY + PLOT_H + 8}
        stroke={TEXT_MUTED}
        strokeWidth={1}
      />
      <text
        x={xOneScreen}
        y={TICK_LABEL_Y}
        textAnchor="middle"
        fontSize={13}
        fill={TEXT_MUTED}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        x = 1
      </text>

      {/* Verdict 二判定 */}
      <g transform={`translate(${cellX + HEADER_X}, ${VERDICT_Y})`}>
        <VerdictPill label="物理" verdict={spec.verdictPhysics} x={0} />
        <VerdictPill label="レンジ" verdict={spec.verdictRange} x={PILL_W + 22} />
      </g>

      {/* パラメータ readout */}
      <text
        x={cellX + CELL_W - HEADER_X}
        y={VALUE_Y}
        textAnchor="end"
        fill={TEXT_PRIMARY}
        fontSize={28}
        fontWeight={600}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {spec.paramSymbol} = {spec.formatValue(p)}
      </text>
    </g>
  )
}

export default function CorrectionSpaceChoice({
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
        {CELLS.map((spec) => {
          const plotX = spec.cellX + PLOT_X
          return (
            <clipPath key={spec.clipId} id={spec.clipId}>
              <rect x={plotX} y={PLOT_Y} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          )
        })}
      </defs>

      {/* セル境界線 (横並び 2 本、薄め) */}
      {[1, 2].map((i) => (
        <line
          key={`sep-${i}`}
          x1={CELL_W * i}
          y1={28}
          x2={CELL_W * i}
          y2={H - 28}
          stroke={GRID}
          strokeWidth={1}
          strokeDasharray="6 8"
        />
      ))}

      {CELLS.map((spec) => (
        <Cell
          key={spec.clipId}
          spec={spec}
          t={t}
          reducedMotion={reducedMotion}
        />
      ))}
    </svg>
  )
}
