
// download-popup-real.spec.ts - THE AUTO-DOWNLOAD PROMPT, END TO END
// (2026-08-26; gate:4 lane). Unlike the start-door-intercepted
// dialog-only specs, THIS spec lets the download go through the
// REAL gateway SSE wire:
//
//   card Run -> start door short-circuits download_required (intercepted,
//   exact gateway shape) -> user clicks "Download" IN THE POPUP -> the REAL
//   POST /v1/download-model/stream streams a local Range-capable upstream
//   into the sanctioned model volume -> the runner AUTO-RETRIES the same
//   body -> this time it resolves a COMPLETED run -> dialog closes, card is
//   done. The downloaded bytes are asserted on disk, then cleaned up.
//
// Proves the feature the operator asked for: models auto-download via the
// popup prompt, hands off nothing to the chat model, zero GPU work.
import { test as base, expect, chromium } from "@playwright/test"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer, type Server } from "node:http"
import * as nodeFs from "node:fs"
import * as nodeCrypto from "node:crypto"
import { join } from "node:path"

const rmSync = nodeFs.rmSync
const existsSync = nodeFs.existsSync
const readFileSync = nodeFs.readFileSync
const randomBytes = nodeCrypto.randomBytes

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

// Sanctioned root (validateDestDir hard roots) - the only place the stream
// endpoint will write. Unique per run; cleaned up afterwards.
const DEST_DIR = "/opt/ComfyUI/models/diffusion_models"
const FILE_NAME = "e2e_auto_download.bin"

const FULL = randomBytes(65_536)
let upstream: Server | null = null
let upstreamUrl = ""
let startCalls = 0

async function startUpstream(): Promise<string> {
  const srv = createServer((req, res) => {
    if (req.url !== "/tiny.bin") {
      res.writeHead(404); res.end(); return
    }
    const range = req.headers.range as string | undefined
    if (range !== undefined && range.startsWith("bytes=")) {
      const start = Number(range.slice("bytes=".length).replace(/-.*$/, ""))
      if (Number.isFinite(start) && start > 0 && start < FULL.length) {
        const body = FULL.subarray(start)
        res.writeHead(206, {
          "content-type": "application/octet-stream",
          "content-length": String(body.length),
          "content-range": "bytes " + start + "-" + (FULL.length - 1) + "/" + FULL.length,
        })
        res.end(body)
        return
      }
    }
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": String(FULL.length),
    })
    res.end(FULL)
  })
  await new Promise<void>((res) => { srv.listen(0, "127.0.0.1", () => res()) })
  const addr = srv.address()
  const port = typeof addr === "object" && addr !== null ? addr.port : 0
  return "http://127.0.0.1:" + port + "/tiny.bin"
}

function downloadRequiredPayload(): Record<string, unknown> {
  return {
    status: "download_required",
    message: "1 of 1 missing model file(s) - downloading resumes the same run automatically.",
    files: [{ kind: "gguf", name: FILE_NAME, dest_dir: DEST_DIR }],
    download_url:
      "files://" +
      JSON.stringify([
        {
          kind: "gguf",
          repo: upstreamUrl,
          filename: FILE_NAME,
          local_filename: FILE_NAME,
          dest_dir: DEST_DIR,
        },
      ]),
    model_filename: FILE_NAME,
    model_dir: DEST_DIR,
    checked: 1,
    external: false,
  }
}

const completedRun = {
  run_id: "e2e-auto-download",
  status: "completed",
  stages: [{ id: "s1", name: "E2E auto download", index: 0, status: "completed" }],
}

async function gotoEmbed(page: import("@playwright/test").Page, url: string): Promise<void> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" })
      lastError = null
      break
    } catch (e) {
      lastError = e
      await page.waitForTimeout(3000)
    }
  }
  await page.waitForSelector("[data-agent-cards-embed]", {
    timeout: 120_000,
    state: "attached",
  })
  void lastError
}

test.describe("The popup prompt auto-downloads models end to end (gate:4)", () => {
  let draftId = ""

  test.afterEach(async ({ request }) => {
    try { rmSync(join(DEST_DIR, FILE_NAME), { force: true }) } catch { /* best-effort */ }
    if (draftId !== "") {
      await request.delete("/v1/flows/drafts/" + encodeURIComponent(draftId)).catch(() => {})
      draftId = ""
    }
    if (upstream !== null) {
      const s = upstream
      upstream = null
      await new Promise<void>((res) => { s.close(() => res()) })
    }
  })

  test("card Run -> popup prompt -> Download -> SSE stream -> auto-retry -> run completes", async ({
    page,
    request,
  }) => {
    // The tiny upstream the gateway will pull from (Range-capable).
    upstreamUrl = await startUpstream()

    // A REAL backend draft, hydrated by the embed exactly like chat cards.
    const created = await request.post("/v1/flows/drafts", {
      data: {
        intent: "gate4 auto-download probe",
        stages: [{
          title: "Auto download card",
          kind: "generation",
          service: "krea-2",
          params: { prompt: "gate4 probe" },
        }],
      },
    })
    expect(created.ok()).toBeTruthy()
    const createdBody = (await created.json()) as { draftId?: string }
    draftId = createdBody.draftId ?? ""
    expect(draftId.startsWith("p_")).toBe(true)

    // Call 1 short-circuits with the gateway's live payload shape; the retry
    // after the popup completes resolves a COMPLETED run (no GPU work).
    startCalls = 0
    await page.route("**/v1/flows/start*", async (route) => {
      startCalls += 1
      if (startCalls === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(downloadRequiredPayload()),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(completedRun),
      })
    })
    // The auto-retry polls the (fake) run to terminal.
    await page.route("**/v1/flows/status/e2e-auto-download*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(completedRun),
      })
    })

    await gotoEmbed(page, "/editor/?meliteCards=" + encodeURIComponent(draftId))

    // 1. THE PROMPT - the popup appears because the weights are "missing".
    const runAll = page.getByRole("button", { name: "Run all" })
    await expect(runAll).toBeVisible({ timeout: 60_000 })
    await runAll.click()
    await expect(page.getByText("Model download required")).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(FILE_NAME)).toBeVisible()

    // 2. THE USER SAYS YES - one click, then everything is automatic.
    await page.getByRole("button", { name: "Download 1 files" }).click()

    // 3. AUTO-DOWNLOAD through the REAL gateway SSE wire...
    try {
      await expect.poll(
        async () => (existsSync(join(DEST_DIR, FILE_NAME)) ? readFileSync(join(DEST_DIR, FILE_NAME)).equals(FULL) : false),
        { timeout: 15_000, intervalMs: 250 },
      ).toBe(true)
    } catch (pollErr) {
      const state = await page.evaluate(() =>
        document.body.innerText.split(/\n/).join(" | ").slice(0, 600))
      console.log('[dl-debug] body:', state)
      throw pollErr
    }

    // 4. ...then the AUTO-RETRY fires and the run completes. The dialog
    //    closes itself (resolve ok:true -> immediate close + retry).
    await expect(page.getByText("Model download required")).toBeHidden({ timeout: 20_000 })

    // Exactly TWO start-door hits: short-circuit + post-download retry. No
    // third hit would mean a loop; fewer would mean the download never fed
    // back into the run.
    expect(startCalls).toBe(2)

    // The card surfaces success (the store hydrated the completed result).
    await expect(page.locator("[data-agent-cards-embed]")).toContainText("done", {
      timeout: 20_000,
    })
  })
})
