"use client"

import { useEffect, useRef, useState } from "react"

/**
 * v5 統合動画モジュール: 迷宮 → 因数分解 (脳人物 + 5 列粒度 + 落下物理)
 *
 * 1 本の 20 秒ループで「頭の中で混線していた 9 因子」が「フレーム → アングル
 * → カメラ → シーン → 作品 の 5 列粒度」へ整列する過程を描く。
 *
 *   - Phase 0 (0..4s)   : 脳人物の脳内 emit point から 9 chip が時間差で湧き旋回
 *   - Phase 1 (4..10s)  : 重力 ON、各 chip が所属列へ落下し、列内で積層
 *   - Phase 2 (10..15s) : 全 chip が所属列に積層完了し静止 (因数分解の完成図)
 *   - Phase 3 (15..20s) : 全 chip が頭部 emit point へ吸い上げられ opacity 1→0
 *   - t=20 で Phase 0 に wrap し再ループ
 *
 * 物理は seed 固定の閉形解 (swirl は周期関数、fall は ease-out X / ease-in Y)
 * のみで構成し、衝突解決は所属列 × 積み順の事前割当で表現する (chip 同士の
 * 重なり NG を構造的に保証する)。
 */

const LOOP = 20
const W = 1600
const H = 1000
const CHIP_W = 240
const CHIP_H = 72
const COL_W = 240
const COL_X = [80, 380, 680, 980, 1280]
const COL_TOP_Y = 340
const COL_H = 520
const COL_BOTTOM_Y = COL_TOP_Y + COL_H
const STACK_GAP = 8
const FALL_DUR = 1.6

const BRAIN_X = 800
const BRAIN_Y = 110
const HEAD_RX = 80
const HEAD_RY = 86

const P0_END = 4
const P1_END = 10
const P2_END = 15
const P3_END = 20

const ACCENT = "rgb(139,127,255)"
const TEXT_PRIMARY = "rgba(28,15,110,0.92)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"
const STROKE_BRAIN = "rgba(95,80,210,0.55)"
const STROKE_BRAIN_SOFT = "rgba(95,80,210,0.45)"

const COLUMNS = [
  { label: "フレーム単位", borderOp: 0.85, fillOp: 0.10 },
  { label: "アングル単位", borderOp: 0.72, fillOp: 0.085 },
  { label: "カメラ単位", borderOp: 0.59, fillOp: 0.07 },
  { label: "シーン単位", borderOp: 0.45, fillOp: 0.055 },
  { label: "作品単位", borderOp: 0.32, fillOp: 0.04 },
]

const TINT_VIOLET = { border: "rgba(139,127,255,0.85)", bg: "rgba(139,127,255,0.10)", iconStroke: "rgba(95,80,210,0.92)" }
const TINT_AMBER = { border: "rgba(214,162,108,0.85)", bg: "rgba(214,162,108,0.10)", iconStroke: "rgba(160,108,60,0.92)" }
const TINT_CORAL = { border: "rgba(214,127,140,0.85)", bg: "rgba(214,127,140,0.10)", iconStroke: "rgba(160,75,90,0.92)" }
const TINT_ROSE = { border: "rgba(214,140,180,0.85)", bg: "rgba(214,140,180,0.10)", iconStroke: "rgba(160,80,120,0.92)" }
const TINT_SKY = { border: "rgba(120,165,225,0.85)", bg: "rgba(120,165,225,0.10)", iconStroke: "rgba(60,108,170,0.92)" }
const TINT_TEAL = { border: "rgba(108,180,170,0.85)", bg: "rgba(108,180,170,0.10)", iconStroke: "rgba(50,120,115,0.92)" }
const TINT_PLUM = { border: "rgba(170,120,200,0.85)", bg: "rgba(170,120,200,0.10)", iconStroke: "rgba(112,60,150,0.92)" }
const TINT_LIME = { border: "rgba(150,180,90,0.85)", bg: "rgba(150,180,90,0.10)", iconStroke: "rgba(95,130,40,0.92)" }
const TINT_INDIGO = { border: "rgba(110,120,210,0.85)", bg: "rgba(110,120,210,0.10)", iconStroke: "rgba(60,75,160,0.92)" }

