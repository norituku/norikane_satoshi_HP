"use client"

import { useEffect, useRef, useState } from "react"

/**
 * v5 動画モジュール: 操作の数学 (オペとノブの対応)
 *
 * 4 並列ループ型。viewBox 1600×1000 を 2×2 グリッドに分け、
 * ゲイン (赤系) / ガンマ (緑系) / オフセット (黄系) / リフト (青系) の
 * 4 ミニ図を独立位相で 10 秒ループさせる。各セルに「ノブ・式・トーンカーブ」
 * を三つ揃いで配置し、パラメータの動きが式と曲線にどう波及するかを
 * 一望できる構成にする。
 *
 *   ゲイン a(t)    = 1.25 + 0.75 · sin(2π t / 10)         ∈ [0.5, 2.0]
 *   ガンマ γ(t)    = 1.25 + 0.75 · sin(2π t / 10 + π/2)   ∈ [0.5, 2.0]
 *   オフセット b(t) = 0.3 · sin(2π t / 10 + π)             ∈ [-0.3, 0.3]
 *   リフト L(t)    = 0.25 + 0.25 · sin(2π t / 10 + 3π/2)  ∈ [0, 0.5]
 *
 * 0〜100 信号レンジから一時的にはみ出す挙動 (ハイライトクリップ) は
 * plot 領域の clipPath で平らに見せ、教育的振り幅を優先する。
 * reducedMotion 時は各パラメータを range 中央値で固定して静止画化する。
 */

const LOOP = 10
const W = 1600
const H = 1000
const CELL_W = 800
const CELL_H = 500

// セル内レイアウト (セル相対座標)
const TITLE_X = 60
const TITLE_Y = 64
const FORMULA_Y = 116
const PARAM_LABEL_Y = 200
const TRACK_X = 60
const TRACK_Y = 240
const TRACK_W = 300
const TRACK_H = 14
const VALUE_Y = 310

// トーンカーブの小座標 (セル相対 → cellX, cellY を加えてスクリーン座標)
const PLOT_X = 410
const PLOT_Y = 70
const PLOT_W = 350
const PLOT_H = 380

const TEXT_PRIMARY = "rgba(28,15,110,0.92)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"
const GRID = "rgba(139,127,255,0.30)"
const AXIS = "rgba(28,15,110,0.55)"

// 配色 (前作 correction-labyrinth-to-factor.tsx の TINT パレットと整合)
const TINT_GAIN = {
  border: "rgba(214,127,140,0.85)",
  bg: "rgba(214,127,140,0.10)",
  curve: "rgb(180,60,80)",
}
const TINT_GAMMA = {
  border: "rgba(108,180,170,0.85)",
  bg: "rgba(108,180,170,0.10)",
  curve: "rgb(45,135,120)",
}
const TINT_OFFSET = {
  border: "rgba(214,162,108,0.85)",
  bg: "rgba(214,162,108,0.10)",
  curve: "rgb(170,115,55)",
}
const TINT_LIFT = {
  border: "rgba(120,165,225,0.85)",
  bg: "rgba(120,165,225,0.10)",
  curve: "rgb(55,108,180)",
}

type Tint = typeof TINT_GAIN

type CellSpec = {
  cellX: number
  cellY: number
  title: string
  formula: string
  paramSymbol: string
  tint: Tint
  param: (t: number) => number
  curve: (x: number, p: number) => number
  range: [number, number]
  clipId: string
}

function paramGain(t: number) {
  return 1.25 + 0.75 * Math.sin((2 * Math.PI * t) / LOOP)
}
function paramGamma(t: number) {
  return 1.25 + 0.75 * Math.sin((2 * Math.PI * t) / LOOP + Math.PI / 2)
}
function paramOffset(t: number) {
  return 0.3 * Math.sin((2 * Math.PI * t) / LOOP + Math.PI)
}
function paramLift(t: number) {
  return 0.25 + 0.25 * Math.sin((2 * Math.PI * t) / LOOP + (3 * Math.PI) / 2)
}

function curveGain(x: number, a: number) {
  return a * x
}
function curveGamma(x: number, g: number) {
  return Math.pow(Math.max(0, x), g)
}
function curveOffset(x: number, b: number) {
  return x + b
}
// Resolve 系: y = x + L · (1 − x)。L が大きいほど暗部だけ持ち上がる。
function curveLift(x: number, l: number) {
  return x + l * (1 - x)
}

