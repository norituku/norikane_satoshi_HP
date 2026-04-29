/**
 * Notion 本文の [[diagram:<slug>]] marker から呼び出す図解の生成設定。
 *
 * 設計方針 (2026-04-29 改訂、図解仕様書 v3 = 8b38762c に同期):
 *   - HP 実コード (src/app/globals.css) の Glass Design System が正本。
 *     背景 = --bg-base #F8F6FF (白〜ごく薄いラベンダー)、アクセント = --accent-primary #8B7FFF。
 *     aurora は 3 色のみ ── --aurora-purple rgba(139,127,255,0.28) /
 *     --aurora-pink rgba(255,143,171,0.20) / --aurora-sky rgba(125,211,252,0.20)。
 *     orange / teal / 緑系は HP 実装に存在しない。新規色相を発明しない。
 *   - 1 図 = 1 主張。背景画像は構図と気分だけを担い、ラベル・番号・小箱・グリフは
 *     note-diagram.tsx 側 (glass トークン) で確定させる役割分担。
 *   - GPT Image 2 に任せるのは背景の構図・質感・余白だけ。
 *     画像内に文字 (kana / kanji / ascii / 数字) ・記号・矢印・UI 要素・ロゴは絶対に描かせない。
 *   - リポジトリ内の AGENTS.md にあるニューモーフィズム記述は実装と乖離しているため無視。
 *
 * 各 slug ごとに以下を持つ:
 *   - referenceAssets.used: 構図・トーン・形状の根拠としたローカル素材
 *     (どの素材をどの図のどの部分に反映したかは prompt と generationRationale に明記)
 *   - referenceAssets.checkedButNotUsed: 仕様書に名前があるが直接寄与しない素材
 *   - sourceSpecNotionUrl / sourceSpecSummary
 *   - targetArticleNotionUrl
 *   - overlayLabels: HP 側で HTML/CSS で後載せするラベル
 *   - successCriteria: 仕様書「成功基準」をそのまま転記
 *   - generationRationale: prompt が仕様書とローカル素材をどう満たすかの記録
 */

const COMMON_NEGATIVE = [
  "STRICT NEGATIVE CONSTRAINTS — do NOT include any of the following:",
  "text, letters, words, numbers, captions, labels, titles, sentences, characters in any language",
  "(especially Japanese kana / kanji / Latin / numerals),",
  "UI elements, icons with letters, logos, watermarks, signatures,",
  "button shapes, screenshots, photos of people, faces, hands,",
  "arrows, arrowheads, connectors, callouts,",
  "dark backgrounds, navy or charcoal fills, heavy black, neon-on-black aesthetics, cinematic noir,",
  "saturated bold colors, vivid orange, teal, green, hard outlines, thick borders, busy compositions.",
].join(" ")

const COMMON_STYLE = [
  "Light, airy editorial illustration aligned with the host site's Glass Design System.",
  "Background is overwhelmingly bright: a calm white-to-soft-lavender canvas (~#F8F6FF) with very subtle aurora gradients used only as quiet directional light.",
  "Palette is strictly limited to the HP tokens: base #F8F6FF, accent #8B7FFF (soft lavender purple),",
  "and the three aurora washes ── aurora-purple ~rgba(139,127,255,0.28), aurora-pink ~rgba(255,143,171,0.20), aurora-sky ~rgba(125,211,252,0.20).",
  "All other colors (orange / teal / green / vivid saturated tones) are forbidden — they are not part of the HP implementation.",
  "Compositions feel spacious and uncluttered: generous negative space (at least 35% of the frame), few elements, low color count, soft thin lines, no thick borders.",
  "Contrast is tuned for in-article reading: shapes are visible but never demand attention — they are scaffolding only; HTML labels, numbers, and small boxes are overlaid in post by note-diagram.tsx.",
  "Output: 16:9 horizontal banner that sits inside an article body column, comfortably readable next to body text.",
].join(" ")

