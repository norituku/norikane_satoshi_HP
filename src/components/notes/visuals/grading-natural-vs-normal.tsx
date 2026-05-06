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
      aria-label="ナチュラル軸とノーマル軸の二軸マップ。左上の狭い領域を、ナチュラルだけどノーマルじゃない場所として示す。"
    >
      <defs>
        <linearGradient id="gnvn-top-label-scrim" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.42)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id="gnvn-left-label-scrim" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgba(0,0,0,0.4)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <filter id="gnvn-text-shadow" x="-8%" y="-30%" width="116%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#071116" floodOpacity="0.55" />
        </filter>
      </defs>

      <image href={ASSET_PATH} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      <rect x={0} y={0} width={W} height={260} fill="url(#gnvn-top-label-scrim)" />
      <rect x={0} y={0} width={560} height={H} fill="url(#gnvn-left-label-scrim)" />

      <g filter="url(#gnvn-text-shadow)" fontFamily="var(--font-noto-sans-jp), sans-serif">
        <text x={795} y={98} textAnchor="middle" fill="#fff8dc" fontSize={52} fontWeight={800}>
          ナチュラル ↑
        </text>
        <text x={1510} y={448} textAnchor="end" fill="#f5efe6" fontSize={50} fontWeight={800}>
          ノーマル →
        </text>

        <g>
          <text x={186} y={234} fill="#fff4c8" fontSize={38} fontWeight={700}>
            目指す狭い場所
          </text>
          <text x={186} y={302} fill="#fff9e8" fontSize={62} fontWeight={850}>
            ナチュラルだけど
          </text>
          <text x={186} y={374} fill="#fff9e8" fontSize={62} fontWeight={850}>
            ノーマルじゃない
          </text>
        </g>

        <text x={1012} y={250} fill="rgba(255,255,255,0.78)" fontSize={34} fontWeight={650}>
          規格通り
        </text>
        <text x={1042} y={690} fill="rgba(255,255,255,0.54)" fontSize={34} fontWeight={650}>
          時代外れ
        </text>
        <text x={250} y={694} fill="rgba(255,255,255,0.54)" fontSize={34} fontWeight={650}>
          あざとい
        </text>
      </g>
    </svg>
  )
}
