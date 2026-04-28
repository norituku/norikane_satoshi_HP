/**
 * Notion 本文の [[diagram:<slug>]] marker から呼び出す図解の生成設定。
 *
 * 設計方針 (2026-04-28 改訂):
 *   - HP の世界観 = ライトグラスモーフィズム + オーロラ。背景は #F8F6FF を基調とした
 *     白〜ごく薄いラベンダー、補助色は --aurora-purple / --aurora-pink /
 *     --aurora-blue / --aurora-orange の 4 色のみ。「暗めシネマティック」前提は廃止。
 *   - 1 図 = 1 主張。5 秒で読み取れる構図に絞り、矢印・枠・装飾は最小限。
 *   - GPT Image 2 に任せるのは背景・質感・構図・素材感の下地だけ。
 *     日本語ラベル / 短文 / 矢印 / 枠 / 順番 / 注釈は全て HTML/CSS 側で確定する。
 *   - 画像内に文字 (kana / kanji / ascii / 数字) は絶対に描かせない。
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
  "dark backgrounds, navy or charcoal fills, heavy black, neon-on-black aesthetics, cinematic noir,",
  "saturated bold colors, hard outlines, thick borders, busy compositions.",
].join(" ")

const COMMON_STYLE = [
  "Light, airy editorial illustration aligned with the host site's light glass-morphism + aurora design language.",
  "Background is overwhelmingly bright: a calm white-to-soft-lavender canvas (~#F8F6FF) with very subtle aurora gradients used only as quiet directional light",
  "(soft lavender ~rgba(139,127,255,0.18), gentle peach ~rgba(255,200,160,0.10), faint sky blue ~rgba(160,200,255,0.10), muted teal ~rgba(121,199,199,0.10)).",
  "Compositions feel spacious and uncluttered: generous negative space (at least 35% of the frame), few elements, low color count, soft thin lines, no thick borders.",
  "Contrast is tuned for in-article reading: shapes are visible but never demand attention — they are scaffolding for HTML labels overlaid in post.",
  "Output: 16:9 horizontal banner that sits inside an article body column, comfortably readable next to body text.",
].join(" ")

export const DIAGRAM_GEN_CONFIGS = {
  "correction-factor-map": {
    sourceSpecNotionUrl: "https://www.notion.so/a88b4c519ced4773b3b357b45cd0a2d4",
    targetArticleNotionUrl: "https://www.notion.so/1510399661d64891aee912320df39b91",
    sourceSpecSummary:
      "図解仕様書「カラーコレクションの因数分解マップ」。左=混線(7要因), 右=5段の粒度レイヤー(カメラ/フレーム/アングル/シーン/作品), 中央=漏斗。文字なし、HTML/CSS で後載せ。HP slides 11(分解と整理) と 5(複合操作の影響と復元性) のトーンを継承し、抽象化した横長ビジュアルにする方針。",
    overlayLabels: [
      "混ざると迷宮",
      "分けると制御できる",
      "カメラ単位",
      "フレーム単位",
      "アングル単位",
      "シーン単位",
      "作品単位",
    ],
    successCriteria: [
      "記事本文を読まなくても「混ざると迷う」「分けると制御できる」が一目で伝わる",
      "5つの粒度が明確に読み取れる",
      "日本語ラベルはHP側で正確に重ねられる",
      "図単体が装飾で終わらず、本文の理解を助けている",
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
      "slides/11 → 左→中央→右の三幕構成 (混線 / 漏斗 / 整理) をそのまま踏襲。漏斗の中央集約モチーフを中央のソフトフローに反映。",
      "slides/5 → 7要因が「重なって戻せなくなる」感覚を、左半分の絡み合う 7 本の細い帯として反映 (異なる色相の薄帯)。",
      "public/demo/(+2/+1/normal/-1/-2)STOP → 露出ブラケットを左半分の帯の太さ・透明度のばらつきに反映 (一様でない揺らぎ)。",
      "右半分の 5 段は、上から per-camera / per-frame / per-angle / per-scene / per-project の支配域を 5 本の整列したホライゾンタルバンドで表現。",
      "色域は HP の Layer1 (lavender / peach / sky / teal) のみ。dark navy 系は廃止。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — Decomposition of correction factors. Single horizontal banner, three-act read (chaos → funnel → strata).",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF) with very faint aurora wash. No dark fills.",
      "LEFT THIRD — entangled state: SEVEN slender translucent ribbons drift loosely in a relaxed cluster, gently overlapping each other. Each ribbon is one factor (camera difference, exposure drift, color temperature, skin tone, atmosphere/smoke, scene tone, overall look). Ribbons use the site palette only (soft lavender, gentle peach, faint sky, muted teal). Their thickness and opacity vary slightly to echo the +2 / +1 / normal / -1 / -2 STOP exposure bracket from public/demo/*STOP.jpg — a quiet non-uniform vibration, not chaos. The ribbons read as 'mixed but not dark'.",
      "MIDDLE THIRD — soft luminous funnel / lens, rendered as a quiet inward gradient that gathers the ribbons toward the right. This is the 'decomposition' moment from public/slides/11分解と整理によるアプローチ.png — same calm three-act feeling, reframed horizontally. No hard boundary, no arrow heads.",
      "RIGHT THIRD — orderly state: FIVE clean horizontal bands stacked top-to-bottom with generous breathing space between them. Each band is a thin softly-glowing horizon line, slightly different muted hue (top = warm peach for per-camera, descending toward cooler lavender / sky / teal for per-frame, per-angle, per-scene, per-project at the bottom). Bands are identical in height and spacing — uniformity matters because HTML labels of equal size sit on each band.",
      "Tone: light, calm, structural. Generous empty negative space above, below, and between the three thirds so HTML labels (per-camera ... per-project, plus '混ざると迷宮' / '分けると制御できる' headers) overlay cleanly. No arrows, no symbols, no glyphs.",
      "Visual reference (tone only, do not copy text): public/slides/11分解と整理によるアプローチ.png and public/slides/5複合操作の影響と復元性.png — inherit the calm framework feel and three-act decomposition rhythm, not the dark aesthetic.",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "correction-scope-map": {
    sourceSpecNotionUrl: "https://www.notion.so/cfc851f649c0458db9d2126c0b832584",
    targetArticleNotionUrl: "https://www.notion.so/1510399661d64891aee912320df39b91",
    sourceSpecSummary:
      "図解仕様書「適用範囲ミニ図」。5段の粒度 (カメラ/フレーム/アングル/シーン/作品) それぞれが、どこまでの範囲を支配するかを横並びで示す。文字なし、HTML/CSS で後載せ。HP slides 11 (分解と整理) と HP slides 5 (複合操作の影響と復元性) のトーンを継承。",
    overlayLabels: [
      "カメラ単位",
      "フレーム単位",
      "アングル単位",
      "シーン単位",
      "作品単位",
      "粒度 = 適用範囲",
    ],
    successCriteria: [
      "5つの粒度それぞれが「どこまでの範囲を支配するか」が一目で見える",
      "粒度を取り違えると戻せなくなる、という本文の核が直感的に伝わる",
      "日本語ラベルはHP側で正確に重ねられる",
      "correction-factor-map と並べても重複ではなく補完として読める",
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
      "slides/11 → 「分解=粒度ごとに見る」発想を、横並び 5 つの同心円クラスタに反映。中心が同じでも外周(支配域)が違う、という対比をそのまま絵にする。",
      "slides/5 → 「適用範囲が広いほど取り返しがつかない」感覚を、右に行くほど外周リングが大きく、にじみが穏やかになることで反映。",
      "correction-factor-map と並ぶことを意識し、構図は同心円 (factor-map の 5 本バンドと別形状) を採用 → 補完図として機能する。",
    ].join(" "),
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — 'scope-of-effect' mini-map. Five concentric-ring clusters arranged left-to-right. Each cluster represents one of the five granularity strata (per-camera, per-frame, per-angle, per-scene, per-project).",
      "Background: bright white-to-soft-lavender canvas (~#F8F6FF). No dark fills.",
      "Each cluster: a small bright nucleus at its center (same size across all five clusters — the correction itself is the same), surrounded by 2-3 nested rings. The OUTERMOST ring grows progressively from left to right: smallest on the leftmost cluster (narrow per-camera scope), largest on the rightmost (project-wide scope).",
      "Rings: thin softly-glowing outlines using the HP aurora palette (soft lavender as the dominant ring color, with one accent ring per cluster in faint peach / sky / teal). No filled disks. No hard outlines.",
      "Spacing: equal horizontal spacing between cluster centers; clusters do NOT overlap. Generous breathing space above and below for HTML labels.",
      "A very faint horizontal flow line passes through all five nuclei to read left-to-right as one sequence (slides/11 'decompose then read' sense).",
      "Visual reference (tone only): public/slides/11分解と整理によるアプローチ.png and public/slides/5複合操作の影響と復元性.png — inherit the calm structural feel.",
      "No arrows, no symbols, no glyphs, no text.",
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
