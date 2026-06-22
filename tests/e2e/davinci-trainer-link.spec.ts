import { expect, test, type Page } from "@playwright/test"

const trainerUrl =
  "https://www.blackmagicdesign.com/jp/products/davinciresolve/training#:~:text=%E3%83%88%E3%83%AC%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0%E5%BD%A2%E5%BC%8F"

async function searchUiMetrics(page: Page) {
  return page.evaluate(() => {
    const trainingType = document.getElementById("TrainingType")
    const states = document.getElementById("States")
    const labels = Array.from(document.querySelectorAll("label"))
      .map((label) => {
        const rect = label.getBoundingClientRect()
        return {
          text: label.textContent?.trim() ?? "",
          top: rect.top,
          bottom: rect.bottom,
          visible: rect.width > 0 && rect.height > 0,
        }
      })
      .filter((label) => label.visible)

    const rectFor = (element: HTMLElement | null) => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top,
        bottom: rect.bottom,
        inViewport: rect.bottom > 0 && rect.top < window.innerHeight,
      }
    }

    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      labels,
      trainingType: rectFor(trainingType),
      states: rectFor(states),
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
  expect(metrics.states?.inViewport).toBe(true)
  expect(metrics.labels.some((label) => label.text === "トレーニング形式" && label.top >= 0)).toBe(true)
})
