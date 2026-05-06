const W = 1600
const H = 900

const PAD = 60
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
const GLASS_STROKE = "rgba(255,255,255,0.78)"
const AXIS_STROKE = "rgba(139,127,255,0.4)"

const QUADRANTS = [
  {
    role: "hero" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-natural-not-normal.png",
    x: COL_L_X,
    y: ROW_T_Y,
    label: "狙う狭い場所",
  },
  {
    role: "support" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-normal.png",
    x: COL_R_X,
    y: ROW_T_Y,
    label: "設計上の中立",
  },
  {
    role: "support" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-outdated.png",
    x: COL_R_X,
    y: ROW_B_Y,
    label: "現在の感覚とずれる",
  },
  {
    role: "support" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-aza.png",
    x: COL_L_X,
    y: ROW_B_Y,
    label: "あざとい",
  },
]

type Quadrant = (typeof QUADRANTS)[number]

const LABEL_H = 48
const LABEL_FONT_SIZE = 26

function pillWidth(label: string) {
  if (label === "現在の感覚とずれる") return 320
  if (label === "設計上の中立") return 238
  if (label === "狙う狭い場所") return 236
  return 170
}

function QuadrantLabel({ q }: { q: Quadrant }) {
  const isHero = q.role === "hero"
  const inset = 22
  const labelW = pillWidth(q.label)
  const labelX = q.x + CELL_W - inset - labelW
  const labelY = q.y + CELL_H - inset - LABEL_H
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
    </g>
  )
}

function AxisLabels() {
  const AXIS_W_TOP = 200
  const AXIS_W_RIGHT = 182
  const AXIS_H = 44
  const AXIS_FONT = 26
  const topCx = CROSS_X
  const topCy = PAD / 2
  const rightCx = W - AXIS_W_RIGHT / 2 - 12
  const rightCy = CROSS_Y
  return (
    <g>
      <rect
        x={topCx - AXIS_W_TOP / 2}
        y={topCy - AXIS_H / 2}
        width={AXIS_W_TOP}
        height={AXIS_H}
        rx={AXIS_H / 2}
        fill={GLASS_FILL}
        stroke={GLASS_STROKE}
        strokeWidth={1}
        filter="url(#gnvn-badge-shadow)"
      />
      <text
        x={topCx}
        y={topCy + 9}
        textAnchor="middle"
        fill={ACCENT}
        fontSize={AXIS_FONT}
        fontWeight={600}
      >
        ↑ ナチュラル
      </text>
      <rect
        x={rightCx - AXIS_W_RIGHT / 2}
        y={rightCy - AXIS_H / 2}
        width={AXIS_W_RIGHT}
        height={AXIS_H}
        rx={AXIS_H / 2}
        fill={GLASS_FILL}
        stroke={GLASS_STROKE}
        strokeWidth={1}
        filter="url(#gnvn-badge-shadow)"
      />
      <text
        x={rightCx}
        y={rightCy + 9}
        textAnchor="middle"
        fill={ACCENT}
        fontSize={AXIS_FONT}
        fontWeight={600}
      >
        ノーマル →
      </text>
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
      aria-label="ナチュラル軸 (上が高い) とノーマル軸 (右が高い) の二軸を 4 象限独立画像で対比し、左上のナチュラルだけどノーマルじゃない領域を主役として強調する図。軸ラベルは外周帯に横書きで配置し、4 象限ラベルはすべて CELL 右下に統一する。"
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

      <line
        x1={CROSS_X}
        y1={PAD + 8}
        x2={CROSS_X}
        y2={H - PAD - 8}
        stroke={AXIS_STROKE}
        strokeWidth={1.5}
        strokeDasharray="6 8"
        strokeLinecap="round"
      />
      <line
        x1={PAD + 8}
        y1={CROSS_Y}
        x2={W - PAD - 8}
        y2={CROSS_Y}
        stroke={AXIS_STROKE}
        strokeWidth={1.5}
        strokeDasharray="6 8"
        strokeLinecap="round"
      />

      <AxisLabels />

      {QUADRANTS.map((q) => (
        <QuadrantLabel key={q.href + ":label"} q={q} />
      ))}
    </svg>
  )
}
