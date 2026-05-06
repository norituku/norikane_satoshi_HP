"use client"

const W = 1600
const H = 500

const TEXT = "rgba(34,34,38,0.90)"
const MUTED = "rgba(92,92,99,0.78)"
const GRID = "rgba(90,90,96,0.18)"
const AXIS = "rgba(46,46,52,0.70)"
const PANEL = "rgba(255,255,255,0.55)"
const PANEL_STROKE = "rgba(70,70,78,0.18)"

const MAGENTA = "rgb(192,74,142)"
const TEAL = "rgb(46,140,132)"

const PLOT = {
  x: 78,
  y: 36,
  w: 1444,
  h: 384,
}
const MID_X = PLOT.x + PLOT.w / 2
const MID_Y = PLOT.y + PLOT.h / 2

export default function GradingNaturalVsNormal() {
  return (
    <svg
      data-diagram-slug="grading-natural-vs-normal"
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="縦軸をナチュラル軸、横軸をノーマル軸として、ナチュラルだけどノーマルじゃない狭い帯を示す四象限図"
    >
      <defs>
        <filter id="gnvn-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="18" floodOpacity="0.12" />
        </filter>
        <marker
          id="gnvn-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={AXIS} />
        </marker>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />

      <g filter="url(#gnvn-soft-shadow)">
        <rect
          x={20}
          y={18}
          width={1560}
          height={462}
          rx={20}
          fill={PANEL}
          stroke={PANEL_STROKE}
          strokeWidth={1.5}
        />
      </g>

      <g aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <line
            key={`v-${i}`}
            x1={PLOT.x + (PLOT.w / 4) * i}
            y1={PLOT.y}
            x2={PLOT.x + (PLOT.w / 4) * i}
            y2={PLOT.y + PLOT.h}
            stroke={GRID}
            strokeWidth={1}
            strokeDasharray="8 10"
          />
        ))}
        {[1, 2, 3].map((i) => (
          <line
            key={`h-${i}`}
            x1={PLOT.x}
            y1={PLOT.y + (PLOT.h / 4) * i}
            x2={PLOT.x + PLOT.w}
            y2={PLOT.y + (PLOT.h / 4) * i}
            stroke={GRID}
            strokeWidth={1}
            strokeDasharray="8 10"
          />
        ))}
      </g>

      <g>
        <line
          x1={PLOT.x}
          y1={MID_Y}
          x2={PLOT.x + PLOT.w}
          y2={MID_Y}
          stroke={AXIS}
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd="url(#gnvn-arrow)"
        />
        <line
          x1={MID_X}
          y1={PLOT.y + PLOT.h}
          x2={MID_X}
          y2={PLOT.y}
          stroke={AXIS}
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd="url(#gnvn-arrow)"
        />

        <text x={MID_X} y={464} textAnchor="middle" fill={TEAL} fontSize={26} fontWeight={800}>
          ノーマル軸
        </text>
        <text x={PLOT.x + 10} y={454} textAnchor="start" fill={MUTED} fontSize={20} fontWeight={700}>
          ノーマル度 低い (規格から外れる)
        </text>
        <text x={PLOT.x + PLOT.w - 10} y={454} textAnchor="end" fill={TEAL} fontSize={20} fontWeight={800}>
          ノーマル度 高い (規格通り)
        </text>
        <text x={MID_X} y={454} textAnchor="middle" fill={AXIS} fontSize={22} fontWeight={700}>
          低 ←→ 高
        </text>

        <text
          x={48}
          y={MID_Y}
          textAnchor="middle"
          fill={TEAL}
          fontSize={26}
          fontWeight={800}
          transform={`rotate(-90 48 ${MID_Y})`}
        >
          ナチュラル軸
        </text>
        <text x={MID_X + 18} y={70} textAnchor="start" fill={TEAL} fontSize={20} fontWeight={800}>
          ナチュラル度 高い (時代と整合)
        </text>
        <text x={MID_X + 18} y={405} textAnchor="start" fill={MUTED} fontSize={20} fontWeight={700}>
          ナチュラル度 低い (時代から外れる)
        </text>
        <text
          x={MID_X - 24}
          y={MID_Y}
          textAnchor="middle"
          fill={AXIS}
          fontSize={22}
          fontWeight={700}
          transform={`rotate(-90 ${MID_X - 24} ${MID_Y})`}
        >
          低 ←→ 高
        </text>
      </g>

      <g>
        <rect
          x={520}
          y={88}
          width={312}
          height={68}
          rx={18}
          fill={MAGENTA}
          opacity={0.24}
          stroke={MAGENTA}
          strokeWidth={4}
        />
        <text x={676} y={116} textAnchor="middle" fill={TEXT} fontSize={22} fontWeight={850}>
          ここを目指す
        </text>
        <text x={676} y={144} textAnchor="middle" fill={MAGENTA} fontSize={20} fontWeight={850}>
          狭い帯
        </text>
      </g>

      <g>
        <QuadrantLabel
          x={168}
          y={108}
          title="ナチュラルだけど"
          sub="ノーマルじゃない"
          accent={MAGENTA}
          strong
        />
        <QuadrantLabel
          x={1054}
          y={120}
          title="規格通りの絵"
          sub="ナチュラル高 × ノーマル高"
          accent={TEAL}
        />
        <QuadrantLabel
          x={166}
          y={322}
          title="あざとい絵"
          sub="ナチュラル低 × ノーマル低"
        />
        <QuadrantLabel
          x={1054}
          y={322}
          title="時代から外れた絵"
          sub="ナチュラル低 × ノーマル高"
        />
      </g>
    </svg>
  )
}

function QuadrantLabel({
  x,
  y,
  title,
  sub,
  accent = "rgba(86,86,94,0.70)",
  strong = false,
}: {
  x: number
  y: number
  title: string
  sub: string
  accent?: string
  strong?: boolean
}) {
  return (
    <g>
      <circle cx={x - 28} cy={y - 9} r={strong ? 8 : 6} fill={accent} />
      <text
        x={x}
        y={y}
        fill={strong ? TEXT : "rgba(45,45,52,0.82)"}
        fontSize={strong ? 28 : 24}
        fontWeight={strong ? 850 : 760}
      >
        {title}
      </text>
      <text x={x} y={y + 32} fill={strong ? MAGENTA : MUTED} fontSize={18} fontWeight={strong ? 800 : 560}>
        {sub}
      </text>
    </g>
  )
}
