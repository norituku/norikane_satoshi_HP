"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Phase 32-AM: 戻せる / 戻せない (可逆性の比較)
 *
 * viewBox 1600×1000 を 2 セル横並び (各 800×1000) に分け、
 * 左 GAIN×GAMMA (×K と ^γ 交互 7 op) と
 * 右 LIFT×GAMMA (+β と ^γ 交互 7 op) を 14 秒で 1 ループ。
 *
 * 時間軸 3 区間:
 *   HOLD_START = 2.5  : y = x で完全静止
 *   MIDDLE     = 8.0  : 往路 7 op + 復路 7 op を sequential 連続適用
 *   HOLD_END   = 3.5  : 14 op 完全適用 + y=x 理想線フェードイン静止
 *
 * 各 op は 0 → 1 へ easeInOutCubic で連続補間し、
 * 数式表記は op ごとに実数値（toFixed(3)）でリアルタイム連続表示する。
 * op 種類 (mul / pow / add) が切り替わる瞬間だけ 200ms クロスフェード、
 * 同種 op 内は数値だけ滑らかに動く（明滅させない）。
 *
 * reducedMotion=true のときは HOLD_END 状態（14 op 適用 + 理想線 1.0）で静止。
 */

const LOOP = 14
const HOLD_START = 2.5
const MIDDLE = 8.0
const HOLD_END = 3.5
const OPS_PER_SIDE = 7
const TOTAL_OPS = OPS_PER_SIDE * 2
const OP_DUR = MIDDLE / TOTAL_OPS // ≈ 0.5714
const FADE_DUR = 0.2
const IDEAL_FADE_IN = 0.6
const IDEAL_FADE_OUT = 0.2

const W = 1600
const H = 1000
const CELL_W = 800
const SAMPLES = 96

const TITLE_Y = 38
const PLOT_X_LOCAL = 60
const PLOT_Y = 80
const PLOT_W = CELL_W - 120 // 680
const PLOT_H = 600 // 80..680
const PHASE_LABEL_CY = 720
const STEP_FORMULA_CY = 790
const SUBLABEL_CY = 870

const Y_MAX = 2.5

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

type Op = { kind: "add" | "pow" | "mul"; param: number }

// 左セル: ×K と ^γ を交互に 7 つ。K=0.7..1.6、γ=1.2..1.5。
const LEFT_OPS: Op[] = [
  { kind: "mul", param: 1.6 },
  { kind: "pow", param: 1.5 },
  { kind: "mul", param: 0.7 },
  { kind: "pow", param: 1.35 },
  { kind: "mul", param: 1.25 },
  { kind: "pow", param: 1.2 },
  { kind: "mul", param: 0.85 },
]

// 右セル: +β と ^γ を交互に 7 つ。β=0.10..0.22、γ=1.25..1.5。
const RIGHT_OPS: Op[] = [
  { kind: "add", param: 0.22 },
  { kind: "pow", param: 1.5 },
  { kind: "add", param: 0.18 },
  { kind: "pow", param: 1.4 },
  { kind: "add", param: 0.14 },
  { kind: "pow", param: 1.25 },
  { kind: "add", param: 0.1 },
]

function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

// p ∈ [0,1] で op を 0(=恒等) → 1(=完全適用) に連続補間。
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

type AnimState = {
  phase: "hold-start" | "middle" | "hold-end"
  // middle / hold-end のみ意味を持つ
  opIndex: number // 0..13 (forward 0..6, backward 7..13)。hold-start=-1, hold-end=14
  opLocalT: number // 秒 (op 開始からの経過時間)
  opP: number // eased 0..1
  opPRaw: number // raw 0..1
  isBackward: boolean
  backIndex: number // backward 内 0..6, forward は -1
  tEnd: number // hold-end 開始からの秒数
}

