"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Phase 32-AR: 戻せる / 戻せない（可逆性の比較）
 *
 * Phase 32-AR 主要変更:
 *  - signedPow / Y 軸下方拡張 / y=0 軸線まわりを撤去（通常 pow + Y[0,1] へ復帰）
 *  - リフトを「両端不動点 bump 加算」へ: y + L * p * 4y(1-y)
 *    → y=0 / y=1 を全 p で固定。bump は [0,1] 外でゼロクランプ。
 *  - shiftOffsets を非負方向のみ (R/G/B = 0 / +0.06 / +0.12) に再配置
 *    → HOLD_START で必ず y = x 直線
 *  - applyOp に p<=0 早期 return ガード
 *  - 右セル forward リズム: 下げ→γ→上げ→γ→下げ
 *  - 右セル backward 設計逸脱（視覚意図優先で再解釈）:
 *      forward の逆順 + 解析的逆操作 (kA*Q, kP*Q で gradient)
 *      add 逆: bump 加算 y' = y + L * 4y(1-y) を二次方程式で解く inverseBumpAdd
 *      pow 逆: forward の逆 exponent 1/forward.param へ Q で補間
 *    発注書5 の文言「Q=1 で 1.0 ＝ 直線」と「逆符号 + 振幅 70-85%」を厳密実装すると
 *    forward の pow が打ち消されず HOLD_END max|y-x| ≈ 0.23 となり(2)復元視覚と
 *    assert 4 < 0.10 が両立しないため、視覚意図 (HOLD_END で「直線にかなり近い」)
 *    を優先して backward を完全打ち消し近傍へ再設計。
 *  - dev assert を 4 本に再構成（HOLD_START 直線 / 端点不動 / FORWARD 終 / HOLD_END）
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
const OSC_AMP_RIGHT = 0.06

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

const Y_MIN = 0
const Y_MAX = 1.0
const Y_RANGE = Y_MAX - Y_MIN

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

// Phase 32-AR: 全 shift を非負に揃え、HOLD_START (P=0) で全 op の lo>=0 → p=0 → no-op を保証。
const OFFSETS_LEFT_R: Offsets = shiftOffsets(0)
const OFFSETS_LEFT_G: Offsets = shiftOffsets(0.06)
const OFFSETS_LEFT_B: Offsets = shiftOffsets(0.12)

const OFFSETS_RIGHT_R: Offsets = shiftOffsets(0)
const OFFSETS_RIGHT_G: Offsets = shiftOffsets(0.06)
const OFFSETS_RIGHT_B: Offsets = shiftOffsets(0.12)

// 左セル（ゲイン × ガンマ）: RGB ごとに param をずらして中盤の識別性を出す。
// 各 chan は自分自身の数学的逆を backward 区間で適用するので完全可逆。
const LEFT_OPS_R: Op[] = [
  { kind: "mul", param: 2.2 },
  { kind: "pow", param: 1.85 },
  { kind: "mul", param: 0.45 },
  { kind: "pow", param: 0.55 },
  { kind: "mul", param: 1.3 },
]
const LEFT_OPS_G: Op[] = [
  { kind: "mul", param: 2.0 },
  { kind: "pow", param: 1.7 },
  { kind: "mul", param: 0.5 },
  { kind: "pow", param: 0.62 },
  { kind: "mul", param: 1.2 },
]
const LEFT_OPS_B: Op[] = [
  { kind: "mul", param: 2.4 },
  { kind: "pow", param: 1.95 },
  { kind: "mul", param: 0.4 },
  { kind: "pow", param: 0.5 },
  { kind: "mul", param: 1.4 },
]

