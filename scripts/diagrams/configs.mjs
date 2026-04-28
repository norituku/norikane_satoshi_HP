/**
 * Notion 本文の [[diagram:<slug>]] marker から呼び出す図解の生成設定。
 *
 * 画像生成は文字を一切描かせず背景・構造・雰囲気のみ生成し、
 * ラベル等は HP 側の HTML/CSS で重ねる。grading / filmlook を
 * 横展開する場合は DIAGRAM_GEN_CONFIGS に slug を追加するだけ。
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
    referenceAssets: [
      "public/slides/11分解と整理によるアプローチ.png",
      "public/slides/5複合操作の影響と復元性.png",
      "public/demo/+2STOP.jpg",
      "public/demo/+1STOP.jpg",
      "public/demo/チャートノーマル.jpg",
      "public/demo/-1STOP.jpg",
      "public/demo/-2STOP.jpg",
    ],
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "Compose a single horizontal banner split into two halves with a soft luminous transition in the middle (no hard line).",
      "LEFT HALF — represents an entangled, chaotic state of correction factors before decomposition:",
      "a dense knot of intertwined translucent threads in muted blue, magenta, peach and teal,",
      "drifting and overlapping like tangled silk, suggesting many independent variables fused into one mass",
      "(camera differences, exposure drift, color temperature, skin tone, atmospheric haze, scene tone, overall film look).",
      "Soft volumetric light passes through the knot, creating a sense of unresolved layering. No symbols, no glyphs.",
      "RIGHT HALF — represents the same factors after being decomposed into five horizontal granularity layers,",
      "stacked from top to bottom with generous breathing space:",
      "thin clean horizontal bands separated by faint glowing dividers, each band a slightly different muted hue,",
      "the topmost band brightest, descending bands progressively cooler and more grounded.",
      "The bands feel orderly, calm and structural — clearly five distinct strata, but abstract (no text, no numbers).",
      "MIDDLE — a delicate luminous funnel / lens effect channels the tangled threads from the left into the five clean bands on the right,",
      "implying that chaos is being factored into layered structure.",
      COMMON_NEGATIVE,
    ].join(" "),
  },
  "grading-look-decomposition": {
    referenceAssets: [
      "public/slides/7カラーグレーディングのフレームワーク.png",
      "public/slides/10カラーグレーディングのフレームワーク - まとめ.png",
      "public/slides/8フレームワーク関連コントロール.png",
      "public/slides/3カラーグレーディングの基本概念.png",
    ],
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
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
    referenceAssets: [
      "../Tetra_Reverse/ANALYSIS.md",
      "../FilmLookEmulator_project/analysis/stage2/wu8_basis_vectors.png",
      "../FilmLookEmulator_project/analysis/stage2/wu8_weight_functions.png",
      "../FilmLookEmulator_project/analysis/stage2/wu8_variance_explained.png",
      "../FilmLookEmulator_project/analysis/stage2/wu8_mean_residual.png",
      "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/svd_spectrum_iems1.png",
      "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/svd_spectrum_rochp.png",
      "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/separability.png",
      "../FilmLookEmulator_project/analysis/phaseE/wu1_plots/pareto_front.png",
    ],
    size: "1536x1024",
    quality: "high",
    output_format: "webp",
    prompt: [
      COMMON_STYLE,
      "Compose a single horizontal banner depicting a left-to-right physical chain that turns a digital signal into a final film look.",
      "Read like a cinematic film-lab cross-section: light enters from the left, passes through layered emulsion, density curves, an S-shaped tone response, RGB printer light, and grain, before resolving into a luminous final frame on the right.",
      "STAGE 1 (left edge) — a thin vertical column of clean digital scene-linear light: faint cool blue rays, very neutral, slightly grid-like as if sampled.",
      "STAGE 2 — exposure: that light fans outward and softens into warm volumetric beams hitting an emulsion plane.",
      "STAGE 3 — three translucent dye layers stacked in depth (cyan, magenta, yellow), each layer showing its own subtle absorption color, slightly offset to suggest interlayer scattering.",
      "STAGE 4 — spectral density curves: faint luminous wavelength curves crossing the dye stack, drawn as gentle wave-like ridges (no axis labels).",
      "STAGE 5 — S-curve: a smooth global S-shaped luminance ridge reshapes the signal, with a soft toe in the shadows and a gentle shoulder in the highlights, rolling off rather than clipping.",
      "STAGE 6 — printer light: three faint colored beams (warm red, neutral green, cool blue) recombine the signal as if shining through a printer head.",
      "STAGE 7 — grain: a delicate, NON-uniform film-grain texture drifts across midtones — sparser in highlights, slightly denser in shadows, never lying flat over skin-equivalent midtones.",
      "STAGE 8 (right edge) — final cinematic frame: a soft warm-cool aurora orb that reads as the resolved film look.",
      "Connect the eight stages with a quiet luminous flow line running left to right, so the whole banner reads as a single physical pipeline.",
      "Background remains dark and uniform so HTML labels for each stage can be overlaid cleanly afterward.",
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
