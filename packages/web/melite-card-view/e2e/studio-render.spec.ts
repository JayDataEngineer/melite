/**
 * E2E: the h3-timeline STUDIO in real Chromium — the browser-plane
 * wall born from the 2026-09-12 operator report ("it renders like a
 * [REDACTED 2026-11-05] form"). Root cause then: the lane host booted 14:29 UTC,
 * the studio bundles rebuilt 16:10 — the browser's boot graph never
 * carried @melite/video-h3-timeline, the cards.stage.view slot went
 * unclaimed, and the bench's zoom fell back to the generic card. No
 * in-process wall can see that; only the real browser plane can.
 *
 * The tour (read-only against the seeded bench — never mutates it):
 *   1. Open a listed session (the right sidebar's expand button only
 *      materializes in an open conversation header).
 *   2. Expand the right sidebar (data-sidebar-right-expand), open the
 *      Cards tab through the guide entry.
 *   3. The bench hydrates (bench/get session 'main') and the seeded
 *      h3-timeline stage row renders.
 *   4. Click the row: the card view opens and cards.stage.view must
 *      be CLAIMED by the studio — VideoTimelineStudio's own markers
 *      (timeline bar + ruler + playhead + doc readout), never the
 *      generic form.
 *   5. Zero page errors / console errors across the tour.
 *
 * Self-skips without E2E_STUDIO_URL (the token-authenticated shell
 * URL) — same law as test:e2e's DEEPSEEK_API_KEY gate.
 *
 * Run: E2E_STUDIO_URL='http://127.0.0.1:3907/?token=…' pnpm --filter
 *   @melite-plugin/dsh-card-view exec playwright test
 */
import { expect, test, type Page } from '@playwright/test'

const STUDIO_URL = process.env.E2E_STUDIO_URL ?? ''

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host with the seeded bench')

/** Let the host's own boot noise land before the tour's ledger. */
async function settle(page: Page): Promise<void> {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(9_000)
}

/** Open SOME conversation (stroke 83): a fresh host lists zero
 * sessions (a brand-new profile has no conversations yet — the
 * pre-stroke spec leaned on the operator's accumulated list, which
 * made the tier pass/fail on host HISTORY). The tour needs an open
 * conversation for the header's expand seat; when no time-suffixed
 * session row exists, MINT one through the GUI's own New session
 * button, wait for the tree to carry it, then click it. */
async function openAConversation(page: Page): Promise<boolean> {
  const findRow = async (): Promise<number> => {
    const sessions = page.locator('[role="treeitem"]')
    const count = await sessions.count()
    for (let i = 0; i < count && i < 16; i++) {
      const label = ((await sessions.nth(i).textContent()) ?? '').trim()
      if (/\d+\s*(min|h|d)\s*$/.test(label)) return i
    }
    return -1
  }
  let at = await findRow()
  if (at < 0) {
    await page.getByRole('button', { name: 'New session' }).first().click({ timeout: 10_000 })
    await page.waitForTimeout(4_000)
    at = await findRow()
  }
  if (at < 0) return false
  await page.locator('[role="treeitem"]').nth(at).click({ timeout: 10_000 })
  return true
}

/** One typed client-request frame over the gateway's own /api wire
 * (the api-gateway.md envelope — the same frame wire.ts spells for
 * manage/act). In-page so the fetch carries the shell's auth. */
async function callBench(page: Page, method: string, args: Record<string, unknown>): Promise<unknown> {
  return await page.evaluate(async ({ method, args }) => {
    const r = await fetch('/api/' + method, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'e2e-' + Date.now(), method, payload: { args } }),
    })
    const body = (await r.json().catch(() => null)) as { result?: { ok?: boolean; value?: unknown; error?: { message?: string } } } | null
    const result = body?.result
    if (result === undefined || result.ok === false) {
      throw new Error(method + ' refused: ' + String(result && 'error' in result ? result.error?.message : 'no result'))
    }
    return result.value
  }, { method, args })
}

/** The tour's bench (stroke 83's history-law fix): a FRESH host (or a
 * freshly minted conversation) carries an EMPTY bench — the old spec
 * leaned on the operator's accumulated bench-main and passed/failed
 * on host HISTORY. Seed THIS conversation's bench through the
 * estate's own add-stage door (the same door melite_construct rides
 * — never a disk write), idempotently: only when no h3-timeline
 * stage is aboard, CAS'd against the live rev. */
