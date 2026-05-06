"use client"

const W = 1600
const H = 900

const TEXT = "#1a1a1a"
const MUTED = "#888888"
const GUIDE = "#dddddd"
const PANEL = "rgba(255,255,255,0.55)"
const PANEL_STROKE = "rgba(70,70,78,0.18)"

const MAGENTA = "rgb(192,74,142)"

const PLOT = {
  x: 260,
  y: 150,
  w: 1080,
  h: 590,
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
        <marker id="gnvn-here-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
          <path d="M 0 0 L 12 6 L 0 12 Z" fill={MAGENTA} />
        </marker>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.16)" />

      <g filter="url(#gnvn-soft-shadow)">
        <rect
          x={20}
          y={18}
          width={1560}
          height={842}
          rx={20}
          fill={PANEL}
          stroke={PANEL_STROKE}
          strokeWidth={1.5}
        />
      </g>

      <g>
        <line
          x1={PLOT.x}
          y1={MID_Y}
          x2={PLOT.x + PLOT.w}
          y2={MID_Y}
          stroke={GUIDE}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={MID_X}
          y1={PLOT.y + PLOT.h}
          x2={MID_X}
          y2={PLOT.y}
          stroke={GUIDE}
          strokeWidth={2}
          strokeLinecap="round"
        />

        <text x={MID_X} y={PLOT.y - 36} textAnchor="middle" fill={TEXT} fontSize={44} fontWeight={850}>
          ナチュラル ↑
        </text>
        <text x={MID_X} y={PLOT.y + PLOT.h + 62} textAnchor="middle" fill={MUTED} fontSize={44} fontWeight={760}>
          ↓
        </text>
        <text x={PLOT.x + PLOT.w} y={MID_Y - 18} textAnchor="end" fill={TEXT} fontSize={44} fontWeight={850}>
          ノーマル →
        </text>
        <text x={PLOT.x - 36} y={MID_Y + 14} textAnchor="end" fill={MUTED} fontSize={44} fontWeight={760}>
          ←
        </text>
      </g>

      <g>
        <rect
          x={502}
          y={224}
          width={92}
          height={232}
          rx={46}
          fill={MAGENTA}
          opacity={0.95}
        />
        <path
          d="M 666 310 C 638 310 620 310 594 310"
          fill="none"
          stroke={MAGENTA}
          strokeWidth={5}
          strokeLinecap="round"
          markerEnd="url(#gnvn-here-arrow)"
        />
        <text x={624} y={282} fill={MAGENTA} fontSize={30} fontWeight={850}>
          ここ
        </text>
        <text x={700} y={330} fill={TEXT} fontSize={46} fontWeight={860}>
          ナチュラルだけどノーマルじゃない
        </text>
      </g>

      <g>
        <QuadrantLabel
          x={1080}
          y={262}
          title="規格通り"
        />
        <QuadrantLabel
          x={1060}
          y={604}
          title="時代外れ"
        />
        <QuadrantLabel
          x={412}
          y={604}
          title="あざとい"
        />
      </g>
    </svg>
  )
}

function QuadrantLabel({
  x,
  y,
  title,
}: {
  x: number
  y: number
  title: string
}) {
  return (
    <g>
      <text x={x} y={y} fill={MUTED} fontSize={30} fontWeight={650}>
        {title}
      </text>
    </g>
  )
}
