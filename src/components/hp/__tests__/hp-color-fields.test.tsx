// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FeaturedWorks } from "@/components/hp/featured-works"
import { HERO_DEEP_SURFACE_BACKGROUND } from "@/components/hp/hero-deep-surface"
import { HeroSection } from "@/components/hp/hero-section"

const globalsCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")

function readRgbaVariable(name: string) {
  const match = globalsCss.match(
    new RegExp(`${name}:\\s*rgba\\((\\d+),\\s*(\\d+),\\s*(\\d+),\\s*([0-9.]+)\\)`),
  )
  expect(match, `${name} should be an rgba() CSS variable`).not.toBeNull()
  const [, r, g, b, a] = match as RegExpMatchArray
  return {
    alpha: Number(a),
    b: Number(b),
    g: Number(g),
    r: Number(r),
  }
}

function rgbDistance(
  first: { r: number; g: number; b: number },
  second: { r: number; g: number; b: number },
) {
  return Math.hypot(first.r - second.r, first.g - second.g, first.b - second.b)
}

describe("HP three-hue color fields", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("defines distinct aurora slots for pink, red, and blue", () => {
    const pink = readRgbaVariable("--aurora-pink")
    const red = readRgbaVariable("--aurora-red")
    const blue = readRgbaVariable("--aurora-blue")

    expect(globalsCss).not.toContain("--aurora-purple")
    expect(globalsCss).not.toContain("--aurora-sky")
    expect(globalsCss).toContain("var(--aurora-pink)")
    expect(globalsCss).toContain("var(--aurora-red)")
    expect(globalsCss).toContain("var(--aurora-blue)")

    expect(pink.r).toBeGreaterThan(pink.g + 45)
    expect(pink.b).toBeGreaterThan(pink.g + 20)
    expect(red.r).toBeGreaterThan(red.g + 70)
    expect(red.r).toBeGreaterThan(red.b + 45)
    expect(blue.b).toBeGreaterThan(blue.r + 45)
    expect(blue.b).toBeGreaterThan(blue.g + 10)

    expect(rgbDistance(pink, red)).toBeGreaterThan(80)
    expect(rgbDistance(pink, blue)).toBeGreaterThan(80)
    expect(rgbDistance(red, blue)).toBeGreaterThan(120)
    expect(Math.max(pink.alpha, red.alpha, blue.alpha)).toBeLessThanOrEqual(0.24)
  })

  it("keeps the hero deep surface dark while adding faint pink red blue fields", () => {
    expect(HERO_DEEP_SURFACE_BACKGROUND).toContain("rgba(224, 76, 140, 0.08)")
    expect(HERO_DEEP_SURFACE_BACKGROUND).toContain("rgba(188, 60, 74, 0.07)")
    expect(HERO_DEEP_SURFACE_BACKGROUND).toContain("rgba(54, 139, 214, 0.08)")
    expect(HERO_DEEP_SURFACE_BACKGROUND).toContain("#0E0E10")
  })

  it("renders CSS-only abstract art in the hero and Mars card without external images", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        removeEventListener: vi.fn(),
      })),
    })

    const hero = render(<HeroSection />)
    const heroArt = hero.container.querySelector('[data-hp-abstract-art="hero"]')
    expect(heroArt).toBeInTheDocument()
    expect(heroArt?.querySelector("img")).toBeNull()
    expect(heroArt).toHaveAttribute("aria-hidden", "true")
    hero.unmount()

    const works = render(<FeaturedWorks />)
    const marsCard = screen.getByLabelText("火星の女王 作品カード")
    const marsArt = marsCard.querySelector('[data-hp-abstract-art="mars"]')
    expect(marsArt).toBeInTheDocument()
    expect(marsArt?.querySelector("img")).toBeNull()
    expect(marsArt).toHaveAttribute("aria-hidden", "true")
    expect(marsCard.querySelector('[data-featured-work-abstract-cover="true"]')).toHaveAttribute(
      "data-hp-color-field",
      "pink-red-blue",
    )
    works.unmount()
  })
})
