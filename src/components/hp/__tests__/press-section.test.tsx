// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { PRESS_CATEGORIES, PressSection } from "@/components/hp/press-section"

describe("PressSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the three SSOT categories and nine press items", () => {
    render(<PressSection />)

    expect(screen.getByRole("heading", { name: "登壇・メディア掲載 / 実績" })).toBeInTheDocument()
    expect(PRESS_CATEGORIES.map((category) => category.title)).toEqual([
      "登壇・セミナー",
      "メディア掲載・事例紹介",
      "紹介動画制作",
    ])
    expect(PRESS_CATEGORIES.flatMap((category) => category.items)).toHaveLength(9)

    for (const category of PRESS_CATEGORIES) {
      expect(screen.getByRole("heading", { name: category.title })).toBeInTheDocument()
      for (const item of category.items) {
        expect(screen.getAllByText(item.period).length).toBeGreaterThan(0)
        expect(screen.getByRole("heading", { name: item.title })).toBeInTheDocument()
        expect(screen.getByText(item.description)).toBeInTheDocument()
      }
    }
  })

  it("keeps the Jukkakukan media item as one item with the two specified links", () => {
    const mediaItems =
      PRESS_CATEGORIES.find((category) => category.title === "メディア掲載・事例紹介")?.items ?? []
    const jukkakukan = mediaItems.find((item) => item.title.includes("十角館の殺人"))

    expect(jukkakukan).toEqual(
      expect.objectContaining({
        period: "2024年",
        links: [
          {
            label: "VIDEO SALON 記事",
            href: "https://videosalon.jp/report/jukkakukannosatsujin/",
          },
          {
            label: "Imagica EMS 事例紹介",
            href: "https://www.imagica-ems.co.jp/case-study/jukkakukannosatsujin_20240515/",
          },
        ],
      }),
    )
  })

  it("opens every external link in a new isolated tab", () => {
    render(<PressSection />)

    const expectedLinks = PRESS_CATEGORIES.flatMap((category) =>
      category.items.flatMap((item) =>
        item.links.map((link) => ({
          ...link,
          itemTitle: item.title,
        })),
      ),
    )

    for (const link of expectedLinks) {
      const anchor = screen.getByRole("link", {
        name: `${link.itemTitle} ${link.label}を新しいタブで開く`,
      })

      expect(anchor).toHaveAttribute("href", link.href)
      expect(anchor).toHaveAttribute("target", "_blank")
      expect(anchor).toHaveAttribute("rel", "noopener noreferrer")
    }
  })
})
