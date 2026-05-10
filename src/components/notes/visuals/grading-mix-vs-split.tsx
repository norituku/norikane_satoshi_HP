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
const GRAPH_FILL = "rgba(255,255,255,0.08)"
const GRAPH_STROKE = "rgba(255,255,255,0.4)"

const GRAPH = { x: 140, y: 120, w: 400, h: 320 }
const PREVIEW = { x: 900, y: 108, w: 560, h: 315 }

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

function applyGamma(channel: number, shift: number) {
  const gamma = 1 + shift * 0.6
  return clamp255(Math.pow(channel / 255, gamma) * 255)
}

function gammaRgb(r: number, g: number, b: number, shift: number) {
  return `rgb(${applyGamma(r, shift)},${applyGamma(g, shift)},${applyGamma(b, shift)})`
}

function gammaShiftAt(t: number) {
  if (t < 3) return 0
  if (t < 7) return 0.55 * easeInOutCubic(windowProgress(t, 3, 7))
  if (t < 9) return 0.55
  if (t < 10.5) return 0.55 * fadeOut(t, 9, 10.5)
  return 0
}

function orderPillPose(t: number) {
  if (t < 1.5) {
    const p = fadeIn(t, 0, 1.5)
    return { y: lerp(-32, 22, p), opacity: p }
  }
  if (t < 9.5) return { y: 22, opacity: 1 }
  if (t < 10.5) return { y: 22, opacity: fadeOut(t, 9.5, 10.5) }
  const p = fadeIn(t, 10.5, 12)
  return { y: lerp(-32, 22, p), opacity: p }
}

function thoughtOpacity(t: number) {
  if (t < 1.5) return 0
  if (t < 3) return fadeIn(t, 1.5, 3)
  if (t < 9) return 1
  if (t < 10.5) return fadeOut(t, 9, 10.5)
  return 0
}

function gazeOpacity(t: number) {
  if (t < 1.5) return 0
  if (t < 3) return fadeIn(t, 1.5, 3)
  if (t < 9) return 1
  if (t < 10.5) return fadeOut(t, 9, 10.5)
  return 0
}

function faceOverlayOpacity(t: number) {
  if (t < 3 || t > 10.5) return 0
  const fade = t < 4 ? fadeIn(t, 3, 4) : t > 9 ? fadeOut(t, 9, 10.5) : 1
  const phase = (t - 3) / 1.5
  const pulse = 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI)
  return fade * 0.6 * pulse
}

function conclusionOpacity(t: number) {
  if (t < 7) return 0
  if (t < 8) return fadeIn(t, 7, 8)
  if (t < 9) return 1
  if (t < 10.5) return fadeOut(t, 9, 10.5)
  return 0
}

function controlPointY(shift: number) {
  return GRAPH.y + GRAPH.h / 2 + 160 * shift
}

function curvePath(shift: number) {
  const P0x = GRAPH.x
  const P0y = GRAPH.y + GRAPH.h
  const P1x = GRAPH.x + GRAPH.w / 2
  const P1y = controlPointY(shift)
  const P2x = GRAPH.x + GRAPH.w
  const P2y = GRAPH.y
  const t0x = P1x - P0x
  const t0y = P1y - P0y
  const t1x = (P2x - P0x) / 2
  const t1y = (P2y - P0y) / 2
  const t2x = P2x - P1x
  const t2y = P2y - P1y
  const c1ax = P0x + t0x / 3
  const c1ay = P0y + t0y / 3
  const c1bx = P1x - t1x / 3
  const c1by = P1y - t1y / 3
  const c2ax = P1x + t1x / 3
  const c2ay = P1y + t1y / 3
  const c2bx = P2x - t2x / 3
  const c2by = P2y - t2y / 3
  return `M ${P0x} ${P0y} C ${c1ax.toFixed(2)} ${c1ay.toFixed(2)} ${c1bx.toFixed(2)} ${c1by.toFixed(2)} ${P1x} ${P1y.toFixed(2)} C ${c2ax.toFixed(2)} ${c2ay.toFixed(2)} ${c2bx.toFixed(2)} ${c2by.toFixed(2)} ${P2x} ${P2y}`
}

