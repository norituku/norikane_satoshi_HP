"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Phase 32-AN: 戻せる / 戻せない（可逆性の比較）
 *
 * 「層」概念を内部処理からも表示からも完全撤廃し、
 * 時間軸上の連続進度 P / Q だけで全 op を overlap させながら同時に動かす。
 *
 * 時間軸（合計 14 秒）:
 *   HOLD_START  2.5s : P = 0,        Q = 0,        y = x で 3 本静止
 *   FORWARD     4.0s : P が 0 → 1,    Q = 0,        forward 進行（再生 ▶）
 *   BACKWARD    4.0s : P = 1,        Q が 0 → 1,   backward 進行（逆再生 ◀）
 *   HOLD_END    3.5s : P = 1,        Q = 1,        理想線重ね（復元結果）
 *
 * 各 op i に進度区間 [lo_i, hi_i] を割り当て、隣接 op と区間を overlap させる
 * （5 op で [0.00, 0.32], [0.18, 0.50], [0.36, 0.68], [0.54, 0.86], [0.72, 1.00]）。
 * 各 op の進捗は p_i(P) = easeInOutCubic(clamp01((P - lo_i) / (hi_i - lo_i)))。
 *
 * 左セル（ゲイン × ガンマ）: 3 chan 完全同期、5 op 完全可逆。
 * 右セル（リフト × ガンマ）: 3 chan に位相 / param をずらした op 列を配り、
 *   さらに中間オシレーション osc_amp * sin(t * 2π * freq_i + phase_rgb) を加算
 *   （envelope = sin(P π) * sin(Q π) で両端 0 / 中央 max）。
 *
 * reducedMotion=true のときは HOLD_END 状態（P=1, Q=1, 理想線 1.0）で静止。
 */

const LOOP = 14
const HOLD_START = 2.5
const FORWARD_DUR = 4.0
const BACKWARD_DUR = 4.0
const HOLD_END = 3.5
const FADE_DUR = 0.2
const IDEAL_FADE_IN = 0.6
const IDEAL_FADE_OUT = 0.2

const NUM_OPS = 5
const SAMPLES = 96
const OSC_AMP = 0.06

const W = 1640
const H = 680
const CELL_W = 760
const GAP = 120

const TITLE_Y = 30
const PLOT_X_LOCAL = 50
const PLOT_Y = 60
const PLOT_W = CELL_W - 100 // 660
const PLOT_H = 480 // 60..540
const BADGE_CY = 575
const FORMULA_CY = 630

const Y_MAX = 2.5

const TEXT_PRIMARY = "rgba(28,15,110,0.95)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"
const GRID = "rgba(139,127,255,0.18)"
const Y_ONE_LINE = "rgba(139,127,255,0.32)"

const TINT_GAMMA = {
  title: "rgb(45,135,120)",
  border: "rgba(108,180,170,0.85)",
  bg: "rgba(108,180,170,0.10)",
}
const TINT_LIFT = {
  title: "rgb(55,108,180)",
  border: "rgba(120,165,225,0.85)",
  bg: "rgba(120,165,225,0.10)",
}

const RGB_R = "rgba(220, 60, 60, 0.88)"
const RGB_G = "rgba(60, 180, 80, 0.88)"
const RGB_B = "rgba(60, 110, 220, 0.88)"

type Op = { kind: "add" | "pow" | "mul"; param: number }
type Offsets = { lo: number; hi: number }[]

// 5 op の overlap 区間（基準）。
const BASE_OFFSETS: Offsets = [
  { lo: 0.0, hi: 0.32 },
  { lo: 0.18, hi: 0.5 },
  { lo: 0.36, hi: 0.68 },
  { lo: 0.54, hi: 0.86 },
  { lo: 0.72, hi: 1.0 },
]

function shiftOffsets(shift: number): Offsets {
  return BASE_OFFSETS.map(({ lo, hi }) => ({ lo: lo + shift, hi: hi + shift }))
}

const OFFSETS_BASE: Offsets = shiftOffsets(0)
const OFFSETS_R: Offsets = shiftOffsets(0)
const OFFSETS_G: Offsets = shiftOffsets(0.06)
const OFFSETS_B: Offsets = shiftOffsets(-0.06)

