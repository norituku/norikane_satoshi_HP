"use client"

import { useEffect, useRef, useState } from "react"

/**
 * v5 動画モジュール: 迷宮 → 因数分解
 *
 * 12 秒ループで「混線していた要因 (chaos zone)」が「5 段の粒度レイヤー
 * (order zone)」に並び直る過程を見せる。色や派手な動きではなく、
 * カードがゆっくり目的の行へスライドする、その手付きを描く。
 *
 * 構成:
 *   - 0..1s    : カードが chaos 位置に opacity 0→1 で立ち上がる
 *   - 1..3s    : chaos 位置で微小ジッター
 *   - 3..7.6s  : 各カードがスタガーで layer 位置にイージング移動
 *   - 5..7s    : 5 段のルール線と layer ラベルがフェードイン
 *   - 7..11s   : 静止 (settled state)
 *   - 11..12s  : 全要素 opacity 1→0 でフェードアウト → 0s に戻り再ループ
 *
 * isPlaying=false の間は requestAnimationFrame を回さず、最後の t を保持する。
 * reducedMotion=true の間はアニメ層を駆動せず t=9 (settled) で固定する。
 */

const LOOP = 12
const W = 1600
const H = 1000
const CARD_W = 200
const CARD_H = 64

type CardSpec = {
  id: string
  label: string
  chaos: { x: number; y: number }
  layer: { x: number; y: number }
  staggerStart: number
  staggerEnd: number
}

const LAYERS: { index: number; label: string; y: number }[] = [
  { index: 1, label: "カメラ単位", y: 110 },
  { index: 2, label: "フレーム単位", y: 280 },
  { index: 3, label: "アングル単位", y: 450 },
  { index: 4, label: "シーン単位", y: 620 },
  { index: 5, label: "作品単位", y: 790 },
]

const LAYER_X_BASE = 880
const LAYER_X_SECOND = LAYER_X_BASE + 230

const CARDS: CardSpec[] = [
  {
    id: "camera-diff",
    label: "カメラ差",
    chaos: { x: 180, y: 130 },
    layer: { x: LAYER_X_BASE, y: LAYERS[0].y },
    staggerStart: 3.0,
    staggerEnd: 6.4,
  },
  {
    id: "exposure-shift",
    label: "露出揺れ",
    chaos: { x: 470, y: 270 },
    layer: { x: LAYER_X_BASE, y: LAYERS[1].y },
    staggerStart: 3.2,
    staggerEnd: 6.6,
  },
  {
    id: "color-temp",
    label: "色温度",
    chaos: { x: 240, y: 430 },
    layer: { x: LAYER_X_SECOND, y: LAYERS[0].y },
    staggerStart: 3.4,
    staggerEnd: 6.8,
  },
  {
    id: "skin",
    label: "肌",
    chaos: { x: 560, y: 560 },
    layer: { x: LAYER_X_BASE, y: LAYERS[2].y },
    staggerStart: 3.6,
    staggerEnd: 7.0,
  },
  {
    id: "atmosphere",
    label: "大気",
    chaos: { x: 150, y: 690 },
    layer: { x: LAYER_X_BASE, y: LAYERS[3].y },
    staggerStart: 3.8,
    staggerEnd: 7.2,
  },
  {
    id: "scene-tone",
    label: "シーントーン",
    chaos: { x: 430, y: 830 },
    layer: { x: LAYER_X_SECOND, y: LAYERS[3].y },
    staggerStart: 4.0,
    staggerEnd: 7.4,
  },
  {
    id: "work-look",
    label: "作品ルック",
    chaos: { x: 600, y: 130 },
    layer: { x: LAYER_X_BASE, y: LAYERS[4].y },
    staggerStart: 4.2,
    staggerEnd: 7.6,
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
      lastRef.current = null
    }
  }, [isPlaying, reducedMotion])

  // reducedMotion 環境では時間を進めず settled 状態 (t=9) を固定で出す。
  // その他は rAF が更新する animT をそのまま使う。
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
          y1={L.y + CARD_H / 2}
          y2={L.y + CARD_H / 2}
          stroke={ACCENT}
          strokeOpacity={0.32}
          strokeWidth={1.5}
          opacity={layerOp}
        />
      ))}

      {/* layer text labels (right edge) */}
      {LAYERS.map((L) => (
        <text
          key={`label-${L.index}`}
          x={1545}
          y={L.y + CARD_H / 2 + 8}
          textAnchor="end"
          fill={TEXT_PRIMARY}
          fontSize={26}
          fontWeight={600}
          opacity={layerOp}
        >
          {`L${L.index}  ${L.label}`}
        </text>
      ))}

      {/* eyebrow labels for the two zones (visible after rules appear) */}
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

      {/* migrating cards */}
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
              width={CARD_W}
              height={CARD_H}
              rx={12}
              ry={12}
              fill="rgba(255,255,255,0.85)"
              stroke={ACCENT}
              strokeOpacity={0.45}
              strokeWidth={1.2}
            />
            <text
              x={x + CARD_W / 2}
              y={y + CARD_H / 2 + 8}
              textAnchor="middle"
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
