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
const METER_BASE = "rgba(255,255,255,0.16)"

const BOX = { x: 120, y: 180, w: 300, h: 160 }
const PREVIEW = { x: 900, y: 108, w: 560, h: 315 }
const METERS = [
  { x: 310, y: 420, w: 180, h: 12 },
  { x: 550, y: 420, w: 180, h: 12 },
  { x: 790, y: 420, w: 180, h: 12 },
  { x: 1030, y: 420, w: 180, h: 12 },
]

type Rgb = { r: number; g: number; b: number }

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

function fadeIn(t: number, start: number, end: number) {
  return easeInOutCubic(windowProgress(t, start, end))
}

function fadeOut(t: number, start: number, end: number) {
  return 1 - easeInOutCubic(windowProgress(t, start, end))
}

function fadeInOut(t: number, start: number, inEnd: number, outStart: number, end: number) {
  if (t < start || t > end) return 0
  if (t < inEnd) return fadeIn(t, start, inEnd)
  if (t > outStart) return fadeOut(t, outStart, end)
  return 1
}

function rgb({ r, g, b }: Rgb) {
  return `rgb(${clamp255(r)},${clamp255(g)},${clamp255(b)})`
}

function mixColor(a: Rgb, b: Rgb, p: number): Rgb {
  return {
    r: lerp(a.r, b.r, p),
    g: lerp(a.g, b.g, p),
    b: lerp(a.b, b.b, p),
  }
}

function orderPose(t: number) {
  if (t < 2) {
    const p = fadeIn(t, 0, 1.75)
    return {
      x: lerp(520, BOX.x + 34, p),
      y: lerp(34, BOX.y + 50, p),
      opacity: t < 1.35 ? 1 : fadeOut(t, 1.35, 2),
      scale: lerp(1, 0.62, windowProgress(t, 1.35, 2)),
    }
  }

  if (t >= 11.5) {
    return {
      x: 520,
      y: 34,
      opacity: fadeIn(t, 11.5, 12),
      scale: 1,
    }
  }

  return { x: 520, y: 34, opacity: 0, scale: 1 }
}

function lutPulse(t: number) {
  const absorb = Math.sin(Math.PI * windowProgress(t, 1.7, 2.1)) * Number(t >= 1.7 && t <= 2.1)
  const handTouch = Math.sin(Math.PI * windowProgress(t, 2.25, 2.8)) * Number(t >= 2.25 && t <= 2.8)
  return 1 + 0.025 * Math.max(absorb, handTouch)
}

function resetProgress(t: number) {
  return t >= 10 ? fadeIn(t, 10, 11.5) : 0
}

function meterValues(t: number) {
  const reset = resetProgress(t)
  const intentProgress = fadeIn(t, 2.6, 7.6)
  const sideProgress = fadeIn(t, 2.8, 7.9)
  const intent = lerp(0.5, 0.82, intentProgress)
  const finals = [intent, 0.27, 0.73, 0.38]

  if (t >= 8) {
    return finals.map((value) => lerp(value, 0.5, reset))
  }

  if (t < 2.4) return [0.5, 0.5, 0.5, 0.5]

  const side1 = 0.5 + (0.27 - 0.5) * sideProgress + Math.sin((t - 2.8) * 2.7 + 0.6) * 0.08 * sideProgress
  const side2 = 0.5 + (0.73 - 0.5) * sideProgress + Math.sin((t - 2.8) * 1.9 + 2.2) * 0.1 * sideProgress
  const side3 = 0.5 + (0.38 - 0.5) * sideProgress + Math.sin((t - 2.8) * 3.25 + 4.1) * 0.075 * sideProgress

  return [intent, side1, side2, side3].map((value) => clamp01(value))
}

function sideEffectOpacity(t: number) {
  if (t < 2.7) return 0
  if (t < 8) {
    const pulse = 0.5 + 0.5 * Math.sin(((t - 2.7) / 1.5) * Math.PI * 2)
    return fadeIn(t, 2.7, 3.2) * (0.12 + pulse * 0.48)
  }
  if (t < 10) return 0.52
  return 0.52 * fadeOut(t, 10, 11.5)
}

function previewState(t: number) {
  const values = meterValues(t)
  const previewOn = fadeIn(t, 4, 7.8)
  const reset = resetProgress(t)
  const hold = t >= 8 ? 1 : previewOn
  const active = hold * (1 - reset)
  const warm = 0.18 * values[0] * active
  const density = (values[1] - 0.5) * 0.72 * active
  const balance = (values[2] - 0.5) * 0.92 * active
  const saturation = (values[3] - 0.5) * 0.66 * active

  return { warm, density, balance, saturation, active }
}

function previewOverlayOpacity(t: number) {
  if (t < 4) return 0
  if (t < 8) return fadeIn(t, 4, 4.6) * 0.78
  if (t < 10) return 0.78
  return 0.78 * fadeOut(t, 10, 11.5)
}