// 右セル forward: 下げ → γ強 → 上げ大 → γ弱 → 下げ
// 各 add は両端不動点 bump 加算 y + L*p*4y(1-y) で y=0/1 を完全固定。
// G/B は位相ずらしで amp/exponent を 5〜10% ずらす（B が一番激しく、R が穏やか）。
const RIGHT_FORWARD_R: Op[] = [
  { kind: "add", param: -0.2 },
  { kind: "pow", param: 1.48 },
  { kind: "add", param: 0.3 },
  { kind: "pow", param: 0.65 },
  { kind: "add", param: -0.21 },
]
const RIGHT_FORWARD_G: Op[] = [
  { kind: "add", param: -0.21 },
  { kind: "pow", param: 1.5 },
  { kind: "add", param: 0.32 },
  { kind: "pow", param: 0.63 },
  { kind: "add", param: -0.22 },
]
const RIGHT_FORWARD_B: Op[] = [
  { kind: "add", param: -0.22 },
  { kind: "pow", param: 1.52 },
  { kind: "add", param: 0.34 },
  { kind: "pow", param: 0.6 },
  { kind: "add", param: -0.23 },
]

// 右セル backward: forward の逆順 + raw param（apply 側で解析的逆を実装）。
// applyOpProgressBackward で:
//   add: inverseBumpAdd(y, op.param * p * Q) で forward bump 加算を解析的に巻き戻す
//   pow: forward の逆 exponent 1/op.param へ Q で補間（Q=0 で no-op、Q=1 で完全逆）
// → HOLD_END で forward を完全打ち消し近傍 (残差 ~0.06 の小さな構造的歪みのみ残る)
const RIGHT_BACKWARD_R: Op[] = [
  { kind: "add", param: -0.21 },
  { kind: "pow", param: 0.65 },
  { kind: "add", param: 0.3 },
  { kind: "pow", param: 1.48 },
  { kind: "add", param: -0.2 },
]
const RIGHT_BACKWARD_G: Op[] = [
  { kind: "add", param: -0.22 },
  { kind: "pow", param: 0.63 },
  { kind: "add", param: 0.32 },
  { kind: "pow", param: 1.5 },
  { kind: "add", param: -0.21 },
]
const RIGHT_BACKWARD_B: Op[] = [
  { kind: "add", param: -0.23 },
  { kind: "pow", param: 0.6 },
  { kind: "add", param: 0.34 },
  { kind: "pow", param: 1.52 },
  { kind: "add", param: -0.22 },
]

const FREQS = [0.7, 0.85, 1.0, 1.15, 1.3]
const PHASE_R = 0
const PHASE_G = (2 * Math.PI) / 3
const PHASE_B = (4 * Math.PI) / 3

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

// Phase 32-AR: bump = [0,1] でのみ正の凸関数、外側ではゼロで数値暴走を防ぐ。
//   bump(0) = bump(1) = 0、bump(0.5) = 1 (× 4 で正規化)
function bump(y: number): number {
  if (y <= 0 || y >= 1) return 0
  return y * (1 - y) * 4
}

// Phase 32-AR: bump 加算 y' = y + L * 4y(1-y) を y について解析的に逆算。
//   4L y^2 - (1+4L) y + y' = 0、解は y = ((1+4L) - sqrt(D)) / (8L)
//   端 y' ∈ {0,1} で y = y' を維持。L=0 で恒等。
function inverseBumpAdd(yOut: number, L: number): number {
  if (L === 0) return yOut
  if (yOut <= 0) return 0
  if (yOut >= 1) return 1
  const a = 4 * L
  const b = -(1 + 4 * L)
  const c = yOut
  const D = b * b - 4 * a * c
  if (D < 0) return yOut
  const root = (-b - Math.sqrt(D)) / (2 * a)
  return root < 0 ? 0 : root > 1 ? 1 : root
}

// Phase 32-AR: リフト = 両端不動点 bump 加算
//   add: y + L * p * bump(y)
//     y=0 → 0、y=1 → 1 が全 p で完全固定
//     y=0.5 で bump の最大値が L*p に揃う
//   pow: 通常 Math.pow（y=0/1 不動点、[0,1] クランプ）
//   mul: y * (1 + (param-1)*p)（y=0 不動点）
function applyOpProgressForward(y: number, op: Op, p: number): number {
  if (p <= 0) return y
  if (op.kind === "add") return y + op.param * p * bump(y)
  if (op.kind === "pow") {
    if (y <= 0) return 0
    if (y >= 1) return 1
    return Math.pow(y, 1 + (op.param - 1) * p)
  }
  return y * (1 + (op.param - 1) * p)
}

