const W = 1600
const H = 900

const PAD_TOP = 100
const PAD_BOTTOM = 100
const PAD_LEFT = 100
const PAD_RIGHT = 100
const GAP = 0
const IMG_W = 700
const IMG_H = 350
const CORNER_R = 0

const BG_BASE = "#F8F6FF"
const ACCENT = "#8B7FFF"
const TEXT_PRIMARY = "#1C0F6E"

const QUADRANTS = [
  {
    role: "hero" as const,
    href: "/notes-assets/quadrant-natural-not-normal.png",
    x: PAD_LEFT,
    y: PAD_TOP,
  },
  {
    role: "support" as const,
    href: "/notes-assets/quadrant-normal.png",
    x: PAD_LEFT + IMG_W + GAP,
    y: PAD_TOP,
  },
  {
    role: "support" as const,
    href: "/notes-assets/quadrant-outdated.png",
    x: PAD_LEFT + IMG_W + GAP,
    y: PAD_TOP + IMG_H + GAP,
  },
  {
    role: "support" as const,
    href: "/notes-assets/quadrant-aza.png",
    x: PAD_LEFT,
    y: PAD_TOP + IMG_H + GAP,
  },
]

function AxisLabels() {
  return (
    <g fill={ACCENT} fontSize={36} fontWeight={700}>
      <text x={800} y={75} textAnchor="middle">
        ナチュラル高
      </text>
      <text x={800} y={840} textAnchor="middle">
        ナチュラル低
      </text>
      <text x={50} y={450} textAnchor="middle" transform="rotate(-90 50 450)">
        ノーマル低
      </text>
      <text x={1550} y={450} textAnchor="middle" transform="rotate(-90 1550 450)">
        ノーマル高
      </text>
    </g>
  )
}

function QuadrantLabels() {
  return (
    <g fontSize={26} fontWeight={600}>
      <text x={450} y={40} textAnchor="middle" fill={ACCENT}>
        狙う狭い場所
      </text>
      <text x={1150} y={40} textAnchor="middle" fill={TEXT_PRIMARY}>
        設計上の中立
      </text>
      <text x={450} y={880} textAnchor="middle" fill={TEXT_PRIMARY}>
        あざとい
      </text>
      <text x={1150} y={880} textAnchor="middle" fill={TEXT_PRIMARY}>
        現在の感覚とずれる
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
      aria-label="ナチュラル軸（上=ナチュラル高 / 下=ナチュラル低）とノーマル軸（右=ノーマル高 / 左=ノーマル低）の二軸を、外周ラベル付きの 4 象限独立画像で対比する図。4 枚の画像は角丸なしで密着し、中央十字、矢印、accent point、ガラスピル背景は使わない。"
      fontFamily="var(--font-noto-sans-jp), sans-serif"
    >
      <rect x={0} y={0} width={W} height={H} fill={BG_BASE} />

      {QUADRANTS.map((q) => (
        <image
          key={q.href}
          href={q.href}
          x={q.x}
          y={q.y}
          width={IMG_W}
          height={IMG_H}
          preserveAspectRatio="xMidYMid slice"
        />
      ))}

      <AxisLabels />
      <QuadrantLabels />
    </svg>
  )
}
