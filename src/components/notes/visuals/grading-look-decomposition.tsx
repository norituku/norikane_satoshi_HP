"use client"

import { useEffect, useRef, useState } from "react"

const LOOP = 12
const W = 1600
const H = 500
const LEFT_W = 800
const RIGHT_X = 800

const TEXT_PRIMARY = "rgba(28,15,110,0.94)"
const TEXT_MUTED = "rgba(107,95,168,0.84)"
const GRID = "rgba(139,127,255,0.18)"
const CARD = "rgba(255,255,255,0.54)"

const MAGENTA = "rgb(192,74,142)"
const NAVY = "rgb(42,79,143)"
const AMBER = "rgb(200,146,58)"
const TEAL = "rgb(46,140,132)"

type AxisId = 1 | 2 | 3 | 4

type Axis = {
  id: AxisId
  name: string
  sub: string
  color: string
  y: number
}

type Word = {
  text: string
  axis: AxisId
}

const AXES: Axis[] = [
  {
    id: 1,
    name: "色の広がり・転がり",
    sub: "hue / saturation",
    color: MAGENTA,
    y: 82,
  },
  { id: 2, name: "濃度", sub: "color density", color: NAVY, y: 190 },
  { id: 3, name: "カーブ", sub: "tone curve", color: AMBER, y: 298 },
  {
    id: 4,
    name: "RGB カラーバランス",
    sub: "gray balance",
    color: TEAL,
    y: 406,
  },
]

const WORDS: Word[] = [
  { text: "もう少し暖かく", axis: 4 },
  { text: "青の濃度だけ落として", axis: 2 },
  { text: "もう少し抜けを", axis: 3 },
  { text: "肌の転がりをリッチに", axis: 1 },
]

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function easeInOutCubic(v: number) {
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}

function easeOutCubic(v: number) {
  return 1 - Math.pow(1 - v, 3)
}

function lerp(a: number, b: number, p: number) {
  return a + (b - a) * p
}

function response(localT: number) {
  const p = clamp01((localT - 2.05) / 1.2)
  if (p <= 0 || p >= 1) return 0
  return Math.sin(Math.PI * easeInOutCubic(p))
}

function wordState(localT: number) {
  const enter = easeOutCubic(clamp01(localT / 0.4))
  const fadeOut = 1 - clamp01((localT - 2.6) / 0.4)
  return {
    x: lerp(82, 260, enter),
    opacity: Math.min(enter, fadeOut),
  }
}

function targetY(axisId: AxisId) {
  return AXES.find((axis) => axis.id === axisId)!.y
}

function axisById(id: AxisId) {
  return AXES.find((axis) => axis.id === id)!
}

function arrowPath(fromX: number, fromY: number, toY: number, p: number) {
  const toX = RIGHT_X + 52
  const x1 = lerp(fromX, toX, p)
  const y1 = lerp(fromY, toY, p)
  return `M ${fromX} ${fromY} C 520 ${fromY}, 650 ${y1}, ${x1} ${y1}`
}

function hslColor(i: number, amp: number) {
  const baseHue = 318 + i * 10
  const hue = baseHue + amp * 15 * Math.sin(i * 0.8)
  const sat = 58 * (1 + amp * 0.3 * Math.cos(i * 0.7))
  const light = 62 - i * 1.8
  return `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${light.toFixed(1)}%)`
}

function curvePoints(amp: number) {
  const points: string[] = []
  const x0 = RIGHT_X + 500
  const y0 = 270
  const w = 196
  const h = 56
  for (let i = 0; i <= 96; i++) {
    const x = i / 96
    const contrast = amp * 0.3
    const y = clamp01(x + contrast * Math.sin((x - 0.5) * Math.PI))
    points.push(`${(x0 + x * w).toFixed(2)},${(y0 + h - y * h).toFixed(2)}`)
  }
  return points.join(" ")
}

function grayRampColor(i: number, amp: number) {
  const v = 42 + i * 7
  const shift = amp * 20
  const r = Math.max(0, Math.min(255, v + shift))
  const g = v
  const b = Math.max(0, Math.min(255, v - shift))
  return `rgb(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)})`
}

function AxisPreview({ axis, amp }: { axis: Axis; amp: number }) {
  const baseX = RIGHT_X + 500
  const y = axis.y
  if (axis.id === 1) {
    return (
      <g>
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={baseX + i * 25}
            y={y - 22}
            width={21}
            height={44}
            rx={7}
            fill={hslColor(i, amp)}
            stroke="rgba(255,255,255,0.72)"
          />
        ))}
        <rect
          x={baseX + 218}
          y={y - 20}
          width={38}
          height={40}
          rx={8}
          fill="rgb(142,142,142)"
          stroke="rgba(255,255,255,0.72)"
        />
      </g>
    )
  }
  if (axis.id === 2) {
    const shirt = 88 - amp * 34
    return (
      <g>
        <rect
          x={baseX}
          y={y - 34}
          width={180}
          height={68}
          rx={14}
          fill="rgba(255,255,255,0.46)"
          stroke="rgba(42,79,143,0.32)"
        />
        <path
          d={`M ${baseX + 22} ${y + 30} C ${baseX + 44} ${y - 8}, ${baseX + 78} ${y - 18}, ${baseX + 104} ${y + 30} Z`}
          fill={`rgb(${shirt * 0.42},${shirt * 0.62},${shirt * 1.1})`}
        />
        <circle cx={baseX + 80} cy={y - 10} r={18} fill="rgb(220,165,132)" />
        <rect
          x={baseX + 122}
          y={y - 19}
          width={38}
          height={38}
          rx={8}
          fill="rgb(220,165,132)"
        />
      </g>
    )
  }
  if (axis.id === 3) {
    return (
      <g>
        <rect
          x={baseX}
          y={y - 38}
          width={220}
          height={76}
          rx={14}
          fill="rgba(255,255,255,0.42)"
          stroke="rgba(200,146,58,0.28)"
        />
        <line
          x1={baseX + 12}
          y1={y + 24}
          x2={baseX + 208}
          y2={y - 32}
          stroke="rgba(28,15,110,0.20)"
          strokeWidth={2}
          strokeDasharray="5 7"
        />
        <polyline
          points={curvePoints(amp)}
          fill="none"
          stroke={AMBER}
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
    )
  }
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={baseX + i * 25}
          y={y - 22}
          width={21}
          height={44}
          rx={7}
          fill={grayRampColor(i, amp)}
          stroke="rgba(255,255,255,0.72)"
        />
      ))}
    </g>
  )
}

