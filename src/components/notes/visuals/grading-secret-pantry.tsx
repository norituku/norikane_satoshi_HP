"use client"

import { useEffect, useRef, useState } from "react"
import type { VideoVisualProps } from "@/components/notes/note-visual"

const LOOP = 9
const W = 1600
const H = 500

const PREVIEW_X = 426.5
const PREVIEW_Y = 40
const PREVIEW_W = 747
const PREVIEW_H = 420
const PREVIEW_CX = PREVIEW_X + PREVIEW_W / 2

const CARD = "rgba(255,255,255,0.50)"
const GRID = "rgba(139,127,255,0.16)"

const MAGENTA = "rgb(192,74,142)"
const NAVY = "rgb(42,79,143)"
const AMBER = "rgb(200,146,58)"
const TEAL = "rgb(46,140,132)"

type AxisId = 1 | 2 | 3 | 4

type Bottle = {
  id: AxisId
  label: string
  color: string
  x: number
  y: number
}

const BOTTLES: Bottle[] = [
  { id: 1, label: "Gamut", color: MAGENTA, x: 138, y: 84 },
  { id: 2, label: "Lum", color: NAVY, x: 138, y: 306 },
  { id: 3, label: "Curve", color: AMBER, x: 1350, y: 84 },
  { id: 4, label: "RGB", color: TEAL, x: 1350, y: 306 },
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
  const fadeStart = axisStart(id) + 0.4
  if (t < fadeStart) return 0
  if (t >= fadeStart + 0.4) return 1
  return easeInOutCubic((t - fadeStart) / 0.4)
}

function easeOutCubic(v: number) {
  return 1 - Math.pow(1 - v, 3)
}

function shelfOpacity(t: number) {
  if (t < 7.4) return 1
  if (t >= 8) return 0
  return 1 - easeOutCubic((t - 7.4) / 0.6)
}

function bottlePose(bottle: Bottle, t: number, reducedMotion: boolean) {
  const targetX = PREVIEW_CX - 56 + (bottle.id - 2.5) * 34
  const targetY = PREVIEW_Y + 126
  if (reducedMotion) {
    return { x: targetX, y: targetY, rotate: 0, opacity: 0 }
  }
  const start = axisStart(bottle.id)
  if (t < start) {
    return { x: bottle.x, y: bottle.y, rotate: 0, opacity: 1 }
  }
  const p = easeInOutCubic(clamp01((t - start) / 0.4))
  const fadeP = easeOutCubic(clamp01((t - (start + 0.4)) / 0.4))
  return {
    x: lerp(bottle.x, targetX, p),
    y: lerp(bottle.y, targetY, p),
    rotate: lerp(-8, 0, p),
    opacity: 1 - fadeP,
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
      <line x1={x + 10} y1={230} x2={x + 370} y2={230} stroke={GRID} />
      <line x1={x + 10} y1={452} x2={x + 370} y2={452} stroke={GRID} />
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
      <path
        d="M 28 52 C 28 36, 44 31, 54 24 L 54 9 L 86 9 L 86 24 C 96 31, 112 36, 112 52 L 112 118 C 112 132, 99 142, 70 142 C 41 142, 28 132, 28 118 Z"
        fill="rgba(255,255,255,0.68)"
        stroke={bottle.color}
        strokeOpacity={0.58}
        strokeWidth={3}
      />
      <rect x={48} y={0} width={44} height={18} rx={5} fill={bottle.color} />
      <rect x={34} y={68} width={72} height={34} rx={8} fill={bottle.color} />
      <text
        x={70}
        y={91}
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), 'Notion Mono Editorial', monospace"
        fontSize={bottle.label.length > 4 ? 18 : 21}
        fontWeight={760}
        fill="white"
      >
        {bottle.label}
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

  const t = reducedMotion ? 8.5 : animT
  const shelvesP = reducedMotion ? 0 : shelfOpacity(t)

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
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />

      <g>
        {shelvesP > 0 ? (
          <g opacity={shelvesP}>
            <Shelf side="left" />
            <Shelf side="right" />
          </g>
        ) : null}
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
        {!reducedMotion
          ? BOTTLES.map((bottle) => (
              <BottleShape
                key={bottle.id}
                bottle={bottle}
                t={t}
                reducedMotion={reducedMotion}
              />
            ))
          : null}
      </g>
    </svg>
  )
}
