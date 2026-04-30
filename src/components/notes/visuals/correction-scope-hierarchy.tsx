"use client"

/**
 * v5 静止画モジュール: 粒度 = 適用範囲 (横並び 5 列)
 *
 * カメラ → フレーム → アングル → シーン → 作品 の順に、左から右へ 5 列を並べる。
 * 各列は縦長のカードで、アイコン・大ラベル・粒度の説明を持つ。
 * 階層関係は「上部の粒度バー (細→粗)」+「列ごとの accent 濃度差」+「列間の矢印」で示す。
 *
 * 視界連動 / reduced-motion 対象外。SSR で初期表示にそのまま乗る。
 */

const W = 1600
const H = 900
const ACCENT = "rgb(139,127,255)"
const TEXT_PRIMARY = "rgba(28,15,110,0.92)"
const TEXT_MUTED = "rgba(107,95,168,0.85)"

const COL_W = 240
const COL_H = 600
const COL_Y = 180
const COL_GAP = 60
const COL_X_FIRST = (W - (COL_W * 5 + COL_GAP * 4)) / 2 // 80

type Scope = {
  label: string
  sub: string
  /** 細→粗 の連続軸上の位置 (0..1)。border / 粒度バー濃度に効く */
  axis: number
  icon: "frame" | "rect" | "angle" | "scape" | "film"
}

const SCOPES: Scope[] = [
  { label: "カメラ単位", sub: "同一カメラの全カット", axis: 0.0, icon: "frame" },
  { label: "フレーム単位", sub: "同一場面・同一構図", axis: 0.25, icon: "rect" },
  { label: "アングル単位", sub: "同一場面・別構図", axis: 0.5, icon: "angle" },
  { label: "シーン単位", sub: "物語上の 1 場面", axis: 0.75, icon: "scape" },
  { label: "作品単位", sub: "作品全体", axis: 1.0, icon: "film" },
]

function colX(i: number) {
  return COL_X_FIRST + i * (COL_W + COL_GAP)
}

function borderOpacity(axis: number) {
  // 左 (細) ほど濃く、右 (粗) ほど淡く。0.85 → 0.32
  return 0.85 - axis * 0.53
}

function fillOpacity(axis: number) {
  return 0.10 - axis * 0.06
}

