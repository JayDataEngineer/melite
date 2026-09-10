/**
 * CARD RUN SPINNER POSITION — the loading circle lives NEXT TO THE X
 * (2026-08-22 operator request: "when I hit run on this tab, the loading
 * circle is in the top corner. I want it next to the X button").
 *
 * What changed: the expanded card's header rail (CardDetailModal /
 * CardDetailInline) used to render the StatusChip spinner at the row's
 * LEFT edge, right after the service/provenance/upstream badges. It now
 * renders as the LAST element before the Collapse (X) button — same flex
 * row, gap-2 apart, vertically centered with it.
 *
 * This spec drives the real editor (Vite dev :5173 → the owning DSH) the
 * way the user does: add a card, type a prompt, press Run IN THE DETAIL
 * HEADER. The run door (/v1/flows/start) and the status poll are
 * route-mocked to stay "running" forever — NO real ComfyUI job fires and
 * nothing is written to data/runs. executeStage marks the stage running
 * optimistically at click, so the spinner must appear at once; the mocks
 * only keep it alive for the assertions.
 *
 * Proven, in a real browser layout engine (jsdom cannot):
 *   1. the spinner ([aria-label="Running"]) appears after Run;
 *   2. EXACTLY ONE exists in the whole drilldown (no second one back at
 *      the old badge-corner position);
 *   3. DOM adjacency — its nextElementSibling IS the Collapse button
 *      (Tip renders bare via asChild, so there is no wrapper between);
 *   4. geometry — horizontal gap to the X within the row's gap-2 rhythm,
 *      vertical centers aligned (same visual line).
 *
 * Run:
 *   cd web/editor && npx playwright test e2e/card-run-spinner-position.spec.ts
 * (needs task up — Vite :5173 proxying /v1 to the owning DSH)
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoLibrary(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^Library$/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

/** Mock the run door + status poll: the run starts and NEVER finishes. */
async function mockEternalRun(page: Page): Promise<void> {
  await page.route('**/v1/flows/start', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        run_id: 'p-test-spinner-0001',
        status: 'running',
        bricks: [{ title: 'Generate', status: 'running' }],
        total: 1,
      }),
    })
  })
  await page.route('**/v1/flows/status/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        run_id: 'p-test-spinner-0001',
        status: 'running',
        stages: [{ title: 'Generate', status: 'running', progress: { value: 3, max: 20 } }],
      }),
    })
  })
}

test.describe('Card detail — running spinner sits next to the Collapse X', () => {
  test('pressing Run puts ONE spinner beside the X, not in the top corner', async ({ page }) => {
    test.setTimeout(90_000)
    await mockEternalRun(page)

    // ── Add a generation card; its detail opens immediately ──────────
    await gotoLibrary(page)
    const addBtn = page.getByRole('button', { name: /add your first card|add a card/i }).first()
    await addBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await addBtn.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Your action cards').waitFor({ state: 'visible', timeout: 15_000 })
    // Action-card picker (one list since 2026-09-04): the Image card
    // (image_gen_card). Accessible name is "{title} {model}" — anchor on
    // the title with a trailing space.
    const createTile = dialog.getByRole('button', { name: /^Image / }).first()
    await createTile.waitFor({ state: 'visible', timeout: 15_000 })
    await createTile.click()
    const modal = page.locator('[data-card-detail]')
    await modal.waitFor({ state: 'visible', timeout: 15_000 })

    // Give the card a prompt (the shape a real run carries).
    const promptInput = modal.locator('textarea').first()
    await promptInput.waitFor({ state: 'visible', timeout: 10_000 })
    await promptInput.fill('a small red cube on white')

    // ── Sanity BEFORE Run: no running spinner anywhere in the card ──
    await expect(
      modal.locator('[aria-label="Running"]'),
      'idle card must carry no running spinner',
    ).toHaveCount(0)

    // ── Press Run IN THE DETAIL HEADER ──────────────────────────────
    const runBtn = modal.getByRole('button', { name: /^Run$/ }).first()
    await runBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await runBtn.click()

    // ── 1. The spinner appears ──────────────────────────────────────
    const spinner = modal.locator('[aria-label="Running"]')
    await expect(spinner, 'running spinner must appear after Run').toBeVisible({ timeout: 5_000 })
    await expect(spinner, 'spinner must be animating').toHaveClass(/animate-spin/)

    // ── 2. Exactly ONE — none back at the old badge-corner spot ─────
    await expect(
      modal.locator('[aria-label="Running"]'),
      'exactly one running signal in the drilldown (no duplicate at the badges)',
    ).toHaveCount(1)

    // ── 3+4. Adjacency + geometry against the real layout ───────────
    const probe = await page.evaluate(() => {
      const root = document.querySelector('[data-card-detail]')
      if (!root) return { ok: false, reason: 'no [data-card-detail] in DOM' }
      const spin = root.querySelector('[aria-label="Running"]') as HTMLElement | null
      const close = root.querySelector('[aria-label="Collapse"]') as HTMLElement | null
      if (!spin || !close) return { ok: false, reason: 'spinner or Collapse X missing' }
      // Structural adjacency: walking forward from the spinner must hit
      // the X with NOTHING in between (Tip mounts bare via asChild).
      let next: Element | null = spin.nextElementSibling
      while (next && next !== close && !(next.querySelector?.('[aria-label="Collapse"]'))) {
        next = next.nextElementSibling
      }
      const adjacent = next !== null
      // Geometry: same visual line, gap within the row's spacing rhythm.
      const s = spin.getBoundingClientRect()
      const c = close.getBoundingClientRect()
      return {
        ok: adjacent,
        reason: adjacent ? '' : 'spinner is not the element preceding the X in the header rail',
        gapPx: Math.round(c.left - s.right),
        dyPx: Math.round(Math.abs(s.top + s.height / 2 - (c.top + c.height / 2))),
        spinnerLeftOfX: s.right <= c.left + 1,
        rowGap: getComputedStyle(spin.parentElement!).columnGap,
      }
    })
    expect(probe.ok, probe.reason).toBe(true)
    // gap-2 = 8px; allow sub-pixel slop and border rounding either side.
    expect(
      probe.gapPx,
      `horizontal gap spinner→X should be the row's ~8px rhythm (got ${probe.gapPx}px)`,
    ).toBeGreaterThanOrEqual(-2)
    expect(probe.gapPx, 'no daylight beyond one gap step').toBeLessThanOrEqual(20)
    expect(probe.dyPx, 'spinner and X share the row centerline').toBeLessThanOrEqual(8)
    expect(probe.spinnerLeftOfX, 'spinner sits LEFT of the X').toBe(true)

    // ── And the header's left cluster stays spinner-free while it runs
    const runDisabled = await modal.getByRole('button', { name: /^Run$/ }).first().isDisabled()
    expect(runDisabled, 'Run is disabled while its own stage runs').toBe(true)
  })
})