// 左セル（ゲイン × ガンマ）: 3 chan 同一、完全可逆。
const LEFT_OPS: Op[] = [
  { kind: "mul", param: 1.5 },
  { kind: "pow", param: 1.4 },
  { kind: "mul", param: 0.7 },
  { kind: "pow", param: 1.25 },
  { kind: "mul", param: 0.95 },
]

// 右セル（リフト × ガンマ）: RGB ごとに param をずらして中間で分離させる。
const RIGHT_OPS_R: Op[] = [
  { kind: "add", param: 0.22 },
  { kind: "pow", param: 1.5 },
  { kind: "add", param: 0.18 },
  { kind: "pow", param: 1.35 },
  { kind: "add", param: 0.1 },
]
const RIGHT_OPS_G: Op[] = [
  { kind: "add", param: 0.18 },
  { kind: "pow", param: 1.4 },
  { kind: "add", param: 0.22 },
  { kind: "pow", param: 1.25 },
  { kind: "add", param: 0.14 },
]
const RIGHT_OPS_B: Op[] = [
  { kind: "add", param: 0.14 },
  { kind: "pow", param: 1.55 },
  { kind: "add", param: 0.2 },
  { kind: "pow", param: 1.45 },
  { kind: "add", param: 0.18 },
]

const FREQS = [0.7, 0.85, 1.0, 1.15, 1.3]
const PHASE_R = 0
const PHASE_G = (2 * Math.PI) / 3
const PHASE_B = (4 * Math.PI) / 3

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function safePow(b: number, e: number): number {
  return Math.pow(Math.max(0, b), e)
}

function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function applyOpProgress(y: number, op: Op, p: number): number {
  if (op.kind === "add") return y + op.param * p
  if (op.kind === "pow") return safePow(y, 1 + (op.param - 1) * p)
  return y * (1 + (op.param - 1) * p)
}

function applyOpProgressInverse(y: number, op: Op, p: number): number {
  if (op.kind === "add") return y - op.param * p
  if (op.kind === "pow") return safePow(y, 1 / (1 + (op.param - 1) * p))
  return y / (1 + (op.param - 1) * p)
}

type Phase = "hold-start" | "forward" | "backward" | "hold-end"

type AnimState = {
  phase: Phase
  P: number
  Q: number
  t: number
  tInPhase: number
  tEnd: number
}

function computeAnimState(t: number): AnimState {
  if (t < HOLD_START) {
    return { phase: "hold-start", P: 0, Q: 0, t, tInPhase: t, tEnd: 0 }
  }
  if (t < HOLD_START + FORWARD_DUR) {
    const tIn = t - HOLD_START
    return {
      phase: "forward",
      P: clamp01(tIn / FORWARD_DUR),
      Q: 0,
      t,
      tInPhase: tIn,
      tEnd: 0,
    }
  }
  if (t < HOLD_START + FORWARD_DUR + BACKWARD_DUR) {
    const tIn = t - HOLD_START - FORWARD_DUR
    return {
      phase: "backward",
      P: 1,
      Q: clamp01(tIn / BACKWARD_DUR),
      t,
      tInPhase: tIn,
      tEnd: 0,
    }
  }
  const tIn = t - HOLD_START - FORWARD_DUR - BACKWARD_DUR
  return { phase: "hold-end", P: 1, Q: 1, t, tInPhase: tIn, tEnd: tIn }
}

function envelopeAmp(P: number, Q: number): number {
  return Math.sin(clamp01(P) * Math.PI) * Math.sin(clamp01(Q) * Math.PI)
}

/**
 * channel ごとの x → y を組み立てる。
 * forward 部は ops を 0..N-1 順に applyOpProgress、続けて backward 部を N-1..0 順に
 * applyOpProgressInverse。各 op の進捗は P / Q から区間補間 + eased。
 * oscAmp > 0 のとき、進捗に sin オシレーションを加算（envelope で両端 0）。
 */
