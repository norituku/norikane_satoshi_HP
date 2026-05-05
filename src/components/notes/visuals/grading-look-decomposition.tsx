"use client"

import { useEffect, useRef, useState } from "react"
import type { VideoVisualProps } from "@/components/notes/note-visual"

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
type ChipKind = "color" | "gray" | "skin"
type Rgb = { r: number; g: number; b: number }

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

type Chip = {
  kind: ChipKind
  label: string
  rgb: Rgb
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

const TEST_CHIPS: Chip[] = [
  { kind: "color", label: "R", rgb: { r: 224, g: 44, b: 58 } },
  { kind: "color", label: "O", rgb: { r: 235, g: 126, b: 28 } },
  { kind: "color", label: "B", rgb: { r: 36, g: 94, b: 224 } },
  { kind: "color", label: "G", rgb: { r: 34, g: 172, b: 82 } },
  { kind: "gray", label: "12", rgb: gray(0.12) },
  { kind: "gray", label: "38", rgb: gray(0.38) },
  { kind: "gray", label: "64", rgb: gray(0.64) },
  { kind: "gray", label: "86", rgb: gray(0.86) },
  { kind: "skin", label: "D1", rgb: { r: 105, g: 62, b: 44 } },
  { kind: "skin", label: "D2", rgb: { r: 139, g: 83, b: 58 } },
  { kind: "skin", label: "L1", rgb: { r: 204, g: 142, b: 102 } },
  { kind: "skin", label: "L2", rgb: { r: 230, g: 180, b: 136 } },
]

function gray(v: number): Rgb {
  const c = Math.round(v * 255)
  return { r: c, g: c, b: c }
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function clamp255(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)))
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
  const p = clamp01((localT - 2.05) / 0.95)
  if (p <= 0 || p >= 1) return 0
  return Math.sin(Math.PI * 2 * easeInOutCubic(p))
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

function rgbToHsl({ r, g, b }: Rgb) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return { h: h * 60, s, l }
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = (((h % 360) + 360) % 360) / 360
  if (s === 0) return gray(l)
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (tIn: number) => {
    let t = tIn
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return {
    r: clamp255(channel(hue + 1 / 3) * 255),
    g: clamp255(channel(hue) * 255),
    b: clamp255(channel(hue - 1 / 3) * 255),
  }
}

function sCurve(l: number, k: number) {
  return clamp01(l + k * 0.5 * Math.sin((l - 0.5) * Math.PI))
}

function chipColor(axisId: AxisId, chip: Chip, amp: number) {
  let rgb = chip.rgb
  if (axisId === 1 && chip.kind !== "gray") {
    const hsl = rgbToHsl(rgb)
    rgb = hslToRgb(hsl.h + amp * 15, clamp01(hsl.s * (1 + amp * 0.3)), hsl.l)
  }
  if (axisId === 2 && chip.kind !== "gray") {
    const hsl = rgbToHsl(rgb)
    rgb = hslToRgb(hsl.h, hsl.s, clamp01(hsl.l + amp * 0.3))
  }
  if (axisId === 3) {
    const hsl = rgbToHsl(rgb)
    rgb = hslToRgb(hsl.h, hsl.s, sCurve(hsl.l, amp * 0.3))
  }
  if (axisId === 4) {
    const shift = amp * 0.2 * 255
    rgb = { r: rgb.r + shift, g: rgb.g, b: rgb.b - shift }
  }
  return `rgb(${clamp255(rgb.r)},${clamp255(rgb.g)},${clamp255(rgb.b)})`
}

