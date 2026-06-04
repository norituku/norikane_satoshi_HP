// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const pageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8")
const calendarEmbedSource = readFileSync(
  join(process.cwd(), "src/components/hp/calendar-embed.tsx"),
  "utf8",
)
const homeScheduleSource = readFileSync(
  join(process.cwd(), "src/components/hp/home-schedule-section.tsx"),
  "utf8",
)
const profilePhotoSource = readFileSync(
  join(process.cwd(), "src/components/hp/profile-photo.tsx"),
  "utf8",
)
const featuredWorksSource = readFileSync(
  join(process.cwd(), "src/components/hp/featured-works.tsx"),
  "utf8",
)
const globalsCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")

function cssRule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = globalsCss.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))
  expect(match, `${selector} should be defined`).not.toBeNull()
  return match?.[1] ?? ""
}

function expectNeutralSurface(rule: string) {
  const tintedSurfaceValues = [
    "rgba(117, 104, 214",
    "rgba(54, 111, 204",
    "rgba(54, 44, 108",
    "rgba(33, 53, 98",
    "rgba(28, 15, 110",
  ]

  for (const value of tintedSurfaceValues) {
    expect(rule).not.toContain(value)
  }
}

describe("HP targeted glass contracts", () => {
  it("targets notes profile and schedule glass without broadening Featured Works", () => {
    expect(pageSource).toContain(
      "glass-card-sm glass-card-sm--hp-note hp-shadow-sync-surface hp-shadow-sync-surface--note glass-refraction-edge glass-distortion-surface",
    )
    expect(pageSource).toContain(
      "glass-card glass-card--showcase glass-card--hp-profile hp-shadow-sync-surface hp-shadow-sync-surface--profile glass-distortion-surface",
    )
    expect(homeScheduleSource).toContain(
      "glass-card glass-card--hp-schedule hp-shadow-sync-surface hp-shadow-sync-surface--schedule",
    )
    expect(calendarEmbedSource).toContain("glass-inset glass-inset--hp-schedule")

    expect(cssRule(".glass-card-sm--hp-note")).toContain("saturate(1.42)")
    expect(cssRule(".glass-card--hp-profile")).toContain("blur(34px)")
    expect(cssRule(".glass-card--hp-schedule")).toContain("blur(30px)")
    expect(cssRule(".glass-inset--hp-schedule")).toContain("inset")
    expect(cssRule(".featured-work-transparent-card")).toContain(
      "backdrop-filter: none",
    )
  })

  it("removes card-shaped refracted shadows and their independent motion", () => {
    expect(pageSource).not.toContain("hp-refracted-shadow-card")
    expect(homeScheduleSource).not.toContain("hp-refracted-shadow-card")
    expect(profilePhotoSource).not.toContain("hp-refracted-shadow-card")
    expect(featuredWorksSource).not.toContain("hp-refracted-shadow-card")
    expect(globalsCss).not.toContain(".hp-refracted-shadow-card")
    expect(globalsCss).not.toContain("hp-refracted-shadow-card__shadow")
    expect(globalsCss).not.toContain("@keyframes hp-refracted-shadow-breathe")
    expect(globalsCss).not.toContain("hp-refracted-shadow-breathe")

    expect(pageSource).not.toContain('aria-hidden="true" className="hp-refracted-shadow')
    expect(homeScheduleSource).not.toContain('aria-hidden="true" className="hp-refracted-shadow')
  })

  it("binds positive-y shadows to actual section elements below the glass foreground", () => {
    const rootRule = cssRule(":root")
    expect(rootRule).toContain("--hp-element-shadow-x")
    expect(rootRule).toContain("--hp-element-shadow-y")
    expect(rootRule).toContain("--hp-element-shadow-blur")
    expect(rootRule).toContain("--hp-element-shadow-color")
    expect(rootRule).toContain("--hp-featured-shadow-y")
    expect(rootRule).not.toMatch(/--hp-(?:element|featured)-shadow-[a-z-]*y:\s*-/)

    expect(cssRule(".hp-shadow-sync-surface")).toContain("isolation: isolate")
    expect(cssRule(".hp-shadow-sync-surface")).toContain("overflow: visible")
    expect(cssRule(".hp-shadow-sync-foreground")).toContain("z-index: 1")

    const elementRule = cssRule(".hp-shadow-sync-element")
    expect(elementRule).toContain(
      "drop-shadow(var(--hp-element-shadow-x) var(--hp-element-shadow-y) var(--hp-element-shadow-blur) var(--hp-element-shadow-color))",
    )
    expect(cssRule(".hp-shadow-sync-text")).toContain(
      "text-shadow: var(--hp-element-shadow-x) var(--hp-element-text-shadow-y) var(--hp-element-text-shadow-blur) var(--hp-element-shadow-color)",
    )
    expect(cssRule(".hp-shadow-sync-surface--note")).toContain("--hp-element-shadow-y: 8px")
    expect(cssRule(".hp-shadow-sync-surface--profile")).toContain("--hp-element-shadow-y: 10px")
    expect(cssRule(".hp-shadow-sync-surface--schedule")).toContain("--hp-element-shadow-y: 10px")
  })

  it("attaches shadows to profile notes schedule and Featured Works elements", () => {
    expect(profilePhotoSource).toContain("hp-shadow-sync-element hp-profile-photo-shadow")
    expect(pageSource).toContain("hp-shadow-sync-text hp-profile-text-shadow")
    expect(pageSource).toContain("glass-badge glass-badge--profile-tool hp-shadow-sync-element")
    expect(pageSource).toContain("glass-btn glass-btn--profile-social hp-shadow-sync-element")

    expect(pageSource).toContain("hp-shadow-sync-text hp-note-text-shadow")
    expect(pageSource).toContain("hp-shadow-sync-element hp-note-icon-shadow")
    expect(homeScheduleSource).toContain("hp-shadow-sync-text hp-schedule-text-shadow")
    expect(homeScheduleSource).toContain("hp-shadow-sync-element hp-schedule-widget-shadow")

    expect(featuredWorksSource).toContain("hp-featured-shadow-media")
    expect(featuredWorksSource).toContain("hp-featured-shadow-text")
    expect(cssRule(".hp-featured-shadow-media")).toContain(
      "drop-shadow(var(--hp-featured-shadow-x) var(--hp-featured-shadow-y) var(--hp-featured-shadow-blur) var(--hp-featured-shadow-color))",
    )
    expect(cssRule(".hp-featured-shadow-text")).toContain("text-shadow:")
    expect(cssRule(".featured-work-transparent-card")).toContain("backdrop-filter: none")
  })

  it("keeps the liquid distortion stronger without adding another blur layer", () => {
    const liquidSurface = cssRule(
      ".hp-liquid-glass-enabled .glass-distortion-surface::before",
    )

    expect(liquidSurface).toContain(
      'backdrop-filter: url("#hp-liquid-glass-distortion") blur(20px) saturate(1.22)',
    )
    expect(liquidSurface).toContain("opacity: 0.95")
    expect(cssRule(".hp-liquid-glass-enabled .glass-distortion-surface--subtle::before")).toContain(
      "opacity: 0.60",
    )
  })

  it("makes profile tool and social badges strong transparent glass buttons", () => {
    expect(pageSource).toContain("glass-badge glass-badge--profile-tool")
    expect(pageSource).toContain("glass-btn glass-btn--profile-social")

    const toolBadge = cssRule(".glass-badge--profile-tool")
    const socialButton = cssRule(".glass-btn--profile-social")
    expect(toolBadge).toContain("rgba(255, 255, 255, 0.58)")
    expect(toolBadge).toContain("inset")
    expect(toolBadge).not.toContain("background: var(--accent-primary)")
    expect(socialButton).toContain("rgba(255, 255, 255, 0.52)")
    expect(socialButton).toContain("inset")
    expect(socialButton).not.toContain("background: var(--accent-primary)")
  })

  it("keeps glass surface fill border and shadow neutral while preserving transparency blur edge and inset depth", () => {
    expect(globalsCss).toContain("--glass-bg: rgba(255, 255, 255, 0.")
    expect(globalsCss).toContain("--glass-border: rgba(255, 255, 255,")
    expectNeutralSurface(cssRule(":root"))

    const surfaceSelectors = [
      ".glass-card",
      ".glass-card--showcase",
      ".glass-card--hp-profile",
      ".glass-card--hp-schedule",
      ".glass-card-sm",
      ".glass-card-sm--hp-note",
      ".glass-refraction-edge",
      ".glass-distortion-surface::before",
      ".hp-shadow-sync-surface",
      ".hp-shadow-sync-element",
      ".glass-badge",
      ".glass-badge--profile-tool",
      ".glass-btn--profile-social",
      ".glass-inset--hp-schedule",
    ]

    for (const selector of surfaceSelectors) {
      expectNeutralSurface(cssRule(selector))
    }

    expect(cssRule(".glass-card")).toContain("backdrop-filter: blur(24px)")
    expect(cssRule(".glass-refraction-edge")).toContain("rgba(255, 255, 255")
    expect(cssRule(".glass-card--hp-profile")).toContain("inset")
    expect(cssRule(".glass-card--hp-schedule")).toContain("inset")
    expect(cssRule(".glass-badge--profile-tool")).toContain("inset")
  })

  it("turns off element shadow motion in reduced-motion mode while keeping static shadows", () => {
    const reducedMotionBlock = globalsCss.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]+?)\n\s*\}\n\}/,
    )

    expect(reducedMotionBlock?.[1]).toContain(".hp-shadow-sync-element")
    expect(reducedMotionBlock?.[1]).toContain(".hp-featured-shadow-media")
    expect(reducedMotionBlock?.[1]).toContain("animation: none")
    expect(reducedMotionBlock?.[1]).toContain("transform: none")
    expect(reducedMotionBlock?.[1]).not.toContain("filter: none")
  })
})
