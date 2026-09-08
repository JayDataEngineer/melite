
// flows-sidebar.spec.ts - THE FLOWS TAB AT THE BROWSER LAYER
// (2026-08-25). Pins, against the LIVE stack, what the DSH right sidebar's
// FOURTH tab iframes (?meliteAssets=flows - the exact URL melite-card-deck's
// Melite Flows tab mounts):
//
//   1. SIDEBAR SURFACE - [data-assets-embed="flows"] mounts with the
//      REAL FlowsSection rows served by GET /v1/flows/yaml/list.
//   2. PANE SEARCH - the pane's OWN "Search flows…" input filters the
//      rows (the rail's shared query does not exist here).
//   3. DRAG CONTRACT - a real row's dragstart writes
//      application/tech-noir-flow {name, filename} - the payload
//      FlowCanvas / InlineFlowCards parse into loadFlowSpec.
//      This is the gesture that crosses the DSH iframe boundary; clicks
//      stay in-frame.
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { test as base, expect, chromium } from "@playwright/test"

// FRESH BROWSER PER TEST: the shared-browser network service
// intermittently wedges successive page loads here; a virgin browser per
// test keeps the contract deterministic.
const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM ??
  path.join(homedir(), ".cache/ms-playwright/chromium-1234/chrome-linux64/chrome")
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173"

const test = base.extend({
  page: async ({}, use) => {
    const browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    const context = await browser.newContext({ baseURL: BASE_URL })
    const page = await context.newPage()
    await use(page)
    await browser.close()
  },
})

test.describe("Flows lane - sidebar surface", () => {
  test("?meliteAssets=flows mounts the templates pane with live spec rows", async ({ page }) => {
    await page.goto("/editor/?meliteAssets=flows", { waitUntil: "domcontentloaded" })
    const embed = page.locator('[data-assets-embed="flows"]')
    await expect(embed).toBeVisible()

    // Rows come from the LIVE gateway chain list - at least one spec exists
    // on any provisioned machine (melite-core ships flow YAMLs).
    await embed.locator("[data-flow-row]").first().waitFor({ state: "attached", timeout: 30_000 })
    const rows = embed.locator("[data-flow-row]")
    expect(await rows.count()).toBeGreaterThan(0)

    // The pane's own search is mounted and labeled for THIS pane.
    await expect(embed.getByPlaceholder("Search flows…")).toBeVisible()
  })

  test("the pane search filters spec rows by name substring", async ({ page }) => {
    await page.goto("/editor/?meliteAssets=flows", { waitUntil: "domcontentloaded" })
    const embed = page.locator('[data-assets-embed="flows"]')
    await embed.locator("[data-flow-row]").first().waitFor({ state: "attached", timeout: 30_000 })

    const before = await embed.locator("[data-flow-row]").count()
    // A garbage query must empty the list, not no-op it.
    await embed.getByPlaceholder("Search flows…").fill("zzz-no-probe-match")
    await expect(embed.locator("[data-flow-row]")).toHaveCount(0, { timeout: 10_000 })

    // Clearing restores the full list.
    await embed.getByPlaceholder("Search flows…").fill("")
    await expect(embed.locator("[data-flow-row]")).toHaveCount(before, { timeout: 10_000 })
  })

  test("a row dragstart writes application/tech-noir-flow {name, filename}", async ({ page }) => {
    await page.goto("/editor/?meliteAssets=flows", { waitUntil: "domcontentloaded" })
    const embed = page.locator('[data-assets-embed="flows"]')
    const rows = embed.locator("[data-flow-row]")
    await rows.first().waitFor({ state: "attached", timeout: 30_000 })

    // Dispatch through the REAL DOM so the editor's own React handler
    // writes the store; read AFTER the bubble settles (React delegates).
    const payload = await rows.first().evaluate(
      (el) =>
        new Promise<{ mime: string; data: string } | null>((resolve) => {
          const dt = new DataTransfer()
          el.addEventListener(
            "dragstart",
            () => {
              setTimeout(() => {
                if (dt.types.length === 0) resolve(null)
                else resolve({ mime: dt.types[0], data: dt.getData(dt.types[0]) })
              }, 50)
            },
            { once: true },
          )
          el.dispatchEvent(
            new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }),
          )
          setTimeout(() => resolve(null), 3000)
        }),
    )
    expect(payload).not.toBeNull()
    expect(payload!.mime).toBe("application/tech-noir-flow")
    const parsed = JSON.parse(payload!.data) as { name: string; filename: string }
    expect(typeof parsed.name).toBe("string")
    expect(parsed.name.length).toBeGreaterThan(0)
    expect(typeof parsed.filename).toBe("string")
    expect(parsed.filename.length).toBeGreaterThan(0)
  })
})
