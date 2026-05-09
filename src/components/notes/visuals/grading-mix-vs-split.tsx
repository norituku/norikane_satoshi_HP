"use client"

import { useEffect, useRef, useState } from "react"
import type { VideoVisualProps } from "@/components/notes/note-visual"

const LOOP = 12
const W = 1600
const H = 500
const PURPLE = "#8B7FFF"
const ACCENT_GREEN = "rgb(80,180,120)"
const ACCENT_RED = "rgb(220,80,80)"
const AXIS_STROKE = "rgba(139,127,255,0.4)"
const GLASS_FILL = "rgba(255,255,255,0.65)"
const GLASS_STROKE = "rgba(255,255,255,0.78)"
const LUT_FILL = "rgba(255,255,255,0.08)"
const LUT_STROKE = "rgba(255,255,255,0.4)"
const TEXT_DARK = "rgba(38,31,82,0.92)"
const SKY_BASE = { r: 135, g: 180, b: 210 }
const SKIN_BASE = { r: 204, g: 142, b: 102 }

type Rgb = { r: number; g: number; b: number }
type ChipSpec = {
  id: "sky" | "skin"
  label: string
  base: Rgb
  x: number
}

const CHIPS: ChipSpec[] = [
  { id: "sky", label: "空 chip", base: SKY_BASE, x: 392 },
  { id: "skin", label: "肌 chip", base: SKIN_BASE, x: 948 },
]

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function clamp255(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function lerp(a: number, b: number, p: number) {
  return a + (b - a) * p
}

function easeInOutCubic(v: number) {
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}

function windowProgress(t: number, start: number, end: number) {
  return clamp01((t - start) / (end - start))
}

function fadeInOut(t: number, start: number, inEnd: number, outStart: number, end: number) {
  if (t < start || t > end) return 0
  if (t < inEnd) return easeInOutCubic(windowProgress(t, start, inEnd))
  if (t > outStart) return 1 - easeInOutCubic(windowProgress(t, outStart, end))
  return 1
}

function adjustLightness(input: Rgb, amount: number): Rgb {
  if (amount >= 0) {
    return {
      r: input.r + (255 - input.r) * amount,
      g: input.g + (255 - input.g) * amount,
      b: input.b + (255 - input.b) * amount,
    }
  }
  const p = 1 + amount
  return { r: input.r * p, g: input.g * p, b: input.b * p }
}

function rgb({ r, g, b }: Rgb) {
  return `rgb(${clamp255(r)},${clamp255(g)},${clamp255(b)})`
}

function chipState(id: ChipSpec["id"], t: number) {
  const turn1Sky = easeInOutCubic(windowProgress(t, 2.15, 2.95))
  const turn1Skin = easeInOutCubic(windowProgress(t, 2.85, 3.65))
  const turn2SkinBack = easeInOutCubic(windowProgress(t, 4.1, 4.9))
  const turn2SkyBack = easeInOutCubic(windowProgress(t, 4.75, 5.75))
  const reset = t >= 8 ? 1 - easeInOutCubic(windowProgress(t, 8, 9.5)) : 1

  const skyLift = 0.18 * turn1Sky * (1 - turn2SkyBack) * reset
  const skinLift = -0.2 * turn1Skin * (1 - turn2SkinBack) * reset
  const amount = id === "sky" ? skyLift : skinLift
  const wobbleWindow =
    id === "sky"
      ? fadeInOut(t, 2.1, 2.35, 5.45, 5.95)
      : fadeInOut(t, 2.85, 3.15, 4.65, 5.0)
  const drift = id === "sky" ? -12 * skyLift / 0.18 : -18 * skinLift / 0.2
  const wobble = Math.sin(t * 24) * 3 * wobbleWindow

  return { amount, y: 330 + drift + wobble }
}

function orderPose(t: number) {
  if (t < 2) {
    const p = easeInOutCubic(windowProgress(t, 0, 2))
    return {
      y: lerp(34, 132, p),
      opacity: t < 1.35 ? 1 : 1 - easeInOutCubic(windowProgress(t, 1.35, 2)),
    }
  }
  if (t >= 9.5) {
    return {
      y: 34,
      opacity: easeInOutCubic(windowProgress(t, 9.5, 11.2)),
    }
  }
  return { y: 34, opacity: 0 }
}

function pulseScale(t: number) {
  const first = Math.sin(Math.PI * windowProgress(t, 2, 2.55)) * Number(t >= 2 && t <= 2.55)
  const second = Math.sin(Math.PI * windowProgress(t, 4, 4.55)) * Number(t >= 4 && t <= 4.55)
  return 1 + 0.035 * Math.max(first, second)
}

function handOpacity(t: number) {
  return fadeInOut(t, 6, 6.5, 7.85, 8.2)
}

function handDy(t: number) {
  if (t < 7.1) return Math.sin((t - 6) * Math.PI * 3) * 5 * (1 - windowProgress(t, 6, 7.1))
  return 0
}

function stillPillOpacity(t: number) {
  return fadeInOut(t, 6.35, 6.85, 7.8, 8.2)
}

function OrderPill({ t }: { t: number }) {
  const pose = orderPose(t)
  return (
    <g opacity={pose.opacity}>
      <rect x={472} y={pose.y} width={656} height={54} rx={27} fill={PURPLE} />
      <text x={800} y={pose.y + 35} textAnchor="middle" fontSize={22} fontWeight={760} fill="white">
        もう少し暖かく、もう少し濃く、もう少し青を引いて
      </text>
    </g>
  )
}

function LutBox({ t }: { t: number }) {
  const scale = pulseScale(t)
  return (
    <g transform={`translate(800 210) scale(${scale}) translate(-800 -210)`}>
      <rect x={620} y={154} width={360} height={112} rx={38} fill={LUT_FILL} stroke={LUT_STROKE} strokeWidth={2} />
      <rect x={646} y={176} width={308} height={68} rx={26} fill="rgba(170,170,188,0.16)" stroke="rgba(255,255,255,0.22)" />
      <text x={800} y={222} textAnchor="middle" fontSize={32} fontWeight={800} fill={GLASS_FILL}>
        LUT
      </text>
    </g>
  )
}

function Chip({ spec, t }: { spec: ChipSpec; t: number }) {
  const state = chipState(spec.id, t)
  const fill = rgb(adjustLightness(spec.base, state.amount))
  const ringOpacity =
    spec.id === "sky"
      ? fadeInOut(t, 2.2, 2.45, 3.45, 3.85)
      : fadeInOut(t, 4.1, 4.35, 5.0, 5.35)

  return (
    <g transform={`translate(${spec.x} ${state.y})`}>
      <rect x={0} y={0} width={260} height={92} rx={24} fill={fill} stroke={GLASS_STROKE} strokeWidth={1.5} />
      <rect x={12} y={12} width={236} height={68} rx={18} fill="rgba(255,255,255,0.12)" />
      <text x={130} y={58} textAnchor="middle" fontSize={22} fontWeight={760} fill={TEXT_DARK}>
        {spec.label}
      </text>
      <rect
        x={-6}
        y={-6}
        width={272}
        height={104}
        rx={30}
        fill="none"
        stroke={ACCENT_GREEN}
        strokeWidth={2}
        opacity={ringOpacity}
      />
    </g>
  )
}

function ChainArrow({ t, reverse = false }: { t: number; reverse?: boolean }) {
  const opacity = reverse ? fadeInOut(t, 4.8, 5.05, 5.65, 5.95) : fadeInOut(t, 3.0, 3.25, 3.75, 4.05)
  const startX = reverse ? 946 : 668
  const endX = reverse ? 672 : 942
  const y = reverse ? 350 : 378
  const c1 = reverse ? startX - 72 : startX + 72
  const c2 = reverse ? endX + 72 : endX - 72

  return (
    <path
      d={`M ${startX} ${y} C ${c1} ${y - 54}, ${c2} ${y - 54}, ${endX} ${y}`}
      fill="none"
      stroke={ACCENT_RED}
      strokeWidth={2}
      strokeLinecap="round"
      markerEnd="url(#gmvs-arrowhead)"
      opacity={opacity}
    />
  )
}

function HandCursor({ t }: { t: number }) {
  const opacity = handOpacity(t)
  const dy = handDy(t)
  return (
    <g transform={`translate(910 ${112 + dy})`} opacity={opacity}>
      <path
        d="M 0 0 L 0 72 L 18 54 L 34 88 L 54 78 L 38 45 L 66 45 Z"
        fill={GLASS_FILL}
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M 18 54 L 31 45" stroke={AXIS_STROKE} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

function StopPill({ t }: { t: number }) {
  const opacity = stillPillOpacity(t)
  return (
    <g opacity={opacity}>
      <rect x={700} y={438} width={200} height={42} rx={21} fill={PURPLE} />
      <text x={800} y={466} textAnchor="middle" fontSize={20} fontWeight={780} fill="white">
        手が止まる
      </text>
    </g>
  )
}

export default function GradingMixVsSplit({
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

  const t = reducedMotion ? 7 : animT

  return (
    <svg
      viewBox="0 0 1600 500"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="gmvs-aurora-purple" cx="20%" cy="8%" r="58%">
          <stop offset="0%" stopColor="rgba(139,127,255,0.42)" />
          <stop offset="100%" stopColor="rgba(139,127,255,0)" />
        </radialGradient>
        <radialGradient id="gmvs-aurora-pink" cx="88%" cy="10%" r="48%">
          <stop offset="0%" stopColor="rgba(210,126,188,0.28)" />
          <stop offset="100%" stopColor="rgba(210,126,188,0)" />
        </radialGradient>
        <radialGradient id="gmvs-aurora-sky" cx="54%" cy="104%" r="60%">
          <stop offset="0%" stopColor="rgba(110,174,210,0.28)" />
          <stop offset="100%" stopColor="rgba(110,174,210,0)" />
        </radialGradient>
        <marker id="gmvs-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={ACCENT_RED} />
        </marker>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-purple)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-pink)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-sky)" />
      <line x1={342} y1={298} x2={1258} y2={298} stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} />
      <OrderPill t={t} />
      <LutBox t={t} />
      <ChainArrow t={t} />
      <ChainArrow t={t} reverse />
      {CHIPS.map((chip) => (
        <Chip key={chip.id} spec={chip} t={t} />
      ))}
      <HandCursor t={t} />
      <StopPill t={t} />
    </svg>
  )
}