function AxisPreview({ axis, amp }: { axis: Axis; amp: number }) {
  const baseX = RIGHT_X + 484
  const y = axis.y
  return (
    <g>
      <rect
        x={baseX - 14}
        y={y - 31}
        width={302}
        height={62}
        rx={14}
        fill="rgba(255,255,255,0.34)"
        stroke="rgba(255,255,255,0.58)"
      />
      {TEST_CHIPS.map((chip, i) => (
        <rect
          key={`${axis.id}-${chip.label}`}
          x={baseX + i * 23}
          y={y - 20}
          width={19}
          height={40}
          rx={5}
          fill={chipColor(axis.id, chip, amp)}
          stroke="rgba(255,255,255,0.76)"
        />
      ))}
      <line
        x1={baseX + 4 * 23 - 5}
        y1={y - 24}
        x2={baseX + 4 * 23 - 5}
        y2={y + 24}
        stroke="rgba(28,15,110,0.14)"
      />
      <line
        x1={baseX + 8 * 23 - 5}
        y1={y - 24}
        x2={baseX + 8 * 23 - 5}
        y2={y + 24}
        stroke="rgba(28,15,110,0.14)"
      />
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
        fill={
          active
            ? `${axis.color.replace("rgb", "rgba").replace(")", ",0.10)")}`
            : CARD
        }
        stroke={active ? axis.color : "rgba(255,255,255,0.62)"}
        strokeOpacity={active ? 0.72 : 0.48}
      />
      <circle cx={RIGHT_X + 72} cy={axis.y} r={12} fill={axis.color} />
      <text
        x={RIGHT_X + 96}
        y={axis.y - 6}
        fontSize={22}
        fontWeight={700}
        fill={TEXT_PRIMARY}
      >
        {axis.name}
      </text>
      <text x={RIGHT_X + 96} y={axis.y + 20} fontSize={14} fill={TEXT_MUTED}>
        {axis.sub}
      </text>
      <line
        x1={RIGHT_X + 315}
        y1={axis.y}
        x2={RIGHT_X + 447}
        y2={axis.y}
        stroke="rgba(28,15,110,0.18)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <circle
        cx={knobX}
        cy={axis.y}
        r={15}
        fill={axis.color}
        stroke="white"
        strokeWidth={3}
      />
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
            <rect
              x={88}
              y={y - 30}
              width={410}
              height={60}
              rx={18}
              fill="rgba(255,255,255,0.64)"
              stroke={axis.color}
              strokeOpacity={0.42}
            />
            <text
              x={116}
              y={y + 8}
              fontSize={24}
              fontWeight={700}
              fill={TEXT_PRIMARY}
            >
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

  const wordIndex = Math.floor(animT / 3) % WORDS.length
  const localT = animT % 3
  const activeWord = WORDS[wordIndex]
  const activeAxis = activeWord.axis
  const state = wordState(localT)
  const arrowP = clamp01((localT - 1.55) / 0.7)
  const amp = response(localT)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {AXES.map((axis) => (
          <marker
            key={axis.id}
            id={`gld-arrow-${axis.id}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={axis.color} />
          </marker>
        ))}
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />
      <line
        x1={LEFT_W}
        y1={28}
        x2={LEFT_W}
        y2={H - 28}
        stroke={GRID}
        strokeWidth={2}
        strokeDasharray="9 12"
      />

      <text
        x={64}
        y={58}
        fontSize={15}
        fontWeight={700}
        letterSpacing={2}
        fill={TEXT_MUTED}
      >
        WORD STREAM
      </text>
      <text
        x={RIGHT_X + 48}
        y={58}
        fontSize={15}
        fontWeight={700}
        letterSpacing={2}
        fill={TEXT_MUTED}
      >
        4 AXIS FOOTING
      </text>

      {AXES.map((axis) => (
        <AxisRow
          key={axis.id}
          axis={axis}
          active={!reducedMotion && activeAxis === axis.id && Math.abs(amp) > 0}
          amp={!reducedMotion && activeAxis === axis.id ? amp : 0}
        />
      ))}

      {reducedMotion ? (
        <ReducedFrame />
      ) : (
        <g opacity={state.opacity}>
          <rect
            x={state.x}
            y={212}
            width={410}
            height={76}
            rx={22}
            fill="rgba(255,255,255,0.72)"
            stroke={axisById(activeAxis).color}
            strokeOpacity={0.6}
          />
          <text
            x={state.x + 32}
            y={258}
            fontSize={29}
            fontWeight={760}
            fill={TEXT_PRIMARY}
          >
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
