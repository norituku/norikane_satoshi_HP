const W = 1600
const H = 900

const PAD = 24
const GAP = 56
const CELL_W = (W - PAD * 2 - GAP) / 2
const CELL_H = (H - PAD * 2 - GAP) / 2

const COL_L_X = PAD
const COL_R_X = PAD + CELL_W + GAP
const ROW_T_Y = PAD
const ROW_B_Y = PAD + CELL_H + GAP

const CROSS_X = W / 2
const CROSS_Y = H / 2

const CORNER_R = 18
const BG_BASE = "#F8F6FF"
const ACCENT = "#8B7FFF"
const TEXT_PRIMARY = "#1C0F6E"
const GLASS_FILL = "rgba(255,255,255,0.65)"
const GLASS_FILL_SOFT = "rgba(255,255,255,0.55)"
const GLASS_STROKE = "rgba(255,255,255,0.78)"
const AXIS_STROKE = "rgba(139,127,255,0.4)"

const QUADRANTS = [
  {
    role: "hero" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-natural-not-normal.png",
    x: COL_L_X,
    y: ROW_T_Y,
    label: "狙う狭い場所",
    sub: "ナチュラルだけどノーマルじゃない",
    labelAnchor: "top" as const,
  },
  {
    role: "support" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-normal.png",
    x: COL_R_X,
    y: ROW_T_Y,
    label: "設計上の中立",
    labelAnchor: "top" as const,
  },
  {
    role: "support" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-outdated.png",
    x: COL_R_X,
    y: ROW_B_Y,
    label: "現在の感覚とずれる",
    labelAnchor: "bottom" as const,
  },
  {
    role: "support" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-aza.png",
    x: COL_L_X,
    y: ROW_B_Y,
    label: "あざとい",
    labelAnchor: "bottom" as const,
  },
]

type Quadrant = (typeof QUADRANTS)[number]

const LABEL_H = 48
const LABEL_FONT_SIZE = 26
const HERO_SUB_H = 36
const HERO_SUB_FONT_SIZE = 19

function pillWidth(label: string) {
  if (label === "現在の感覚とずれる") return 320
  if (label === "ナチュラルだけどノーマルじゃない") return 382
  if (label === "設計上の中立") return 238
  if (label === "狙う狭い場所") return 236
  if (label === "ナチュラル") return 164
  if (label === "ノーマル") return 142
  return 170
}

function QuadrantLabel({ q }: { q: Quadrant }) {
  const isHero = q.role === "hero"
  const inset = 22
  const labelW = pillWidth(q.label)
  const labelX = q.labelAnchor === "top" ? q.x + inset : q.x + CELL_W - inset - labelW
  const labelY = q.labelAnchor === "top" ? q.y + inset : q.y + CELL_H - inset - LABEL_H
  const subW = q.sub ? pillWidth(q.sub) : 0
  const subX = q.x + inset
  const subY = labelY + LABEL_H + 10
  return (
    <g>
      <rect
        x={labelX}
        y={labelY}
        width={labelW}
        height={LABEL_H}
        rx={LABEL_H / 2}
        fill={GLASS_FILL}
        stroke={GLASS_STROKE}
        strokeWidth={1}
        filter="url(#gnvn-badge-shadow)"
      />
      <text
        x={labelX + labelW / 2}
        y={labelY + 32}
        textAnchor="middle"
        fill={isHero ? ACCENT : TEXT_PRIMARY}
        fontSize={LABEL_FONT_SIZE}
        fontWeight={600}
      >
        {q.label}
      </text>
      {isHero ? (
        <g>
          <rect
            x={subX}
            y={subY}
            width={subW}
            height={HERO_SUB_H}
            rx={HERO_SUB_H / 2}
            fill={GLASS_FILL_SOFT}
            stroke={GLASS_STROKE}
            strokeWidth={1}
            filter="url(#gnvn-badge-shadow)"
          />
          <text
            x={subX + subW / 2}
            y={subY + 25}
            textAnchor="middle"
            fill={ACCENT}
            fontSize={HERO_SUB_FONT_SIZE}
            fontWeight={500}
          >
            {q.sub}
          </text>
        </g>
      ) : null}
    </g>
  )
}