type Tint = { border: string; bg: string; iconStroke: string }
type IconKind =
  | "camera"
  | "sun"
  | "thermo"
  | "person"
  | "cloud"
  | "scape"
  | "film"
  | "lens"
  | "illusion"

type CardSpec = {
  id: string
  label: string
  col: number
  stack: number
  emitDelay: number
  fallStart: number
  swirlPhase: number
  swirlR: number
  swirlPeriod: number
  swirlDir: 1 | -1
  tint: Tint
  icon: IconKind
}

// 9 chip × (col, stack) は事前固定で重なり NG を構造的に保証する。
// emitDelay ∈ [0, 2.5]、fallStart ∈ [4.0, 6.8] で時間差を作り、Phase 1 (6s) 内に
// 全 chip が着地できるよう FALL_DUR=1.6s の余白を確保する。
const CARDS: CardSpec[] = [
  // フレーム列
  { id: "exposure", label: "露出揺れ", col: 0, stack: 0, emitDelay: 0.4, fallStart: 4.2, swirlPhase: 0.0, swirlR: 36, swirlPeriod: 2.0, swirlDir: 1, tint: TINT_AMBER, icon: "sun" },
  { id: "atmosphere", label: "大気", col: 0, stack: 1, emitDelay: 1.6, fallStart: 5.4, swirlPhase: 1.4, swirlR: 44, swirlPeriod: 2.3, swirlDir: -1, tint: TINT_SKY, icon: "cloud" },
  // アングル列
  { id: "skin", label: "肌", col: 1, stack: 0, emitDelay: 0.9, fallStart: 4.7, swirlPhase: 2.6, swirlR: 40, swirlPeriod: 1.8, swirlDir: 1, tint: TINT_ROSE, icon: "person" },
  { id: "illusion", label: "色の錯覚", col: 1, stack: 1, emitDelay: 2.0, fallStart: 5.9, swirlPhase: 3.7, swirlR: 32, swirlPeriod: 2.1, swirlDir: -1, tint: TINT_LIME, icon: "illusion" },
  // カメラ列
  { id: "camera", label: "カメラ差", col: 2, stack: 0, emitDelay: 0.2, fallStart: 4.0, swirlPhase: 4.5, swirlR: 38, swirlPeriod: 1.9, swirlDir: 1, tint: TINT_VIOLET, icon: "camera" },
  { id: "lens", label: "レンズ", col: 2, stack: 1, emitDelay: 1.2, fallStart: 5.0, swirlPhase: 5.6, swirlR: 46, swirlPeriod: 2.2, swirlDir: -1, tint: TINT_INDIGO, icon: "lens" },
  { id: "color-temp", label: "色温度", col: 2, stack: 2, emitDelay: 2.4, fallStart: 6.2, swirlPhase: 0.9, swirlR: 34, swirlPeriod: 2.0, swirlDir: 1, tint: TINT_CORAL, icon: "thermo" },
  // シーン列
  { id: "scene-tone", label: "シーントーン", col: 3, stack: 0, emitDelay: 1.0, fallStart: 5.2, swirlPhase: 1.9, swirlR: 42, swirlPeriod: 2.1, swirlDir: 1, tint: TINT_TEAL, icon: "scape" },
  // 作品列
  { id: "work-look", label: "作品ルック", col: 4, stack: 0, emitDelay: 1.8, fallStart: 6.8, swirlPhase: 3.0, swirlR: 36, swirlPeriod: 2.0, swirlDir: -1, tint: TINT_PLUM, icon: "film" },
]

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
function easeInCubic(x: number) {
  return x * x * x
}
function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3)
}
function easeInQuad(x: number) {
  return x * x
}
function lerp(a: number, b: number, p: number) {
  return a + (b - a) * p
}

function chipTargetX(col: number) {
  return COL_X[col] + (COL_W - CHIP_W) / 2
}

function chipTargetY(stack: number) {
  // stack 0 = 列底に最も近い、stack 増で上へ積む。底から 4px 余白を取る。
  return COL_BOTTOM_Y - 4 - CHIP_H - stack * (CHIP_H + STACK_GAP)
}