function buildCurrentFn(
  ops: Op[],
  offsets: Offsets,
  P: number,
  Q: number,
  freqs: number[],
  phaseRgb: number,
  oscAmp: number,
  t: number,
): (x: number) => number {
  const env = oscAmp > 0 ? envelopeAmp(P, Q) : 0
  return (x: number) => {
    let y = x
    for (let i = 0; i < ops.length; i++) {
      const { lo, hi } = offsets[i]
      let p = easeInOutCubic(clamp01((P - lo) / (hi - lo)))
      if (oscAmp > 0) {
        p = clamp01(
          p + oscAmp * env * Math.sin(t * 2 * Math.PI * freqs[i] + phaseRgb),
        )
      }
      y = applyOpProgress(y, ops[i], p)
    }
    for (let i = ops.length - 1; i >= 0; i--) {
      const { lo, hi } = offsets[i]
      let p = easeInOutCubic(clamp01((Q - lo) / (hi - lo)))
      if (oscAmp > 0) {
        p = clamp01(
          p +
            oscAmp *
              env *
              Math.sin(t * 2 * Math.PI * freqs[i] + phaseRgb + Math.PI),
        )
      }
      y = applyOpProgressInverse(y, ops[i], p)
    }
    return y
  }
}

function buildPolyline(
  fn: (x: number) => number,
  plotXAbs: number,
  plotY: number,
  plotW: number,
  plotH: number,
): string {
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
): string {
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

function fmt3(n: number): string {
  return n.toFixed(3)
}

function formulaForOpAt(op: Op, p: number, isBackward: boolean): string {
  if (!isBackward) {
    if (op.kind === "add") return `y + ${fmt3(op.param * p)}`
    if (op.kind === "pow") return `y^${fmt3(1 + (op.param - 1) * p)}`
    return `y × ${fmt3(1 + (op.param - 1) * p)}`
  }
  if (op.kind === "add") return `y − ${fmt3(op.param * p)}`
  if (op.kind === "pow") return `y^(1/${fmt3(1 + (op.param - 1) * p)})`
  return `y ÷ ${fmt3(1 + (op.param - 1) * p)}`
}

/**
 * representative op index と eased 進捗を返す。
 * forward 中は floor(P * NUM_OPS)、backward 中は最後の op から戻り順に進む。
 */
function representativeOp(
  state: AnimState,
  offsets: Offsets,
): { index: number; p: number; isBackward: boolean } | null {
  if (state.phase === "hold-start" || state.phase === "hold-end") return null
  if (state.phase === "forward") {
    const idx = Math.min(NUM_OPS - 1, Math.max(0, Math.floor(state.P * NUM_OPS)))
    const { lo, hi } = offsets[idx]
    const p = easeInOutCubic(clamp01((state.P - lo) / (hi - lo)))
    return { index: idx, p, isBackward: false }
  }
  const fromQ = Math.min(NUM_OPS - 1, Math.max(0, Math.floor(state.Q * NUM_OPS)))
  const idx = NUM_OPS - 1 - fromQ
  const { lo, hi } = offsets[idx]
  const p = easeInOutCubic(clamp01((state.Q - lo) / (hi - lo)))
  return { index: idx, p, isBackward: true }
}

function timeSinceRepBoundary(state: AnimState): number {
  if (state.phase === "forward") {
    const rep = Math.min(NUM_OPS - 1, Math.floor(state.P * NUM_OPS))
    return (state.P - rep / NUM_OPS) * FORWARD_DUR
  }
  if (state.phase === "backward") {
    const fromQ = Math.min(NUM_OPS - 1, Math.floor(state.Q * NUM_OPS))
    return (state.Q - fromQ / NUM_OPS) * BACKWARD_DUR
  }
  return Infinity
}

type FormulaCell = {
  current: string
  prev: string | null
  fadeIn: number
  fadeOut: number
}

/**
 * channel 1 つぶんの formula state。rep op が直前境界から FADE_DUR 以内かつ
 * 種類が変わっているならクロスフェード（既存ロジック）。
 */
function makeFormulaForChannel(
  state: AnimState,
  ops: Op[],
  offsets: Offsets,
): FormulaCell {
  if (state.phase === "hold-start") {
    return { current: "y = x", prev: null, fadeIn: 1, fadeOut: 0 }
  }
  if (state.phase === "hold-end") {
    // 最後に適用された backward op = ops[0]
    return {
      current: formulaForOpAt(ops[0], 1, true),
      prev: null,
      fadeIn: 1,
      fadeOut: 0,
    }
  }
  const rep = representativeOp(state, offsets)
  if (!rep) return { current: "y = x", prev: null, fadeIn: 1, fadeOut: 0 }
  const op = ops[rep.index]
  const current = formulaForOpAt(op, rep.p, rep.isBackward)

  const since = timeSinceRepBoundary(state)
  if (since >= FADE_DUR) {
    return { current, prev: null, fadeIn: 1, fadeOut: 0 }
  }
  // 前 rep op を求める（forward は rep-1、backward は rep+1）
  let prevIdx: number
  let prevBackward: boolean
  if (!rep.isBackward) {
    prevIdx = rep.index - 1
    prevBackward = false
    if (prevIdx < 0) {
      // forward 開始直後 → 前は hold-start (y = x)
      const ratio = since / FADE_DUR
      return { current, prev: "y = x", fadeIn: ratio, fadeOut: 1 - ratio }
    }
  } else {
    prevIdx = rep.index + 1
    prevBackward = true
    if (prevIdx > NUM_OPS - 1) {
      // backward 開始直後 → 前は forward 最後 (ops[NUM_OPS-1] forward 完全)
      const ratio = since / FADE_DUR
      return {
        current,
        prev: formulaForOpAt(ops[NUM_OPS - 1], 1, false),
        fadeIn: ratio,
        fadeOut: 1 - ratio,
      }
    }
  }
  const prevOp = ops[prevIdx]
  if (prevOp.kind === op.kind) {
    // 同種 op → 数値だけ滑らかに動く（クロスフェードなし）
    return { current, prev: null, fadeIn: 1, fadeOut: 0 }
  }
  const ratio = since / FADE_DUR
  return {
    current,
    prev: formulaForOpAt(prevOp, prevBackward ? 0 : 1, prevBackward),
    fadeIn: ratio,
    fadeOut: 1 - ratio,
  }
}

type BadgeKind = "initial" | "forward" | "backward" | "hold-end"

function phaseToBadge(p: Phase): BadgeKind {
  if (p === "hold-start") return "initial"
  if (p === "forward") return "forward"
  if (p === "backward") return "backward"
  return "hold-end"
}

function previousPhase(p: Phase): Phase {
  if (p === "forward") return "hold-start"
  if (p === "backward") return "forward"
  if (p === "hold-end") return "backward"
  return "hold-end"
}

function badgeOpacities(state: AnimState): Record<BadgeKind, number> {
  const result: Record<BadgeKind, number> = {
    initial: 0,
    forward: 0,
    backward: 0,
    "hold-end": 0,
  }
  const cur = phaseToBadge(state.phase)
  const fadeIn = Math.min(1, state.tInPhase / FADE_DUR)
  result[cur] = fadeIn
  const fadeOut = 1 - fadeIn
  if (fadeOut > 0.001) {
    result[phaseToBadge(previousPhase(state.phase))] = fadeOut
  }
  return result
}

function Badge({
  cx,
  cy,
  kind,
  opacity,
}: {
  cx: number
  cy: number
  kind: BadgeKind
  opacity: number
}) {
  if (opacity <= 0.001) return null
  const cfgMap: Record<
    BadgeKind,
    { fill: string; text: string; icon: "play" | "rev" | "check" | "circle" }
  > = {
    initial: {
      fill: "rgba(120,120,130,0.88)",
      text: "初期状態",
      icon: "circle",
    },
    forward: {
      fill: "rgba(80,180,120,0.88)",
      text: "再生中",
      icon: "play",
    },
    backward: {
      fill: "rgba(220,130,60,0.88)",
      text: "逆再生中",
      icon: "rev",
    },
    "hold-end": {
      fill: "rgba(120,120,130,0.88)",
      text: "復元結果",
      icon: "check",
    },
  }
  const cfg = cfgMap[kind]
  const iconCx = cx - 40
  return (
    <g opacity={opacity}>
      <ellipse cx={cx} cy={cy} rx={70} ry={20} fill={cfg.fill} />
      {cfg.icon === "play" && (
        <polygon
          points={`${iconCx - 6},${cy - 8} ${iconCx - 6},${cy + 8} ${iconCx + 6},${cy}`}
          fill="white"
        />
      )}
      {cfg.icon === "rev" && (
        <polygon
          points={`${iconCx + 6},${cy - 8} ${iconCx + 6},${cy + 8} ${iconCx - 6},${cy}`}
          fill="white"
        />
      )}
      {cfg.icon === "check" && (
        <polyline
          points={`${iconCx - 7},${cy + 1} ${iconCx - 1},${cy + 7} ${iconCx + 8},${cy - 6}`}
          fill="none"
          stroke="white"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {cfg.icon === "circle" && (
        <circle
          cx={iconCx}
          cy={cy}
          r={6}
          fill="none"
          stroke="white"
          strokeWidth={2}
        />
      )}
      <text
        x={cx + 14}
        y={cy + 1}
        fontSize={16}
        fontWeight={600}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {cfg.text}
      </text>
    </g>
  )
}

function CellBackground({
  cellX,
  border,
  bg,
}: {
  cellX: number
  border: string
  bg: string
}) {
  return (
    <>
      <rect
        x={cellX + 6}
        y={6}
        width={CELL_W - 12}
        height={H - 12}
        rx={18}
        ry={18}
        fill={bg}
        stroke={border}
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      <rect
        x={cellX + 6}
        y={6}
        width={CELL_W - 12}
        height={H - 12}
        rx={18}
        ry={18}
        fill="rgba(255,255,255,0.55)"
      />
    </>
  )
}

function CellPlot({
  cellX,
  state,
  showIdeal,
  idealOpacity,
  curveBuilds,
  clipId,
}: {
  cellX: number
  state: AnimState
  showIdeal: boolean
  idealOpacity: number
  curveBuilds: { fnR: (x: number) => number; fnG: (x: number) => number; fnB: (x: number) => number }
  clipId: string
}) {
  const plotXAbs = cellX + PLOT_X_LOCAL
  const polyR = buildPolyline(curveBuilds.fnR, plotXAbs, PLOT_Y, PLOT_W, PLOT_H)
  const polyG = buildPolyline(curveBuilds.fnG, plotXAbs, PLOT_Y, PLOT_W, PLOT_H)
  const polyB = buildPolyline(curveBuilds.fnB, plotXAbs, PLOT_Y, PLOT_W, PLOT_H)
  const idealPoints = buildIdealPolyline(plotXAbs, PLOT_Y, PLOT_W, PLOT_H)

  const yOneScreen = PLOT_Y + PLOT_H * (1 - 1.0 / Y_MAX)
  const yHalfScreen = PLOT_Y + PLOT_H * (1 - 0.5 / Y_MAX)

  return (
    <g>
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

      {/* y = x 参照線（極薄） */}
      <line
        x1={plotXAbs}
        y1={PLOT_Y + PLOT_H}
        x2={plotXAbs + PLOT_W * (1 / Y_MAX)}
        y2={PLOT_Y}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="2 6"
      />

      <line
        x1={plotXAbs}
        y1={yHalfScreen}
        x2={plotXAbs + PLOT_W}
        y2={yHalfScreen}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="4 6"
      />

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

      {/* RGB 3 本 + HOLD_END 中の理想線 */}
      <g clipPath={`url(#${clipId})`}>
        {showIdeal && (
          <polyline
            points={idealPoints}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 6"
            opacity={idealOpacity}
          />
        )}
        <g style={{ mixBlendMode: "screen" }}>
          <polyline
            points={polyR}
            fill="none"
            stroke={RGB_R}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={polyG}
            fill="none"
            stroke={RGB_G}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={polyB}
            fill="none"
            stroke={RGB_B}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </g>
  )
}

function FormulaSingle({
  cellX,
  cell,
}: {
  cellX: number
  cell: FormulaCell
}) {
  return (
    <g>
      {cell.prev && (
        <text
          x={cellX + CELL_W / 2}
          y={FORMULA_CY}
          fontSize={32}
          fontWeight={500}
          fill={TEXT_PRIMARY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          opacity={cell.fadeOut}
        >
          {cell.prev}
        </text>
      )}
      <text
        x={cellX + CELL_W / 2}
        y={FORMULA_CY}
        fontSize={32}
        fontWeight={500}
        fill={TEXT_PRIMARY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        opacity={cell.fadeIn}
      >
        {cell.current}
      </text>
    </g>
  )
}

function FormulaRGB({
  cellX,
  rCell,
  gCell,
  bCell,
}: {
  cellX: number
  rCell: FormulaCell
  gCell: FormulaCell
  bCell: FormulaCell
}) {
  // 1 行 3 列に並べる: 左から R / G / B 等間隔。font-size 22。
  const slotW = (PLOT_W - 20) / 3
  const baseX = cellX + PLOT_X_LOCAL + 10
  const slots: { label: string; cell: FormulaCell; color: string; cx: number }[] = [
    {
      label: "R",
      cell: rCell,
      color: "rgb(195,55,55)",
      cx: baseX + slotW * 0.5,
    },
    {
      label: "G",
      cell: gCell,
      color: "rgb(45,150,70)",
      cx: baseX + slotW * 1.5,
    },
    {
      label: "B",
      cell: bCell,
      color: "rgb(55,100,200)",
      cx: baseX + slotW * 2.5,
    },
  ]
  return (
    <g>
      {slots.map((s) => (
        <g key={s.label}>
          {s.cell.prev && (
            <text
              x={s.cx}
              y={FORMULA_CY}
              fontSize={22}
              fontWeight={500}
              fill={TEXT_PRIMARY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              opacity={s.cell.fadeOut}
            >
              <tspan fill={s.color} fontWeight={700}>
                {s.label}:{" "}
              </tspan>
              {s.cell.prev}
            </text>
          )}
          <text
            x={s.cx}
            y={FORMULA_CY}
            fontSize={22}
            fontWeight={500}
            fill={TEXT_PRIMARY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity={s.cell.fadeIn}
          >
            <tspan fill={s.color} fontWeight={700}>
              {s.label}:{" "}
            </tspan>
            {s.cell.current}
          </text>
        </g>
      ))}
    </g>
  )
}

function Cell({
  cellX,
  title,
  tint,
  state,
  showIdeal,
  idealOpacity,
  curveBuilds,
  clipId,
  formulaMode,
  leftFormula,
  rgbFormula,
  badgeOps,
}: {
  cellX: number
  title: string
  tint: typeof TINT_GAMMA
  state: AnimState
  showIdeal: boolean
  idealOpacity: number
  curveBuilds: { fnR: (x: number) => number; fnG: (x: number) => number; fnB: (x: number) => number }
  clipId: string
  formulaMode: "single" | "rgb"
  leftFormula?: FormulaCell
  rgbFormula?: { r: FormulaCell; g: FormulaCell; b: FormulaCell }
  badgeOps: Record<BadgeKind, number>
}) {
  const cx = cellX + CELL_W / 2
  return (
    <g>
      <CellBackground cellX={cellX} border={tint.border} bg={tint.bg} />
      <text
        x={cx}
        y={TITLE_Y}
        fontSize={22}
        fontWeight={700}
        fill={tint.title}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {title}
      </text>

      <CellPlot
        cellX={cellX}
        state={state}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        curveBuilds={curveBuilds}
        clipId={clipId}
      />

      {/* バッジ（4 種類同時 render、 opacity でクロスフェード） */}
      <Badge cx={cx} cy={BADGE_CY} kind="initial" opacity={badgeOps.initial} />
      <Badge cx={cx} cy={BADGE_CY} kind="forward" opacity={badgeOps.forward} />
      <Badge cx={cx} cy={BADGE_CY} kind="backward" opacity={badgeOps.backward} />
      <Badge cx={cx} cy={BADGE_CY} kind="hold-end" opacity={badgeOps["hold-end"]} />

      {formulaMode === "single" && leftFormula && (
        <FormulaSingle cellX={cellX} cell={leftFormula} />
      )}
      {formulaMode === "rgb" && rgbFormula && (
        <FormulaRGB
          cellX={cellX}
          rCell={rgbFormula.r}
          gCell={rgbFormula.g}
          bCell={rgbFormula.b}
        />
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

  const state: AnimState = reducedMotion
    ? {
        phase: "hold-end",
        P: 1,
        Q: 1,
        t: 0,
        tInPhase: HOLD_END / 2,
        tEnd: HOLD_END / 2,
      }
    : computeAnimState(animT)

  let showIdeal = false
  let idealOpacity = 0
  if (reducedMotion) {
    showIdeal = true
    idealOpacity = 1
  } else if (state.phase === "hold-end") {
    showIdeal = true
    const tEnd = state.tEnd
    if (tEnd < IDEAL_FADE_IN) idealOpacity = tEnd / IDEAL_FADE_IN
    else if (tEnd > HOLD_END - IDEAL_FADE_OUT)
      idealOpacity = Math.max(0, (HOLD_END - tEnd) / IDEAL_FADE_OUT)
    else idealOpacity = 1
  }

  // 左セル: 3 chan 同一 ops + offsets、 osc なし、 phase shift なし
  const leftFn = buildCurrentFn(
    LEFT_OPS,
    OFFSETS_BASE,
    state.P,
    state.Q,
    FREQS,
    0,
    0,
    state.t,
  )
  // 3 本完全同期なので参照同一
  const leftCurves = { fnR: leftFn, fnG: leftFn, fnB: leftFn }

  const rightFnR = buildCurrentFn(
    RIGHT_OPS_R,
    OFFSETS_R,
    state.P,
    state.Q,
    FREQS,
    PHASE_R,
    OSC_AMP,
    state.t,
  )
  const rightFnG = buildCurrentFn(
    RIGHT_OPS_G,
    OFFSETS_G,
    state.P,
    state.Q,
    FREQS,
    PHASE_G,
    OSC_AMP,
    state.t,
  )
  const rightFnB = buildCurrentFn(
    RIGHT_OPS_B,
    OFFSETS_B,
    state.P,
    state.Q,
    FREQS,
    PHASE_B,
    OSC_AMP,
    state.t,
  )
  const rightCurves = { fnR: rightFnR, fnG: rightFnG, fnB: rightFnB }

  const leftFormula = makeFormulaForChannel(state, LEFT_OPS, OFFSETS_BASE)
  const rightFormulaR = makeFormulaForChannel(state, RIGHT_OPS_R, OFFSETS_R)
  const rightFormulaG = makeFormulaForChannel(state, RIGHT_OPS_G, OFFSETS_G)
  const rightFormulaB = makeFormulaForChannel(state, RIGHT_OPS_B, OFFSETS_B)

  const badgeOps = badgeOpacities(state)

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
            x={CELL_W + GAP + PLOT_X_LOCAL}
            y={PLOT_Y}
            width={PLOT_W}
            height={PLOT_H}
          />
        </clipPath>
      </defs>

      <Cell
        cellX={0}
        title="ゲイン × ガンマ（乗算 + べき乗）"
        tint={TINT_GAMMA}
        state={state}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        curveBuilds={leftCurves}
        clipId="cr-plot-left"
        formulaMode="single"
        leftFormula={leftFormula}
        badgeOps={badgeOps}
      />
      <Cell
        cellX={CELL_W + GAP}
        title="リフト × ガンマ（加算 + べき乗）"
        tint={TINT_LIFT}
        state={state}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        curveBuilds={rightCurves}
        clipId="cr-plot-right"
        formulaMode="rgb"
        rgbFormula={{
          r: rightFormulaR,
          g: rightFormulaG,
          b: rightFormulaB,
        }}
        badgeOps={badgeOps}
      />
    </svg>
  )
}
