import { expect, test, type Page } from "@playwright/test"

const assistantName = "AI 相談窓口"

async function clearWidgetState(page: Page) {
  await page.addInitScript(() => window.localStorage.clear())
}

async function expectChatbotOpen(page: Page) {
  await expect(page.getByRole("complementary", { name: assistantName })).toBeVisible()
  await expect(page.getByLabel("相談内容")).toBeVisible()
}

test.describe("root chatbot entry", () => {
  test("shows the chatbot widget on the root page after the scroll trigger", async ({ page }) => {
    await clearWidgetState(page)

    const response = await page.goto("/")
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("complementary", { name: assistantName })).toHaveCount(0)

    await page.evaluate(() => window.scrollTo(0, Math.ceil(window.innerHeight * 0.3)))

    await expectChatbotOpen(page)
    await expect(page.getByText("のりかね映像設計室のご相談窓口")).toBeVisible()
  })

  test("opens the chatbot from the legacy contact hash", async ({ page }) => {
    await clearWidgetState(page)

    const response = await page.goto("/#contact")
    expect(response?.status()).toBe(200)

    await expectChatbotOpen(page)
  })

  test("opens the chatbot from the header contact action", async ({ page }) => {
    await clearWidgetState(page)

    const response = await page.goto("/")
    expect(response?.status()).toBe(200)
    await page.getByRole("button", { name: "お問い合わせ" }).click()

    await expectChatbotOpen(page)
  })
})