function computeAnimState(t: number): AnimState {
  if (t < HOLD_START) {
    return {
      phase: "hold-start",
      opIndex: -1,
      opLocalT: 0,
      opP: 0,
      opPRaw: 0,
      isBackward: false,
      backIndex: -1,
      tEnd: 0,
    }
  }
  const tMid = t - HOLD_START
  if (tMid < MIDDLE) {
    const opIndex = Math.min(TOTAL_OPS - 1, Math.floor(tMid / OP_DUR))
    const opLocalT = tMid - opIndex * OP_DUR
    const pRaw = Math.min(1, opLocalT / OP_DUR)
    const p = easeInOutCubic(pRaw)
    const isBackward = opIndex >= OPS_PER_SIDE
    const backIndex = isBackward ? opIndex - OPS_PER_SIDE : -1
    return {
      phase: "middle",
      opIndex,
      opLocalT,
      opP: p,
      opPRaw: pRaw,
      isBackward,
      backIndex,
      tEnd: 0,
    }
  }
  const tEnd = tMid - MIDDLE
  return {
    phase: "hold-end",
    opIndex: TOTAL_OPS,
    opLocalT: 0,
    opP: 1,
    opPRaw: 1,
    isBackward: true,
    backIndex: OPS_PER_SIDE - 1,
    tEnd,
  }
}

// state に応じた x → y の現在カーブ。
// hold-start: y = x。middle forward: ops[0..i-1] 完全 + ops[i] を p で部分適用。
// middle backward: 全往路完全 + ops[0..b-1] 逆完全 + ops[b] を p で部分逆適用。
// hold-end: 全往路完全 + 全復路完全。
function buildCurrentFn(ops: Op[], state: AnimState): (x: number) => number {
  return (x: number) => {
    let y = x
    if (state.phase === "hold-start") return y

    if (state.phase === "hold-end") {
      for (let i = 0; i < OPS_PER_SIDE; i++) y = applyOpProgress(y, ops[i], 1)
      for (let i = 0; i < OPS_PER_SIDE; i++)
        y = applyOpProgressInverse(y, ops[i], 1)
      return y
    }

    // middle
    if (!state.isBackward) {
      for (let i = 0; i < state.opIndex; i++)
        y = applyOpProgress(y, ops[i], 1)
      y = applyOpProgress(y, ops[state.opIndex], state.opP)
      return y
    }
    for (let i = 0; i < OPS_PER_SIDE; i++) y = applyOpProgress(y, ops[i], 1)
    for (let i = 0; i < state.backIndex; i++)
      y = applyOpProgressInverse(y, ops[i], 1)
    y = applyOpProgressInverse(y, ops[state.backIndex], state.opP)
    return y
  }
}

function fmt3(n: number): string {
  return n.toFixed(3)
}

// 進行中 op の実数値を表示する（forward は適用方向、backward は逆向き表記）。
function currentFormulaForOp(op: Op, p: number, isBackward: boolean): string {
  if (!isBackward) {
    if (op.kind === "add") return `y + ${fmt3(op.param * p)}`
    if (op.kind === "pow") return `y^${fmt3(1 + (op.param - 1) * p)}`
    return `y × ${fmt3(1 + (op.param - 1) * p)}`
  }
  if (op.kind === "add") return `y − ${fmt3(op.param * p)}`
  if (op.kind === "pow") return `y^(1/${fmt3(1 + (op.param - 1) * p)})`
  return `y ÷ ${fmt3(1 + (op.param - 1) * p)}`
}

function phaseLabelFor(state: AnimState): string {
  if (state.phase === "hold-start") return "y = x（初期）"
  if (state.phase === "hold-end") return "復路 7 / 7 層（終端）"
  if (!state.isBackward) return `往路 ${state.opIndex + 1} / 7 層`
  return `復路 ${state.backIndex + 1} / 7 層`
}