function Icon({ kind, cx, cy }: { kind: Scope["icon"]; cx: number; cy: number }) {
  const stroke = "rgba(95,80,210,0.92)"
  const sw = 2.2
  const common = { stroke, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  // 60x60 box, centered on (cx, cy)
  const x = cx - 30
  const y = cy - 30
  switch (kind) {
    case "frame":
      // カメラ筐体
      return (
        <g {...common}>
          <rect x={x + 6} y={y + 18} width={48} height={32} rx={4} ry={4} />
          <path d={`M ${x + 18} ${y + 18} L ${x + 22} ${y + 12} L ${x + 38} ${y + 12} L ${x + 42} ${y + 18}`} />
          <circle cx={x + 30} cy={y + 34} r={8} />
        </g>
      )
    case "rect":
      // 1 フレーム
      return (
        <g {...common}>
          <rect x={x + 6} y={y + 12} width={48} height={36} rx={3} ry={3} />
          <path d={`M ${x + 6} ${y + 30} L ${x + 54} ${y + 30}`} strokeOpacity={0.5} strokeDasharray="3 4" />
          <path d={`M ${x + 30} ${y + 12} L ${x + 30} ${y + 48}`} strokeOpacity={0.5} strokeDasharray="3 4" />
        </g>
      )
    case "angle":
      // 同点を見る複数の視線
      return (
        <g {...common}>
          <circle cx={x + 30} cy={y + 16} r={5} />
          <path d={`M ${x + 28} ${y + 21} L ${x + 10} ${y + 50}`} />
          <path d={`M ${x + 30} ${y + 21} L ${x + 30} ${y + 50}`} />
          <path d={`M ${x + 32} ${y + 21} L ${x + 50} ${y + 50}`} />
        </g>
      )
    case "scape":
      // シーン (山と太陽)
      return (
        <g {...common}>
          <circle cx={x + 44} cy={y + 16} r={4} />
          <path d={`M ${x + 4} ${y + 50} L ${x + 18} ${y + 28} L ${x + 28} ${y + 38} L ${x + 40} ${y + 22} L ${x + 56} ${y + 50} Z`} />
        </g>
      )
    case "film":
      // フィルムロール
      return (
        <g {...common}>
          <rect x={x + 6} y={y + 14} width={48} height={32} rx={2} ry={2} />
          <rect x={x + 11} y={y + 19} width={4} height={4} />
          <rect x={x + 11} y={y + 37} width={4} height={4} />
          <rect x={x + 45} y={y + 19} width={4} height={4} />
          <rect x={x + 45} y={y + 37} width={4} height={4} />
          <rect x={x + 19} y={y + 22} width={22} height={16} rx={1} ry={1} />
        </g>
      )
  }
}

export default function CorrectionScopeHierarchy() {
  const barY = 100
  const barH = 18
  const barX = COL_X_FIRST
  const barW = COL_W * 5 + COL_GAP * 4

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <defs>
        <linearGradient id="scope-axis-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.85} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0.20} />
        </linearGradient>
      </defs>

      {/* 上部 eyebrow + 粒度バー (細 → 粗) */}
      <text
        x={COL_X_FIRST}
        y={56}
        fill={TEXT_MUTED}
        fontSize={20}
        fontWeight={500}
        letterSpacing={4}
      >
        粒 度 の 階 層
      </text>
      <text
        x={barX - 8}
        y={barY + barH / 2 + 6}
        textAnchor="end"
        fill={TEXT_MUTED}
        fontSize={18}
        fontWeight={500}
      >
        細
      </text>
      <text
        x={barX + barW + 8}
        y={barY + barH / 2 + 6}
        fill={TEXT_MUTED}
        fontSize={18}
        fontWeight={500}
      >
        粗
      </text>
      <rect
        x={barX}
        y={barY}
        width={barW}
        height={barH}
        rx={9}
        ry={9}
        fill="url(#scope-axis-grad)"
      />

      {/* 列間の連結矢印 (4 本) */}
      {SCOPES.slice(0, 4).map((_, i) => {
        const ax = colX(i) + COL_W + 12
        const bx = colX(i + 1) - 12
        const ay = COL_Y + COL_H / 2
        return (
          <g key={`arrow-${i}`} opacity={0.55}>
            <path
              d={`M ${ax} ${ay} L ${bx} ${ay}`}
              stroke={ACCENT}
              strokeWidth={1.6}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M ${bx - 10} ${ay - 6} L ${bx} ${ay} L ${bx - 10} ${ay + 6}`}
              stroke={ACCENT}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )
      })}

      {/* 5 列のカード */}
      {SCOPES.map((s, i) => {
        const x = colX(i)
        const y = COL_Y
        const bo = borderOpacity(s.axis)
        const fo = fillOpacity(s.axis)
        return (
          <g key={s.label}>
            <rect
              x={x}
              y={y}
              width={COL_W}
              height={COL_H}
              rx={20}
              ry={20}
              fill={ACCENT}
              fillOpacity={fo}
              stroke={ACCENT}
              strokeOpacity={bo}
              strokeWidth={1.8}
            />
            {/* white wash で glass parent の青みを抑え、列内コンテンツの可読性を保つ */}
            <rect
              x={x}
              y={y}
              width={COL_W}
              height={COL_H}
              rx={20}
              ry={20}
              fill="rgba(255,255,255,0.55)"
            />
            {/* 階層番号バッジ (上端) */}
            <circle
              cx={x + COL_W / 2}
              cy={y - 32}
              r={20}
              fill="rgba(255,255,255,0.85)"
              stroke={ACCENT}
              strokeOpacity={bo}
              strokeWidth={1.8}
            />
            <text
              x={x + COL_W / 2}
              y={y - 32 + 7}
              textAnchor="middle"
              fill={TEXT_PRIMARY}
              fontSize={20}
              fontWeight={700}
            >
              {i + 1}
            </text>

            <Icon kind={s.icon} cx={x + COL_W / 2} cy={y + 110} />

            <text
              x={x + COL_W / 2}
              y={y + 220}
              textAnchor="middle"
              fill={TEXT_PRIMARY}
              fontSize={28}
              fontWeight={700}
            >
              {s.label}
            </text>
            <line
              x1={x + COL_W / 2 - 36}
              x2={x + COL_W / 2 + 36}
              y1={y + 244}
              y2={y + 244}
              stroke={ACCENT}
              strokeOpacity={bo * 0.7}
              strokeWidth={1.4}
            />
            <text
              x={x + COL_W / 2}
              y={y + 286}
              textAnchor="middle"
              fill={TEXT_MUTED}
              fontSize={18}
              fontWeight={500}
            >
              {s.sub}
            </text>
          </g>
        )
      })}

      {/* 下部 axis annotation */}
      <text
        x={W / 2}
        y={H - 32}
        textAnchor="middle"
        fill={TEXT_MUTED}
        fontSize={18}
        letterSpacing={4}
        fontWeight={500}
      >
        左 ＝ 細 か い 粒 度 ／ 右 ＝ 広 い 範 囲
      </text>
    </svg>
  )
}
