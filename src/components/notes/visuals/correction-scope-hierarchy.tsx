"use client"

/**
 * v5 静止画モジュール: 粒度 = 適用範囲の入れ子
 *
 * 5 層の同心矩形でカメラ → フレーム → アングル → シーン → 作品の入れ子を示す。
 * 内側ほど狭く濃く、外側ほど広く淡く。各層は独自のラベル + サブラベルを持ち、
 * 「内側を動かしても外側は壊れない」という保証を視覚で伝える。
 *
 * 視界連動 / reduced-motion 対象外。サーバ側でも描画可能 ("use client" は付くが
 * 実体は時間依存しないので SSR 結果が初期表示にそのまま乗る)。
 */

const W = 1600
const H = 1000
const ACCENT = "rgb(139,127,255)"
const TEXT_PRIMARY = "rgba(28,15,110,0.92)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"

type Scope = {
  index: number
  label: string
  sublabel: string
  /** 矩形の幅 / 高さ。中心揃えで配置する */
  w: number
  h: number
  /** 塗り (0..1) と外周線 (0..1) の不透明度。外側ほど淡く */
  fillOpacity: number
  strokeOpacity: number
}

const SCOPES: Scope[] = [
  {
    index: 5,
    label: "作品単位",
    sublabel: "全カットの基底に効く",
    w: 1500,
    h: 900,
    fillOpacity: 0.05,
    strokeOpacity: 0.22,
  },
  {
    index: 4,
    label: "シーン単位",
    sublabel: "同シーンの全カットに乗る",
    w: 1260,
    h: 740,
    fillOpacity: 0.07,
    strokeOpacity: 0.3,
  },
  {
    index: 3,
    label: "アングル単位",
    sublabel: "同アングルの別テイクに揃う",
    w: 1020,
    h: 580,
    fillOpacity: 0.09,
    strokeOpacity: 0.38,
  },
  {
    index: 2,
    label: "フレーム単位",
    sublabel: "1 カット内の各フレームを動かす",
    w: 780,
    h: 420,
    fillOpacity: 0.11,
    strokeOpacity: 0.46,
  },
  {
    index: 1,
    label: "カメラ単位",
    sublabel: "同じカメラ全体を均す",
    w: 540,
    h: 260,
    fillOpacity: 0.14,
    strokeOpacity: 0.55,
  },
]

export default function CorrectionScopeHierarchy() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {SCOPES.map((s) => {
        const x = (W - s.w) / 2
        const y = (H - s.h) / 2
        const isInnermost = s.index === 1
        return (
          <g key={s.label}>
            <rect
              x={x}
              y={y}
              width={s.w}
              height={s.h}
              rx={32}
              ry={32}
              fill={ACCENT}
              fillOpacity={s.fillOpacity}
              stroke={ACCENT}
              strokeOpacity={s.strokeOpacity}
              strokeWidth={1.5}
            />
            <text
              x={x + 28}
              y={y + 36}
              fill={TEXT_PRIMARY}
              fontSize={isInnermost ? 30 : 22}
              fontWeight={isInnermost ? 700 : 600}
            >
              {`L${s.index}  ${s.label}`}
            </text>
            <text
              x={x + 28}
              y={y + (isInnermost ? 64 : 60)}
              fill={TEXT_MUTED}
              fontSize={isInnermost ? 18 : 16}
            >
              {s.sublabel}
            </text>
          </g>
        )
      })}

      {/* axis annotations */}
      <g opacity={0.9}>
        <text
          x={W / 2}
          y={48}
          textAnchor="middle"
          fill={TEXT_MUTED}
          fontSize={18}
          letterSpacing={4}
          fontWeight={500}
        >
          外 ＝ 影 響 範 囲 が 広 い
        </text>
        <text
          x={W / 2}
          y={H - 28}
          textAnchor="middle"
          fill={TEXT_MUTED}
          fontSize={18}
          letterSpacing={4}
          fontWeight={500}
        >
          内 ＝ 粒 度 が 細 か い
        </text>
      </g>
    </svg>
  )
}
