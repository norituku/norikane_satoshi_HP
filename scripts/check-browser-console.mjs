import { chromium } from "playwright"

const [, , targetUrl, waitSecondsArg = "5", clickSelector] = process.argv

if (!targetUrl) {
  console.error("Usage: pnpm check:console <url> [waitSeconds] [postNavigateClickSelector]")
  process.exit(2)
}

const waitSeconds = Number(waitSecondsArg)
if (!Number.isFinite(waitSeconds) || waitSeconds < 0) {
  console.error("waitSeconds must be a non-negative number")
  process.exit(2)
}

const consoleMessages = []
const pageErrors = []
const requestFailures = []
const browser = await chromium.launch({ headless: true })

try {
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on("console", (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    })
  })

  page.on("pageerror", (error) => {
    pageErrors.push({
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    })
  })

  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failureText: request.failure()?.errorText ?? null,
    })
  })

  const url = new URL(targetUrl)
  await page.goto(`${url.origin}/api/dev/auth-bypass`, { waitUntil: "networkidle" })
  await page.goto(targetUrl, { waitUntil: "networkidle" })

  if (clickSelector) {
    await page.locator(clickSelector).click()
  }

  await page.waitForTimeout(waitSeconds * 1000)

  const result = { consoleMessages, pageErrors, requestFailures }
  console.log(JSON.stringify(result, null, 2))

  const consoleErrorCount = consoleMessages.filter((message) => message.type === "error").length
  if (consoleErrorCount > 0 || pageErrors.length > 0 || requestFailures.length > 0) {
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
