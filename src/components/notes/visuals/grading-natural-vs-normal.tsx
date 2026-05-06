const W = 1600
const H = 900

const ASSET_PATH = "/notes-assets/grading/natural-vs-normal/main.png"

export default function GradingNaturalVsNormal() {
  return (
    <svg
      data-diagram-slug="grading-natural-vs-normal"
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="ナチュラルとノーマルの二軸を四象限で対比し、左上の狭い領域をナチュラルだけどノーマルじゃない場所として強調する図。"
    >
      <defs>
        <linearGradient id="gnvn-top-scrim" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#110d29" stopOpacity="0.72" />
          <stop offset="1" stopColor="#110d29" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gnvn-right-scrim" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0" stopColor="#110d29" stopOpacity="0.5" />
          <stop offset="1" stopColor="#110d29" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="gnvn-hero-scrim" cx="0.18" cy="0.14" r="0.52">
          <stop offset="0" stopColor="#0d0b1f" stopOpacity="0.5" />
          <stop offset="1" stopColor="#0d0b1f" stopOpacity="0" />
        </radialGradient>
        <filter id="gnvn-text-shadow" x="-12%" y="-28%" width="124%" height="156%">
          <feDropShadow dx="0" dy="3" stdDeviation="7" floodColor="#070814" floodOpacity="0.46" />
        </filter>
      </defs>

      <image href={ASSET_PATH} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      <rect x={0} y={0} width={W} height={188} fill="url(#gnvn-top-scrim)" />
      <rect x={1240} y={0} width={360} height={H} fill="url(#gnvn-right-scrim)" />
      <rect x={0} y={0} width={760} height={430} fill="url(#gnvn-hero-scrim)" />

      <g opacity="0.9">
        <rect x={160} y={158} width={520} height={228} rx={32} fill="#130f2d" fillOpacity="0.34" />
        <rect x={980} y={166} width={280} height={92} rx={24} fill="#15122d" fillOpacity="0.28" />
        <rect x={1164} y={640} width={224} height={88} rx={22} fill="#161228" fillOpacity="0.3" />
        <rect x={188} y={642} width={196} height={86} rx={22} fill="#120f24" fillOpacity="0.22" />
      </g>

      <g filter="url(#gnvn-text-shadow)" fontFamily="var(--font-noto-sans-jp), sans-serif">
        <text x={800} y={96} textAnchor="middle" fill="#fcf8ff" fontSize={54} fontWeight={800}>
          ナチュラル ↑
        </text>
        <text x={1512} y={458} textAnchor="end" fill="#fcf8ff" fontSize={52} fontWeight={800}>
          ノーマル →
        </text>

        <g>
          <text x={194} y={222} fill="#f7d7a0" fontSize={38} fontWeight={700}>
            狙う狭い場所
          </text>
          <text x={194} y={290} fill="#fffaf2" fontSize={70} fontWeight={850}>
            ナチュラルだけど
          </text>
          <text x={194} y={366} fill="#fffaf2" fontSize={70} fontWeight={850}>
            ノーマルじゃない
          </text>
        </g>

        <text x={1120} y={226} textAnchor="middle" fill="#f8f3ff" fontSize={36} fontWeight={680}>
          規格通り
        </text>
        <text x={1276} y={697} textAnchor="middle" fill="#f8f3ff" fontSize={34} fontWeight={680}>
          時代外れ
        </text>
        <text x={286} y={698} textAnchor="middle" fill="#f8f3ff" fontSize={34} fontWeight={680}>
          あざとい
        </text>
      </g>
    </svg>
  )
}
