import { expect, test, type Page } from "@playwright/test"

const assistantName = "AI 相談窓口"

async function clearWidgetState(page: Page) {
  await page.addInitScript(() => window.localStorage.clear())
}

async function expectChatbotOpen(page: Page) {
  await expect(page.getByRole("complementary", { name: assistantName })).toBeVisible()
  await expect(page.getByLabel("相談内容")).toBeVisible()
}

async function revealMinimizedLauncher(page: Page) {
  await page.evaluate(() => window.scrollTo(0, Math.ceil(window.innerHeight * 0.3)))
  return page.getByRole("button", { name: "AI 相談窓口を開く" })
}

test.describe("root chatbot entry", () => {
  test("shows the chatbot widget on the root page after the scroll trigger", async ({ page }) => {
    await clearWidgetState(page)

    const response = await page.goto("/")
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("complementary", { name: assistantName })).toHaveCount(0)

    const launcher = await revealMinimizedLauncher(page)
    await expect(launcher).toBeVisible()
    await expect(launcher).toHaveAttribute("data-attention", "true")
    await expect
      .poll(async () => await launcher.evaluate((element) => getComputedStyle(element).animationIterationCount))
      .toContain("infinite")

    await launcher.click()
    await expectChatbotOpen(page)
    await expect(page.getByText("のりかね映像設計室のご相談窓口")).toBeVisible()
  })

  test("opens the chatbot from the legacy contact hash", async ({ page }) => {
    await clearWidgetState(page)

    const response = await page.goto("/#contact")
    expect(response?.status()).toBe(200)

    await expectChatbotOpen(page)
  })

  test("submits a chatbot message from the minimized launcher", async ({ page }) => {
    await clearWidgetState(page)
    let postedMessage: string | undefined
    await page.route("**/api/chatbot/message", async (route) => {
      const requestBody = route.request().postDataJSON() as { message?: string }
      postedMessage = requestBody.message
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          conversationId: "root-entry-conversation",
          assistantMessage: {
            role: "assistant",
            content: "最終媒体を教えてください",
            createdAt: new Date("2026-05-28T00:00:00.000Z").toISOString(),
          },
          tier: "tier-4-form-fallback",
          ui: {
            kind: "choice-panel",
            choiceSet: {
              id: "final-medium",
              question: "最終媒体を教えてください",
              choices: [{ id: "web", label: "Web" }],
            },
          },
        }),
      })
    })

    const response = await page.goto("/")
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("button", { name: "お問い合わせ" })).toHaveCount(0)
    const launcher = await revealMinimizedLauncher(page)
    await launcher.click()

    await expectChatbotOpen(page)
    await page.getByLabel("相談内容").fill("Web CM の相談です")
    await page.getByRole("button", { name: "送信" }).click()
    await expect(page.getByRole("region", { name: "最終媒体を教えてください" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Web" })).toBeVisible()
    expect(postedMessage).toBe("Web CM の相談です")
  })
})
