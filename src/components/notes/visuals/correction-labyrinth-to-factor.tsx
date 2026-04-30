"use client"

import { useEffect, useRef, useState } from "react"

/**
 * v5 動画モジュール: 迷宮 → 因数分解
 *
 * 12 秒ループで「混線していた要因 (chaos zone)」が「5 段の粒度レイヤー
 * (order zone)」に並び直る過程を見せる。色や派手な動きではなく、
 * カードがゆっくり目的の行へスライドする、その手付きを描く。
 *
 *   - 0..1s    : カードが chaos 位置に opacity 0→1 で立ち上がる
 *   - 1..3s    : chaos 位置で微小ジッター
 *   - 3..7.6s  : 各カードがスタガーで layer 位置にイージング移動
 *   - 5..7s    : 5 段のルール線と layer ラベルがフェードイン
 *   - 7..11s   : 静止 (settled state)
 *   - 11..12s  : 全要素 opacity 1→0 でフェードアウト → 0s に戻り再ループ
 */

const LOOP = 12
const W = 1600
const H = 1000
const CHIP_W = 240
const CHIP_H = 72

type CardSpec = {
  id: string
  label: string
  chaos: { x: number; y: number }
  layer: { x: number; y: number }
  staggerStart: number
  staggerEnd: number
  tint: { border: string; bg: string; iconStroke: string }
  icon: "camera" | "sun" | "thermo" | "person" | "cloud" | "scape" | "film"
}

const LAYERS: { index: number; label: string; y: number }[] = [
  { index: 1, label: "カメラ単位", y: 110 },
  { index: 2, label: "フレーム単位", y: 280 },
  { index: 3, label: "アングル単位", y: 450 },
  { index: 4, label: "シーン単位", y: 620 },
  { index: 5, label: "作品単位", y: 790 },
]

const LAYER_X_BASE = 880
const LAYER_X_SECOND = LAYER_X_BASE + 270

// accent #8B7FFF を中心に、色相を ±90° の範囲で穏やかに振る。
// 彩度を抑えて 7 因子に identity を与えつつ Glass トーンを保つ。
const TINT_VIOLET = { border: "rgba(139,127,255,0.85)", bg: "rgba(139,127,255,0.10)", iconStroke: "rgba(95,80,210,0.92)" }
const TINT_AMBER = { border: "rgba(214,162,108,0.85)", bg: "rgba(214,162,108,0.10)", iconStroke: "rgba(160,108,60,0.92)" }
const TINT_CORAL = { border: "rgba(214,127,140,0.85)", bg: "rgba(214,127,140,0.10)", iconStroke: "rgba(160,75,90,0.92)" }
const TINT_ROSE = { border: "rgba(214,140,180,0.85)", bg: "rgba(214,140,180,0.10)", iconStroke: "rgba(160,80,120,0.92)" }
const TINT_SKY = { border: "rgba(120,165,225,0.85)", bg: "rgba(120,165,225,0.10)", iconStroke: "rgba(60,108,170,0.92)" }
const TINT_TEAL = { border: "rgba(108,180,170,0.85)", bg: "rgba(108,180,170,0.10)", iconStroke: "rgba(50,120,115,0.92)" }
const TINT_PLUM = { border: "rgba(170,120,200,0.85)", bg: "rgba(170,120,200,0.10)", iconStroke: "rgba(112,60,150,0.92)" }

const CARDS: CardSpec[] = [
  {
    id: "camera-diff",
    label: "カメラ差",
    chaos: { x: 80, y: 90 },
    layer: { x: LAYER_X_BASE, y: LAYERS[0].y },
    staggerStart: 3.0,
    staggerEnd: 6.4,
    tint: TINT_VIOLET,
    icon: "camera",
  },
  {
    id: "exposure-shift",
    label: "露出揺れ",
    chaos: { x: 430, y: 200 },
    layer: { x: LAYER_X_BASE, y: LAYERS[1].y },
    staggerStart: 3.2,
    staggerEnd: 6.6,
    tint: TINT_AMBER,
    icon: "sun",
  },
  {
    id: "color-temp",
    label: "色温度",
    chaos: { x: 110, y: 320 },
    layer: { x: LAYER_X_SECOND, y: LAYERS[0].y },
    staggerStart: 3.4,
    staggerEnd: 6.8,
    tint: TINT_CORAL,
    icon: "thermo",
  },
  {
    id: "skin",
    label: "肌",
    chaos: { x: 460, y: 440 },
    layer: { x: LAYER_X_BASE, y: LAYERS[2].y },
    staggerStart: 3.6,
    staggerEnd: 7.0,
    tint: TINT_ROSE,
    icon: "person",
  },
  {
    id: "atmosphere",
    label: "大気",
    chaos: { x: 130, y: 560 },
    layer: { x: LAYER_X_BASE, y: LAYERS[3].y },
    staggerStart: 3.8,
    staggerEnd: 7.2,
    tint: TINT_SKY,
    icon: "cloud",
  },
  {
    id: "scene-tone",
    label: "シーントーン",
    chaos: { x: 440, y: 680 },
    layer: { x: LAYER_X_SECOND, y: LAYERS[3].y },
    staggerStart: 4.0,
    staggerEnd: 7.4,
    tint: TINT_TEAL,
    icon: "scape",
  },
  {
    id: "work-look",
    label: "作品ルック",
    chaos: { x: 100, y: 800 },
    layer: { x: LAYER_X_BASE, y: LAYERS[4].y },
    staggerStart: 4.2,
    staggerEnd: 7.6,
    tint: TINT_PLUM,
    icon: "film",
  },
]