const CELLS: CellSpec[] = [
  {
    cellX: 0,
    cellY: 0,
    title: "ゲイン (明部・乗算)",
    formula: "y = a · x",
    paramSymbol: "a",
    tint: TINT_GAIN,
    param: paramGain,
    curve: curveGain,
    range: [0.5, 2.0],
    clipId: "ccm-clip-gain",
  },
  {
    cellX: CELL_W,
    cellY: 0,
    title: "ガンマ (中間・べき乗)",
    formula: "y = x ^ γ",
    paramSymbol: "γ",
    tint: TINT_GAMMA,
    param: paramGamma,
    curve: curveGamma,
    range: [0.5, 2.0],
    clipId: "ccm-clip-gamma",
  },
  {
    cellX: 0,
    cellY: CELL_H,
    title: "オフセット (加算)",
    formula: "y = x + b",
    paramSymbol: "b",
    tint: TINT_OFFSET,
    param: paramOffset,
    curve: curveOffset,
    range: [-0.3, 0.3],
    clipId: "ccm-clip-offset",
  },
  {
    cellX: CELL_W,
    cellY: CELL_H,
    title: "リフト (暗部・複合)",
    formula: "y = x + L · (1 − x)",
    paramSymbol: "L",
    tint: TINT_LIFT,
    param: paramLift,
    curve: curveLift,
    range: [0, 0.5],
    clipId: "ccm-clip-lift",
  },
]

// 96 サンプルで polyline。極端値でも輪郭がガタつかないよう中庸を取る (仕様: 64〜128)。
const SAMPLES = 96

function buildPolyline(
  curve: (x: number, p: number) => number,
  p: number,
  plotX: number,
  plotY: number
) {
  const points: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = i / SAMPLES
    const y = curve(x, p)
    const sx = plotX + x * PLOT_W
    const sy = plotY + PLOT_H - y * PLOT_H
    points.push(`${sx.toFixed(2)},${sy.toFixed(2)}`)
  }
  return points.join(" ")
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function knobScreenX(p: number, range: [number, number], cellX: number) {
  const [lo, hi] = range
  const norm = clamp01((p - lo) / (hi - lo))
  return cellX + TRACK_X + norm * TRACK_W
}

function formatRangeLabel(v: number) {
  return v.toFixed(1)
}