function handPose(t: number) {
  if (t < 2) return { x: BOX.x + 212, y: BOX.y + 44, opacity: 0 }
  if (t < 2.75) {
    const p = fadeIn(t, 2, 2.75)
    return {
      x: lerp(BOX.x + 212, METERS[0].x + 90, p),
      y: lerp(BOX.y + 44, METERS[0].y - 48, p),
      opacity: p,
    }
  }
  if (t < 8) {
    const drag = fadeIn(t, 2.75, 7.6)
    return {
      x: lerp(METERS[0].x + 90, METERS[0].x + 148, drag),
      y: METERS[0].y - 48 + Math.sin((t - 2.75) * 4.1) * 4,
      opacity: 1,
    }
  }
  if (t < 10) {
    const p = fadeIn(t, 8, 10)
    return {
      x: lerp(METERS[0].x + 148, 150, p),
      y: lerp(METERS[0].y - 48, 560, p),
      opacity: fadeOut(t, 8.35, 9.35),
    }
  }
  return { x: 150, y: 560, opacity: 0 }
}

function gazeOpacity(t: number) {
  return fadeInOut(t, 2.55, 2.95, 8, 8.7)
}

function conclusionOpacity(t: number) {
  if (t < 8.35) return 0
  if (t < 10.25) return fadeIn(t, 8.35, 9)
  return fadeOut(t, 10.25, 11.2)
}

function OrderPill({ t }: { t: number }) {
  const pose = orderPose(t)
  return (
    <g opacity={pose.opacity} transform={`translate(${pose.x} ${pose.y}) scale(${pose.scale})`}>
      <rect x={0} y={0} width={360} height={54} rx={27} fill={PURPLE} />
      <text x={180} y={35} textAnchor="middle" fontSize={22} fontWeight={760} fill="white">
        もう少し暖かく
      </text>
    </g>
  )
}

function LutBox({ t }: { t: number }) {
  const scale = lutPulse(t)
  return (
    <g transform={`translate(${BOX.x + BOX.w / 2} ${BOX.y + BOX.h / 2}) scale(${scale}) translate(${-BOX.x - BOX.w / 2} ${-BOX.y - BOX.h / 2})`}>
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={44} fill={LUT_FILL} stroke={LUT_STROKE} strokeWidth={2} />
      <rect
        x={BOX.x + 28}
        y={BOX.y + 36}
        width={BOX.w - 56}
        height={BOX.h - 72}
        rx={30}
        fill="rgba(172,172,188,0.16)"
        stroke="rgba(255,255,255,0.2)"
      />
      <text x={BOX.x + BOX.w / 2} y={BOX.y + 94} textAnchor="middle" fontSize={34} fontWeight={800} fill={GLASS_FILL}>
        LUT
      </text>
    </g>
  )
}

function Meter({ index, value, t }: { index: number; value: number; t: number }) {
  const meter = METERS[index]
  const knobX = meter.x + value * meter.w
  const redOpacity = index === 0 ? 0 : sideEffectOpacity(t)
  const gaze = index === 0 ? gazeOpacity(t) : 0

  return (
    <g>
      <rect x={meter.x} y={meter.y} width={meter.w} height={meter.h} rx={6} fill={METER_BASE} />
      <rect x={meter.x} y={meter.y} width={value * meter.w} height={meter.h} rx={6} fill={PURPLE} opacity={0.82} />
      <circle cx={knobX} cy={meter.y + meter.h / 2} r={10} fill={GLASS_FILL} stroke={GLASS_STROKE} strokeWidth={1.5} />
      <circle cx={knobX} cy={meter.y + meter.h / 2} r={22} fill="none" stroke={ACCENT_GREEN} strokeWidth={2} opacity={gaze} />
      <rect
        x={meter.x - 8}
        y={meter.y - 11}
        width={meter.w + 16}
        height={meter.h + 22}
        rx={17}
        fill="none"
        stroke={ACCENT_RED}
        strokeWidth={2}
        opacity={redOpacity}
      />
    </g>
  )
}