function OrderPill({ t }: { t: number }) {
  const pose = orderPillPose(t)
  return (
    <g opacity={pose.opacity} transform={`translate(580 ${pose.y})`}>
      <rect x={0} y={0} width={440} height={54} rx={27} fill={PURPLE} />
      <text x={220} y={35} textAnchor="middle" fontSize={24} fontWeight={760} fill="white">
        もう少ししっとり感を
      </text>
    </g>
  )
}

function ThoughtBubble({ t }: { t: number }) {
  const opacity = thoughtOpacity(t)
  return (
    <g opacity={opacity}>
      <rect
        x={1060}
        y={28}
        width={400}
        height={48}
        rx={24}
        fill="rgba(255,255,255,0.08)"
        stroke={PURPLE}
        strokeOpacity={0.4}
        strokeWidth={1.5}
      />
      <circle
        cx={1080}
        cy={84}
        r={6}
        fill="rgba(255,255,255,0.08)"
        stroke={PURPLE}
        strokeOpacity={0.4}
        strokeWidth={1.2}
      />
      <circle
        cx={1066}
        cy={94}
        r={3.5}
        fill="rgba(255,255,255,0.08)"
        stroke={PURPLE}
        strokeOpacity={0.4}
        strokeWidth={1}
      />
      <text x={1260} y={59} textAnchor="middle" fontSize={20} fontWeight={620} fill="white">
        暗くすれば？　締めた感じに？
      </text>
    </g>
  )
}

function ToneCurveGraph({ shift, gaze }: { shift: number; gaze: number }) {
  const cy = controlPointY(shift)
  const cxCenter = GRAPH.x + GRAPH.w / 2
  return (
    <g>
      <rect
        x={GRAPH.x}
        y={GRAPH.y}
        width={GRAPH.w}
        height={GRAPH.h}
        rx={14}
        fill={GRAPH_FILL}
        stroke={GRAPH_STROKE}
        strokeWidth={1.5}
      />
      {[0.25, 0.5, 0.75].map((p) => (
        <g key={`grid-${p}`}>
          <line
            x1={GRAPH.x + GRAPH.w * p}
            y1={GRAPH.y}
            x2={GRAPH.x + GRAPH.w * p}
            y2={GRAPH.y + GRAPH.h}
            stroke={AXIS_STROKE}
            strokeOpacity={0.18}
            strokeWidth={1}
          />
          <line
            x1={GRAPH.x}
            y1={GRAPH.y + GRAPH.h * p}
            x2={GRAPH.x + GRAPH.w}
            y2={GRAPH.y + GRAPH.h * p}
            stroke={AXIS_STROKE}
            strokeOpacity={0.18}
            strokeWidth={1}
          />
        </g>
      ))}
      <line
        x1={GRAPH.x}
        y1={GRAPH.y + GRAPH.h}
        x2={GRAPH.x + GRAPH.w}
        y2={GRAPH.y}
        stroke={PURPLE}
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      <path
        d={curvePath(shift)}
        fill="none"
        stroke={PURPLE}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={cxCenter} cy={cy} r={6} fill={PURPLE} stroke="white" strokeWidth={1.5} />
      <circle
        cx={cxCenter}
        cy={cy}
        r={18}
        fill="none"
        stroke={ACCENT_GREEN}
        strokeWidth={2}
        opacity={gaze}
      />
      <text
        x={GRAPH.x + GRAPH.w / 2}
        y={GRAPH.y + GRAPH.h + 28}
        textAnchor="middle"
        fontSize={16}
        fontWeight={620}
        fill="rgba(255,255,255,0.78)"
        letterSpacing="0.2em"
      >
        IN
      </text>
      <text
        x={GRAPH.x - 26}
        y={GRAPH.y + GRAPH.h / 2}
        textAnchor="middle"
        fontSize={16}
        fontWeight={620}
        fill="rgba(255,255,255,0.78)"
        letterSpacing="0.2em"
        transform={`rotate(-90 ${GRAPH.x - 26} ${GRAPH.y + GRAPH.h / 2})`}
      >
        OUT
      </text>
    </g>
  )
}