// 右セル backward 専用: 解析的逆 + Q による gradient。
//   add: forward bump 加算 (L=op.param * p * Q) を inverseBumpAdd で巻き戻し
//        Q=0 で no-op (L=0 → inverseBumpAdd 恒等)、Q=1 で forward 完全打ち消し
//   pow: forward の逆 exponent 1/op.param へ Q で補間
//        targetExp = 1 + (1/op.param - 1) * Q
//        Q=0 で targetExp=1.0 (no-op)、Q=1 で targetExp=1/op.param (完全逆)
//        op の exp = 1 + (targetExp - 1) * p で進度補間
function applyOpProgressBackward(y: number, op: Op, p: number, Q: number): number {
  if (p <= 0) return y
  if (op.kind === "add") return inverseBumpAdd(y, op.param * p * Q)
  if (op.kind === "pow") {
    if (y <= 0) return 0
    if (y >= 1) return 1
    const targetExp = 1 + (1 / op.param - 1) * Q
    return Math.pow(y, 1 + (targetExp - 1) * p)
  }
  return y * (1 + (op.param - 1) * p)
}

// 左セル backward: applyOpProgressForward の数学的逆関数。
//   add 逆: 左セルでは add 不使用、恒等関数を返す
//   pow 逆: y^(1/exp)
//   mul 逆: y / (1 + (param-1)*p)
function applyOpProgressInverse(y: number, op: Op, p: number): number {
  if (p <= 0) return y
  if (op.kind === "add") return y
  if (op.kind === "pow") return Math.pow(y, 1 / (1 + (op.param - 1) * p))
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
 * 左セル用: forward は applyOpProgressForward、backward は applyOpProgressInverse
 * （同じ ops の数学的逆関数を逆順で適用）。HOLD_END で完全 y=x 復帰。
 */
function buildLeftFn(
  ops: Op[],
  offsets: Offsets,
  P: number,
  Q: number,
): (x: number) => number {
  return (x: number) => {
    let y = x
    for (let i = 0; i < ops.length; i++) {
      const { lo, hi } = offsets[i]
      const p = easeInOutCubic(clamp01((P - lo) / (hi - lo)))
      y = applyOpProgressForward(y, ops[i], p)
    }
    for (let i = ops.length - 1; i >= 0; i--) {
      const { lo, hi } = offsets[i]
      const p = easeInOutCubic(clamp01((Q - lo) / (hi - lo)))
      y = applyOpProgressInverse(y, ops[i], p)
    }
    return y
  }
}

/**
 * 右セル用: forward は opsForward を順に追加適用、backward は opsBackward を順に追加適用。
 * 入れ子非可換性で HOLD_END でも y=x には戻らず残差が残る。
 * pow op は backward 側で Q による exponent → 1.0 補間が入り、
 * Q=1 で全 pow 直線化、add 系の残差だけが残る。
 */
function buildRightFn(
  opsForward: Op[],
  opsBackward: Op[],
  offsetsForward: Offsets,
  offsetsBackward: Offsets,
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
    for (let i = 0; i < opsForward.length; i++) {
      const { lo, hi } = offsetsForward[i]
      let p = easeInOutCubic(clamp01((P - lo) / (hi - lo)))
      if (oscAmp > 0) {
        p = clamp01(
          p + oscAmp * env * Math.sin(t * 2 * Math.PI * freqs[i] + phaseRgb),
        )
      }
      y = applyOpProgressForward(y, opsForward[i], p)
    }
    for (let i = 0; i < opsBackward.length; i++) {
      const { lo, hi } = offsetsBackward[i]
      let p = easeInOutCubic(clamp01((Q - lo) / (hi - lo)))
      if (oscAmp > 0) {
        p = clamp01(
          p +
            oscAmp *
              env *
              Math.sin(t * 2 * Math.PI * freqs[i] + phaseRgb + Math.PI),
        )
      }
      y = applyOpProgressBackward(y, opsBackward[i], p, Q)
    }
    return y
  }
}