export const DIAGRAM_GEN_CONFIGS = {
  "correction-factor-map": {
    sourceSpecNotionUrl: "https://www.notion.so/8b38762c77fc4a048787c83ee7e8cb56",
    targetArticleNotionUrl: "https://www.notion.so/1510399661d64891aee912320df39b91",
    sourceSpecSummary:
      "図解仕様書 v3 (2026-04-29 / 8b38762c) chaos-vs-structured。主張『混ざると迷宮 / 分けると制御できる』。左半=ゆるく交差する 8 本の細い帯テクスチャ、中央=細い luminous seam、右半=水平バンドの陰影 5 段。色域は #F8F6FF + #8B7FFF + aurora 3 色 (purple / pink / sky) のみ。文字・記号・矢印は note-diagram.tsx 側で描画。",
    overlayLabels: [
      "混ざると迷宮",
      "カメラの種類",
      "露出",
      "色温度",
      "VEさんのアイリスフォロー",
      "肌色の一貫性",
      "スモークで生まれる大気の色",
      "作品全体のトーン",
      "曲ごとの方向性",
      "分けると制御できる",
      "カメラ単位",
      "フレーム単位",
      "アングル単位",
      "シーン単位",
      "作品単位",
      "混ぜたら迷う。粒度に分けると制御できる。",
    ],
    successCriteria: [
      "左半分=混線/右半分=整列、の左右対比が一目で読める",
      "左半の 8 本リボンが重なって混ざっている感覚が伝わる",
      "右半の 5 段水平バンドが等高・等幅で揃って見える",
      "中央の luminous seam が左右の境界を補助している (主役にはならない)",
      "HTML overlay の左右ヘッダー + 8 chaosLabels + 5 structuredLayers が乗る空白がある",
      "色域が #F8F6FF + #8B7FFF + aurora 3 色だけで構成され、orange / teal が出てこない",
    ],
    referenceAssets: {
      used: [
        "public/slides/11分解と整理によるアプローチ.png",
        "public/slides/5複合操作の影響と復元性.png",
        "public/demo/+2STOP.jpg",
        "public/demo/+1STOP.jpg",
        "public/demo/チャートノーマル.jpg",
        "public/demo/-1STOP.jpg",
        "public/demo/-2STOP.jpg",
      ],
      checkedButNotUsed: [
        {
          path: "public/slides/4プライマリーコントロール概要.png",
          reason: "コントロール粒度参考だが、本図解の「混線→粒度」軸とはレイヤーが異なるので不採用",
        },
      ],
    },
    generationRationale: [
      "v3 (2026-04-29 / 8b38762c) chaos-vs-structured 左右対比に再アライン。",
      "左半: 8 要因の細い帯がゆるく交差する柔らかいテクスチャ。slides/11 の三幕構成『分解前』を抽象化。帯の太さ/透明度のばらつきは demo の ±STOP 露出ブラケットを反映。",
      "中央: 細い luminous seam (ハードラインなし)。左右の境界を示すだけで、漏斗のように主張しない。",
      "右半: 5 段の水平バンドの陰影。上から per-camera / per-frame / per-angle / per-scene / per-project の支配域を均等高さで配置 (HTML 5 ラベル + サブラベルが乗る前提)。",
      "色域は HP 実コードのトークンに同期: #F8F6FF base、#8B7FFF accent、aurora purple/pink/sky の 3 色のみ。",
      "両半は同じ縦幅・同じ余白。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — chaos-vs-structured: two states placed side by side. Left half = entangled mix. Right half = sorted into 5 calm horizontal bands. Both halves share the same vertical area and identical breathing space.",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF) with very faint aurora wash (purple / pink / sky only).",
      "Composition rule: the frame is split into two equal halves by a thin luminous seam at the horizontal center. No hard line — just a quiet brighter ridge (subtle aurora-pink hairline) so the eye reads the seam as a soft boundary. Identical top and bottom margins on both halves.",
      "LEFT HALF (state A — 'mixed') — EIGHT slender translucent ribbons drift loosely and gently CROSS each other in a relaxed cluster around the middle of the half. Each ribbon represents one mixed correction factor (camera type, exposure, color temperature, VE iris-follow, skin-tone consistency, smoke-born atmospheric color, overall film tone, per-song direction). Ribbons use ONLY the HP palette: faint aurora-purple body, with occasional aurora-pink and aurora-sky tints, and the lavender accent #8B7FFF as the most saturated note. Ribbon thickness and opacity vary subtly to echo the +2 / +1 / normal / -1 / -2 STOP exposure bracket — a quiet non-uniform vibration, not chaos. The ribbons read as 'mixed but bright' — never crashed-dark, never warm-peach, never teal.",
      "MIDDLE SEAM — a single quiet luminous ridge running top-to-bottom, slightly brighter than the rest of the canvas. No arrowheads, no funnel walls, no hard boundaries. The ridge is built from the aurora-pink wash only, kept extremely subtle.",
      "RIGHT HALF (state B — 'sorted') — FIVE clean horizontal bands stacked top-to-bottom with generous breathing space between them. Each band is a thin softly-glowing horizon line of subtle aurora gradient (top band uses aurora-purple, second mixes purple-into-pink, middle is pure aurora-pink, fourth blends pink-into-sky, bottom is aurora-sky). All five bands are IDENTICAL in height, length, and spacing — equal-weight is critical because HTML labels of identical size will sit one per band. Each band casts a faint diffused shadow of the same aurora hue as itself.",
      "Empty negative space (>= 35% of frame) above, below, and between the two halves so HTML overlay (left header '混ざると迷宮', right header '分けると制御できる', 8 chaosLabels stacked along the left, and 5 structured-layer labels with sublabels per band on the right) lands cleanly.",
      "Visual reference (tone only, do not reproduce any text): public/slides/11分解と整理によるアプローチ.png (calm three-act feel) and public/slides/5複合操作の影響と復元性.png (sober contrast tone — adopt the rhythm, not the dark aesthetic).",
      "No arrows, no symbols, no glyphs, no text, no UI elements, no orange, no teal.",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "correction-scope-map": {
    sourceSpecNotionUrl: "https://www.notion.so/8b38762c77fc4a048787c83ee7e8cb56",
    targetArticleNotionUrl: "https://www.notion.so/1510399661d64891aee912320df39b91",
    sourceSpecSummary:
      "図解仕様書 v3 (2026-04-29 / 8b38762c) keypoint-row。主張『粒度 = 適用範囲』。ヒーロービジュアルとして 5 段の同心円クラスタが奥から手前へ柔らかく重なる。色域は #F8F6FF + #8B7FFF + aurora 3 色 (purple / pink / sky) のみ。文字・番号・グリフは note-diagram.tsx 側で描画。",
    overlayLabels: [
      "粒度 = 適用範囲",
      "カメラ単位",
      "フレーム単位",
      "アングル単位",
      "シーン単位",
      "作品単位",
      "粒度を取り違えると、迷宮に戻る。",
    ],
    successCriteria: [
      "5 段の同心円クラスタが奥から手前へ柔らかく重なるヒーロービジュアルとして読める",
      "「粒度 = 適用範囲」が一目で伝わる",
      "色域が #F8F6FF + #8B7FFF + aurora 3 色だけで構成され、orange / teal / 高彩度色が出てこない",
      "HTML overlay の itemsHeading + 5 items + takeaway が乗る空白がある",
      "correction-factor-map (chaos-vs-structured) と並べたときに、形状で補完関係になる (左右対比 vs ヒーロー同心円)",
    ],
    referenceAssets: {
      used: [
        "public/slides/11分解と整理によるアプローチ.png",
        "public/slides/5複合操作の影響と復元性.png",
      ],
      checkedButNotUsed: [
        {
          path: "public/slides/4プライマリーコントロール概要.png",
          reason: "コントロール粒度よりも適用範囲(支配範囲)を視覚化したいので不採用",
        },
      ],
    },
    generationRationale: [
      "v3 (2026-04-29 / 8b38762c) keypoint-row のヒーロービジュアルに再アライン。",
      "5 段の同心円クラスタが奥から手前へ柔らかく重なる構図に変更 (旧版の左→右 5 個並びは廃止)。各リングが順次広がり、奥側=narrow scope (per-camera) → 手前=broad scope (per-project) の支配域拡大を暗示する。",
      "factor-map (chaos-vs-structured) の左右対比とは別形状 (奥行きのある同心円重なり) で補完関係。",
      "色域は HP 実コードのトークンに同期: #F8F6FF base、#8B7FFF accent、aurora purple/pink/sky の 3 色のみ。",
      "ラベル・番号・グリフは note-diagram.tsx の keypoint-row 側で全て描画する役割分担なので、画像はヒーロー背景として気分だけを担う。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — A hero-style background visual for a keypoint-row diagram about 'scope = grain'. FIVE concentric-ring clusters that softly overlap from back to front, suggesting how the same correction reaches a wider area at coarser grain. The image is background only — labels, numbers, and small boxes are NOT drawn here; they are overlaid in HTML by note-diagram.tsx.",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF) with very faint aurora wash (purple / pink / sky only).",
      "FIVE concentric-ring clusters share a roughly common center (slightly off-center to the left so the right side has breathing space), arranged so the smallest cluster sits in the deepest layer and the largest cluster sits in the front layer. The clusters overlap softly, with translucency creating gentle depth — never hard-edged. Each cluster is built from 2-3 thin softly-glowing rings of the same aurora hue.",
      "Cluster 1 (back, smallest, narrow per-camera scope) — aurora-purple thin rings.",
      "Cluster 2 — purple-blending-into-pink rings.",
      "Cluster 3 (middle) — aurora-pink rings, with the lavender accent #8B7FFF as a quiet inner highlight.",
      "Cluster 4 — pink-blending-into-sky rings.",
      "Cluster 5 (front, largest, broad project-wide scope) — aurora-sky rings, very pale.",
      "All clusters are open thin outlines — NO filled disks, NO hard borders, NO thick strokes. The overlap regions deepen to a slightly more saturated lavender-pink-sky blend without ever becoming dark.",
      "Negative space: keep the right ~30% of the canvas mostly empty so the HTML overlay (heading '粒度 = 適用範囲', 5 grid items with monospace numbers, and the takeaway line) lands cleanly. The top edge and bottom edge also stay soft and uncluttered.",
      "Visual reference (tone only): public/slides/11分解と整理によるアプローチ.png and public/slides/5複合操作の影響と復元性.png — inherit the calm structural feel.",
      "No arrows, no symbols, no glyphs, no text, no orange, no teal.",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "grading-look-decomposition": {
    sourceSpecNotionUrl: "https://www.notion.so/fab6e697e92b48cc870a898c01165de8",
    targetArticleNotionUrl: "https://www.notion.so/2d61194573e140789602864a9040affe",
    sourceSpecSummary:
      "図解仕様書「Look Decomposition 4軸マップ」。中心=作品のルック(抽象映像フレーム), 4方向に放射する独立軸(色の広がり・転がり / 濃度 / カーブ / RGBカラーバランス)。文字なし、HTML/CSS で後載せ。HP slides 7(カラーグレーディングのフレームワーク) と 10(まとめ) のトーンを継承。",
    overlayLabels: [
      "作品のルック",
      "色の広がり・転がり",
      "濃度",
      "カーブ",
      "RGBカラーバランス",
      "監督の言葉がノードに落ちる",
    ],
    successCriteria: [
      "「正解がない仕事にも、判断の軸は作れる」と伝わる",
      "4軸が一目で違う性質として見える",
      "監督の抽象的な言葉と、カラリストの具体的な操作がつながる",
      "図が美しいだけでなく、本文の核心を短時間で理解させる",
    ],
    referenceAssets: {
      used: [
        "public/slides/7カラーグレーディングのフレームワーク.png",
        "public/slides/10カラーグレーディングのフレームワーク - まとめ.png",
        "public/slides/8フレームワーク関連コントロール.png",
        "public/slides/3カラーグレーディングの基本概念.png",
      ],
      checkedButNotUsed: [
        {
          path: "~/Library/CloudStorage/GoogleDrive-norikane.satoshi@gmail.com/マイドライブ/ルックコミュニケーションツール（仮名） — ピッチスライド.gslides",
          reason: "ツールビジョン資料 (27枚) で、Look Decomposition 概念図そのものは含まれない。中心+4軸構図の下敷きにはならないので不採用。",
        },
        {
          path: "~/Library/CloudStorage/GoogleDrive-norikane.satoshi@gmail.com/マイドライブ/mars_queen_grading_workflow_20260112094639.gslides",
          reason: "実プロジェクトのワークフロー図。4軸構造とは別の関心事 (作業順序) なので不採用",
        },
      ],
    },
    generationRationale: [
      "slides/7 → 「中心+周辺軸」の framework 構図を継承。中心の球と 4 方向への放射構造をそのまま採用。",
      "slides/10 → 「4軸まとめ」の整列感 (4軸が等しい重みで並ぶ) を、4 軸の太さ・長さを揃えることで反映。",
      "slides/8 → 各軸が「具体的なコントロールに対応する」感覚を、各軸末端のミニ表象 (色相弧/輝度バー/S曲線/3本ビーム) に反映。",
      "slides/3 → 「ルックは複数の独立軸の合成」という基礎概念を、軸同士が交差せず独立に描かれる構図に反映。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — Look Decomposition 4-axis map. One luminous central core surrounded by FOUR clearly separated radial axes, each axis representing one orthogonal property of a colorist's look.",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF). No dark fills.",
      "CENTER — a soft glowing orb at the geometric center of the frame, distilling the 'look of a film' into one luminous nucleus. The orb is bright and pale (warm peach to soft lavender aurora gradient), abstract — no eyes, no faces, no scenery.",
      "FOUR RADIAL AXES — extending outward toward upper-left, upper-right, lower-left, lower-right. The four axes have IDENTICAL length, identical line weight, and identical end-cap size, so they read as equal-weight at a glance (slides/10 'まとめ' rule of equal weight).",
      "AXIS 1 (upper-left, color spread / hue rotation) — terminates in a small soft chromatic arc fragment hinting at hue rotation and saturation.",
      "AXIS 2 (upper-right, density) — terminates in a small stack of three short vertical bands of varying luminance, hinting at per-color brightness control.",
      "AXIS 3 (lower-left, tonal curve) — terminates in a small smooth S-shaped luminous line over a faint grayscale.",
      "AXIS 4 (lower-right, RGB color balance) — terminates in three short faint parallel beams (warm peach, neutral teal, cool sky) gently shifting an underlying soft plane.",
      "The four axes connect to the central orb via thin softly-glowing filaments. Axes never cross each other (slides/3 'independent axes' rule). Plenty of empty space between axes so HTML labels overlay cleanly.",
      "Tone: calm, structural, framework-like. Use ONLY the HP palette (soft lavender, faint peach, faint sky, muted teal). No vivid saturated colors. No arrows, no symbols, no text.",
      "Visual reference (tone only): public/slides/7カラーグレーディングのフレームワーク.png (center+axes structure), public/slides/10カラーグレーディングのフレームワーク - まとめ.png (equal-weight 4-axis layout), public/slides/8フレームワーク関連コントロール.png (axis-end control glyphs), public/slides/3カラーグレーディングの基本概念.png (independent axes).",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "grading-words-to-knobs": {
    sourceSpecNotionUrl: "https://www.notion.so/cfc851f649c0458db9d2126c0b832584",
    targetArticleNotionUrl: "https://www.notion.so/2d61194573e140789602864a9040affe",
    sourceSpecSummary:
      "図解仕様書「監督の言葉 → 軸 → 操作」。立ち会いの抽象的な指示を、4軸のどれに落とし、どの操作で返すかを4列で示す3段ホップ。文字なし、HTML/CSS で後載せ。HP slides 8 (フレームワーク関連コントロール) と HP slides 7 (フレームワーク) のトーンを継承。",
    overlayLabels: [
      "「もう少し暖かく」",
      "「もう少し抜けを」",
      "「青を深く」",
      "「映画っぽく」",
      "色の広がり・転がり",
      "カーブ",
      "濃度",
      "4軸の合成",
      "言葉 → 軸 → 操作",
    ],
    successCriteria: [
      "監督の抽象的な一言が、軸とノブに落ちる仕組みが直感的に伝わる",
      "4列(言葉→軸→操作)が等しい重みで並んで見える",
      "grading-look-decomposition の「4軸そのもの」とは別の角度で、軸の使い方が読める",
      "後載せの日本語ラベルが綺麗に乗る",
    ],
    referenceAssets: {
      used: [
        "public/slides/8フレームワーク関連コントロール.png",
        "public/slides/7カラーグレーディングのフレームワーク.png",
      ],
      checkedButNotUsed: [
        {
          path: "public/slides/3カラーグレーディングの基本概念.png",
          reason: "前提知識スライド。3段ホップ構図とは別レイヤーなので不採用",
        },
      ],
    },
    generationRationale: [
      "slides/8 → 「コントロール = ノブ・スライダー・ホイール」の表象を、各レーン下段の小さな抽象ノブに反映。",
      "slides/7 → 「フレームワーク = 軸の整列」感を、4 レーンを等幅・等高で並べることで反映。",
      "grading-look-decomposition との重複回避: あちらは 1 中心+4 軸の放射、こちらは 4 列の縦並び 3 段ホップ。構図形状で補完関係。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — A 3-hop translation: spoken word → axis → control. Four parallel translation lanes side by side, one per phrase.",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF). No dark fills.",
      "Layout: FOUR identical-width vertical lanes, equally spaced left to right. Each lane has THREE stages stacked top-to-bottom with identical vertical spacing.",
      "TOP STAGE (per lane) — a small soft luminous wave or speech ripple, like a gentle sound wave. Lane 1 = warm peach tint, lane 2 = soft lavender, lane 3 = faint sky blue, lane 4 = a balanced warm-cool aurora wash. All four waves have IDENTICAL size and identical line weight.",
      "MIDDLE STAGE (per lane) — a small fragment of the colorist's framework: lane 1 = a small chromatic hue arc, lane 2 = a small S-curve segment, lane 3 = a short vertical density bar, lane 4 = a small 4-axis cross. Each fragment matches the lane's destination axis.",
      "BOTTOM STAGE (per lane) — a small abstract control element (soft round knob, short slider, or small wheel) glowing in the lane's tint. Identical size across lanes.",
      "Each lane's three stages are connected by a thin vertical softly-glowing filament so the eye reads top-to-bottom. Lanes are visually independent — clear empty space between lanes.",
      "Equal weight across lanes is critical (slides/7 framework feel): identical lane width, identical stage heights, identical glyph sizes. Plenty of empty space at top, between lanes, and at bottom for HTML labels.",
      "Use ONLY the HP palette (soft lavender, faint peach, faint sky, muted teal). No arrows, no text, no symbols beyond the abstract knob/slider/wheel shapes.",
      "Visual reference (tone only): public/slides/8フレームワーク関連コントロール.png (knob/slider feel), public/slides/7カラーグレーディングのフレームワーク.png (equal-weight axis layout).",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "filmlook-physics-flow": {
    sourceSpecNotionUrl: "https://www.notion.so/3a1ad1f58cab4b709c684725089bbf1e",
    targetArticleNotionUrl: "https://www.notion.so/7202c1ee64c04c97a4821b8e4f2e0f67",
    sourceSpecSummary:
      "図解仕様書「フィルムルックを作る物理の流れ」。左→右に8段の物理パイプライン: デジタル信号 / 露光 / 3層の染料 / 分光密度曲線 / S字カーブ / プリンターライト / グレイン / 最終ルック。文字なし、HTML/CSS で後載せ。FilmLookEmulator の SVD/PCA プロット群 (wu8_*, phaseE/wu1_plots/*) と Tetra_Reverse/ANALYSIS.md を曲線・染料層・テトラ構造の根拠に。",
    overlayLabels: [
      "デジタル信号",
      "露光",
      "3層の染料",
      "分光密度曲線",
      "S字カーブ",
      "プリンターライト",
      "グレイン",
      "最終ルック",
      "フィルムルックは物理で読める",
    ],
    successCriteria: [
      "フィルムルックが「雰囲気」ではなく「物理の流れ」だと伝わる",
      "記事の情報量に圧倒される前に、全体構造を掴める",
      "3層の染料、曲線、光、粒の要素が視覚的に分かる",
      "後から重ねる日本語ラベルで、本文の章構成と対応できる",
    ],
    referenceAssets: {
      used: [
        "../FilmLookEmulator_project/analysis/stage2/wu8_basis_vectors.png",
        "../FilmLookEmulator_project/analysis/stage2/wu8_weight_functions.png",
        "../FilmLookEmulator_project/analysis/stage2/wu8_variance_explained.png",
        "../FilmLookEmulator_project/analysis/stage2/wu8_mean_residual.png",
        "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/svd_spectrum_iems1.png",
        "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/svd_spectrum_rochp.png",
        "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/separability.png",
        "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/pareto_front.png",
        "../Tetra_Reverse/ANALYSIS.md",
      ],
      checkedButNotUsed: [
        {
          path: "../Tetra_Reverse/01_signal_flow.md",
          reason: "仕様書記載 path だが現在ローカルに不在 (Tetra_Reverse には ANALYSIS.md のみ)。8段構成の章割は仕様書本体から取った。",
        },
        {
          path: "../Tetra_Reverse/02a_modified_daniele_curve.md",
          reason: "同上、不在。S字カーブの構図は wu8_weight_functions.png から取った。",
        },
        {
          path: "../Tetra_Reverse/02b_energy_correction_gamut_mapping.md",
          reason: "同上、不在",
        },
        {
          path: "../Tetra_Reverse/02c_density_luminance_masks.md",
          reason: "同上、不在",
        },
        {
          path: "../Tetra_Reverse/02d_hue_matrix_hdr_unroll.md",
          reason: "同上、不在",
        },
      ],
    },
    generationRationale: [
      "wu8_basis_vectors.png → 3層の染料 (Stage 3) を 3 本の薄い曲線基底として描く根拠。曲線の形は採用、軸ラベルは描かせない。",
      "wu8_weight_functions.png → S字カーブ (Stage 5) の肩・トーの形状の根拠。緩やかなロールオフを採用。",
      "wu8_variance_explained.png → 各成分の重みが等しくないという感覚を、Stage 3 の 3 層の太さの違いに反映。",
      "wu8_mean_residual.png → グレイン (Stage 7) の非一様分布 (中間調で密、端で疎) の根拠。",
      "phaseE/wu1_plots/svd_spectrum_(iems1/rochp).png → 分光密度曲線 (Stage 4) の連続スペクトル感の根拠。波長方向に滑らかな波。",
      "phaseE/wu1_plots/separability.png → 各段が独立に見えるべき (混ざりすぎない) という構図上の根拠。8 段の境界をぼかしすぎない。",
      "phaseE/wu1_plots/pareto_front.png → 採用しないが checked。本図解は分離性議論ではないため。",
      "Tetra_Reverse/ANALYSIS.md → 7 vertex (R/G/B/C/M/Y/W) のテトラ補間構造を理解した上で、Stage 6 のプリンタライトを RGB 3 ビーム + 中央の白で表現する根拠。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — 8-stage physical pipeline that turns a digital signal into a film look. Left-to-right read.",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF). No dark fills, no cinematic noir.",
      "Eight stages span the frame at equal horizontal intervals. Each stage occupies roughly the same horizontal slot so HTML stage labels of equal size sit cleanly underneath.",
      "STAGE 1 (left edge) — digital signal: a thin vertical column of clean cool-sky vertical samples, very neutral, slightly grid-like.",
      "STAGE 2 — exposure: the column softens into a fan of warm-peach volumetric beams hitting an emulsion plane.",
      "STAGE 3 — three dye layers: three translucent horizontal layers (faint cyan/teal, faint magenta/lavender, faint yellow/peach) stacked in depth with subtle inter-layer offset (DIR-coupler suggestion). Layer thickness varies slightly to echo wu8_basis_vectors / wu8_variance_explained (each component has different weight).",
      "STAGE 4 — spectral density curves: a few faint smooth wavelength-like ridges crossing the dye stack, shape inherited from FilmLookEmulator phaseE/wu1_plots/svd_spectrum_iems1.png and svd_spectrum_rochp.png. No axis text.",
      "STAGE 5 — S-curve: one smooth global S-shaped luminous ridge with a soft toe and gentle shoulder, shape inherited from FilmLookEmulator wu8_weight_functions.png.",
      "STAGE 6 — printer light: three short faint parallel beams (warm peach, neutral teal, cool sky) recombining the signal, with a subtle bright nucleus where they converge — echoing the 7-vertex (R/G/B/C/M/Y/W) tetrahedral structure documented in Tetra_Reverse/ANALYSIS.md.",
      "STAGE 7 — grain: a delicate, NON-uniform grain texture confined to this stage's horizontal slot. Sparser at the bright edges, slightly denser in the middle range, never flat — distribution inherited from wu8_mean_residual.png.",
      "STAGE 8 (right edge) — final look: a soft warm-cool aurora orb at right, brighter than other stages, suggesting the resolved film frame.",
      "A thin softly-glowing horizontal flow line passes through all eight stages so the banner reads as one pipeline. Each stage boundary is gently delineated (not blurred together) — separability hint from phaseE/wu1_plots/separability.png.",
      "Plenty of empty negative space below each stage for HTML stage labels and the bottom takeaway label. Use ONLY the HP palette. No arrows, no text, no axis labels.",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "filmlook-density-mixture": {
    sourceSpecNotionUrl: "https://www.notion.so/cfc851f649c0458db9d2126c0b832584",
    targetArticleNotionUrl: "https://www.notion.so/7202c1ee64c04c97a4821b8e4f2e0f67",
    sourceSpecSummary:
      "図解仕様書「フィルムらしさ = 濃度 + 色の混ざり」。4軸のうち、フィルム固有の差はほぼ二軸 (濃度/色の混ざり) に集約される、という本文の核を視覚化する。左右二分割。文字なし、HTML/CSS で後載せ。FilmLookEmulator の wu8_basis_vectors / wu8_weight_functions の曲線形状と3層染料の感覚を継承。",
    overlayLabels: [
      "濃度",
      "色の混ざり",
      "暗部の粘り",
      "S字の肩",
      "対数応答",
      "3層染料",
      "分光密度曲線",
      "DIRカプラー",
      "プリンター光",
      "フィルムの正体は、二軸に絞れる。",
    ],
    successCriteria: [
      "フィルムルックの正体が「濃度 + 色の混ざり」の二軸に絞れる、という本文の核が直感で伝わる",
      "左半分 = 濃度、右半分 = 色の混ざり、が一目で違うものとして読める",
      "filmlook-physics-flow (8段) の補完として、何を取り出した二軸なのかが分かる",
      "後載せの日本語ラベルが綺麗に乗る",
    ],
    referenceAssets: {
      used: [
        "../FilmLookEmulator_project/analysis/stage2/wu8_weight_functions.png",
        "../FilmLookEmulator_project/analysis/stage2/wu8_basis_vectors.png",
        "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/svd_spectrum_iems1.png",
      ],
      checkedButNotUsed: [
        {
          path: "../FilmLookEmulator_project/analysis/stage2/wu8_variance_explained.png",
          reason: "寄与度のバープロットで、二軸の視覚化に直接寄与しないので不採用",
        },
        {
          path: "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/pareto_front.png",
          reason: "別議論(分離可能性)のプロット。本図解の「濃度+色の混ざり」とは関心が違うので不採用",
        },
      ],
    },
    generationRationale: [
      "wu8_weight_functions.png → 左半分 (濃度) の S 字の肩・対数応答ロールオフの形状根拠。",
      "wu8_basis_vectors.png → 右半分 (色の混ざり) の 3 層基底 (cyan / magenta / yellow) の重なりと相互コンタミ感の根拠。",
      "phaseE/wu1_plots/svd_spectrum_iems1.png → 右半分のプリンタ光 3 ビーム (R/G/B) を、波長方向の連続スペクトルの一断面として描く根拠。",
      "filmlook-physics-flow との重複回避: あちらは 8 段時系列、こちらは 2 軸の本質抽出。構図 (左右二分割) で補完。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — Film-ness reduces to TWO axes: density (how each brightness sinks) and color mixture (how layers cross-contaminate). Left-right split banner.",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF). No dark fills.",
      "LEFT HALF — DENSITY axis. A vertical luminance wedge: highlights at top softly rolling off (a gentle shoulder), midtones neutral, deep tones at the bottom that linger and never crash to pure black. A faint S-shaped tonal ridge crosses the wedge, shape inherited from FilmLookEmulator wu8_weight_functions.png — gentle toe, gentle shoulder, log-like response. Use soft lavender for the wedge body, faint peach for the highlight roll-off.",
      "RIGHT HALF — COLOR MIXTURE axis. Three translucent dye layers (faint cyan/teal, faint magenta/lavender, faint yellow/peach) overlap in a soft Venn-like cluster, with subtle inter-layer offsets suggesting DIR-coupler cross-contamination. Three short faint parallel beams (warm peach, neutral teal, cool sky) gently shift the resulting blend — printer light reference from phaseE/wu1_plots/svd_spectrum_iems1.png. Layer overlap shape inherited from wu8_basis_vectors.png.",
      "MIDDLE — a delicate luminous seam where the two halves meet. No hard line. The seam reads as 'these two axes belong to the same film'.",
      "Equal visual weight: the two halves occupy equal horizontal area, with identical breathing space above and below for HTML labels.",
      "Use ONLY the HP palette (soft lavender, faint peach, faint sky, muted teal). No arrows, no text, no axis labels.",
      COMMON_NEGATIVE,
    ].join(" "),
  },
}

export function getDiagramGenConfig(slug) {
  const cfg = DIAGRAM_GEN_CONFIGS[slug]
  if (!cfg) {
    throw new Error(`unknown diagram slug: ${slug}. known: ${Object.keys(DIAGRAM_GEN_CONFIGS).join(", ")}`)
  }
  return cfg
}
