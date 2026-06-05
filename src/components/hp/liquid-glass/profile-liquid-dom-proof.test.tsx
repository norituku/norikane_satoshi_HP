// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ProfileLiquidDomProof } from "@/components/hp/liquid-glass/profile-liquid-dom-proof"

describe("ProfileLiquidDomProof", () => {
  it("mounts no liquid-dom canvas in the default unsupported browser path", () => {
    const { container } = render(<ProfileLiquidDomProof />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId("hp-liquid-dom-proof")).not.toBeInTheDocument()
  })

  it("keeps the clean profile fallback in page.tsx and only adds the gated proof", () => {
    const page = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8")
    const profileClass = page.match(
      /className="([^"]*glass-card--hp-profile[^"]*)"/,
    )?.[1]

    expect(profileClass).toBeDefined()
    expect(profileClass).not.toContain("glass-distortion-surface")
    expect(page).toContain("<ProfileLiquidDomProof />")
    expect(page).toContain("glass-distortion-foreground hp-shadow-sync-foreground")
  })
})
