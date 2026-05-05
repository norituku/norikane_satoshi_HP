"use client"

import { useEffect, useRef, useState } from "react"
import type { VideoVisualProps } from "@/components/notes/note-visual"

const LOOP = 11
const W = 1600
const H = 500

const TITLE_X = 20
const TITLE_Y = 20
const TITLE_W = 1560
const TITLE_H = 70
const PREVIEW_X = 440
const PREVIEW_Y = 92
const PREVIEW_W = 720
const PREVIEW_H = 405
const PREVIEW_CX = PREVIEW_X + PREVIEW_W / 2

const TEXT_PRIMARY = "rgba(28,15,110,0.94)"
const TEXT_MUTED = "rgba(107,95,168,0.84)"
const CARD = "rgba(255,255,255,0.50)"
const GRID = "rgba(139,127,255,0.16)"

const MAGENTA = "rgb(192,74,142)"
const NAVY = "rgb(42,79,143)"
const AMBER = "rgb(200,146,58)"
const TEAL = "rgb(46,140,132)"

type AxisId = 1 | 2 | 3 | 4

type Bottle = {
  id: AxisId
  axis: string
  secret: string
  color: string
  x: number
  y: number
}

const BOTTLES: Bottle[] = [
  { id: 1, axis: "色の広がり・転がり", secret: "秘伝 01", color: MAGENTA, x: 126, y: 166 },
  { id: 2, axis: "濃度", secret: "秘伝 02", color: NAVY, x: 126, y: 354 },
  { id: 3, axis: "カーブ", secret: "秘伝 03", color: AMBER, x: 1316, y: 166 },
  { id: 4, axis: "RGB バランス", secret: "秘伝 04", color: TEAL, x: 1316, y: 354 },
]

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function easeInOutCubic(v: number) {
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}

function lerp(a: number, b: number, p: number) {
  return a + (b - a) * p
}

function axisStart(id: AxisId) {
  return 1 + (id - 1) * 2
}

function fadeOpacity(id: AxisId, t: number) {
  const fadeStart = axisStart(id) + 0.6
  if (t < fadeStart) return 0
  if (t >= fadeStart + 0.4) return 1
  return easeInOutCubic((t - fadeStart) / 0.4)
}

function titleOpacity(t: number) {
  if (t < 10) return 0
  return easeInOutCubic(clamp01((t - 10) / 1))
}

function bottlePose(bottle: Bottle, t: number, reducedMotion: boolean) {
  const targetX = PREVIEW_CX - 24 + (bottle.id - 2.5) * 38
  const targetY = 134
  if (reducedMotion) {
    return { x: targetX, y: targetY, rotate: 0, opacity: 1 }
  }
  const start = axisStart(bottle.id)
  if (t < start || t >= 11) {
    return { x: bottle.x, y: bottle.y, rotate: 0, opacity: 1 }
  }
  const p = easeInOutCubic(clamp01((t - start) / 0.6))
  return {
    x: lerp(bottle.x, targetX, p),
    y: lerp(bottle.y, targetY, p),
    rotate: lerp(-8, 0, p),
    opacity: t > 10 ? 1 - titleOpacity(t) * 0.2 : 1,
  }
}

function PreviewLayers({
  t,
  reducedMotion,
}: {
  t: number
  reducedMotion: boolean
}) {
  const finalFrame = reducedMotion
  return (
    <g>
      <rect
        id="sp-step-0"
        x={PREVIEW_X}
        y={PREVIEW_Y}
        width={PREVIEW_W}
        height={PREVIEW_H}
        rx={20}
        fill="url(#sp-step-0-fill)"
      />
      <rect
        id="sp-step-1"
        x={PREVIEW_X}
        y={PREVIEW_Y}
        width={PREVIEW_W}
        height={PREVIEW_H}
        rx={20}
        fill="url(#sp-step-1-fill)"
        opacity={finalFrame ? 1 : fadeOpacity(1, t)}
      />
      <rect
        id="sp-step-2"
        x={PREVIEW_X}
        y={PREVIEW_Y}
        width={PREVIEW_W}
        height={PREVIEW_H}
        rx={20}
        fill="url(#sp-step-2-fill)"
        opacity={finalFrame ? 1 : fadeOpacity(2, t)}
      />
      <rect
        id="sp-step-3"
        x={PREVIEW_X}
        y={PREVIEW_Y}
        width={PREVIEW_W}
        height={PREVIEW_H}
        rx={20}
        fill="url(#sp-step-3-fill)"
        opacity={finalFrame ? 1 : fadeOpacity(3, t)}
      />
      <rect
        id="sp-step-4"
        x={PREVIEW_X}
        y={PREVIEW_Y}
        width={PREVIEW_W}
        height={PREVIEW_H}
        rx={20}
        fill="url(#sp-step-4-fill)"
        opacity={finalFrame ? 1 : fadeOpacity(4, t)}
      />
    </g>
  )
}

function Shelf({ side }: { side: "left" | "right" }) {
  const x = side === "left" ? 20 : 1200
  return (
    <g>
      <line x1={x + 10} y1={252} x2={x + 370} y2={252} stroke={GRID} />
      <line x1={x + 10} y1={440} x2={x + 370} y2={440} stroke={GRID} />
    </g>
  )
}