// TODO: replace placeholder with actual reference image when ready
function ReferenceImage({ shift, overlay }: { shift: number; overlay: number }) {
  const bgTop = gammaRgb(184, 184, 188, shift)
  const bgMid = gammaRgb(146, 146, 152, shift)
  const bgBot = gammaRgb(102, 104, 114, shift)
  const skin = gammaRgb(204, 142, 102, shift)
  const cloth = gammaRgb(78, 86, 100, shift)
  const hair = gammaRgb(50, 40, 38, shift)

  const faceCx = PREVIEW.x + 280
  const faceCy = PREVIEW.y + 152
  const faceRx = 56
  const faceRy = 72

  return (
    <g>
      <defs>
        <linearGradient
          id="gmvs-ref-bg"
          x1="0"
          y1={PREVIEW.y}
          x2="0"
          y2={PREVIEW.y + PREVIEW.h}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={bgTop} />
          <stop offset="55%" stopColor={bgMid} />
          <stop offset="100%" stopColor={bgBot} />
        </linearGradient>
        <clipPath id="gmvs-ref-clip">
          <rect
            x={PREVIEW.x}
            y={PREVIEW.y}
            width={PREVIEW.w}
            height={PREVIEW.h}
            rx={20}
          />
        </clipPath>
      </defs>
      <g clipPath="url(#gmvs-ref-clip)">
        <rect
          x={PREVIEW.x}
          y={PREVIEW.y}
          width={PREVIEW.w}
          height={PREVIEW.h}
          fill="url(#gmvs-ref-bg)"
        />
        <ellipse cx={faceCx} cy={faceCy - 64} rx={70} ry={52} fill={hair} />
        <rect
          x={faceCx - 100}
          y={faceCy + 64}
          width={200}
          height={160}
          rx={28}
          fill={cloth}
        />
        <ellipse cx={faceCx} cy={faceCy} rx={faceRx} ry={faceRy} fill={skin} />
      </g>
      <rect
        x={PREVIEW.x}
        y={PREVIEW.y}
        width={PREVIEW.w}
        height={PREVIEW.h}
        rx={20}
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={6}
      />
      <rect
        x={PREVIEW.x}
        y={PREVIEW.y}
        width={PREVIEW.w}
        height={PREVIEW.h}
        rx={20}
        fill="none"
        stroke={PURPLE}
        strokeWidth={2}
      />
      <g opacity={overlay}>
        <ellipse
          cx={faceCx}
          cy={faceCy}
          rx={faceRx + 14}
          ry={faceRy + 16}
          fill="rgba(220,80,80,0.16)"
          stroke={ACCENT_RED}
          strokeWidth={2}
        />
      </g>
    </g>
  )
}

function ConclusionPill({ t }: { t: number }) {
  const opacity = conclusionOpacity(t)
  return (
    <g opacity={opacity}>
      <rect x={580} y={448} width={440} height={42} rx={21} fill={PURPLE} />
      <text x={800} y={476} textAnchor="middle" fontSize={20} fontWeight={780} fill="white">
        全体は締まったけど、顔も一緒に沈んだ
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

  const t = reducedMotion ? 8 : animT
  const shift = gammaShiftAt(t)

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
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-purple)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-pink)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gmvs-aurora-sky)" />
      <ToneCurveGraph shift={shift} gaze={gazeOpacity(t)} />
      <ReferenceImage shift={shift} overlay={faceOverlayOpacity(t)} />
      <OrderPill t={t} />
      <ThoughtBubble t={t} />
      <ConclusionPill t={t} />
    </svg>
  )
}
