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
}

export function getDiagramGenConfig(slug) {
  const cfg = DIAGRAM_GEN_CONFIGS[slug]
  if (!cfg) {
    throw new Error(`unknown diagram slug: ${slug}. known: ${Object.keys(DIAGRAM_GEN_CONFIGS).join(", ")}`)
  }
  return cfg
}