function swirlPos(card: CardSpec, t: number) {
  const tau = Math.max(0, t - card.emitDelay)
  const angle = (card.swirlDir * 2 * Math.PI * tau) / card.swirlPeriod + card.swirlPhase
  const x = BRAIN_X + card.swirlR * Math.cos(angle) - CHIP_W / 2
  const y = BRAIN_Y + card.swirlR * 0.85 * Math.sin(angle) - CHIP_H / 2
  return { x, y }
}

type ChipState = { x: number; y: number; opacity: number }

function chipState(card: CardSpec, t: number): ChipState {
  // Phase 3: 吸い上げ + フェードアウト (15..20s)
  if (t >= P2_END) {
    const p = clamp01((t - P2_END) / (P3_END - P2_END))
    const eased = easeInCubic(p)
    const tx = chipTargetX(card.col)
    const ty = chipTargetY(card.stack)
    const bx = BRAIN_X - CHIP_W / 2
    const by = BRAIN_Y - CHIP_H / 2
    return {
      x: lerp(tx, bx, eased),
      y: lerp(ty, by, eased),
      opacity: 1 - eased,
    }
  }

  // Phase 2: 静止 (10..15s)
  if (t >= P1_END) {
    return { x: chipTargetX(card.col), y: chipTargetY(card.stack), opacity: 1 }
  }

  // Phase 1: 落下 (chip 個別の fallStart から FALL_DUR 秒)
  if (t >= card.fallStart) {
    const p = clamp01((t - card.fallStart) / FALL_DUR)
    const sw = swirlPos(card, card.fallStart)
    const tx = chipTargetX(card.col)
    const ty = chipTargetY(card.stack)
    return {
      x: lerp(sw.x, tx, easeOutCubic(p)),
      y: lerp(sw.y, ty, easeInQuad(p)),
      opacity: 1,
    }
  }

  // Phase 0: emit_delay 後 swirl + fade-in
  if (t >= card.emitDelay) {
    const fadeIn = clamp01((t - card.emitDelay) / 0.8)
    const sw = swirlPos(card, t)
    return { x: sw.x, y: sw.y, opacity: fadeIn }
  }

  // Pre-emission: 脳中心に駐機・不可視
  return { x: BRAIN_X - CHIP_W / 2, y: BRAIN_Y - CHIP_H / 2, opacity: 0 }
}

function pulseAlpha(t: number) {
  // P0/P1 のみ脈動。9..10s でフェードアウトし、P2 は無音、P3 (15..20s) で再脈動
  if (t < 9) return 0.55
  if (t < 10) return 0.55 * (10 - t)
  if (t < P2_END) return 0
  if (t < P3_END) return 0.55
  return 0
}

function pulseOffset(t: number) {
  // 1.6 秒周期で 0..1 を往復
  return (Math.sin((2 * Math.PI * t) / 1.6) + 1) / 2
}