const ACCENT = "rgb(139,127,255)"
const TEXT_PRIMARY = "rgba(28,15,110,0.92)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function overallOpacity(t: number) {
  if (t < 1) return t
  if (t > 11) return 1 - (t - 11)
  return 1
}

function jitter(t: number, seed: number) {
  // chaos 段階で最大、移動が始まると 2 秒かけて 0 へ収束。
  const amp = t < 3 ? 5 : t < 5 ? 5 * (1 - (t - 3) / 2) : 0
  return {
    x: amp * Math.sin(t * 1.3 + seed * 0.7),
    y: amp * Math.cos(t * 1.7 + seed * 1.1),
  }
}

function Icon({ kind, x, y, stroke }: { kind: CardSpec["icon"]; x: number; y: number; stroke: string }) {
  // 28x28 の line-icon。chip 左端 (x, y) を起点に描く。
  const sw = 1.8
  const common = { stroke, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
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
  }
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

  const t = reducedMotion ? 9 : animT
  const layerOp = clamp01((t - 5) / 2)
  const overallOp = overallOpacity(t)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* chaos / order zone divider (dashed, faint) */}
      <line
        x1={820}
        x2={820}
        y1={60}
        y2={940}
        stroke={ACCENT}
        strokeOpacity={0.18}
        strokeWidth={1}
        strokeDasharray="6 8"
        opacity={layerOp}
      />

      {/* 5 layer rule lines (right zone) */}
      {LAYERS.map((L) => (
        <line
          key={`rule-${L.index}`}
          x1={860}
          x2={1540}
          y1={L.y + CHIP_H / 2}
          y2={L.y + CHIP_H / 2}
          stroke={ACCENT}
          strokeOpacity={0.32}
          strokeWidth={1.5}
          opacity={layerOp}
        />
      ))}

      {/* layer text labels (right edge) — プレフィックスなし、層名のみ */}
      {LAYERS.map((L) => (
        <text
          key={`label-${L.index}`}
          x={1545}
          y={L.y + CHIP_H / 2 + 8}
          textAnchor="end"
          fill={TEXT_PRIMARY}
          fontSize={26}
          fontWeight={600}
          opacity={layerOp}
        >
          {L.label}
        </text>
      ))}

      {/* eyebrow labels for the two zones */}
      <text
        x={120}
        y={50}
        fill={TEXT_MUTED}
        fontSize={20}
        fontWeight={500}
        letterSpacing={4}
        opacity={1 - layerOp}
      >
        混 線
      </text>
      <text
        x={1545}
        y={50}
        textAnchor="end"
        fill={TEXT_MUTED}
        fontSize={20}
        fontWeight={500}
        letterSpacing={4}
        opacity={layerOp}
      >
        5 段 の 粒 度
      </text>

      {/* migrating chips */}
      {CARDS.map((card, i) => {
        const raw = (t - card.staggerStart) / (card.staggerEnd - card.staggerStart)
        const p = easeInOutCubic(clamp01(raw))
        const j = jitter(t, i)
        const x = card.chaos.x * (1 - p) + card.layer.x * p + j.x * (1 - p)
        const y = card.chaos.y * (1 - p) + card.layer.y * p + j.y * (1 - p)
        return (
          <g key={card.id} opacity={overallOp}>
            <rect
              x={x}
              y={y}
              width={CHIP_W}
              height={CHIP_H}
              rx={26}
              ry={26}
              fill={card.tint.bg}
              stroke={card.tint.border}
              strokeWidth={1.6}
            />
            {/* white wash so glass-card 親の青味と混線せず chip identity が立つ */}
            <rect
              x={x}
              y={y}
              width={CHIP_W}
              height={CHIP_H}
              rx={26}
              ry={26}
              fill="rgba(255,255,255,0.55)"
            />
            <Icon kind={card.icon} x={x + 20} y={y + 22} stroke={card.tint.iconStroke} />
            <text
              x={x + 64}
              y={y + CHIP_H / 2 + 8}
              fill={TEXT_PRIMARY}
              fontSize={24}
              fontWeight={600}
            >
              {card.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