function AxisRow({
  axis,
  amp,
  active,
}: {
  axis: Axis
  amp: number
  active: boolean
}) {
  const knobX = RIGHT_X + 394 + amp * 26
  return (
    <g>
      <rect
        x={RIGHT_X + 36}
        y={axis.y - 44}
        width={720}
        height={88}
        rx={18}
        fill={active ? `${axis.color.replace("rgb", "rgba").replace(")", ",0.10)")}` : CARD}
        stroke={active ? axis.color : "rgba(255,255,255,0.62)"}
        strokeOpacity={active ? 0.72 : 0.48}
      />
      <circle cx={RIGHT_X + 72} cy={axis.y} r={12} fill={axis.color} />
      <text x={RIGHT_X + 96} y={axis.y - 6} fontSize={22} fontWeight={700} fill={TEXT_PRIMARY}>
        {axis.name}
      </text>
      <text x={RIGHT_X + 96} y={axis.y + 20} fontSize={14} fill={TEXT_MUTED}>
        {axis.sub}
      </text>
      <line x1={RIGHT_X + 315} y1={axis.y} x2={RIGHT_X + 447} y2={axis.y} stroke="rgba(28,15,110,0.18)" strokeWidth={8} strokeLinecap="round" />
      <circle cx={knobX} cy={axis.y} r={15} fill={axis.color} stroke="white" strokeWidth={3} />
      <AxisPreview axis={axis} amp={amp} />
    </g>
  )
}

function ReducedFrame() {
  return (
    <g>
      {WORDS.map((word, i) => {
        const axis = axisById(word.axis)
        const y = 116 + i * 86
        return (
          <g key={word.text}>
            <rect x={88} y={y - 30} width={410} height={60} rx={18} fill="rgba(255,255,255,0.64)" stroke={axis.color} strokeOpacity={0.42} />
            <text x={116} y={y + 8} fontSize={24} fontWeight={700} fill={TEXT_PRIMARY}>
              {word.text}
            </text>
            <path
              d={`M 510 ${y} C 610 ${y}, 660 ${axis.y}, 842 ${axis.y}`}
              fill="none"
              stroke={axis.color}
              strokeWidth={3.5}
              strokeLinecap="round"
              markerEnd={`url(#gld-arrow-${word.axis})`}
            />
          </g>
        )
      })}
    </g>
  )
}

export default function GradingLookDecomposition({
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

  const wordIndex = Math.floor(animT / 3) % WORDS.length
  const localT = animT % 3
  const activeWord = WORDS[wordIndex]
  const activeAxis = activeWord.axis
  const state = wordState(localT)
  const arrowP = clamp01((localT - 1.55) / 0.7)
  const amp = response(localT)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        {AXES.map((axis) => (
          <marker key={axis.id} id={`gld-arrow-${axis.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={axis.color} />
          </marker>
        ))}
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />
      <line x1={LEFT_W} y1={28} x2={LEFT_W} y2={H - 28} stroke={GRID} strokeWidth={2} strokeDasharray="9 12" />

      <text x={64} y={58} fontSize={15} fontWeight={700} letterSpacing={2} fill={TEXT_MUTED}>
        WORD STREAM
      </text>
      <text x={RIGHT_X + 48} y={58} fontSize={15} fontWeight={700} letterSpacing={2} fill={TEXT_MUTED}>
        4 AXIS FOOTING
      </text>

      {AXES.map((axis) => (
        <AxisRow
          key={axis.id}
          axis={axis}
          active={!reducedMotion && activeAxis === axis.id && amp > 0}
          amp={!reducedMotion && activeAxis === axis.id ? amp : 0}
        />
      ))}

      {reducedMotion ? (
        <ReducedFrame />
      ) : (
        <g opacity={state.opacity}>
          <rect x={state.x} y={212} width={410} height={76} rx={22} fill="rgba(255,255,255,0.72)" stroke={axisById(activeAxis).color} strokeOpacity={0.6} />
          <text x={state.x + 32} y={258} fontSize={29} fontWeight={760} fill={TEXT_PRIMARY}>
            {activeWord.text}
          </text>
          {arrowP > 0 ? (
            <path
              d={arrowPath(state.x + 410, 250, targetY(activeAxis), arrowP)}
              fill="none"
              stroke={axisById(activeAxis).color}
              strokeWidth={4}
              strokeLinecap="round"
              markerEnd={`url(#gld-arrow-${activeAxis})`}
            />
          ) : null}
        </g>
      )}
    </svg>
  )
}
