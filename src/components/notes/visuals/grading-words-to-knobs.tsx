"use client"

import { useEffect, useRef, useState } from "react"

const LOOP = 10
const W = 1600
const H = 500
const CHART_X = 430
const CHART_W = 1060
const ROW_H = 92
const ROW_Y = [86, 178, 270, 362]
const IMPULSE_T = 1

const TEXT_PRIMARY = "rgba(28,15,110,0.94)"
const TEXT_MUTED = "rgba(107,95,168,0.84)"
const GRID = "rgba(110,110,125,0.20)"
const INSTANT = "rgb(63,140,92)"
const PREP = "rgb(199,110,60)"

const MAGENTA = "rgb(192,74,142)"
const NAVY = "rgb(42,79,143)"
const AMBER = "rgb(200,146,58)"
const TEAL = "rgb(46,140,132)"

type Axis = {
  id: 1 | 2 | 3 | 4
  name: string
  color: string
  kind: "仕込み" | "即応"
  lag: number
  rise: number
  decay: number
  amp: number
}

const AXES: Axis[] = [
  {
    id: 1,
    name: "色の広がり・転がり",
    color: MAGENTA,
    kind: "仕込み",
    lag: 0.4,
    rise: 1.5,
    decay: 2.5,
    amp: 0.44,
  },
  {
    id: 2,
    name: "濃度",
    color: NAVY,
    kind: "仕込み",
    lag: 0.5,
    rise: 1.5,
    decay: 2.5,
    amp: 0.40,
  },
  {
    id: 3,
    name: "カーブ",
    color: AMBER,
    kind: "即応",
    lag: 0.1,
    rise: 0.2,
    decay: 0.3,
    amp: 0.86,
  },
  {
    id: 4,
    name: "RGB カラーバランス",
    color: TEAL,
    kind: "即応",
    lag: 0.1,
    rise: 0.2,
    decay: 0.3,
    amp: 0.80,
  },
]

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function easeOutCubic(v: number) {
  return 1 - Math.pow(1 - v, 3)
}

function easeInOutSine(v: number) {
  return -(Math.cos(Math.PI * v) - 1) / 2
}

function xForTime(t: number) {
  return CHART_X + (t / LOOP) * CHART_W
}

function responseValue(axis: Axis, t: number) {
  const rt = t - IMPULSE_T - axis.lag
  if (rt <= 0) return 0
  if (rt < axis.rise) return axis.amp * easeOutCubic(rt / axis.rise)
  const fall = clamp01((rt - axis.rise) / axis.decay)
  return axis.amp * (1 - easeInOutSine(fall))
}

function curvePath(axis: Axis) {
  const y = ROW_Y[axis.id - 1]
  const baseY = y + 29
  const points: string[] = []
  for (let i = 0; i <= 140; i++) {
    const t = (i / 140) * LOOP
    const v = responseValue(axis, t)
    points.push(`${xForTime(t).toFixed(2)},${(baseY - v * 58).toFixed(2)}`)
  }
  return points.join(" ")
}

function partialCurvePath(axis: Axis, currentT: number) {
  const y = ROW_Y[axis.id - 1]
  const baseY = y + 29
  const end = clamp01(currentT / LOOP)
  const count = Math.max(2, Math.ceil(end * 140))
  const points: string[] = []
  for (let i = 0; i <= count; i++) {
    const t = Math.min((i / 140) * LOOP, currentT)
    const v = responseValue(axis, t)
    points.push(`${xForTime(t).toFixed(2)},${(baseY - v * 58).toFixed(2)}`)
  }
  return points.join(" ")
}

function Badge({ kind }: { kind: Axis["kind"] }) {
  const fill = kind === "即応" ? INSTANT : PREP
  return (
    <g>
      <rect x={252} y={-18} width={78} height={34} rx={17} fill={`${fill.replace("rgb", "rgba").replace(")", ",0.14)")}`} stroke={fill} strokeOpacity={0.55} />
      <text x={291} y={4} textAnchor="middle" fontSize={16} fontWeight={760} fill={fill}>
        {kind}
      </text>
    </g>
  )
}