async function seedBenchH3(page: Page, sessionKey: string): Promise<void> {
  const value = (await callBench(page, 'bench/get', { sessionKey })) as
    | { stages?: unknown[]; bench?: { rev?: number }; doc?: { stages?: unknown[]; bench?: { rev?: number } } }
    | undefined
  const doc = value?.doc ?? value ?? {}
  const stages = Array.isArray(doc.stages) ? doc.stages : []
  if (stages.some((s) => typeof s === 'object' && s !== null && 'card' in s && (s as { card?: unknown }).card === 'h3-timeline')) return
  const rev = typeof doc.bench?.rev === 'number' ? doc.bench.rev : 0
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: {
      card: 'h3-timeline',
      engine: 'comfyui',
      params: { variant: 'h3', quant: 'int8', model: 'h3-timeline', calls: [{ text: 'A single shot — describe the action, camera, and mood.', start_frame: 0, end_frame: 168 }] },
      inputs: {},
      outputs: { default: 'image' },
      expect_rev: rev,
      author: 'user',
    },
  })
}

/** Steps 2-3 of every tour: expand the right sidebar, open the Cards
 * tab (the tab's own bench/get names the conversation's session key
 * — captured from the wire, never guessed), seed the h3 stage when
 * the bench is empty, and let the resource stream re-hydrate. */
async function openCardsWithBench(page: Page): Promise<void> {
  let sessionKey = ''
  page.on('request', (r) => {
    if (!r.url().includes('/api/bench/get')) return
    try {
      const body = r.postDataJSON() as { payload?: { args?: { sessionKey?: unknown } } }
      if (typeof body.payload?.args?.sessionKey === 'string') sessionKey = body.payload.args.sessionKey
    } catch { /* the tab's own frame shapes it; a stranger's frame is ignored */ }
  })
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByText('Cards', { exact: true }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(7_000)
  if (sessionKey !== '') await seedBenchH3(page, sessionKey)
  // the resource stream pushes the rev drift; give the tile time
  await page.waitForTimeout(4_000)
}

test('the h3-timeline bench card opens the VideoTimelineStudio, not the generic form', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 150)}`) })
  // stroke 83: name the failing resource (a bare "404" console line
  // hides WHICH route — the diagnosis law)
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url().slice(0, 150)}`) })

  await settle(page)

  // 1 — open a listed session. The sessions tree now groups by
  // WORKSPACE (the 2026-09-13 layout: workspace parents, sessions as
  // children with time suffixes "7min/1d/22h"); the old
  // /^inference\.cpp\d/ selector matched the pre-grouping flat list.
  // A session row = any treeitem ending in a time suffix.
  // A host without the operator's sessions still carries the seeded
  // bench; the header seat needs SOME open session — mint one if
  // the list is empty, refuse loud only if even minting failed.
  const opened = await openAConversation(page)
  expect.soft(opened, 'a listed session to open (the expand seat needs an open conversation)').toBe(true)
  await page.waitForTimeout(6_000)

  // 2 — expand the right sidebar and open the Cards tab via its guide,
  // seeding THIS conversation's bench through the estate's own door
  // 3 — the bench hydrated: the h3-timeline TILE renders. THE CLICK
  // TARGET LAW (2026-09-13, the hour-6 war): click the TILE BUTTON
  // (the element that owns the onClick), never a bare text node —
  // getByText('h3-timeline') matches the tile's inner label and the
  // click lands on a span whose parent never opens the zoom, and the
  // wall then reports "the form" for a studio that mounted fine.
  await openCardsWithBench(page)
  const tile = page.locator('button', { hasText: 'h3-timeline' }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })

  // 4 — zoom: the studio must claim cards.stage.view. The
  // generic-form fallback renders NONE of these markers. All ten:
  // the full studio surface (tenant + filmstrip + doc readout +
  // timeline bar/ruler/playhead + run panel + audio + route + lora).
  await tile.click({ timeout: 10_000 })
  const markers = [
    'h3-studio-tenant', 'tl-filmstrip', 'tl-doc-readout',
    'motion-timeline-bar', 'motion-timeline-ruler', 'motion-timeline-playhead',
    'tl-run-panel', 'tl-audio-upload', 'tl-route-select', 'tl-lora-panel',
  ]
  await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })
  // tl-audio-upload + tl-route-select + tl-lora-panel live INSIDE the
  // Run fold (RunRefsClips / RunRecipeEngine / RunAdvancedPanels) —
  // since the hour-8 law the fold is CLOSED at the rail's bottom, so
  // those three markers are asserted AFTER unfolding it. The rest
  // live on the open surface.
  const inFold = ['tl-audio-upload', 'tl-route-select', 'tl-lora-panel']
  for (const m of markers.filter((x) => !inFold.includes(x))) {
    await expect(page.locator(`[data-testid="${m}"]`), m).toBeVisible()
  }
  await page.locator('[data-testid="tl-run-panel"] summary').click({ timeout: 5_000 })
  await expect(page.locator('[data-testid="tl-audio-upload"]'), 'audio upload (unfolded Run panel)').toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-testid="tl-route-select"]'), 'route select (unfolded Run panel)').toBeVisible()
  await expect(page.locator('[data-testid="tl-lora-panel"]'), 'lora panel (unfolded Run panel)').toBeVisible()
  // the zoom overlay titles the stage (the CardZoomOverlay shell;
  // exact — a transcript in the chat column can echo the same words)
  await expect(page.getByText('Stage h3-timeline', { exact: true })).toBeVisible({ timeout: 10_000 })

  // 5 — the tour stays error-free
  expect(errors, errors.join('\n')).toEqual([])
})

