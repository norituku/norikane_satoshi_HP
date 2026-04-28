/**
 * Notion 本文の [[diagram:<slug>]] marker から呼び出す図解の生成設定。
 *
 * 画像生成は文字を一切描かせず背景・構造・雰囲気のみ生成し、ラベル等は HP 側の
 * HTML/CSS で重ねる。各 slug ごとに以下を持つ:
 *   - referenceAssets: ローカル候補 path (generate.mjs が exists 検証)
 *     - used: 構図参考として使う、prompt 内で「継承」と明示する
 *     - checkedButNotUsed: 仕様書に載っていたが不在 / 直接寄与しない素材
 *   - sourceSpecNotionUrl / sourceSpecSummary
 *   - targetArticleNotionUrl
 *   - overlayLabels: HP 側で HTML/CSS で後載せするラベル文字列
 *   - successCriteria: 仕様書「成功基準」をそのまま転記
 *   - generationRationale: なぜこの prompt が仕様書を満たすかの一行記録
 */

const COMMON_NEGATIVE = [
  "STRICT NEGATIVE CONSTRAINTS — do NOT include any of the following:",
  "text, letters, words, numbers, captions, labels, titles, sentences, characters in any language",
  "(especially Japanese kana / kanji / Latin / numerals),",
  "UI elements, icons with letters, logos, watermarks, signatures,",
  "button shapes, screenshots, photos of people, faces, hands.",
].join(" ")

