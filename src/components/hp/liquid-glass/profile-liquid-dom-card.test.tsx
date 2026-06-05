// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ProfileLiquidDomCard } from "@/components/hp/liquid-glass/profile-liquid-dom-card"

const root = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("ProfileLiquidDomCard", () => {
  it("renders the clean profile fallback and mounts no liquid-dom canvas by default", () => {
    const { container } = render(
      <ProfileLiquidDomCard
        className="glass-card glass-card--hp-profile hp-shadow-sync-surface hp-shadow-sync-surface--profile p-8 md:p-10 xl:p-12"
        shadowLayer={<div data-testid="profile-shadow-layer" />}
      >
        <p>Profile foreground</p>
      </ProfileLiquidDomCard>,
    )

    expect(container.querySelector("canvas")).not.toBeInTheDocument()
    expect(container.querySelector("[data-hp-liquid-dom-profile-card='true']")).not.toBeInTheDocument()
    expect(container.querySelector("[data-hp-profile-card-fallback='clean-shadow']")).toBeInTheDocument()
    expect(screen.getByTestId("profile-shadow-layer")).toBeInTheDocument()
    expect(screen.getByText("Profile foreground")).toBeInTheDocument()
  })

  it("integrates the U-1 proof into the profile card instead of rendering a separate proof panel", () => {
    const page = readProjectFile("src/app/page.tsx")
    const profileCard = readProjectFile(
      "src/components/hp/liquid-glass/profile-liquid-dom-card.tsx",
    )
    const css = readProjectFile("src/app/globals.css")

    expect(page).toContain("<ProfileLiquidDomCard")
    expect(page).not.toContain("ProfileLiquidDomProof")
    expect(page).not.toContain("data-hp-liquid-dom-proof")
    expect(profileCard).toContain("supportsLiquidDomProfileCard")
    expect(profileCard).toContain("frameloop=\"demand\"")
    expect(profileCard).toContain("document.visibilityState === \"visible\"")
    expect(profileCard).toContain("IntersectionObserver")
    expect(profileCard).toContain("GlassContainer {...PROFILE_GLASS_OPTICS}")
    expect(profileCard).toContain("Glass {...PROFILE_GLASS_SHAPE}")
    expect(profileCard).toContain("Html sizing=\"fill\" zIndex={1}")
    expect(profileCard).toContain("displacementFactor: 0.18")
    expect(profileCard).toContain("thickness: 42")
    expect(profileCard).toContain("ior: 1.16")
    expect(profileCard).toContain("dispersion: 0.012")
    expect(css).toContain(".hp-liquid-dom-profile-backdrop")
    expect(css).toContain(".hp-liquid-dom-profile-html.glass-card--hp-profile")
  })
})
