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
const ACCENT = "#8B7FFF"
const SCRIM_FILL = "rgba(8, 6, 32, 0.62)"

const QUADRANTS = [
  {
    role: "hero" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-natural-not-normal.png",
    x: COL_L_X,
    y: ROW_T_Y,
    label: "ナチュラルだけど",
    label2: "ノーマルじゃない",
    sub: "狙う狭い場所",
    badgeAnchor: "tl" as const,
  },
  {
    role: "ng" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-normal.png",
    x: COL_R_X,
    y: ROW_T_Y,
    label: "規格通り",
    sub: "面白みが出ない",
    badgeAnchor: "tr" as const,
  },
  {
    role: "ng" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-outdated.png",
    x: COL_R_X,
    y: ROW_B_Y,
    label: "時代外れ",
    sub: "古びて見える",
    badgeAnchor: "br" as const,
  },
  {
    role: "ng" as const,
    href: "/notes-assets/grading/natural-vs-normal/quadrant-aza.png",
    x: COL_L_X,
    y: ROW_B_Y,
    label: "あざとい",
    sub: "やりすぎて浮く",
    badgeAnchor: "bl" as const,
  },
]

type Quadrant = (typeof QUADRANTS)[number]

const BADGE_PAD = 18
const BADGE_INNER_X = 22
const BADGE_INNER_Y_TOP = 36
const LABEL_FONT_SIZE = 32
const LABEL_LINE_GAP = 40
const SUB_FONT_SIZE = 22
const SUB_GAP = 30

function badgeRectFor(q: Quadrant) {
  const isHero = q.role === "hero"
  const lines = isHero ? 2 : 1
  const w = isHero ? 360 : 300
  const h = BADGE_INNER_Y_TOP + lines * LABEL_LINE_GAP + SUB_GAP + BADGE_PAD - 14
  switch (q.badgeAnchor) {
    case "tl":
      return { x: q.x + BADGE_PAD, y: q.y + BADGE_PAD, w, h }
    case "tr":
      return { x: q.x + CELL_W - BADGE_PAD - w, y: q.y + BADGE_PAD, w, h }
    case "bl":
      return { x: q.x + BADGE_PAD, y: q.y + CELL_H - BADGE_PAD - h, w, h }
    case "br":
      return { x: q.x + CELL_W - BADGE_PAD - w, y: q.y + CELL_H - BADGE_PAD - h, w, h }
  }
}

function HeroCornerMarks({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const armLen = 38
  const armW = 5
  const inset = 12
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

function QuadrantBadge({ q }: { q: Quadrant }) {
  const r = badgeRectFor(q)
  const isHero = q.role === "hero"
  const textX = r.x + BADGE_INNER_X
  const subColor = isHero ? "#E0D9FF" : "#F4EDFF"
  const subOpacity = isHero ? 1 : 0.86
  const subY = r.y + BADGE_INNER_Y_TOP
  const labelStartY = subY + SUB_GAP + 2
  return (
    <g>
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={20}
        fill={SCRIM_FILL}
        stroke={isHero ? ACCENT : "rgba(255,255,255,0.18)"}
        strokeWidth={isHero ? 2 : 1}
      />
      <text
        x={textX}
        y={subY}
        fill={subColor}
        opacity={subOpacity}
        fontSize={SUB_FONT_SIZE}
        fontWeight={600}
        letterSpacing="0.04em"
      >
        {q.sub}
      </text>
      <text
        x={textX}
        y={labelStartY}
        fill="#FFFFFF"
        fontSize={LABEL_FONT_SIZE}
        fontWeight={800}
      >
        {q.label}
      </text>
      {q.label2 ? (
        <text
          x={textX}
          y={labelStartY + LABEL_LINE_GAP}
          fill="#FFFFFF"
          fontSize={LABEL_FONT_SIZE}
          fontWeight={800}
        >
          {q.label2}
        </text>
      ) : null}
    </g>
  )
}

function AxisCrossBadge() {
  const w = 360
  const h = 132
  const x = CROSS_X - w / 2
  const y = CROSS_Y - h / 2
  return (
    <g>
      <line
        x1={CROSS_X}
        y1={PAD}
        x2={CROSS_X}
        y2={H - PAD}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1}
        strokeDasharray="6 8"
      />
      <line
        x1={PAD}
        y1={CROSS_Y}
        x2={W - PAD}
        y2={CROSS_Y}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1}
        strokeDasharray="6 8"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={22}
        fill="rgba(8, 6, 32, 0.78)"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1}
      />
      <text
        x={CROSS_X}
        y={CROSS_Y - 14}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={36}
        fontWeight={800}
        letterSpacing="0.04em"
      >
        ナチュラル ↑
      </text>
      <text
        x={CROSS_X}
        y={CROSS_Y + 36}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={36}
        fontWeight={800}
        letterSpacing="0.04em"
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

      {QUADRANTS.map((q) => (
        <QuadrantBadge key={q.href + ":badge"} q={q} />
      ))}

      <AxisCrossBadge />
    </svg>
  )
}
