/* BRICK REVIVE (pipe-carry retirement, 2026-09-05) — wire proof in real
 * Chromium.
 *
 * The pipe-carry era is over: no gateway ever stashed `pipe`/`stage_id` on
 * a card run and no status ever emitted `flow_doc` — the 2026-08-10 spec
 * that mocked `flow_doc` + `stage_id` into a status revived a shape no run
 * could serve. The ONE revive path is brick hydration (loadRun →
 * hydrateRunStages): each RunProtocolStage becomes exactly one card, the
 * clicked run's artifact lands on its card, and the flow intent is the
 * run's prompt (or its run id).
 *
 * This spec drives the REAL revive path end-to-end:
 *   1. Seed a 1-card flow in the library store (localStorage — the
 *      ALWAYS-ON persistence rehydrates it at module eval).
 *   2. Route-intercept /v1/flows/runs → a run with one image artifact.
 *   3. Route-intercept /v1/flows/status/p_brick123 → the run's single
 *      brick. NO flow_doc, NO stage_id — the real gateway shape.
 *   4. Click the wand on the asset ("Replace flow with this run"),
 *      ACCEPT the clobber confirm.
 *   5. Assert the canvas now holds ONE card carrying the clicked run's
 *      artifact, named by the run's prompt. A whole-pipe reconstruction
 *      is impossible: the doc is never on the run.
 */
import { test, expect } from "@playwright/test"

const FRONTEND = process.env.BASE_URL || "http://127.0.0.1:5173"

test("wand revive hydrates the run's brick as ONE card (no pipe reconstruction)", async ({ page }) => {
  test.setTimeout(180_000)

  // The runs list (Media drawer) — one artifact, one prompt.
  await page.route("**/v1/flows/runs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        runs: [{
          run_id: "p_brick123",
          name: "p_brick123",
          flow: "YAML",
          status: "done",
          created_at: Date.now(),
          prompt: "bravo",
          params: { prompt: "bravo" },
          thumbnail: "/v1/assets/runs/p_brick123/b.png",
          artifacts: [{
            url: "/v1/assets/runs/p_brick123/b.png",
            type: "image",
            size: 1024,
          }],
          families: ["flux_dev"],
        }],
      }),
    })
  })

  // The run's status — the single brick, and NOTHING else. A flow_doc or
  // stage_id here would be a lying mock: the gateway never stashes the
  // authored pipe on a card run (pipe-carry retirement, 2026-09-05).
  await page.route("**/v1/flows/status/p_brick123", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        run_id: "p_brick123",
        flow: "YAML",
        yaml_filename: "(inline)",
        // Run-level vocabulary (contracts.py RunStatusValue): "completed",
        // NOT the stage-level "done" — the run-status contract refuses a
        // lying mock (2026-08-11).
        status: "completed",
        completed: 1,
        total: 1,
        stages: [{
          id: "flux_dev_0",
          name: "flux_dev",
          family_id: "flux_dev",
          index: 0,
          title: "Bravo",
          status: "done",
          url: "/v1/assets/runs/p_brick123/b.png",
          params: { model: "flux-dev", prompt: "bravo" },
          secs: 2.5,
        }],
        error: null,
      }),
    })
  })

  // ACCEPT the clobber confirm — the replacement is explicit. Register
  // BEFORE the click that fires the dialog.
  page.on("dialog", (d) => d.accept())

  await page.goto(`${FRONTEND}/editor/`, { waitUntil: "domcontentloaded" })

  // Seed a DIFFERENT 1-card flow in the library store — the clobber
  // guard must fire (confirm dialog) before the run replaces it.
  await page.evaluate(() => {
    localStorage.setItem("melite:flow:v2:library", JSON.stringify({
      id: "p_current",
      intent: "current 1-card flow",
      status: "ready",
      stages: [{
        id: "cur0", title: "Old Lone Card", kind: "generation",
        service: "anima-base", params: { prompt: "old" }, inputs: [],
        result: null, status: "done", error: null, cacheKey: "kOld",
      }],
      createdAt: Date.now(),
      completedAt: null,
    }))
  })

  // Rehydrate into the store (fresh page load) — then switch to the LIBRARY
  // tab: /editor/ boots on the Agent tab, and the canvas (FlowCanvas
  // inside LibraryTab) renders the library store's flow there.
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: "Library", exact: true }).click()
  for (let i = 0; i < 60; i++) {
    if (await page.locator("[data-card-wrap]").count() >= 1) break
    await page.waitForTimeout(1000)
  }
  const cardsBefore = await page.locator("[data-card-wrap]").count()
  expect(cardsBefore, "seeded 1-card flow should render on the canvas").toBe(1)

  // The Media drawer (AppSidebar) is open by DEFAULT ("media" is the initial
  // activeDrawer) — the MEDIA label marks its panel. Toggle it open only if
  // a previous state closed it. (NOT the wand: it renders only on hover.)
  if (!(await page.getByText("MEDIA", { exact: true }).first().isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "History / Media" }).click()
  }
  // Expand the Images category (collapsed by default; accessible name
  // carries the count — "Images 1").
  await page.getByRole("button", { name: /^Images/ }).click()

  // The wand — "Replace flow with this run". It lives in the tile's
  // hover layer (hidden group-hover/item:flex) — hover the tile first.
  const tile = page.locator("div.group\\/item").first()
  await tile.hover()
  const wand = page.getByRole("button", { name: "Replace flow with this run" }).first()
  await wand.waitFor({ state: "visible", timeout: 30_000 })
  await wand.click()

  // Wait for the brick to land: ONE card carrying the run's artifact.
  for (let i = 0; i < 60; i++) {
    const count = await page.locator("[data-card-wrap]").count()
    if (count === 1) {
      const srcs = await page
        .locator("[data-card-wrap] img")
        .evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).src))
      if (srcs.some((s) => s.includes("b.png"))) break
    }
    await page.waitForTimeout(1000)
  }

  const cardsAfter = await page.locator("[data-card-wrap]").count()
  expect(cardsAfter, "the run must revive as its ONE brick — never a reconstructed pipe").toBe(1)

  // The run's artifact renders as the card's <img> (result.assetUrls[0]
  // → img src, FlowCard.tsx:369).
  const cardSrcs = await page
    .locator("[data-card-wrap] img")
    .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src))
  expect(cardSrcs.some((s) => s.includes("b.png")),
    "the run's artifact should be the image on its card").toBe(true)

  // The run's prompt rides the revival as the flow intent (a run IS a
  // flow doc; loading it back is 1:1 — WorkspaceLayout onOpenRun).
  const nameInput = page.getByLabel("Flow name")
  await expect(nameInput).toHaveValue("bravo")
})