const COMMON_STYLE = [
  "Cinematic editorial illustration. Dark, calm, premium feel.",
  "Deep navy / charcoal background with very subtle aurora gradients",
  "(deep purple #2a2156, dim teal #1f4a47, faint warm orange #4a2a1a) used as soft directional light only.",
  "Background remains overwhelmingly dark so overlay text added later (in post-processing) stays readable.",
  "Output: 16:9 horizontal banner suitable for being embedded inside an article body column.",
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
    generationRationale:
      "仕様書の構図(左:7要因混線 / 右:5段の粒度ストラータ / 中央:漏斗で因数分解)・成功基準(混ざると迷う/分けると制御できるが一目で伝わる/5粒度を読み取れる)・後載せラベル7件・既存素材 (HP slides 11/5 と public/demo STOP連番) を全て prompt 内に明示。後載せラベルは HP 側の HTML/CSS で重ねる前提なので、画像内には文字を描かない。",
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — illustrate decomposition of correction factors as described in the source spec (Notion: figure spec for 'correction-factor-map').",
      "Five granularity strata to read on the right side from top to bottom: per-camera, per-frame, per-angle, per-scene, per-project (these labels will be overlaid later in HTML/CSS, so do NOT draw any text inside the image).",
      "Inherit the visual tone of the existing reference slides 'public/slides/11分解と整理によるアプローチ.png' and 'public/slides/5複合操作の影響と復元性.png' — same calm cinematic feel, same abstraction level — but reframe the composition as a single horizontal banner.",
      "Compose a single horizontal banner split into two halves with a soft luminous transition in the middle (no hard line).",
      "LEFT HALF — represents an entangled, chaotic state of correction factors before decomposition:",
      "a dense knot of seven distinct intertwined translucent threads in muted blue, magenta, peach and teal,",
      "drifting and overlapping like tangled silk, each thread suggesting one independent variable",
      "(camera differences, exposure drift / VE iris-following, color temperature, skin tone consistency, atmospheric haze from smoke, scene-wide tone, overall project look).",
      "Soft volumetric light passes through the knot, creating a sense of unresolved layering. No symbols, no glyphs.",
      "Subtle exposure-bracket vibration in the threads (echoing the public/demo +2STOP/+1STOP/normal/-1STOP/-2STOP bracket).",
      "RIGHT HALF — represents the same factors after being decomposed into FIVE clearly distinguishable horizontal granularity layers,",
      "stacked top-to-bottom with generous breathing space:",
      "thin clean horizontal bands separated by faint glowing dividers, each band a slightly different muted hue,",
      "the topmost band brightest (per-camera), descending bands progressively cooler and more grounded (per-frame, per-angle, per-scene, per-project at the bottom).",
      "The bands feel orderly, calm and structural — clearly five distinct strata, but abstract (no text, no numbers).",
      "MIDDLE — a delicate luminous funnel / lens effect channels the tangled threads from the left into the five clean bands on the right,",
      "implying that chaos is being factored into layered structure (this is the 'decomposition' moment of the spec).",
      "Strong empty negative space below and above the bands so HTML labels (per-camera ... per-project, plus the 'mixed = labyrinth / separated = controllable' headers) can be overlaid later.",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "grading-look-decomposition": {
    sourceSpecNotionUrl: "https://www.notion.so/fab6e697e92b48cc870a898c01165de8",
    targetArticleNotionUrl: "https://www.notion.so/2d61194573e140789602864a9040affe",
    sourceSpecSummary:
      "図解仕様書「Look Decomposition 4軸マップ」。中心=作品のルック(抽象映像フレーム), 4方向に放射する独立軸(色の広がり・転がり / 濃度 / カーブ / RGBカラーバランス)。文字なし、HTML/CSS で後載せ。HP slides 7(カラーグレーディングのフレームワーク) と 10(まとめ) のトーンを継承。Drive ピッチスライド (ルックコミュニケーションツール) は中身がツールビジョン資料で Look Decomposition 概念図を含んでいなかったため不採用。",
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
          reason: "Drive 上で中身を読んだ結果、ツールビジョン資料 (27枚) で Look Decomposition 概念図そのものは含まれていなかった。中心+4軸構図の下敷きにはならないので採用しない。",
        },
        {
          path: "~/Library/CloudStorage/GoogleDrive-norikane.satoshi@gmail.com/マイドライブ/mars_queen_grading_workflow_20260112094639.gslides",
          reason: "実プロジェクトのワークフロー図で 4軸構造とは別の関心事 (作業順序) なので不採用",
        },
      ],
    },
    generationRationale:
      "仕様書の構図(中心1+4放射軸)・4軸定義(色の広がり・転がり/濃度/カーブ/RGB)・成功基準(4軸が一目で違って見える/監督の言葉と操作がつながる)・後載せラベル6件・既存素材 (HP slides 7/10/8/3) を prompt 内に明示。Drive ピッチスライドは中身確認の結果 Look Decomposition 図ではなかったので checked_but_not_used に明記。",
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — illustrate Look Decomposition 4-axis map as defined in the source spec (Notion: figure spec for 'grading-look-decomposition').",
      "FOUR axes radiate from a central luminous core. Each axis represents a distinct, ORTHOGONAL property of a colorist's look:",
      "axis 1 = color spread / hue rotation (saturation + hue ring fragment), axis 2 = density (per-color luminance bands), axis 3 = tonal curve (S-curve ridge over grayscale), axis 4 = RGB color balance (three faint parallel beams shifting a gray plane).",
      "These labels (作品のルック / 色の広がり・転がり / 濃度 / カーブ / RGBカラーバランス / 監督の言葉がノードに落ちる) will be overlaid later in HTML/CSS, so do NOT draw any text inside the image.",
      "Inherit the visual tone of the existing reference slides 'public/slides/7カラーグレーディングのフレームワーク.png' and 'public/slides/10カラーグレーディングのフレームワーク - まとめ.png' — calm framework feel with one center and surrounding axes — and reframe as a single horizontal banner.",
      "Compose a single horizontal banner depicting an abstract Look Decomposition map: one central luminous core surrounded by FOUR clearly separated radial axes.",
      "CENTER — a soft glowing orb at the visual center of the frame, suggesting a cinematic film frame distilled to its essence:",
      "warm-cool subtle aurora gradient inside the orb (deep teal shadow, gentle peach highlight),",
      "as if the entire mood of a movie were condensed into one luminous nucleus. The orb is abstract — no eyes, no faces, no scenery.",
      "FOUR RADIAL AXES — extending outward from the central orb toward the four cardinal-ish directions",
      "(upper-left, upper-right, lower-left, lower-right), each axis reads as a visually distinct treatment of color:",
      "AXIS 1 (color spread / hue rotation) — a gentle circular hue gradient, like a soft chromatic ring fragment, hinting at hue rotation and saturation.",
      "AXIS 2 (density) — vertical layered bands of varying luminance per color, suggesting how each color's brightness can be pushed independently.",
      "AXIS 3 (curve) — a smooth tonal S-curve drawn as a faint luminous line crossing a soft grayscale gradient, hinting at toe and shoulder.",
      "AXIS 4 (RGB color balance) — three faint parallel beams (warm red, neutral green, cool blue) gently shifting an underlying gray plane.",
      "The four axes are connected to the center via soft luminous filaments, but never cross each other — they read as ORTHOGONAL.",
      "Composition feels cinematic, calm, and structural; suggestive of a colorist's mental map, not a technical diagram.",
      "Strong empty negative space between axes so HTML labels can be overlaid later.",
      COMMON_NEGATIVE,
    ].join(" "),
  },

  "filmlook-physics-flow": {
    sourceSpecNotionUrl: "https://www.notion.so/3a1ad1f58cab4b709c684725089bbf1e",
    targetArticleNotionUrl: "https://www.notion.so/7202c1ee64c04c97a4821b8e4f2e0f67",
    sourceSpecSummary:
      "図解仕様書「フィルムルックを作る物理の流れ」。左→右に8段の物理パイプライン: デジタル信号 / 露光 / 3層の染料 / 分光密度曲線 / S字カーブ / プリンターライト / グレイン / 最終ルック。文字なし、HTML/CSS で後載せ。仕様書記載の Tetra_Reverse 内 signal_flow 系 md は現在ローカルに存在しない (ANALYSIS.md のみ) ので checked_but_not_used に明記。FilmLookEmulator の SVD/PCA プロット群 (wu8_*, phaseE/wu1_plots/*) を曲線・染料層の根拠に。",
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
          reason: "仕様書記載 path だが現在ローカルに不在 (Tetra_Reverse には ANALYSIS.md のみ)。8段構成の章割は仕様書本体から直接取った。",
        },
        {
          path: "../Tetra_Reverse/02a_modified_daniele_curve.md",
          reason: "同上、不在。S字カーブの構図は FilmLookEmulator の wu8_weight_functions.png から取った。",
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
    generationRationale:
      "仕様書の8段構成(信号→露光→染料層→分光密度→S字→プリンタライト→グレイン→最終ルック)・成功基準(物理の流れだと伝わる/全体構造を掴める/染料・曲線・光・粒が視覚的に分かる)・後載せラベル9件 を prompt 内に明示。仕様書記載の Tetra_Reverse 内 signal_flow 系 md は現在ローカル不在なので checked_but_not_used に正直に記録し、章割は仕様書本体・曲線形状は FilmLookEmulator wu8 plot 群から取った。",
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "DESIGN INTENT — illustrate the 8-stage physical pipeline that produces a film look, as defined in the source spec (Notion: figure spec for 'filmlook-physics-flow').",
      "The eight stages run left-to-right: digital signal → exposure → three dye layers → spectral density curves → S-curve → printer light → grain → final cinematic frame.",
      "These stage labels (デジタル信号 / 露光 / 3層の染料 / 分光密度曲線 / S字カーブ / プリンターライト / グレイン / 最終ルック / フィルムルックは物理で読める) will be overlaid later in HTML/CSS, so do NOT draw any text inside the image.",
      "Visual reference for dye-layer basis and S-curve shape comes from FilmLookEmulator project analysis plots (wu8_basis_vectors / wu8_weight_functions / phaseE/wu1_plots/svd_spectrum_*). Do NOT copy axis labels from those plots — only inherit the curve shapes and 3-layer separation feel.",
      "Compose a single horizontal banner depicting a left-to-right physical chain that turns a digital signal into a final film look.",
      "Read like a cinematic film-lab cross-section: light enters from the left, passes through layered emulsion, density curves, an S-shaped tone response, RGB printer light, and grain, before resolving into a luminous final frame on the right.",
      "STAGE 1 (left edge) — a thin vertical column of clean digital scene-linear light: faint cool blue rays, very neutral, slightly grid-like as if sampled.",
      "STAGE 2 — exposure: that light fans outward and softens into warm volumetric beams hitting an emulsion plane.",
      "STAGE 3 — three translucent dye layers stacked in depth (cyan, magenta, yellow), each layer showing its own subtle absorption color, slightly offset to suggest interlayer scattering (DIR coupler / inter-image effects).",
      "STAGE 4 — spectral density curves: faint luminous wavelength curves crossing the dye stack, drawn as gentle wave-like ridges (no axis labels), shape inherited from FilmLookEmulator wu8_basis_vectors.",
      "STAGE 5 — S-curve: a smooth global S-shaped luminance ridge reshapes the signal, with a soft toe in the shadows and a gentle shoulder in the highlights, rolling off rather than clipping. Shape inherited from FilmLookEmulator wu8_weight_functions.",
      "STAGE 6 — printer light: three faint colored beams (warm red, neutral green, cool blue) recombine the signal as if shining through a printer head.",
      "STAGE 7 — grain: a delicate, NON-uniform film-grain texture drifts across midtones — sparser in highlights, slightly denser in shadows, never lying flat over skin-equivalent midtones.",
      "STAGE 8 (right edge) — final cinematic frame: a soft warm-cool aurora orb that reads as the resolved film look.",
      "Connect the eight stages with a quiet luminous flow line running left to right, so the whole banner reads as a single physical pipeline.",
      "Strong empty negative space below the flow so HTML stage labels can be overlaid cleanly afterward.",
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