function formatParamValue(symbol: string, p: number) {
  // ゲイン / ガンマは小数 2 桁、オフセット / リフトは符号付 2 桁。
  const sign = p >= 0 ? "+" : "−"
  if (symbol === "a" || symbol === "γ") return p.toFixed(2)
  return `${sign}${Math.abs(p).toFixed(2)}`
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
  // reducedMotion: range の中央値で固定 (a=1.25 / γ=1.25 / b=0 / L=0.25)。
  const p = reducedMotion
    ? (spec.range[0] + spec.range[1]) / 2
    : spec.param(t)
  const cellX = spec.cellX
  const cellY = spec.cellY

  const plotX = cellX + PLOT_X
  const plotY = cellY + PLOT_Y
  const polyPoints = buildPolyline(spec.curve, p, plotX, plotY)
  const knobCX = knobScreenX(p, spec.range, cellX)
  const knobCY = cellY + TRACK_Y + TRACK_H / 2

  return (
    <g>
      {/* セル背景 (色カテゴリ識別) */}
      <rect
        x={cellX + 12}
        y={cellY + 12}
        width={CELL_W - 24}
        height={CELL_H - 24}
        rx={22}
        ry={22}
        fill={spec.tint.bg}
        stroke={spec.tint.border}
        strokeOpacity={0.55}
        strokeWidth={1.6}
      />
      <rect
        x={cellX + 12}
        y={cellY + 12}
        width={CELL_W - 24}
        height={CELL_H - 24}
        rx={22}
        ry={22}
        fill="rgba(255,255,255,0.55)"
      />

      {/* タイトル */}
      <text
        x={cellX + TITLE_X}
        y={cellY + TITLE_Y}
        fill={TEXT_PRIMARY}
        fontSize={24}
        fontWeight={700}
      >
        {spec.title}
      </text>

      {/* 数式 (記事本文のフレーミングに揃える) */}
      <text
        x={cellX + TITLE_X}
        y={cellY + FORMULA_Y}
        fill={spec.tint.curve}
        fontSize={28}
        fontWeight={700}
      >
        {spec.formula}
      </text>

      {/* パラメータラベル */}
      <text
        x={cellX + TRACK_X}
        y={cellY + PARAM_LABEL_Y}
        fill={TEXT_MUTED}
        fontSize={16}
        fontWeight={500}
        letterSpacing={2}
      >
        パラメータ {spec.paramSymbol}
      </text>

      {/* range 端ラベル (min / max) */}
      <text
        x={cellX + TRACK_X}
        y={cellY + TRACK_Y - 10}
        fill={TEXT_MUTED}
        fontSize={13}
        fontWeight={500}
      >
        {formatRangeLabel(spec.range[0])}
      </text>
      <text
        x={cellX + TRACK_X + TRACK_W}
        y={cellY + TRACK_Y - 10}
        textAnchor="end"
        fill={TEXT_MUTED}
        fontSize={13}
        fontWeight={500}
      >
        {formatRangeLabel(spec.range[1])}
      </text>

      {/* ノブトラック */}
      <rect
        x={cellX + TRACK_X}
        y={cellY + TRACK_Y}
        width={TRACK_W}
        height={TRACK_H}
        rx={TRACK_H / 2}
        ry={TRACK_H / 2}
        fill="rgba(255,255,255,0.65)"
        stroke={spec.tint.border}
        strokeOpacity={0.55}
        strokeWidth={1.2}
      />

      {/* ノブハンドル (parameter 値直結) */}
      <circle
        cx={knobCX}
        cy={knobCY}
        r={15}
        fill={spec.tint.curve}
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={2.2}
      />

      {/* 現在値表示 */}
      <text
        x={cellX + TRACK_X}
        y={cellY + VALUE_Y}
        fill={TEXT_PRIMARY}
        fontSize={20}
        fontWeight={600}
      >
        {spec.paramSymbol} = {formatParamValue(spec.paramSymbol, p)}
      </text>

      {/* plot 枠 */}
      <rect
        x={plotX}
        y={plotY}
        width={PLOT_W}
        height={PLOT_H}
        rx={4}
        ry={4}
        fill="rgba(255,255,255,0.55)"
        stroke={AXIS}
        strokeOpacity={0.55}
        strokeWidth={1.2}
      />

      {/* y = x 参考線 */}
      <line
        x1={plotX}
        y1={plotY + PLOT_H}
        x2={plotX + PLOT_W}
        y2={plotY}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* 軸ラベル */}
      <text
        x={plotX - 8}
        y={plotY + PLOT_H + 4}
        textAnchor="end"
        fill={TEXT_MUTED}
        fontSize={13}
      >
        0
      </text>
      <text
        x={plotX - 8}
        y={plotY + 6}
        textAnchor="end"
        fill={TEXT_MUTED}
        fontSize={13}
      >
        1
      </text>
      <text
        x={plotX}
        y={plotY + PLOT_H + 22}
        fill={TEXT_MUTED}
        fontSize={13}
      >
        x
      </text>
      <text
        x={plotX - 24}
        y={plotY + 6}
        textAnchor="middle"
        fill={TEXT_MUTED}
        fontSize={13}
      >
        y
      </text>

      {/* 入出力カーブ (plot 領域でクリップ) */}
      <g clipPath={`url(#${spec.clipId})`}>
        <polyline
          points={polyPoints}
          fill="none"
          stroke={spec.tint.curve}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  )
}

export default function CorrectionControlMath({
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
          const plotY = spec.cellY + PLOT_Y
          return (
            <clipPath key={spec.clipId} id={spec.clipId}>
              <rect x={plotX} y={plotY} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          )
        })}
      </defs>

      {/* セル境界線 (2×2 グリッドの 十字) */}
      <line
        x1={CELL_W}
        y1={20}
        x2={CELL_W}
        y2={H - 20}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="6 8"
      />
      <line
        x1={20}
        y1={CELL_H}
        x2={W - 20}
        y2={CELL_H}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="6 8"
      />

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