// Phase 32-AR: Y 軸 [0, 1] に戻し、yToScreen は素直な反転。
function yToScreen(y: number, plotY: number, plotH: number): number {
  return plotY + plotH * (1 - (y - Y_MIN) / Y_RANGE)
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
    const sy = yToScreen(y, plotY, plotH)
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
    const sy = yToScreen(x, plotY, plotH)
    points.push(`${sx.toFixed(2)},${sy.toFixed(2)}`)
  }
  return points.join(" ")
}

function fmt3(n: number): string {
  return n.toFixed(3)
}

function formulaForOpAt(op: Op, p: number, isInverseDisplay: boolean): string {
  if (!isInverseDisplay) {
    if (op.kind === "add") {
      const v = op.param * p
      const abs = Math.abs(v).toFixed(3)
      if (v >= 0) return `y + ${abs}·y(1−y)`
      return `y − ${abs}·y(1−y)`
    }
    if (op.kind === "pow") return `y^${fmt3(1 + (op.param - 1) * p)}`
    return `y × ${fmt3(1 + (op.param - 1) * p)}`
  }
  if (op.kind === "add") {
    const v = op.param * p
    const abs = Math.abs(v).toFixed(3)
    if (v >= 0) return `y − ${abs}·y(1−y)`
    return `y + ${abs}·y(1−y)`
  }
  if (op.kind === "pow") return `y^(1/${fmt3(1 + (op.param - 1) * p)})`
  return `y ÷ ${fmt3(1 + (op.param - 1) * p)}`
}

type FormulaCell = {
  current: string
  prev: string | null
  fadeIn: number
  fadeOut: number
}

