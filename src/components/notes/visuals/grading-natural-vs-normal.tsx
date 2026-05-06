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
const ACCENT = "#E8FF6A"
const INK = "#11131A"
const PAPER = "#F6F1E6"

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

const LABEL_BAR_H = 64
const LABEL_FONT_SIZE = 30
const HERO_SUB_FONT_SIZE = 22

function HeroCornerMarks({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const armLen = 32
  const armW = 4
  const inset = 14
  const x0 = x + inset
  const y0 = y + inset
  const x1 = x + w - inset
  const y1 = y + h - inset
  return (
    <g stroke={ACCENT} strokeWidth={armW} strokeLinecap="square" fill="none">
      <path d={`M ${x0} ${y0 + armLen} L ${x0} ${y0} L ${x0 + armLen} ${y0}`} />
      <path d={`M ${x1 - armLen} ${y0} L ${x1} ${y0} L ${x1} ${y0 + armLen}`} />
      <path d={`M ${x0} ${y1 - armLen} L ${x0} ${y1} L ${x0 + armLen} ${y1}`} />
      <path d={`M ${x1 - armLen} ${y1} L ${x1} ${y1} L ${x1} ${y1 - armLen}`} />
    </g>
  )
}

function QuadrantLabel({ q }: { q: Quadrant }) {
  const isHero = q.role === "hero"
  const inset = 16
  const barY = q.labelAnchor === "top" ? q.y + inset : q.y + CELL_H - inset - LABEL_BAR_H
  const barX = q.x + inset
  const barW = CELL_W - inset * 2
  const labelY = barY + 42
  const subY = q.y + CELL_H - inset - 16
  return (
    <g>
      <rect
        x={barX}
        y={barY}
        width={barW}
        height={LABEL_BAR_H}
        rx={12}
        fill={PAPER}
        opacity={isHero ? 0.98 : 0.92}
      />
      {isHero ? <rect x={barX} y={barY} width={9} height={LABEL_BAR_H} rx={4.5} fill={ACCENT} /> : null}
      <text
        x={barX + (isHero ? 28 : 22)}
        y={labelY}
        fill={INK}
        fontSize={LABEL_FONT_SIZE}
        fontWeight={800}
      >
        {q.label}
      </text>
      {isHero ? (
        <text
          x={q.x + CELL_W - inset}
          y={subY}
          textAnchor="end"
          fill="#FFFFFF"
          fontSize={HERO_SUB_FONT_SIZE}
          fontWeight={700}
          paintOrder="stroke"
          stroke="rgba(5,5,8,0.72)"
          strokeWidth={5}
        >
          {q.sub}
        </text>
      ) : null}
    </g>
  )
}

function AxisGuides() {
  const axisStroke = "rgba(246,241,230,0.74)"
  return (
    <g>
      <line
        x1={CROSS_X}
        y1={H - PAD - 4}
        x2={CROSS_X}
        y2={PAD + 26}
        stroke={axisStroke}
        strokeWidth={2}
      />
      <path d={`M ${CROSS_X - 9} ${PAD + 36} L ${CROSS_X} ${PAD + 18} L ${CROSS_X + 9} ${PAD + 36}`} fill="none" stroke={axisStroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <line
        x1={PAD}
        y1={CROSS_Y}
        x2={W - PAD - 26}
        y2={CROSS_Y}
        stroke={axisStroke}
        strokeWidth={2}
      />
      <path d={`M ${W - PAD - 36} ${CROSS_Y - 9} L ${W - PAD - 18} ${CROSS_Y} L ${W - PAD - 36} ${CROSS_Y + 9}`} fill="none" stroke={axisStroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <text
        x={CROSS_X - 18}
        y={CROSS_Y - 120}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={28}
        fontWeight={800}
        paintOrder="stroke"
        stroke="#0d0b1f"
        strokeWidth={4}
        transform={`rotate(-90 ${CROSS_X - 18} ${CROSS_Y - 120})`}
      >
        ナチュラル
      </text>
      <text
        x={W - PAD - 70}
        y={CROSS_Y - 18}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={28}
        fontWeight={800}
        paintOrder="stroke"
        stroke="#0d0b1f"
        strokeWidth={4}
      >
        ノーマル
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
      aria-label="ナチュラル軸 (上が高い) とノーマル軸 (右が高い) の二軸を 4 象限独立画像で対比し、左上のナチュラルだけどノーマルじゃない領域を主役として強調する図。"
      fontFamily="var(--font-noto-sans-jp), sans-serif"
    >
      <defs>
        <clipPath id="gnvn-cell-clip">
          <rect x={0} y={0} width={CELL_W} height={CELL_H} rx={CORNER_R} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={W} height={H} fill="#0d0b1f" />

      {QUADRANTS.map((q) => (
        <g key={q.href} transform={`translate(${q.x} ${q.y})`}>
          <g clipPath="url(#gnvn-cell-clip)">
            <image href={q.href} x={0} y={0} width={CELL_W} height={CELL_H} preserveAspectRatio="xMidYMid slice" />
          </g>
          <rect
            x={0}
            y={0}
            width={CELL_W}
            height={CELL_H}
            rx={CORNER_R}
            fill="none"
            stroke={q.role === "hero" ? ACCENT : "rgba(255,255,255,0.32)"}
            strokeWidth={q.role === "hero" ? 4 : 1.5}
          />
          {q.role === "hero" ? (
            <HeroCornerMarks x={0} y={0} w={CELL_W} h={CELL_H} />
          ) : null}
        </g>
      ))}

      <AxisGuides />

      {QUADRANTS.map((q) => (
        <QuadrantLabel key={q.href + ":label"} q={q} />
      ))}
    </svg>
  )
}