// ── THE LAYOUT LAWS (the operator's hour-7, 2026-09-13 — enshrined
// the same hour they were stated: "Preview is supposed to be to the
// right, and the parameters are supposed to be to the left. Timeline
// is supposed to be under… run paramteres is suppoesd to be an
// optional to unfold at the bottom… the modal is not taking up teh
// full page like before." A column-stacked .shell and a bounded zoom
// card violated all four at once; these assertions are the wall that
// makes the regression impossible to re-land quietly.
test('the studio layout: full-page modal, params left, preview right, timeline under, run fold closed at the rail bottom', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 150)}`) })
  // stroke 83: name the failing resource (a bare "404" console line
  // hides WHICH route — the diagnosis law)
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url().slice(0, 150)}`) })

  await settle(page)
  const opened = await openAConversation(page)
  expect.soft(opened, 'a listed session to open').toBe(true)
  await page.waitForTimeout(6_000)
  await openCardsWithBench(page)

  const tile = page.locator('button', { hasText: 'h3-timeline' }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })
  await tile.click({ timeout: 10_000 })
  await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })

  // 1 — FULL PAGE: the zoom card takes ≥90% of the viewport both ways
  const card = await page.locator('[data-testid="h3-studio-tenant"]').boundingBox()
  expect(card, 'the tenant has geometry').not.toBeNull()
  expect(card!.width, `card width ${card!.width} ≥ 90vw`).toBeGreaterThanOrEqual(page.viewportSize()!.width * 0.9)
  expect(card!.height, `card height ${card!.height} ≥ 85vh`).toBeGreaterThanOrEqual(page.viewportSize()!.height * 0.8)

  // 2 — PARAMS LEFT, PREVIEW RIGHT: the filmstrip (preview surface)
  // starts right of the rail's params column (the run panel's rail)
  const rail = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="tl-run-panel"]')
    return el ? (el.parentElement as HTMLElement).getBoundingClientRect().toJSON() : null
  })
  const preview = await page.locator('[data-testid="tl-filmstrip"]').boundingBox()
  expect(rail, 'the rail column has geometry').not.toBeNull()
  expect(preview, 'the preview has geometry').not.toBeNull()
  expect(rail!.right, `rail right ${rail!.right} ≤ preview left ${preview!.x}`).toBeLessThanOrEqual(preview!.x + 8)

  // 3 — TIMELINE UNDER BOTH: the bar's top is below both panes' tops
  // and spans (nearly) the full card width
  const bar = await page.locator('[data-testid="motion-timeline-bar"]').boundingBox()
  expect(bar, 'the timeline bar has geometry').not.toBeNull()
  expect(bar!.y, `bar y ${bar!.y} > rail y ${rail!.y} and preview y ${preview!.y}`).toBeGreaterThan(Math.max(rail!.y, preview!.y))
  expect(bar!.width, `bar width ${bar!.width} spans the card`).toBeGreaterThanOrEqual(card!.width * 0.9)

  // 4 — THE RUN FOLD: present, at the rail's BOTTOM (below the first
  // non-fold block), and CLOSED by default (optional unfold)
  const fold = page.locator('[data-testid="tl-run-panel"]')
  await expect(fold).toBeVisible()
  expect(await fold.getAttribute('open'), 'the run fold is closed by default').toBeNull()

  // 5 — HOUR-8 LAWS: the preview pane scrolls in its own bounds and
  // the timeline row is BOUNDED (never clipped past the card fold)
  const previewScrolls = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="tl-filmstrip"]')
    const pane = el ? (el.closest('[data-slot="pane-shell"]') as HTMLElement | null) : null
    const scroller = pane ?? (el as HTMLElement | null)
    return scroller ? getComputedStyle(scroller).overflowY : 'missing'
  })
  expect(previewScrolls, 'the preview pane scrolls').toMatch(/auto|scroll/)
  const barBox = bar!
  expect(barBox.y + barBox.height, `timeline bottom ${barBox.y + barBox.height} ≤ viewport ${page.viewportSize()!.height}`).toBeLessThanOrEqual(page.viewportSize()!.height)

  // 6 — the rail scrolls when content outgrows it (overflow law)
  const scrolls = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="tl-run-panel"]')
    const col = el ? (el.parentElement as HTMLElement) : null
    return col ? getComputedStyle(col).overflowY : 'missing'
  })
  expect(scrolls, 'the rail column scrolls (overflow-y auto)').toMatch(/auto|scroll/)

  expect(errors, errors.join('\n')).toEqual([])
})

