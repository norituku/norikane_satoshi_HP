import { expect, test, type Page } from "@playwright/test"

const trainerUrl =
  "https://www.blackmagicdesign.com/jp/products/davinciresolve/training#:~:text=%E3%83%88%E3%83%AC%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0%E5%BD%A2%E5%BC%8F"

async function searchUiMetrics(page: Page) {
  return page.evaluate(() => {
    const trainingType = document.getElementById("TrainingType")
    const countries = document.getElementById("Countries")
    const states = document.getElementById("States")

    const rectFor = (element: HTMLElement | null) => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        inViewport: rect.bottom > 0 && rect.top < window.innerHeight,
      }
    }
    const textRectsFor = (needle: string) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const rects: Array<{ top: number; bottom: number; inViewport: boolean }> = []

      while (walker.nextNode()) {
        const node = walker.currentNode
        if (!node.nodeValue?.includes(needle)) continue

        const range = document.createRange()
        range.selectNodeContents(node)
        for (const rect of range.getClientRects()) {
          if (rect.width === 0 || rect.height === 0) continue
          rects.push({
            top: rect.top,
            bottom: rect.bottom,
            inViewport: rect.bottom > 0 && rect.top < window.innerHeight,
          })
        }
      }

      return rects
    }

    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      trainingType: rectFor(trainingType),
      countries: rectFor(countries),
      states: rectFor(states),
      textRects: {
        trainingType: textRectsFor("トレーニング形式"),
        country: textRectsFor("国"),
        state: textRectsFor("都道府県"),
      },
    }
  })
}

test("DaVinci Resolve trainer link opens the Blackmagic training search UI in view", async ({
  context,
  page,
}) => {
  const response = await page.goto("/")
  expect(response?.status()).toBe(200)

  const link = page.getByRole("link", { name: "DaVinci Resolve 認定トレーナー" })
  await expect(link).toHaveAttribute("href", trainerUrl)

  const popupPromise = context.waitForEvent("page")
  await link.click()
  const popup = await popupPromise
  await popup.waitForLoadState("domcontentloaded")
  await popup.waitForLoadState("networkidle").catch(() => {})
  await popup.waitForTimeout(2500)

  const metrics = await searchUiMetrics(popup)
  expect(metrics.trainingType?.inViewport).toBe(true)
  expect(metrics.countries?.inViewport).toBe(true)
  expect(metrics.states?.inViewport).toBe(true)
  expect(metrics.textRects.trainingType.some((rect) => rect.inViewport && rect.top >= 0)).toBe(true)
  expect(metrics.textRects.country.some((rect) => rect.inViewport && rect.top >= 0)).toBe(true)
  expect(metrics.textRects.state.some((rect) => rect.inViewport && rect.top >= 0)).toBe(true)
})
