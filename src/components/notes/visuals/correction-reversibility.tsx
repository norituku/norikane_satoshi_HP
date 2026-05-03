"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Phase 32-AL: 戻せる / 戻せない (可逆性の比較)
 *
 * viewBox 1600×1000 (16:10) を 2 セル横並び (各 800×1000) に分け、
 * 左セル GAIN×GAMMA (×K と ^γ を交互積み) と
 * 右セル LIFT×GAMMA (+β と ^γ を交互積み) を 14 秒で 1 ループする。
 *
 * 14 層往復構造:
 *   1〜7 層 (往路): 7 個の op を順に積む (各 1 秒)
 *   8〜14 層 (復路): naive な戻し ── op1^-1, op2^-1, ..., op7^-1 を
 *                     forward と同順序で適用する (符号だけ反転、順序を逆転しない)
 *   原典の趣旨: カラリストが「ノードを後から積み足して戻そうとする」と、
 *   数学的には正しい逆順では積まれず、戻り切らずに残差が出る。
 *
 * 14 層目 (復路終端) のみ y = x 理想復元線を点線で重ね描きし、
 * 実線とのズレで「戻りきらなかった残差」= くすみ を可視化する。
 *
 * reducedMotion=true のときは layerIdx=13 (最終形 + 理想線) で静止画化。
 */

const LOOP = 14
const LAYER_DUR = 1.0
const FADE_DUR = 0.2

const W = 1600
const H = 1000
const CELL_W = 800
const SAMPLES = 96

const TITLE_Y = 50
const PLOT_X_LOCAL = 80
const PLOT_Y = 100
const PLOT_W = CELL_W - 160 // 640
const PLOT_H = 560 // 100..660
const PHASE_LABEL_CY = 730
const STEP_FORMULA_CY = 800
const SUBLABEL_CY = 880

const Y_MAX = 1.7

const TEXT_PRIMARY = "rgba(28,15,110,0.95)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"
const GRID = "rgba(139,127,255,0.18)"
const Y_ONE_LINE = "rgba(139,127,255,0.32)"

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

function safePow(b: number, e: number) {
  return Math.pow(Math.max(0, b), e)
}

// 1 ノード = 1 op。kind="add" は y + β、"pow" は y^γ、"mul" は y · K。
type Op = { kind: "add" | "pow" | "mul"; param: number }

// 左セル: ×K と ^γ を交互に 7 つ積む。K は現行 A=1.4 / A2=0.85 を流用 + 追加 3 値。
const LEFT_OPS: Op[] = [
  { kind: "mul", param: 1.4 },
  { kind: "pow", param: 1.3 },
  { kind: "mul", param: 0.85 },
  { kind: "pow", param: 1.2 },
  { kind: "mul", param: 1.1 },
  { kind: "pow", param: 1.1 },
  { kind: "mul", param: 0.95 },
]

// 右セル: +β と ^γ を交互に 7 つ積む。β は L_LIFT=0.18 / L2_LIFT=0.12 を流用 + 追加 2 値。
// γ は RG=1.3 / RG2=1.15 を流用 + 追加 1 値。
const RIGHT_OPS: Op[] = [
  { kind: "add", param: 0.18 },
  { kind: "pow", param: 1.3 },
  { kind: "add", param: 0.12 },
  { kind: "pow", param: 1.15 },
  { kind: "add", param: 0.08 },
  { kind: "pow", param: 1.1 },
  { kind: "add", param: 0.05 },
]

function applyOp(y: number, op: Op): number {
  if (op.kind === "add") return y + op.param
  if (op.kind === "pow") return safePow(y, op.param)
  return y * op.param
}

function applyOpInverse(y: number, op: Op): number {
  if (op.kind === "add") return y - op.param
  if (op.kind === "pow") return safePow(y, 1 / op.param)
  return y / op.param
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : n.toFixed(2)
}

function opLabel(op: Op): string {
  if (op.kind === "add") return `y + ${fmt(op.param)}`
  if (op.kind === "pow") return `y^${fmt(op.param)}`
  return `y × ${fmt(op.param)}`
}

function opInverseLabel(op: Op): string {
  if (op.kind === "add") return `y − ${fmt(op.param)}`
  if (op.kind === "pow") return `y^(1/${fmt(op.param)})`
  return `y ÷ ${fmt(op.param)}`
}

// layerIdx 0..13 → x → y 累積関数。
// 0..6 = 往路 (ops[0..i] を順適用)
// 7..13 = 復路: 全往路完了後、ops[0..k] の逆を「同順序」で重ねる (naive 戻し)
function buildLayerFn(ops: Op[], layerIdx: number): (x: number) => number {
  return (x: number) => {
    let y = x
    if (layerIdx < 7) {
      for (let i = 0; i <= layerIdx; i++) y = applyOp(y, ops[i])
      return y
    }
    for (let i = 0; i < 7; i++) y = applyOp(y, ops[i])
    const back = layerIdx - 6 // 1..7
    for (let i = 0; i < back; i++) y = applyOpInverse(y, ops[i])
    return y
  }
}

function phaseLabelFor(layerIdx: number): string {
  if (layerIdx < 7) return `往路 ${layerIdx + 1} / 7 層`
  return `復路 ${layerIdx - 6} / 7 層`
}