function AxisGuides() {
  const verticalW = pillWidth("ナチュラル")
  const horizontalW = pillWidth("ノーマル")
  return (
    <g>
      <line
        x1={CROSS_X}
        y1={H - PAD - 4}
        x2={CROSS_X}
        y2={PAD + 26}
        stroke={AXIS_STROKE}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path d={`M ${CROSS_X - 9} ${PAD + 36} L ${CROSS_X} ${PAD + 18} L ${CROSS_X + 9} ${PAD + 36}`} fill="none" stroke={AXIS_STROKE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <line
        x1={PAD}
        y1={CROSS_Y}
        x2={W - PAD - 26}
        y2={CROSS_Y}
        stroke={AXIS_STROKE}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path d={`M ${W - PAD - 36} ${CROSS_Y - 9} L ${W - PAD - 18} ${CROSS_Y} L ${W - PAD - 36} ${CROSS_Y + 9}`} fill="none" stroke={AXIS_STROKE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <g transform={`translate(${CROSS_X - 18} ${CROSS_Y - 120}) rotate(-90)`}>
        <rect
          x={-verticalW / 2}
          y={-22}
          width={verticalW}
          height={44}
          rx={22}
          fill={GLASS_FILL}
          stroke={GLASS_STROKE}
          strokeWidth={1}
          filter="url(#gnvn-badge-shadow)"
        />
        <text
          x={0}
          y={9}
          textAnchor="middle"
          fill={ACCENT}
          fontSize={24}
          fontWeight={600}
        >
          ナチュラル
        </text>
      </g>
      <g transform={`translate(${W - PAD - 82} ${CROSS_Y - 24})`}>
        <rect
          x={-horizontalW / 2}
          y={-22}
          width={horizontalW}
          height={44}
          rx={22}
          fill={GLASS_FILL}
          stroke={GLASS_STROKE}
          strokeWidth={1}
          filter="url(#gnvn-badge-shadow)"
        />
        <text
          x={0}
          y={9}
          textAnchor="middle"
          fill={ACCENT}
          fontSize={24}
          fontWeight={600}
        >
          ノーマル
        </text>
      </g>
    </g>
  )
}

export default function GradingNaturalVsNormal() {
  return (
    <svg
      data-diagram-slug="grading-natural-vs-normal"
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="ナチュラル軸 (上が高い) とノーマル軸 (右が高い) の二軸を 4 象限独立画像で対比し、左上のナチュラルだけどノーマルじゃない領域を主役として強調する図。"
      fontFamily="var(--font-noto-sans-jp), sans-serif"
    >
      <defs>
        <radialGradient id="gnvn-aurora-purple" cx="16%" cy="12%" r="48%">
          <stop offset="0%" stopColor="#8B7FFF" stopOpacity={0.18} />
          <stop offset="72%" stopColor="#8B7FFF" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="gnvn-aurora-pink" cx="86%" cy="8%" r="42%">
          <stop offset="0%" stopColor="#FF8FAB" stopOpacity={0.12} />
          <stop offset="72%" stopColor="#FF8FAB" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="gnvn-aurora-sky" cx="55%" cy="96%" r="46%">
          <stop offset="0%" stopColor="#7DD3FC" stopOpacity={0.12} />
          <stop offset="72%" stopColor="#7DD3FC" stopOpacity={0} />
        </radialGradient>
        <filter id="gnvn-card-shadow" x="-8%" y="-8%" width="116%" height="122%">
          <feDropShadow dx={0} dy={8} stdDeviation={16} floodColor="#8B7FFF" floodOpacity={0.15} />
        </filter>
        <filter id="gnvn-badge-shadow" x="-12%" y="-40%" width="124%" height="190%">
          <feDropShadow dx={0} dy={4} stdDeviation={10} floodColor="#8B7FFF" floodOpacity={0.12} />
        </filter>
        <clipPath id="gnvn-cell-clip">
          <rect x={0} y={0} width={CELL_W} height={CELL_H} rx={CORNER_R} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill={BG_BASE} />
      <rect x={0} y={0} width={W} height={H} fill="url(#gnvn-aurora-purple)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gnvn-aurora-pink)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#gnvn-aurora-sky)" />
      <rect x={0} y={0} width={W} height={H} fill="rgba(28,15,110,0.025)" />

      {QUADRANTS.map((q) => (
        <g key={q.href} transform={`translate(${q.x} ${q.y})`}>
          {q.role === "hero" ? (
            <rect
              x={0}
              y={0}
              width={CELL_W}
              height={CELL_H}
              rx={CORNER_R}
              fill="rgba(255,255,255,0.45)"
              stroke="rgba(255,255,255,0.62)"
              strokeWidth={1}
              filter="url(#gnvn-card-shadow)"
            />
          ) : null}
          <g clipPath="url(#gnvn-cell-clip)">
            <image href={q.href} x={0} y={0} width={CELL_W} height={CELL_H} preserveAspectRatio="xMidYMid slice" />
            <rect x={0} y={0} width={CELL_W} height={CELL_H} fill={q.role === "hero" ? "rgba(139,127,255,0.04)" : "rgba(28,15,110,0.04)"} />
          </g>
          <rect
            x={0}
            y={0}
            width={CELL_W}
            height={CELL_H}
            rx={CORNER_R}
            fill="none"
            stroke={q.role === "hero" ? ACCENT : "rgba(255,255,255,0.72)"}
            strokeWidth={q.role === "hero" ? 3 : 1}
            filter={q.role === "hero" ? "url(#gnvn-card-shadow)" : undefined}
          />
        </g>
      ))}

      <AxisGuides />

      {QUADRANTS.map((q) => (
        <QuadrantLabel key={q.href + ":label"} q={q} />
      ))}
    </svg>
  )
}