function AxisRow({
  axis,
  currentT,
  reducedMotion,
}: {
  axis: Axis
  currentT: number
  reducedMotion: boolean
}) {
  const y = ROW_Y[axis.id - 1]
  const cursorValue = responseValue(axis, currentT)
  const cx = xForTime(currentT)
  const cy = y + 29 - cursorValue * 58
  return (
    <g>
      <rect x={52} y={y - 40} width={1496} height={80} rx={18} fill="rgba(255,255,255,0.48)" stroke="rgba(255,255,255,0.62)" />
      <g transform={`translate(76 ${y})`}>
        <circle cx={0} cy={0} r={11} fill={axis.color} />
        <text x={28} y={-5} fontSize={22} fontWeight={740} fill={TEXT_PRIMARY}>
          軸 {axis.id}
        </text>
        <text x={88} y={-5} fontSize={22} fontWeight={700} fill={TEXT_PRIMARY}>
          {axis.name}
        </text>
        <Badge kind={axis.kind} />
        <text x={28} y={23} fontSize={13} fill={TEXT_MUTED}>
          lag {axis.lag.toFixed(1)}s / rise {axis.rise.toFixed(1)}s
        </text>
      </g>
      <line x1={CHART_X} y1={y + 29} x2={CHART_X + CHART_W} y2={y + 29} stroke="rgba(28,15,110,0.18)" strokeWidth={2} />
      <polyline points={curvePath(axis)} fill="none" stroke={axis.color} strokeOpacity={0.26} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      {!reducedMotion ? (
        <>
          <polyline points={partialCurvePath(axis, currentT)} fill="none" stroke={axis.color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={cx} cy={cy} r={8} fill={axis.color} stroke="white" strokeWidth={3} />
        </>
      ) : (
        <circle
          cx={xForTime(IMPULSE_T + axis.lag + axis.rise)}
          cy={y + 29 - axis.amp * 58}
          r={7}
          fill={axis.color}
          stroke="white"
          strokeWidth={3}
        />
      )}
    </g>
  )
}

export default function GradingWordsToKnobs({
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

  const currentT = reducedMotion ? 3.2 : animT
  const impulseX = xForTime(IMPULSE_T)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />
      <text x={58} y={48} fontSize={15} fontWeight={700} letterSpacing={2} fill={TEXT_MUTED}>
        RESPONSE PROFILE
      </text>
      <text x={CHART_X} y={48} fontSize={15} fontWeight={700} letterSpacing={2} fill={TEXT_MUTED}>
        TIME 0-10 SEC
      </text>

      {Array.from({ length: 11 }, (_, i) => {
        const x = xForTime(i)
        return (
          <g key={i}>
            <line x1={x} y1={62} x2={x} y2={432} stroke={GRID} strokeWidth={1} />
            <text x={x} y={462} textAnchor="middle" fontSize={13} fill={TEXT_MUTED}>
              {i}s
            </text>
          </g>
        )
      })}

      <line x1={impulseX} y1={62} x2={impulseX} y2={432} stroke="rgba(28,15,110,0.30)" strokeWidth={2} strokeDasharray="7 8" />
      <rect x={impulseX - 45} y={26} width={90} height={28} rx={14} fill="rgba(28,15,110,0.08)" stroke="rgba(28,15,110,0.18)" />
      <text x={impulseX} y={45} textAnchor="middle" fontSize={13} fontWeight={720} fill={TEXT_PRIMARY}>
        impulse
      </text>

      {AXES.map((axis) => (
        <AxisRow key={axis.id} axis={axis} currentT={currentT} reducedMotion={reducedMotion} />
      ))}

      {!reducedMotion ? (
        <line x1={xForTime(currentT)} y1={62} x2={xForTime(currentT)} y2={432} stroke="rgba(139,127,255,0.45)" strokeWidth={2.5} />
      ) : null}
    </svg>
  )
}
