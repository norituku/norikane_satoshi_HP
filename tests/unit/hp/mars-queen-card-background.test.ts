import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("Mars Queen featured work card background", () => {
  it("uses a dedicated pink red blue deep color field for the abstract cover", () => {
    const hero = readProjectFile("src/components/hp/hero-section.tsx")
    const featuredWorks = readProjectFile("src/components/hp/featured-works.tsx")
    const surface = readProjectFile("src/components/hp/hero-deep-surface.ts")

    expect(hero).toContain("HERO_DEEP_SURFACE_BACKGROUND")
    expect(featuredWorks).toContain("MARS_ABSTRACT_COVER_BACKGROUND")
    expect(featuredWorks).toContain("HERO_ABSTRACT_ART_BACKGROUND")
    expect(featuredWorks).toContain('data-hp-abstract-art="mars"')
    expect(surface).toContain("MARS_ABSTRACT_COVER_BACKGROUND")
    expect(surface).toContain("rgba(224, 76, 140")
    expect(surface).toContain("rgba(188, 60, 74")
    expect(surface).toContain("rgba(54, 139, 214")
  })

  it("removes the retired purple abstract cover gradients", () => {
    const featuredWorks = readProjectFile("src/components/hp/featured-works.tsx")
    const abstractCoverBranch =
      featuredWorks.match(/<PreviewFrame abstractCover>[\s\S]*?<\/PreviewFrame>/)?.[0] ??
      featuredWorks

    expect(abstractCoverBranch).not.toContain("#7568D6")
    expect(abstractCoverBranch).not.toContain("#302B55")
    expect(abstractCoverBranch).not.toContain("#D4D0E8")
    expect(abstractCoverBranch).not.toMatch(/bg-\[radial-gradient/i)
  })
})