// 1 op 前を取得（forward の最初は null、backward の最初は forward 最後）。
function previousOpInfo(
  ops: Op[],
  state: AnimState,
): { op: Op; isBackward: boolean } | null {
  if (state.phase !== "middle") return null
  if (!state.isBackward) {
    if (state.opIndex === 0) return null
    return { op: ops[state.opIndex - 1], isBackward: false }
  }
  if (state.backIndex === 0) {
    return { op: ops[OPS_PER_SIDE - 1], isBackward: false }
  }
  return { op: ops[state.backIndex - 1], isBackward: true }
}

function previousPhaseLabel(state: AnimState): string {
  if (state.phase !== "middle") return ""
  if (!state.isBackward) {
    if (state.opIndex === 0) return ""
    return `往路 ${state.opIndex} / 7 層`
  }
  if (state.backIndex === 0) return `往路 7 / 7 層`
  return `復路 ${state.backIndex} / 7 層`
}

type FormulaState = {
  current: string
  prev: string | null
  prevPhase: string
  currentFadeIn: number // 0..1 (現 op の opacity)
  prevFadeOut: number // 0..1 (前 op の opacity、prev 非表示なら 0)
}

function makeFormulaState(ops: Op[], state: AnimState): FormulaState {
  if (state.phase === "hold-start") {
    return {
      current: "y = x",
      prev: null,
      prevPhase: "",
      currentFadeIn: 1,
      prevFadeOut: 0,
    }
  }
  if (state.phase === "hold-end") {
    const lastOp = ops[OPS_PER_SIDE - 1]
    return {
      current: currentFormulaForOp(lastOp, 1, true),
      prev: null,
      prevPhase: "",
      currentFadeIn: 1,
      prevFadeOut: 0,
    }
  }
  // middle
  const op = state.isBackward ? ops[state.backIndex] : ops[state.opIndex]
  const current = currentFormulaForOp(op, state.opP, state.isBackward)

  const prevInfo = previousOpInfo(ops, state)
  const prevSameKind = prevInfo != null && prevInfo.op.kind === op.kind
  const inFadeWindow = state.opLocalT < FADE_DUR

  if (prevInfo && !prevSameKind && inFadeWindow) {
    const ratio = Math.min(1, state.opLocalT / FADE_DUR)
    const prevStr = currentFormulaForOp(prevInfo.op, 1, prevInfo.isBackward)
    return {
      current,
      prev: prevStr,
      prevPhase: previousPhaseLabel(state),
      currentFadeIn: ratio,
      prevFadeOut: 1 - ratio,
    }
  }
  return {
    current,
    prev: null,
    prevPhase: "",
    currentFadeIn: 1,
    prevFadeOut: 0,
  }
}

// phase ラベルも 200ms クロスフェード（op 切り替わり直後で前ラベルと違うとき）。
type PhaseLabelState = {
  current: string
  prev: string | null
  currentFadeIn: number
  prevFadeOut: number
}

