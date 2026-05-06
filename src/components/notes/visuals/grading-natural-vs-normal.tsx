"use client"

const W = 1600
const H = 500

const TEXT = "rgba(34,34,38,0.90)"
const MUTED = "rgba(92,92,99,0.78)"
const GRID = "rgba(90,90,96,0.18)"
const AXIS = "rgba(46,46,52,0.62)"
const PANEL = "rgba(255,255,255,0.55)"
const PANEL_STROKE = "rgba(70,70,78,0.18)"

const MAGENTA = "rgb(192,74,142)"
const TEAL = "rgb(46,140,132)"

export default function GradingNaturalVsNormal() {
  return (
    <svg
      data-diagram-slug="grading-natural-vs-normal"
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="ナチュラル軸とノーマル軸を分け、ナチュラルだけどノーマルじゃない狭い帯を示す四象限図"
    >
      <defs>
        <linearGradient id="gnvn-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={TEAL} stopOpacity="0.16" />
          <stop offset="100%" stopColor={MAGENTA} stopOpacity="0.20" />
        </linearGradient>
        <filter id="gnvn-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="18" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.18)" />

      <g filter="url(#gnvn-soft-shadow)">
        <rect
          x={70}
          y={34}
          width={1460}
          height={432}
          rx={22}
          fill={PANEL}
          stroke={PANEL_STROKE}
          strokeWidth={1.5}
        />
      </g>

      <g aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`v-${i}`}
            x1={240 + i * 260}
            y1={76}
            x2={240 + i * 260}
            y2={424}
            stroke={GRID}
            strokeWidth={1}
            strokeDasharray="8 10"
          />
        ))}
        {[0, 1, 2].map((i) => (
          <line
            key={`h-${i}`}
            x1={150}
            y1={140 + i * 110}
            x2={1450}
            y2={140 + i * 110}
            stroke={GRID}
            strokeWidth={1}
            strokeDasharray="8 10"
          />
        ))}
      </g>

      <g>
        <line
          x1={170}
          y1={250}
          x2={1430}
          y2={250}
          stroke={AXIS}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path d="M 1430 250 L 1410 238 L 1410 262 Z" fill={AXIS} />
        <line
          x1={800}
          y1={420}
          x2={800}
          y2={80}
          stroke={AXIS}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path d="M 800 80 L 788 100 L 812 100 Z" fill={AXIS} />

        <text x={800} y={458} textAnchor="middle" fill={TEXT} fontSize={26} fontWeight={700}>
          ナチュラル軸
        </text>
        <text x={214} y={288} textAnchor="start" fill={MUTED} fontSize={22} fontWeight={600}>
          時代から外れる
        </text>
        <text x={1386} y={288} textAnchor="end" fill={TEAL} fontSize={22} fontWeight={700}>
          時代と整合
        </text>

        <text
          x={748}
          y={104}
          textAnchor="end"
          fill={MAGENTA}
          fontSize={22}
          fontWeight={700}
        >
          作為過多
        </text>
        <text
          x={748}
          y={407}
          textAnchor="end"
          fill={MUTED}
          fontSize={22}
          fontWeight={600}
        >
          規格通り (ノーマル)
        </text>
        <text
          x={842}
          y={72}
          textAnchor="start"
          fill={TEXT}
          fontSize={26}
          fontWeight={700}
        >
          ノーマル軸
        </text>
      </g>

      <g>
        <rect
          x={956}
          y={146}
          width={328}
          height={112}
          rx={18}
          fill="url(#gnvn-band)"
          stroke={MAGENTA}
          strokeWidth={4}
        />
        <rect
          x={972}
          y={166}
          width={296}
          height={72}
          rx={14}
          fill="rgba(255,255,255,0.62)"
          stroke={TEAL}
          strokeWidth={2}
          strokeDasharray="8 8"
        />
        <text
          x={1120}
          y={198}
          textAnchor="middle"
          fill={TEXT}
          fontSize={24}
          fontWeight={800}
        >
          ナチュラル ×
        </text>
        <text
          x={1120}
          y={228}
          textAnchor="middle"
          fill={MAGENTA}
          fontSize={24}
          fontWeight={800}
        >
          ノーマルじゃない
        </text>
      </g>

      <g>
        <QuadrantLabel
          x={304}
          y={158}
          title="時代から外れた絵"
          sub="自然さの重心から遠い"
        />
        <QuadrantLabel
          x={1044}
          y={96}
          title="あざとい絵"
          sub="整合はあるが作為が先に見える"
          accent={MAGENTA}
        />
        <QuadrantLabel
          x={326}
          y={348}
          title="規格通りの絵"
          sub="間違っていないが残らない"
        />
        <QuadrantLabel
          x={1012}
          y={318}
          title="ナチュラルだけど"
          sub="ノーマルじゃない"
          accent={TEAL}
          strong
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
      <text x={x} y={y} fill={strong ? TEXT : "rgba(45,45,52,0.82)"} fontSize={strong ? 28 : 24} fontWeight={strong ? 800 : 700}>
        {title}
      </text>
      <text x={x} y={y + 32} fill={MUTED} fontSize={18} fontWeight={500}>
        {sub}
      </text>
    </g>
  )
}