function BottleShape({
  bottle,
  t,
  reducedMotion,
}: {
  bottle: Bottle
  t: number
  reducedMotion: boolean
}) {
  const pose = bottlePose(bottle, t, reducedMotion)
  return (
    <g
      transform={`translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${pose.rotate.toFixed(2)} 42 52)`}
      opacity={pose.opacity}
    >
      <rect
        x={0}
        y={88}
        width={250}
        height={74}
        rx={18}
        fill="rgba(255,255,255,0.50)"
        stroke="rgba(255,255,255,0.62)"
      />
      <path
        d="M 28 52 C 28 36, 44 31, 54 24 L 54 9 L 86 9 L 86 24 C 96 31, 112 36, 112 52 L 112 118 C 112 132, 99 142, 70 142 C 41 142, 28 132, 28 118 Z"
        fill="rgba(255,255,255,0.68)"
        stroke={bottle.color}
        strokeOpacity={0.58}
        strokeWidth={3}
      />
      <rect x={48} y={0} width={44} height={18} rx={5} fill={bottle.color} />
      <rect x={42} y={70} width={56} height={34} rx={8} fill={bottle.color} />
      <text
        x={70}
        y={93}
        textAnchor="middle"
        fontSize={13}
        fontWeight={760}
        fill="white"
      >
        AXIS {bottle.id}
      </text>
      <text x={128} y={118} fontSize={18} fontWeight={720} fill={TEXT_PRIMARY}>
        {bottle.axis}
      </text>
      <text x={128} y={145} fontSize={14} fill={TEXT_MUTED}>
        {bottle.secret}
      </text>
    </g>
  )
}

export default function GradingSecretPantry({
  isPlaying,
  reducedMotion,
}: VideoVisualProps) {
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

  const t = reducedMotion ? 10.8 : animT
  const titleP = reducedMotion ? 1 : titleOpacity(t)
  const dimP = titleP * 0.24

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="sp-step-0-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(176,182,187)" />
          <stop offset="52%" stopColor="rgb(128,136,143)" />
          <stop offset="100%" stopColor="rgb(92,99,108)" />
        </linearGradient>
        <linearGradient id="sp-step-1-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(196,176,190)" />
          <stop offset="48%" stopColor="rgb(145,119,151)" />
          <stop offset="100%" stopColor="rgb(96,78,118)" />
        </linearGradient>
        <linearGradient id="sp-step-2-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(161,136,158)" />
          <stop offset="48%" stopColor="rgb(111,91,126)" />
          <stop offset="100%" stopColor="rgb(65,58,86)" />
        </linearGradient>
        <linearGradient id="sp-step-3-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(202,181,167)" />
          <stop offset="45%" stopColor="rgb(104,88,111)" />
          <stop offset="100%" stopColor="rgb(40,46,70)" />
        </linearGradient>
        <linearGradient id="sp-step-4-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(220,186,166)" />
          <stop offset="45%" stopColor="rgb(132,92,126)" />
          <stop offset="100%" stopColor="rgb(52,63,106)" />
        </linearGradient>
        <filter id="sp-title-glow" x="-10%" y="-80%" width="120%" height="260%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />
      <rect
        x={TITLE_X}
        y={TITLE_Y}
        width={TITLE_W}
        height={TITLE_H}
        rx={16}
        fill="rgba(255,255,255,0.34)"
        stroke="rgba(28,15,110,0.16)"
      />

      <g opacity={1 - dimP}>
        <Shelf side="left" />
        <Shelf side="right" />
        <rect
          x={PREVIEW_X - 18}
          y={PREVIEW_Y - 18}
          width={PREVIEW_W + 36}
          height={PREVIEW_H + 36}
          rx={26}
          fill={CARD}
          stroke="rgba(255,255,255,0.62)"
        />
        <PreviewLayers t={t} reducedMotion={reducedMotion} />
        <rect
          x={PREVIEW_X}
          y={PREVIEW_Y}
          width={PREVIEW_W}
          height={PREVIEW_H}
          rx={20}
          fill="none"
          stroke="rgba(255,255,255,0.78)"
          strokeWidth={2}
        />
        {BOTTLES.map((bottle) => (
          <BottleShape
            key={bottle.id}
            bottle={bottle}
            t={t}
            reducedMotion={reducedMotion}
          />
        ))}
      </g>

      <g
        opacity={titleP}
        filter={titleP > 0.01 ? "url(#sp-title-glow)" : undefined}
        transform={`translate(${lerp(-28, 0, titleP).toFixed(2)} 0)`}
      >
        <text
          x={58}
          y={48}
          fontFamily="var(--font-geist-mono), 'Notion Mono Editorial', monospace"
          fontSize={14}
          fontWeight={760}
          letterSpacing={2.2}
          fill={TEXT_MUTED}
        >
          新作
        </text>
        <text
          x={58}
          y={77}
          fontFamily="var(--font-geist-mono), 'Notion Mono Editorial', monospace"
          fontSize={28}
          fontWeight={760}
          fill={TEXT_PRIMARY}
        >
          （仮）New Project Look
        </text>
      </g>
    </svg>
  )
}