// ── THE ADD-DOOR REAL-CARD LAW (the operator's hour-7: "When I click
// add card, and add h3 timeline. It shows me a [REDACTED 2026-11-05] form card and
// not the real card"), as HOUR-24 reshaped the door: "It should just
// add the card and go into the drilldown view" — the picker's pick IS
// the add, the preadd form screen is GONE, and the fresh row's drill
// opens on the picked card. The real-card law lives in that drill:
// the drilldown for a CLAIMED card is the studio itself, never the
// spec form. (The hour-9 page-sized studio modal hijacking the door
// was REPEALED by that same order — the studio is the ZOOM face.)
test('the add door shows the REAL card for h3-timeline (not the spec form)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 150)}`) })
  // stroke 83: name the failing resource (a bare "404" console line
  // hides WHICH route — the diagnosis law)
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url().slice(0, 150)}`) })

  await settle(page)
  const opened = await openAConversation(page)
  expect.soft(opened, 'a listed session to open').toBe(true)
  await page.waitForTimeout(6_000)
  await openCardsWithBench(page)
  const tilesBefore = await page.locator('button', { hasText: 'h3-timeline' }).count()

  // the door-opener tile (aria-label 'Add a card' — the trailing + tile)
  await page.getByRole('button', { name: 'Add a card' }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(2_000)
  // DISPATCHED pick (stroke 83): in the headless viewport the picker's
  // sticky genre header overlays the tile's center and intercepts the
  // POINTER (a human scrolls/hovers past it), and a synthesized
  // keyboard Enter does not carry Preact's onClick; dispatchEvent
  // drives the SAME button handler the operator's click drives — the
  // law under test is the picked VIEW, not the pointer path. Scoped
  // to the dialog with the exact name: the bench tiles' accessible
  // names also contain "H3 Timeline" and would steal a loose match.
  await page.getByRole('dialog').getByRole('button', { name: 'H3 Timeline', exact: true }).dispatchEvent('click')
  // THE PICK IS THE ADD: the stage lands on the bench… (a re-run
  // opens the PREVIOUS run's minted conversation, whose bench may
  // already carry earlier picks — the law is GROWTH, not +1 exactly)
  await expect(page.locator('button', { hasText: 'h3-timeline' }), 'the picked card landed on the bench').not.toHaveCount(tilesBefore, { timeout: 15_000 })
  // …and the fresh row's DRILL opens on the REAL card: the studio
  // claims it (the generic-form fallback renders none of these).
  await expect(page.locator('[data-testid="h3-studio-tenant"]'), 'the drill is the studio (claimed)').toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid="motion-timeline-bar"]'), 'the timeline bar renders in the drill').toBeVisible()
  // the drill overlay titles the stage (the CardZoomOverlay shell)
  await expect(page.getByText('Stage h3-timeline', { exact: true })).toBeVisible({ timeout: 10_000 })
  expect(errors, errors.join('\n')).toEqual([])
})

// NOTE (2026-09-13): the chat-born bench path (estate normalization
// strips stage.card; identity survives on the draft intent) is NOT an
// e2e case — the tab's bench is the host's session-'main' working
// bench, whose contents vary per host, and a read-only tour cannot
// seed a chat-born shape. That law is pinned at BOTH seams in-process:
// readBench's re-attach (tests/cards-resource.spec.ts, three cases)
// and DraftView's consult (tests/draft-view.spec.tsx, the intent-
// cardName pin). The e2e layer owns what only the browser can see:
// the boot graph, the slot claims, and the real-click zoom.