function stepFormulaFor(ops: Op[], layerIdx: number): string {
  if (layerIdx < 7) return opLabel(ops[layerIdx])
  return opInverseLabel(ops[layerIdx - 7])
}

function buildPolyline(
  fn: (x: number) => number,
  plotXAbs: number,
  plotY: number,
  plotW: number,
  plotH: number,
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

function buildIdealPolyline(
  plotXAbs: number,
  plotY: number,
  plotW: number,
  plotH: number,
) {
  // y=x を 0..1 区間で描く (Y_MAX=1.7 上では plot 高の 1/1.7 まで)
  const N = 32
  const points: string[] = []
  for (let i = 0; i <= N; i++) {
    const x = i / N
    const sx = plotXAbs + x * plotW
    const sy = plotY + plotH * (1 - x / Y_MAX)
    points.push(`${sx.toFixed(2)},${sy.toFixed(2)}`)
  }
  return points.join(" ")
}

type Tint = typeof TINT_GAMMA

function Cell({
  cellX,
  title,
  tint,
  ops,
  layerIdx,
  fadeOpacity,
  showIdeal,
  idealOpacity,
  clipId,
}: {
  cellX: number
  title: string
  tint: Tint
  ops: Op[]
  layerIdx: number
  fadeOpacity: number
  showIdeal: boolean
  idealOpacity: number
  clipId: string
}) {
  const fn = buildLayerFn(ops, layerIdx)
  const plotXAbs = cellX + PLOT_X_LOCAL
  const polyPoints = buildPolyline(fn, plotXAbs, PLOT_Y, PLOT_W, PLOT_H)
  const idealPoints = buildIdealPolyline(plotXAbs, PLOT_Y, PLOT_W, PLOT_H)

  const yOneScreen = PLOT_Y + PLOT_H * (1 - 1.0 / Y_MAX)
  const yHalfScreen = PLOT_Y + PLOT_H * (1 - 0.5 / Y_MAX)

  const phase = phaseLabelFor(layerIdx)
  const stepFormula = stepFormulaFor(ops, layerIdx)
  const isBackward = layerIdx >= 7

  return (
    <g>
      {/* セル背景 */}
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

      {/* タイトル */}
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

      {/* y=x 参照線 (極めて薄い、常時) */}
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

      {/* y=1.0 参照線 (オーバーシュート目安) */}
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

      {/* 入出力カーブ + 14 層目だけ y=x 理想線重ね描き */}
      <g clipPath={`url(#${clipId})`}>
        {showIdeal && (
          <polyline
            points={idealPoints}
            fill="none"
            stroke={tint.curve}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 6"
            opacity={0.5 * idealOpacity}
          />
        )}
        <polyline
          points={polyPoints}
          fill="none"
          stroke={tint.curve}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* phase ラベル: 往路 N/7 層 / 復路 M/7 層 (plot 直下) */}
      <text
        x={cellX + CELL_W / 2}
        y={PHASE_LABEL_CY}
        fontSize={22}
        fontWeight={600}
        fill={isBackward ? tint.curve : TEXT_PRIMARY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {phase}
      </text>

      {/* 直前ステップで適用された差分式 (1 行、グラフ近接) */}
      <text
        x={cellX + CELL_W / 2}
        y={STEP_FORMULA_CY}
        fontSize={36}
        fontWeight={500}
        fill={TEXT_PRIMARY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        opacity={fadeOpacity}
      >
        {stepFormula}
      </text>

      {/* 14 層目: 残差説明サブラベル */}
      {showIdeal && (
        <text
          x={cellX + CELL_W / 2}
          y={SUBLABEL_CY}
          fontSize={17}
          fontWeight={500}
          fill={TEXT_MUTED}
          textAnchor="middle"
          dominantBaseline="middle"
          opacity={idealOpacity}
        >
          点線 = 理想復元 y = x ／ 実線とのズレが残差
        </text>
      )}
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
  let idealOpacity: number
  if (reducedMotion) {
    layerIdx = 13
    fadeOpacity = 1
    idealOpacity = 1
  } else {
    const t = animT
    layerIdx = Math.min(13, Math.floor(t / LAYER_DUR))
    const localT = t - layerIdx * LAYER_DUR
    fadeOpacity = Math.min(1, localT / FADE_DUR)
    idealOpacity = layerIdx === 13 ? Math.min(1, localT / FADE_DUR) : 0
  }

  const showIdeal = layerIdx === 13

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id="cr-plot-left">
          <rect x={PLOT_X_LOCAL} y={PLOT_Y} width={PLOT_W} height={PLOT_H} />
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

      {/* セル境界線 */}
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
        title="ゲイン × ガンマ（乗算+べき乗）"
        tint={TINT_GAMMA}
        ops={LEFT_OPS}
        layerIdx={layerIdx}
        fadeOpacity={fadeOpacity}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        clipId="cr-plot-left"
      />
      <Cell
        cellX={CELL_W}
        title="リフト × ガンマ（加算+べき乗）"
        tint={TINT_LIFT}
        ops={RIGHT_OPS}
        layerIdx={layerIdx}
        fadeOpacity={fadeOpacity}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        clipId="cr-plot-right"
      />
    </svg>
  )
}