function Icon({
  kind,
  x,
  y,
  stroke,
}: {
  kind: IconKind
  x: number
  y: number
  stroke: string
}) {
  const sw = 1.8
  const common = {
    stroke,
    strokeWidth: sw,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (kind) {
    case "camera":
      return (
        <g {...common}>
          <rect x={x + 2} y={y + 7} width={24} height={16} rx={3} ry={3} />
          <path d={`M ${x + 9} ${y + 7} L ${x + 11} ${y + 4} L ${x + 17} ${y + 4} L ${x + 19} ${y + 7}`} />
          <circle cx={x + 14} cy={y + 15} r={4} />
        </g>
      )
    case "sun":
      return (
        <g {...common}>
          <circle cx={x + 14} cy={y + 14} r={5} />
          <path d={`M ${x + 14} ${y + 2} L ${x + 14} ${y + 5}`} />
          <path d={`M ${x + 14} ${y + 23} L ${x + 14} ${y + 26}`} />
          <path d={`M ${x + 2} ${y + 14} L ${x + 5} ${y + 14}`} />
          <path d={`M ${x + 23} ${y + 14} L ${x + 26} ${y + 14}`} />
          <path d={`M ${x + 5.5} ${y + 5.5} L ${x + 7.5} ${y + 7.5}`} />
          <path d={`M ${x + 20.5} ${y + 20.5} L ${x + 22.5} ${y + 22.5}`} />
          <path d={`M ${x + 5.5} ${y + 22.5} L ${x + 7.5} ${y + 20.5}`} />
          <path d={`M ${x + 20.5} ${y + 7.5} L ${x + 22.5} ${y + 5.5}`} />
        </g>
      )
    case "thermo":
      return (
        <g {...common}>
          <path d={`M ${x + 14} ${y + 3} L ${x + 14} ${y + 18}`} />
          <path d={`M ${x + 11} ${y + 3} a 3 3 0 0 1 6 0 L ${x + 17} ${y + 18}`} />
          <circle cx={x + 14} cy={y + 22} r={4} fill={stroke} />
        </g>
      )
    case "person":
      return (
        <g {...common}>
          <circle cx={x + 14} cy={y + 9} r={4} />
          <path d={`M ${x + 5} ${y + 25} a 9 9 0 0 1 18 0`} />
        </g>
      )
    case "cloud":
      return (
        <g {...common}>
          <path
            d={`M ${x + 7} ${y + 20} a 5 5 0 0 1 0 -10 a 6 6 0 0 1 11 -2 a 4 4 0 0 1 4 6 a 4 4 0 0 1 -4 6 z`}
          />
        </g>
      )
    case "scape":
      return (
        <g {...common}>
          <path d={`M ${x + 2} ${y + 23} L ${x + 9} ${y + 13} L ${x + 14} ${y + 18} L ${x + 19} ${y + 10} L ${x + 26} ${y + 23} Z`} />
          <circle cx={x + 21} cy={y + 7} r={2} />
        </g>
      )
    case "film":
      return (
        <g {...common}>
          <rect x={x + 3} y={y + 6} width={22} height={16} rx={1.5} ry={1.5} />
          <rect x={x + 5.5} y={y + 8.5} width={2} height={2} />
          <rect x={x + 5.5} y={y + 17.5} width={2} height={2} />
          <rect x={x + 20.5} y={y + 8.5} width={2} height={2} />
          <rect x={x + 20.5} y={y + 17.5} width={2} height={2} />
          <path d={`M ${x + 10} ${y + 14} L ${x + 18} ${y + 14}`} />
        </g>
      )
    case "lens":
      // 凸レンズ断面: 上下 2 円弧で挟まれた紡錘形 + 中央水平の光軸点線
      return (
        <g {...common}>
          <path d={`M ${x + 4} ${y + 14} a 12 8 0 0 1 20 0 a 12 8 0 0 1 -20 0 Z`} />
          <path
            d={`M ${x + 1.5} ${y + 14} L ${x + 26.5} ${y + 14}`}
            strokeOpacity={0.45}
            strokeDasharray="2 3"
          />
        </g>
      )
    case "illusion":
      // 同色の小矩形 2 つを濃淡背景の上に並べる「同じ色なのに違って見える」図
      return (
        <g>
          <rect x={x + 1.5} y={y + 6} width={11.5} height={16} fill="rgba(0,0,0,0.20)" />
          <rect x={x + 15} y={y + 6} width={11.5} height={16} fill="rgba(0,0,0,0.05)" />
          <rect x={x + 4.5} y={y + 10} width={5.5} height={8} fill={stroke} />
          <rect x={x + 18} y={y + 10} width={5.5} height={8} fill={stroke} />
        </g>
      )
  }
}

function BrainPerson({ t }: { t: number }) {
  const ringAlpha = pulseAlpha(t)
  const ringOffset = pulseOffset(t)
  return (
    <g aria-hidden="true">
      {/* 脈動リング (P0/P1/P3 のみ) */}
      {ringAlpha > 0 ? (
        <ellipse
          cx={BRAIN_X}
          cy={BRAIN_Y}
          rx={HEAD_RX + 6 + 4 * ringOffset}
          ry={HEAD_RY + 6 + 4 * ringOffset}
          fill="none"
          stroke={ACCENT}
          strokeOpacity={ringAlpha * (0.6 - 0.3 * ringOffset)}
          strokeWidth={1.4}
        />
      ) : null}

      {/* 肩 / 首ヒント */}
      <path
        d={`M 770 192 L 758 212 L 712 218 M 830 192 L 842 212 L 888 218`}
        stroke={STROKE_BRAIN}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 頭部 */}
      <ellipse
        cx={BRAIN_X}
        cy={BRAIN_Y}
        rx={HEAD_RX}
        ry={HEAD_RY}
        fill="rgba(255,255,255,0.55)"
        stroke={STROKE_BRAIN}
        strokeWidth={1.6}
      />

      {/* 脳のシルエット (頭部内側に accent fill) */}
      <path
        d={`M ${BRAIN_X - 50} ${BRAIN_Y - 38}
            Q ${BRAIN_X - 64} ${BRAIN_Y - 18} ${BRAIN_X - 56} ${BRAIN_Y + 12}
            Q ${BRAIN_X - 50} ${BRAIN_Y + 36} ${BRAIN_X - 22} ${BRAIN_Y + 40}
            Q ${BRAIN_X} ${BRAIN_Y + 48} ${BRAIN_X + 22} ${BRAIN_Y + 40}
            Q ${BRAIN_X + 50} ${BRAIN_Y + 36} ${BRAIN_X + 56} ${BRAIN_Y + 12}
            Q ${BRAIN_X + 64} ${BRAIN_Y - 18} ${BRAIN_X + 50} ${BRAIN_Y - 38}
            Q ${BRAIN_X + 38} ${BRAIN_Y - 52} ${BRAIN_X + 12} ${BRAIN_Y - 48}
            Q ${BRAIN_X - 12} ${BRAIN_Y - 52} ${BRAIN_X - 38} ${BRAIN_Y - 50}
            Q ${BRAIN_X - 60} ${BRAIN_Y - 48} ${BRAIN_X - 50} ${BRAIN_Y - 38} Z`}
        fill="rgba(139,127,255,0.28)"
        stroke={STROKE_BRAIN}
        strokeWidth={1.2}
      />

      {/* 半球の cleft (中央点線) */}
      <path
        d={`M ${BRAIN_X} ${BRAIN_Y - 50} L ${BRAIN_X} ${BRAIN_Y + 44}`}
        stroke={STROKE_BRAIN_SOFT}
        strokeWidth={0.8}
        strokeDasharray="2 3"
        fill="none"
      />

      {/* 半球内のしわ (微細) */}
      <path
        d={`M ${BRAIN_X - 36} ${BRAIN_Y - 18} Q ${BRAIN_X - 22} ${BRAIN_Y - 10} ${BRAIN_X - 12} ${BRAIN_Y - 22}`}
        stroke={STROKE_BRAIN_SOFT}
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${BRAIN_X + 12} ${BRAIN_Y - 22} Q ${BRAIN_X + 22} ${BRAIN_Y - 10} ${BRAIN_X + 36} ${BRAIN_Y - 18}`}
        stroke={STROKE_BRAIN_SOFT}
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${BRAIN_X - 30} ${BRAIN_Y + 16} Q ${BRAIN_X - 16} ${BRAIN_Y + 8} ${BRAIN_X - 6} ${BRAIN_Y + 22}`}
        stroke={STROKE_BRAIN_SOFT}
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${BRAIN_X + 6} ${BRAIN_Y + 22} Q ${BRAIN_X + 16} ${BRAIN_Y + 8} ${BRAIN_X + 30} ${BRAIN_Y + 16}`}
        stroke={STROKE_BRAIN_SOFT}
        strokeWidth={0.9}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

export default function CorrectionLabyrinthToFactor({
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

  // reducedMotion / 非再生時は Phase 2 中盤 (整列静止) を表示する
  const t = reducedMotion ? 12.5 : animT

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="scope-axis-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.85} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0.20} />
        </linearGradient>
      </defs>

      {/* 上部 eyebrow + 細→粗 粒度バー */}
      <text
        x={80}
        y={244}
        fill={TEXT_MUTED}
        fontSize={20}
        fontWeight={500}
        letterSpacing={4}
      >
        粒 度 の 階 層
      </text>
      <text
        x={72}
        y={282}
        textAnchor="end"
        fill={TEXT_MUTED}
        fontSize={18}
        fontWeight={500}
      >
        細
      </text>
      <text
        x={1528}
        y={282}
        fill={TEXT_MUTED}
        fontSize={18}
        fontWeight={500}
      >
        粗
      </text>
      <rect x={80} y={264} width={1440} height={18} rx={9} ry={9} fill="url(#scope-axis-grad)" />

      {/* 列間の連結矢印 (4 本、列の中段) */}
      {COLUMNS.slice(0, 4).map((_, i) => {
        const ax = COL_X[i] + COL_W + 12
        const bx = COL_X[i + 1] - 12
        const ay = COL_TOP_Y + 90
        return (
          <g key={`arrow-${i}`} opacity={0.55}>
            <path
              d={`M ${ax} ${ay} L ${bx} ${ay}`}
              stroke={ACCENT}
              strokeWidth={1.6}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M ${bx - 10} ${ay - 6} L ${bx} ${ay} L ${bx - 10} ${ay + 6}`}
              stroke={ACCENT}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )
      })}

      {/* 5 列の枠 + 番号バッジ + 層名ラベル */}
      {COLUMNS.map((col, i) => {
        const x = COL_X[i]
        const cx = x + COL_W / 2
        return (
          <g key={col.label}>
            <rect
              x={x}
              y={COL_TOP_Y}
              width={COL_W}
              height={COL_H}
              rx={20}
              ry={20}
              fill={ACCENT}
              fillOpacity={col.fillOp}
              stroke={ACCENT}
              strokeOpacity={col.borderOp}
              strokeWidth={1.8}
            />
            <rect
              x={x}
              y={COL_TOP_Y}
              width={COL_W}
              height={COL_H}
              rx={20}
              ry={20}
              fill="rgba(255,255,255,0.45)"
            />
            {/* 番号バッジ */}
            <circle
              cx={cx}
              cy={COL_TOP_Y - 32}
              r={20}
              fill="rgba(255,255,255,0.85)"
              stroke={ACCENT}
              strokeOpacity={col.borderOp}
              strokeWidth={1.8}
            />
            <text
              x={cx}
              y={COL_TOP_Y - 32 + 7}
              textAnchor="middle"
              fill={TEXT_PRIMARY}
              fontSize={20}
              fontWeight={700}
            >
              {i + 1}
            </text>
            {/* 層名ラベル (L プレフィックスなし) */}
            <text
              x={cx}
              y={COL_TOP_Y + 38}
              textAnchor="middle"
              fill={TEXT_PRIMARY}
              fontSize={22}
              fontWeight={700}
            >
              {col.label}
            </text>
          </g>
        )
      })}

      {/* 脳人物 (頭部・脳・体) */}
      <BrainPerson t={t} />

      {/* 9 chip — phase 別の状態で描画 */}
      {CARDS.map((card) => {
        const s = chipState(card, t)
        if (s.opacity <= 0.001) return null
        return (
          <g key={card.id} opacity={s.opacity}>
            <rect
              x={s.x}
              y={s.y}
              width={CHIP_W}
              height={CHIP_H}
              rx={26}
              ry={26}
              fill={card.tint.bg}
              stroke={card.tint.border}
              strokeWidth={1.6}
            />
            <rect
              x={s.x}
              y={s.y}
              width={CHIP_W}
              height={CHIP_H}
              rx={26}
              ry={26}
              fill="rgba(255,255,255,0.55)"
            />
            <Icon kind={card.icon} x={s.x + 20} y={s.y + 22} stroke={card.tint.iconStroke} />
            <text
              x={s.x + 64}
              y={s.y + CHIP_H / 2 + 8}
              fill={TEXT_PRIMARY}
              fontSize={24}
              fontWeight={600}
            >
              {card.label}
            </text>
          </g>
        )
      })}

      {/* 下部 axis 注釈 */}
      <text
        x={W / 2}
        y={H - 32}
        textAnchor="middle"
        fill={TEXT_MUTED}
        fontSize={18}
        letterSpacing={4}
        fontWeight={500}
      >
        左 ＝ 細 か い 粒 度 ／ 右 ＝ 広 い 範 囲
      </text>
    </svg>
  )
}