function Preview({ t }: { t: number }) {
  const state = previewState(t)
  const leftBase = mixColor({ r: 124, g: 130, b: 138 }, { r: 178, g: 134, b: 118 }, state.warm)
  const rightBase = mixColor({ r: 106, g: 116, b: 126 }, { r: 94, g: 130, b: 152 }, Math.abs(state.balance))
  const bgLeft = rgb({
    r: leftBase.r + state.balance * 16 - state.density * 44,
    g: leftBase.g - state.saturation * 30 - state.density * 38,
    b: leftBase.b - state.balance * 42 - state.density * 46,
  })
  const bgRight = rgb({
    r: rightBase.r - state.balance * 34 - state.density * 48,
    g: rightBase.g + state.saturation * 24 - state.density * 42,
    b: rightBase.b + state.balance * 50 - state.density * 36,
  })
  const skin = rgb({
    r: 204 + state.warm * 72 - state.density * 36 + state.balance * 18,
    g: 142 + state.warm * 28 - state.density * 32 - state.saturation * 16,
    b: 102 - state.warm * 22 - state.density * 40 - state.balance * 24,
  })
  const cloth = rgb({
    r: 92 - state.density * 54 - state.balance * 30,
    g: 98 - state.density * 44 + state.saturation * 28,
    b: 112 - state.density * 38 + state.balance * 50,
  })
  const overlayOpacity = previewOverlayOpacity(t)

  return (
    <g>
      <rect x={PREVIEW.x - 12} y={PREVIEW.y - 12} width={PREVIEW.w + 24} height={PREVIEW.h + 24} rx={30} fill="rgba(255,255,255,0.1)" />
      <g clipPath="url(#gmvs-preview-clip)">
        <rect x={PREVIEW.x} y={PREVIEW.y} width={PREVIEW.w} height={PREVIEW.h} fill="url(#gmvs-preview-base)" />
        <rect x={PREVIEW.x} y={PREVIEW.y} width={PREVIEW.w * 0.42} height={PREVIEW.h} fill={bgLeft} opacity={0.9} />
        <rect x={PREVIEW.x + PREVIEW.w * 0.42} y={PREVIEW.y} width={PREVIEW.w * 0.58} height={PREVIEW.h} fill={bgRight} opacity={0.86} />
        <rect x={PREVIEW.x + 44} y={PREVIEW.y + 42} width={98} height={216} rx={18} fill="rgba(226,216,198,0.22)" />
        <rect x={PREVIEW.x + 408} y={PREVIEW.y + 24} width={96} height={240} rx={22} fill="rgba(126,158,178,0.24)" />
        <circle cx={PREVIEW.x + 286} cy={PREVIEW.y + 132} r={48} fill={skin} />
        <rect x={PREVIEW.x + 230} y={PREVIEW.y + 182} width={112} height={132} rx={46} fill={cloth} />
        <rect x={PREVIEW.x + 252} y={PREVIEW.y + 168} width={68} height={44} rx={22} fill={skin} />
        <path d={`M ${PREVIEW.x + 236} ${PREVIEW.y + 142} C ${PREVIEW.x + 254} ${PREVIEW.y + 76}, ${PREVIEW.x + 330} ${PREVIEW.y + 78}, ${PREVIEW.x + 338} ${PREVIEW.y + 148} C ${PREVIEW.x + 316} ${PREVIEW.y + 116}, ${PREVIEW.x + 258} ${PREVIEW.y + 118}, ${PREVIEW.x + 236} ${PREVIEW.y + 142} Z`} fill="rgba(52,48,56,0.64)" />
        <rect x={PREVIEW.x} y={PREVIEW.y} width={PREVIEW.w} height={PREVIEW.h} fill="rgba(190,72,72,0.16)" opacity={state.active * 0.48} />
      </g>
      <rect x={PREVIEW.x} y={PREVIEW.y} width={PREVIEW.w} height={PREVIEW.h} rx={24} fill="none" stroke={GLASS_STROKE} strokeWidth={1.5} />
      <rect
        x={PREVIEW.x - 6}
        y={PREVIEW.y - 6}
        width={PREVIEW.w + 12}
        height={PREVIEW.h + 12}
        rx={29}
        fill="none"
        stroke={ACCENT_RED}
        strokeWidth={1.5}
        opacity={overlayOpacity}
      />
    </g>
  )
}

function HandCursor({ t }: { t: number }) {
  const pose = handPose(t)
  return (
    <g transform={`translate(${pose.x} ${pose.y})`} opacity={pose.opacity}>
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

function ConclusionPill({ t }: { t: number }) {
  const opacity = conclusionOpacity(t)
  return (
    <g opacity={opacity}>
      <rect x={548} y={446} width={504} height={42} rx={21} fill={PURPLE} />
      <text x={800} y={474} textAnchor="middle" fontSize={20} fontWeight={780} fill="white">
        気づかないところで、動いている
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

  const t = reducedMotion ? 9 : animT
  const values = meterValues(t)

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
        <linearGradient id="gmvs-preview-base" x1="900" y1="108" x2="1460" y2="423" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgb(148,148,150)" />
          <stop offset="52%" stopColor="rgb(128,130,134)" />
          <stop offset="100%" stopColor="rgb(104,110,118)" />
        </linearGradient>
        <clipPath id="gmvs-preview-clip">
          <rect x={PREVIEW.x} y={PREVIEW.y} width={PREVIEW.w} height={PREVIEW.h} rx={24} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-purple)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-pink)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-sky)" />
      <OrderPill t={t} />
      <LutBox t={t} />
      <Preview t={t} />
      {values.map((value, index) => (
        <Meter key={index} index={index} value={value} t={t} />
      ))}
      <HandCursor t={t} />
      <ConclusionPill t={t} />
    </svg>
  )
}
