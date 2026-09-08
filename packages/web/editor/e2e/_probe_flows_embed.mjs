// _probe_flows_embed.mjs — live proof for the Melite Flows right-sidebar
// tab (2026-08-25). Drives the REAL overlay host :3088:
//   1. /editor/?meliteAssets=flows renders [data-assets-embed="flows"]
//      with the REAL FlowsSection rows from the LIVE gateway (:33081).
//   2. The pane's OWN search ("Search flows…") filters rows.
//   3. A row dragstart writes application/tech-noir-flow {name, filename}.
import { chromium } from "@playwright/test"

const BASE = process.env.PROBE_BASE ?? "http://127.0.0.1:3088"
const out = {}

const browser = await chromium.launch({
  executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
})
try {
  const page = await browser.newPage()
  await page.goto(BASE + "/editor/?meliteAssets=flows", { waitUntil: "domcontentloaded" })

  const embed = page.locator('[data-assets-embed="flows"]')
  await embed.waitFor({ state: "attached", timeout: 30000 })
  out.embedMounted = true

  // Rows come from GET /v1/flows/yaml/list on the live gateway.
  await page.locator("[data-flow-row]").first().waitFor({ state: "attached", timeout: 20000 })
  out.flowRows = await page.locator("[data-flow-row]").count()
  out.rowNames = await page.locator("[data-flow-row] span.font-mono").allTextContents()

  // The pane's own search filters the rows (type a garbage query → all gone).
  await page.getByPlaceholder("Search flows…").fill("zzzz-no-probe-match")
  await page.waitForFunction(
    () => document.querySelectorAll("[data-flow-row]").length === 0,
    null,
    { timeout: 10000 },
  ).then(() => { out.searchFilters = true })
    .catch(() => { out.searchFilters = false })
  await page.getByPlaceholder("Search flows…").fill("")

  // Real dragstart on a real row: the editor's own handler writes the MIME.
  const row = page.locator("[data-flow-row]").first()
  await row.waitFor({ state: "attached" })
  out.dragPayload = await row.evaluate((el) => {
    return new Promise((resolve) => {
      const dt = new DataTransfer()
      el.addEventListener("dragstart", () => {
        // React's delegated root handler runs AFTER this element-level
        // listener — read the store once the bubble fully settled.
        setTimeout(() => {
          resolve({
            mime: dt.types[0],
            data: dt.getData(dt.types[0]),
          })
        }, 50)
      }, { once: true })
      el.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }))
      setTimeout(() => resolve(null), 2000)
    })
  })

  console.log("PROBE " + JSON.stringify(out, null, 2))
} finally {
  await browser.close()
}