function makePhaseLabelState(state: AnimState): PhaseLabelState {
  const current = phaseLabelFor(state)
  if (state.phase !== "middle") {
    return { current, prev: null, currentFadeIn: 1, prevFadeOut: 0 }
  }
  if (state.opLocalT >= FADE_DUR) {
    return { current, prev: null, currentFadeIn: 1, prevFadeOut: 0 }
  }
  const prev = previousPhaseLabel(state)
  if (!prev || prev === current) {
    return { current, prev: null, currentFadeIn: 1, prevFadeOut: 0 }
  }
  const ratio = Math.min(1, state.opLocalT / FADE_DUR)
  return {
    current,
    prev,
    currentFadeIn: ratio,
    prevFadeOut: 1 - ratio,
  }
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
  state,
  showIdeal,
  idealOpacity,
  clipId,
}: {
  cellX: number
  title: string
  tint: Tint
  ops: Op[]
  state: AnimState
  showIdeal: boolean
  idealOpacity: number
  clipId: string
}) {
  const fn = buildCurrentFn(ops, state)
  const plotXAbs = cellX + PLOT_X_LOCAL
  const polyPoints = buildPolyline(fn, plotXAbs, PLOT_Y, PLOT_W, PLOT_H)
  const idealPoints = buildIdealPolyline(plotXAbs, PLOT_Y, PLOT_W, PLOT_H)

  const yOneScreen = PLOT_Y + PLOT_H * (1 - 1.0 / Y_MAX)
  const yHalfScreen = PLOT_Y + PLOT_H * (1 - 0.5 / Y_MAX)

  const phaseLabel = makePhaseLabelState(state)
  const formula = makeFormulaState(ops, state)
  const isBackward = state.phase !== "hold-start" && state.isBackward

  return (
    <g>
      {/* セル背景（外側パディング 8px） */}
      <rect
        x={cellX + 8}
        y={8}
        width={CELL_W - 16}
        height={H - 16}
        rx={20}
        ry={20}
        fill={tint.bg}
        stroke={tint.border}
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      <rect
        x={cellX + 8}
        y={8}
        width={CELL_W - 16}
        height={H - 16}
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

      {/* y=x 参照線（極めて薄い、常時） */}
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

      {/* y=1.0 参照線 */}
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

      {/* 入出力カーブ + HOLD_END 中のみ y=x 理想線重ね */}
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

      {/* phase ラベル（クロスフェード） */}
      {phaseLabel.prev && (
        <text
          x={cellX + CELL_W / 2}
          y={PHASE_LABEL_CY}
          fontSize={22}
          fontWeight={600}
          fill={isBackward ? tint.curve : TEXT_PRIMARY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          opacity={phaseLabel.prevFadeOut}
        >
          {phaseLabel.prev}
        </text>
      )}
      <text
        x={cellX + CELL_W / 2}
        y={PHASE_LABEL_CY}
        fontSize={22}
        fontWeight={600}
        fill={isBackward ? tint.curve : TEXT_PRIMARY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        opacity={phaseLabel.currentFadeIn}
      >
        {phaseLabel.current}
      </text>

      {/* 数式（実数値リアルタイム表示 + 種類切替時クロスフェード） */}
      {formula.prev && (
        <text
          x={cellX + CELL_W / 2}
          y={STEP_FORMULA_CY}
          fontSize={36}
          fontWeight={500}
          fill={TEXT_PRIMARY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          opacity={formula.prevFadeOut}
        >
          {formula.prev}
        </text>
      )}
      <text
        x={cellX + CELL_W / 2}
        y={STEP_FORMULA_CY}
        fontSize={36}
        fontWeight={500}
        fill={TEXT_PRIMARY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        opacity={formula.currentFadeIn}
      >
        {formula.current}
      </text>

      {/* HOLD_END 中: 残差説明サブラベル */}
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

  let state: AnimState
  let showIdeal: boolean
  let idealOpacity: number
  if (reducedMotion) {
    state = {
      phase: "hold-end",
      opIndex: TOTAL_OPS,
      opLocalT: 0,
      opP: 1,
      opPRaw: 1,
      isBackward: true,
      backIndex: OPS_PER_SIDE - 1,
      tEnd: HOLD_END / 2,
    }
    showIdeal = true
    idealOpacity = 1
  } else {
    state = computeAnimState(animT)
    if (state.phase === "hold-end") {
      showIdeal = true
      const tEnd = state.tEnd
      if (tEnd < IDEAL_FADE_IN) {
        idealOpacity = tEnd / IDEAL_FADE_IN
      } else if (tEnd > HOLD_END - IDEAL_FADE_OUT) {
        idealOpacity = Math.max(0, (HOLD_END - tEnd) / IDEAL_FADE_OUT)
      } else {
        idealOpacity = 1
      }
    } else {
      showIdeal = false
      idealOpacity = 0
    }
  }

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
        state={state}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        clipId="cr-plot-left"
      />
      <Cell
        cellX={CELL_W}
        title="リフト × ガンマ（加算+べき乗）"
        tint={TINT_LIFT}
        ops={RIGHT_OPS}
        state={state}
        showIdeal={showIdeal}
        idealOpacity={idealOpacity}
        clipId="cr-plot-right"
      />
    </svg>
  )
}