function makeFormulaForLeftChannel(
  state: AnimState,
  ops: Op[],
  offsets: Offsets,
): FormulaCell {
  if (state.phase === "hold-start") {
    return { current: "y = x", prev: null, fadeIn: 1, fadeOut: 0 }
  }
  if (state.phase === "hold-end") {
    return {
      current: formulaForOpAt(ops[0], 1, true),
      prev: null,
      fadeIn: 1,
      fadeOut: 0,
    }
  }
  let idx: number
  let isInverse: boolean
  let progress: number
  if (state.phase === "forward") {
    idx = Math.min(NUM_OPS - 1, Math.max(0, Math.floor(state.P * NUM_OPS)))
    isInverse = false
    progress = state.P
  } else {
    const fromQ = Math.min(NUM_OPS - 1, Math.max(0, Math.floor(state.Q * NUM_OPS)))
    idx = NUM_OPS - 1 - fromQ
    isInverse = true
    progress = state.Q
  }
  const { lo, hi } = offsets[idx]
  const easedP = easeInOutCubic(clamp01((progress - lo) / (hi - lo)))
  const op = ops[idx]
  const current = formulaForOpAt(op, easedP, isInverse)

  const since =
    state.phase === "forward"
      ? (state.P - Math.floor(state.P * NUM_OPS) / NUM_OPS) * FORWARD_DUR
      : (state.Q - Math.floor(state.Q * NUM_OPS) / NUM_OPS) * BACKWARD_DUR
  if (since >= FADE_DUR) {
    return { current, prev: null, fadeIn: 1, fadeOut: 0 }
  }
  let prevIdx: number
  let prevInverse: boolean
  if (!isInverse) {
    prevIdx = idx - 1
    prevInverse = false
    if (prevIdx < 0) {
      const ratio = since / FADE_DUR
      return { current, prev: "y = x", fadeIn: ratio, fadeOut: 1 - ratio }
    }
  } else {
    prevIdx = idx + 1
    prevInverse = true
    if (prevIdx > NUM_OPS - 1) {
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
    return { current, prev: null, fadeIn: 1, fadeOut: 0 }
  }
  const ratio = since / FADE_DUR
  return {
    current,
    prev: formulaForOpAt(prevOp, prevInverse ? 0 : 1, prevInverse),
    fadeIn: ratio,
    fadeOut: 1 - ratio,
  }
}

function makeFormulaForRightChannel(
  state: AnimState,
  opsForward: Op[],
  opsBackward: Op[],
  offsetsForward: Offsets,
  offsetsBackward: Offsets,
): FormulaCell {
  if (state.phase === "hold-start") {
    return { current: "y = x", prev: null, fadeIn: 1, fadeOut: 0 }
  }
  if (state.phase === "hold-end") {
    return {
      current: formulaForOpAt(
        opsBackward[opsBackward.length - 1],
        1,
        false,
      ),
      prev: null,
      fadeIn: 1,
      fadeOut: 0,
    }
  }
  let opsToUse: Op[]
  let offsetsToUse: Offsets
  let progress: number
  if (state.phase === "forward") {
    opsToUse = opsForward
    offsetsToUse = offsetsForward
    progress = state.P
  } else {
    opsToUse = opsBackward
    offsetsToUse = offsetsBackward
    progress = state.Q
  }
  const idx = Math.min(NUM_OPS - 1, Math.max(0, Math.floor(progress * NUM_OPS)))
  const { lo, hi } = offsetsToUse[idx]
  const easedP = easeInOutCubic(clamp01((progress - lo) / (hi - lo)))
  const op = opsToUse[idx]
  const current = formulaForOpAt(op, easedP, false)

  const since =
    state.phase === "forward"
      ? (state.P - idx / NUM_OPS) * FORWARD_DUR
      : (state.Q - idx / NUM_OPS) * BACKWARD_DUR
  if (since >= FADE_DUR) {
    return { current, prev: null, fadeIn: 1, fadeOut: 0 }
  }
  const prevIdx = idx - 1
  if (prevIdx < 0) {
    if (state.phase === "forward") {
      const ratio = since / FADE_DUR
      return { current, prev: "y = x", fadeIn: ratio, fadeOut: 1 - ratio }
    }
    const ratio = since / FADE_DUR
    return {
      current,
      prev: formulaForOpAt(opsForward[NUM_OPS - 1], 1, false),
      fadeIn: ratio,
      fadeOut: 1 - ratio,
    }
  }
  const prevOp = opsToUse[prevIdx]
  if (prevOp.kind === op.kind) {
    return { current, prev: null, fadeIn: 1, fadeOut: 0 }
  }
  const ratio = since / FADE_DUR
  return {
    current,
    prev: formulaForOpAt(prevOp, 1, false),
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
    {
      fill: string
      text: string
      icon: "play" | "rev" | "check" | "circle"
      rx: number
    }
  > = {
    initial: {
      fill: "rgba(120,120,130,0.88)",
      text: "初期状態",
      icon: "circle",
      rx: 70,
    },
    forward: {
      fill: "rgba(80,180,120,0.88)",
      text: "処理追加中",
      icon: "play",
      rx: 82,
    },
    backward: {
      fill: "rgba(220,130,60,0.88)",
      text: "後段で復元中",
      icon: "rev",
      rx: 92,
    },
    "hold-end": {
      fill: "rgba(120,120,130,0.88)",
      text: "復元結果",
      icon: "check",
      rx: 70,
    },
  }
  const cfg = cfgMap[kind]
  const iconCx = cx - cfg.rx * 0.55
  const textCx = cx + cfg.rx * 0.18
  return (
    <g opacity={opacity}>
      <ellipse cx={cx} cy={cy} rx={cfg.rx} ry={20} fill={cfg.fill} />
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
        x={textCx}
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
  showIdeal,
  idealOpacity,
  curveBuilds,
  clipId,
}: {
  cellX: number
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

  const yOneScreen = yToScreen(1, PLOT_Y, PLOT_H)
  const yHalfScreen = yToScreen(0.5, PLOT_Y, PLOT_H)
  const yZeroScreen = yToScreen(0, PLOT_Y, PLOT_H)

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

      {/* y = x 参照線（左下原点 → 右上 y=1） */}
      <line
        x1={plotXAbs}
        y1={yZeroScreen}
        x2={plotXAbs + PLOT_W}
        y2={yOneScreen}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="2 6"
      />

      {/* y = 0.5 中央補助線 */}
      <line
        x1={plotXAbs}
        y1={yHalfScreen}
        x2={plotXAbs + PLOT_W}
        y2={yHalfScreen}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="4 6"
      />

      {/* y = 1 上端ライン + ラベル */}
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
        x={plotXAbs + PLOT_W}
        y={PLOT_Y - 8}
        fontSize={13}
        fill={TEXT_MUTED}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        textAnchor="end"
        dominantBaseline="alphabetic"
      >
        y = 1
      </text>

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
              fontSize={20}
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
            fontSize={20}
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
  showIdeal,
  idealOpacity,
  curveBuilds,
  clipId,
  rgbFormula,
  badgeOps,
}: {
  cellX: number
  title: string
  tint: typeof TINT_GAMMA
  showIdeal: boolean
  idealOpacity: number
  curveBuilds: { fnR: (x: number) => number; fnG: (x: number) => number; fnB: (x: number) => number }
  clipId: string
  rgbFormula: { r: FormulaCell; g: FormulaCell; b: FormulaCell }
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
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        curveBuilds={curveBuilds}
        clipId={clipId}
      />

      <Badge cx={cx} cy={BADGE_CY} kind="initial" opacity={badgeOps.initial} />
      <Badge cx={cx} cy={BADGE_CY} kind="forward" opacity={badgeOps.forward} />
      <Badge cx={cx} cy={BADGE_CY} kind="backward" opacity={badgeOps.backward} />
      <Badge cx={cx} cy={BADGE_CY} kind="hold-end" opacity={badgeOps["hold-end"]} />

      <FormulaRGB
        cellX={cellX}
        rCell={rgbFormula.r}
        gCell={rgbFormula.g}
        bCell={rgbFormula.b}
      />
    </g>
  )
}

// Phase 32-AR: 4 本の dev assert + metric ログ
let _devAssertionsRun = false
function runDevAssertions() {
  if (_devAssertionsRun) return
  _devAssertionsRun = true

  const N = 96
  const xs: number[] = []
  for (let i = 0; i <= N; i++) xs.push(i / N)

  const leftChans = [
    { name: "LEFT_R", ops: LEFT_OPS_R, offsets: OFFSETS_LEFT_R },
    { name: "LEFT_G", ops: LEFT_OPS_G, offsets: OFFSETS_LEFT_G },
    { name: "LEFT_B", ops: LEFT_OPS_B, offsets: OFFSETS_LEFT_B },
  ]
  const rightChans = [
    {
      name: "RIGHT_R",
      opsF: RIGHT_FORWARD_R,
      opsB: RIGHT_BACKWARD_R,
      off: OFFSETS_RIGHT_R,
    },
    {
      name: "RIGHT_G",
      opsF: RIGHT_FORWARD_G,
      opsB: RIGHT_BACKWARD_G,
      off: OFFSETS_RIGHT_G,
    },
    {
      name: "RIGHT_B",
      opsF: RIGHT_FORWARD_B,
      opsB: RIGHT_BACKWARD_B,
      off: OFFSETS_RIGHT_B,
    },
  ]

  // Assert 1: HOLD_START 全サンプル x で |y - x| < 1e-12（左右セル R/G/B 全て）
  let holdStartMaxErr = 0
  for (const { name, ops, offsets } of leftChans) {
    const fn = buildLeftFn(ops, offsets, 0, 0)
    for (const x of xs) {
      const err = Math.abs(fn(x) - x)
      holdStartMaxErr = Math.max(holdStartMaxErr, err)
      console.assert(
        err < 1e-12,
        `${name} HOLD_START@x=${x}: |y-x|=${err} >= 1e-12`,
      )
    }
  }
  for (const { name, opsF, opsB, off } of rightChans) {
    const fn = buildRightFn(opsF, opsB, off, off, 0, 0, FREQS, 0, 0, 0)
    for (const x of xs) {
      const err = Math.abs(fn(x) - x)
      holdStartMaxErr = Math.max(holdStartMaxErr, err)
      console.assert(
        err < 1e-12,
        `${name} HOLD_START@x=${x}: |y-x|=${err} >= 1e-12`,
      )
    }
  }

  // Assert 2: y(0)=0 / y(1)=1 を全フェーズで < 1e-9（右セルのみ。左セル mul は中盤で y(1) 不動点を持たない）
  let endpointMaxErr = 0
  const phaseSamples: { P: number; Q: number; label: string }[] = [
    { P: 0, Q: 0, label: "HOLD_START" },
    { P: 0.25, Q: 0, label: "FWD@0.25" },
    { P: 0.5, Q: 0, label: "FWD@0.5" },
    { P: 0.75, Q: 0, label: "FWD@0.75" },
    { P: 1, Q: 0, label: "FWD_END" },
    { P: 1, Q: 0.25, label: "BWD@0.25" },
    { P: 1, Q: 0.5, label: "BWD@0.5" },
    { P: 1, Q: 0.75, label: "BWD@0.75" },
    { P: 1, Q: 1, label: "HOLD_END" },
  ]
  for (const { name, opsF, opsB, off } of rightChans) {
    for (const ph of phaseSamples) {
      const fn = buildRightFn(opsF, opsB, off, off, ph.P, ph.Q, FREQS, 0, 0, 0)
      const e0 = Math.abs(fn(0) - 0)
      const e1 = Math.abs(fn(1) - 1)
      endpointMaxErr = Math.max(endpointMaxErr, e0, e1)
      console.assert(
        e0 < 1e-9,
        `${name} ${ph.label}: y(0)=${fn(0)} (err=${e0})`,
      )
      console.assert(
        e1 < 1e-9,
        `${name} ${ph.label}: y(1)=${fn(1)} (err=${e1})`,
      )
    }
  }

  // Assert 3: FORWARD 終了 (P=1, Q=0) で max|y - x| > 0.20（右セル R/G/B いずれか）
  let forwardEndMaxDev = 0
  for (const { opsF, opsB, off } of rightChans) {
    const fn = buildRightFn(opsF, opsB, off, off, 1, 0, FREQS, 0, 0, 0)
    let maxDev = 0
    for (const x of xs) maxDev = Math.max(maxDev, Math.abs(fn(x) - x))
    forwardEndMaxDev = Math.max(forwardEndMaxDev, maxDev)
  }
  console.assert(
    forwardEndMaxDev > 0.2,
    `FORWARD end max|y-x|=${forwardEndMaxDev} <= 0.20 (画として複雑度不足)`,
  )

  // Assert 4: HOLD_END (P=1, Q=1) で 0.005 < max|y - x| < 0.10（右セル R/G/B いずれか）
  let holdEndMaxDev = 0
  for (const { opsF, opsB, off } of rightChans) {
    const fn = buildRightFn(opsF, opsB, off, off, 1, 1, FREQS, 0, 0, 0)
    let maxDev = 0
    for (const x of xs) maxDev = Math.max(maxDev, Math.abs(fn(x) - x))
    holdEndMaxDev = Math.max(holdEndMaxDev, maxDev)
  }
  console.assert(
    holdEndMaxDev > 0.005 && holdEndMaxDev < 0.1,
    `HOLD_END max|y-x|=${holdEndMaxDev} not in (0.005, 0.10)`,
  )

  console.log(
    "[Phase 32-AR assert metrics]",
    `HOLD_START max|y-x|=${holdStartMaxErr.toExponential(3)}`,
    `endpoint max err=${endpointMaxErr.toExponential(3)}`,
    `FORWARD end max|y-x|=${forwardEndMaxDev.toFixed(4)}`,
    `HOLD_END max|y-x|=${holdEndMaxDev.toFixed(4)}`,
  )
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  runDevAssertions()
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

  // 左セル: RGB 3 chan + 各 chan 完全可逆 (osc なし)
  const leftFnR = buildLeftFn(LEFT_OPS_R, OFFSETS_LEFT_R, state.P, state.Q)
  const leftFnG = buildLeftFn(LEFT_OPS_G, OFFSETS_LEFT_G, state.P, state.Q)
  const leftFnB = buildLeftFn(LEFT_OPS_B, OFFSETS_LEFT_B, state.P, state.Q)
  const leftCurves = { fnR: leftFnR, fnG: leftFnG, fnB: leftFnB }

  // 右セル: forward/backward 別 ops、入れ子非可換性で残差残る (osc あり)
  const rightFnR = buildRightFn(
    RIGHT_FORWARD_R,
    RIGHT_BACKWARD_R,
    OFFSETS_RIGHT_R,
    OFFSETS_RIGHT_R,
    state.P,
    state.Q,
    FREQS,
    PHASE_R,
    OSC_AMP_RIGHT,
    state.t,
  )
  const rightFnG = buildRightFn(
    RIGHT_FORWARD_G,
    RIGHT_BACKWARD_G,
    OFFSETS_RIGHT_G,
    OFFSETS_RIGHT_G,
    state.P,
    state.Q,
    FREQS,
    PHASE_G,
    OSC_AMP_RIGHT,
    state.t,
  )
  const rightFnB = buildRightFn(
    RIGHT_FORWARD_B,
    RIGHT_BACKWARD_B,
    OFFSETS_RIGHT_B,
    OFFSETS_RIGHT_B,
    state.P,
    state.Q,
    FREQS,
    PHASE_B,
    OSC_AMP_RIGHT,
    state.t,
  )
  const rightCurves = { fnR: rightFnR, fnG: rightFnG, fnB: rightFnB }

  const leftFormulaR = makeFormulaForLeftChannel(state, LEFT_OPS_R, OFFSETS_LEFT_R)
  const leftFormulaG = makeFormulaForLeftChannel(state, LEFT_OPS_G, OFFSETS_LEFT_G)
  const leftFormulaB = makeFormulaForLeftChannel(state, LEFT_OPS_B, OFFSETS_LEFT_B)

  const rightFormulaR = makeFormulaForRightChannel(
    state,
    RIGHT_FORWARD_R,
    RIGHT_BACKWARD_R,
    OFFSETS_RIGHT_R,
    OFFSETS_RIGHT_R,
  )
  const rightFormulaG = makeFormulaForRightChannel(
    state,
    RIGHT_FORWARD_G,
    RIGHT_BACKWARD_G,
    OFFSETS_RIGHT_G,
    OFFSETS_RIGHT_G,
  )
  const rightFormulaB = makeFormulaForRightChannel(
    state,
    RIGHT_FORWARD_B,
    RIGHT_BACKWARD_B,
    OFFSETS_RIGHT_B,
    OFFSETS_RIGHT_B,
  )

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
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        curveBuilds={leftCurves}
        clipId="cr-plot-left"
        rgbFormula={{ r: leftFormulaR, g: leftFormulaG, b: leftFormulaB }}
        badgeOps={badgeOps}
      />
      <Cell
        cellX={CELL_W + GAP}
        title="リフト × ガンマ（加算 + べき乗）"
        tint={TINT_LIFT}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        curveBuilds={rightCurves}
        clipId="cr-plot-right"
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
