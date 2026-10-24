/**
 * E2E: the h3-timeline STUDIO in real Chromium — the browser-plane
 * wall born from the 2026-09-12 operator report ("it renders like a
 * plain form"). Root cause then: the lane host booted 14:29 UTC,
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
import { collectPageErrors, expectNoPageErrors, openAConversation, openCardsWithBench, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host with the seeded bench')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

test('the h3-timeline bench card opens the VideoTimelineStudio, not the generic form', async ({ page }) => {
  // THE LEDGER IS THE SPINE'S (tour.ts), not a hand-rolled copy per
  // spec: only the shared collector knows the cold host's boot-race
  // 503s and the wall's own readiness probe are transport, not page
  // errors — a local listener re-records both and fails every
  // cold-lane run. It still names the failing resource (stroke 83: a
  // bare "404" hides WHICH route — the diagnosis law).
  const errors: string[] = collectPageErrors(page)

  await settle(page)

  // 1 — open a listed session. The sessions tree now groups by
  // WORKSPACE (the 2026-09-13 layout: workspace parents, sessions as
  // children with time suffixes "7min/1d/22h"); the old
  // /^inference\.cpp\d/ selector matched the pre-grouping flat list.
  // A session row = any treeitem ending in a time suffix.
  // A host without the operator's sessions still carries the seeded
  // bench; the header seat needs SOME open session — mint one if
  // the list is empty, refuse loud only if even minting failed.
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the expand seat needs an open conversation)').toBe(true)
  await page.waitForTimeout(6_000)

  // 2 — expand the right sidebar and open the Cards tab via its guide,
  // seeding THIS conversation's bench through the estate's own door
  // 3 — the bench hydrated: the h3-timeline TILE renders. THE CLICK
  // TARGET LAW (2026-09-13, the hour-6 war): click the TILE BUTTON
  // (the element that owns the onClick), never a bare text node —
  // getByText('h3-timeline') matches the tile's inner label and the
  // click lands on a span whose parent never opens the zoom, and the
  // wall then reports "the form" for a studio that mounted fine.
  await openCardsWithBench(page, sessionKey)
  const tile = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })

  // 4 — zoom: the studio must claim cards.stage.view. The
  // generic-form fallback renders NONE of these markers. All ten:
  // the full studio surface (tenant + filmstrip + doc readout +
  // timeline bar/ruler/playhead + run panel + audio + route + lora).
  await tile.click({ timeout: 10_000 })
  // THE MARKER LIST tracks the CURRENT studio surface (the
  // 2026-09-20 fold: RunRecipeEngine's tl-recipe-chrome and
  // RunAdvancedPanels' tl-mods-panel succeeded the retired
  // tl-route-select/tl-lora-panel — asserting dead testids would
  // pin the wall to a studio that no longer ships). The 2026-09-21
  // CI-seat repair: tl-mods-panel DIED with RunAdvancedPanels (the
  // generic-seam law — CardForm renders the loras Modifiers section
  // itself); the mods surface now carries card-base's stable
  // cb-mods-section testid.
  const markers = [
    'h3-studio-tenant', 'tl-filmstrip', 'tl-doc-readout',
    'motion-timeline-bar', 'motion-timeline-ruler', 'motion-timeline-playhead',
    'tl-run-panel', 'cb-mods-section',
  ]
  await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })
  const finalVideo = page.locator('[data-testid="tl-final-cut"] video')
  if (await finalVideo.count() > 0) {
    const source = await finalVideo.first().getAttribute('src')
    expect(source ?? '').not.toMatch(/\.(flac|mp3|wav|ogg|m4a|aac)(?:$|[?#])/i)
  }
  // cb-mods-section (re-pin 2026-11-06, order b: the Layer A fold is
  // DEAD) renders OPEN in the global view — a plain open-surface
  // marker now. tl-recipe-chrome DIED with the recipe-engine fold
  // (the h3 package's own unit wall receipts the null:
  // studio-run-recipe-engine.spec.tsx:190 — asserting a dead testid
  // pins a studio that no longer ships, the marker-list's own law);
  // tl-clips-lane-hint moved into the rail's AUDIO submenu (the
  // 2026-11-06 submenu law) — asserted at its own door below.
  for (const m of markers) {
    await expect(page.locator(`[data-testid="${m}"]`), m).toBeVisible()
  }
  await expect(page.locator('[data-testid="tl-run-panel"]'), 'run params open (the fold is dead)').toBeVisible({ timeout: 10_000 })
  // THE AUDIO SUBMENU DOOR (the clips lane's new home): the bar's
  // audio lanes are buttons (MotionTimelineBarLanes: data-audio-layer
  // + role=button when the activate verb rides); a lane click that
  // misses every clip enters the submenu, where RunRefsClips renders
  // the lane inspector + the guard hint. UNCONDITIONAL — a lane row
  // that stops rendering must red here, never skip.
  const audioLane = page.locator('[data-audio-layer][role="button"]').first()
  await expect(audioLane, 'the timeline bar carries its audio lanes as buttons').toBeVisible({ timeout: 10_000 })
  // the LEFT EDGE: a clip window pinned at the lane's center would
  // swallow the click (the submenu verb fires only on a click that
  // missed every clip) — the first pixels own no clip.
  await audioLane.click({ timeout: 10_000, position: { x: 2, y: 4 } })
  await expect(page.locator('[data-testid="tl-audio-panel"]'), 'the audio submenu opens').toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-testid="tl-clips-lane-hint"]'), 'the clips-lane guard hint lives in the audio submenu').toBeVisible({ timeout: 10_000 })
  // the zoom overlay still owns the pane after the submenu detour —
  // the DIALOG's accessible title seats it (drive-17 #13: the
  // overlay titles the stage by its TILE label 'Stage Generate
  // Video', the seeded h3-timeline card's rendered label; the old
  // 'Stage h3-timeline' text pinned a title the shell no longer
  // renders. Role+name is the shell's own seat, exact by default).
  await expect(page.getByRole('dialog', { name: 'Stage Generate Video' })).toBeVisible({ timeout: 10_000 })

  // 5 — the tour stays error-free
  await expectNoPageErrors(page, errors)
})

// ── THE LAYOUT LAWS (the operator's hour-7, 2026-09-13 — enshrined
// the same hour they were stated: "Preview is supposed to be to the
// right, and the parameters are supposed to be to the left. Timeline
// is supposed to be under… run paramteres is suppoesd to be an
// optional to unfold at the bottom… the modal is not taking up teh
// full page like before." A column-stacked .shell and a bounded zoom
// card violated all four at once; these assertions are the wall that
// makes the regression impossible to re-land quietly.
test('the studio layout: full-page modal, params left, fitted preview right, timeline under, run fold closed at the rail bottom', async ({ page }) => {
  // THE LEDGER IS THE SPINE'S (tour.ts), not a hand-rolled copy per
  // spec: only the shared collector knows the cold host's boot-race
  // 503s and the wall's own readiness probe are transport, not page
  // errors — a local listener re-records both and fails every
  // cold-lane run. It still names the failing resource (stroke 83: a
  // bare "404" hides WHICH route — the diagnosis law).
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open').toBe(true)
  await page.waitForTimeout(6_000)
  await openCardsWithBench(page, sessionKey)

  const tile = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }).first()
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

  // 4 — THE RUN PANEL (re-pin 2026-11-06, order b: the fold is
  // dead): present at the rail's bottom, rendering OPEN — no fold
  // grammar (open attribute) exists on it anymore
  const runPanel = page.locator('[data-testid="tl-run-panel"]')
  await expect(runPanel).toBeVisible()
  expect(await runPanel.getAttribute('open'), 'no fold grammar survives (order b)').toBeNull()

  const previewOverflow = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="tl-filmstrip"]')
    const pane = el ? (el.closest('[data-slot="pane-shell"]') as HTMLElement | null) : null
    const fitted = pane ?? (el as HTMLElement | null)
    return fitted ? getComputedStyle(fitted).overflowY : 'missing'
  })
  expect(previewOverflow, 'the fitted preview pane does not scroll').toBe('hidden')
  const barBox = bar!
  expect(barBox.y + barBox.height, `timeline bottom ${barBox.y + barBox.height} ≤ viewport ${page.viewportSize()!.height}`).toBeLessThanOrEqual(page.viewportSize()!.height)

  // 6 — the rail scrolls when content outgrows it (overflow law)
  const scrolls = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="tl-run-panel"]')
    const col = el ? (el.parentElement as HTMLElement) : null
    return col ? getComputedStyle(col).overflowY : 'missing'
  })
  expect(scrolls, 'the rail column scrolls (overflow-y auto)').toMatch(/auto|scroll/)

  await expectNoPageErrors(page, errors)
})

// ── THE ADD-DOOR REAL-CARD LAW (the operator's hour-7: "When I click
// add card, and add h3 timeline. It shows me a placeholder form card and
// not the real card"), as HOUR-24 reshaped the door: "It should just
// add the card and go into the drilldown view" — the picker's pick IS
// the add, the preadd form screen is GONE, and the fresh row's drill
// opens on the picked card. The real-card law lives in that drill:
// the drilldown for a CLAIMED card is the studio itself, never the
// spec form. (The hour-9 page-sized studio modal hijacking the door
// was REPEALED by that same order — the studio is the ZOOM face.)
test('the add door shows the REAL card for h3-timeline (not the spec form)', async ({ page }) => {
  // THE LEDGER IS THE SPINE'S (tour.ts), not a hand-rolled copy per
  // spec: only the shared collector knows the cold host's boot-race
  // 503s and the wall's own readiness probe are transport, not page
  // errors — a local listener re-records both and fails every
  // cold-lane run. It still names the failing resource (stroke 83: a
  // bare "404" hides WHICH route — the diagnosis law).
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open').toBe(true)
  await page.waitForTimeout(6_000)
  await openCardsWithBench(page, sessionKey)
  const tilesBefore = await page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }).count()

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
  // names also contain "Generate Video" and would steal a loose match.
  await page.getByRole('dialog').getByRole('button', { name: 'Generate Video', exact: true }).dispatchEvent('click')
  // THE PICK IS THE ADD: the stage lands on the bench… (a re-run
  // opens the PREVIOUS run's minted conversation, whose bench may
  // already carry earlier picks — the law is GROWTH, not +1 exactly)
  await expect(page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }), 'the picked card landed on the bench').not.toHaveCount(tilesBefore, { timeout: 15_000 })
  // …and the fresh row's DRILL opens on the REAL card: the studio
  // claims it (the generic-form fallback renders none of these).
  await expect(page.locator('[data-testid="h3-studio-tenant"]'), 'the drill is the studio (claimed)').toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-testid="motion-timeline-bar"]'), 'the timeline bar renders in the drill').toBeVisible()
  // the drill overlay titles the stage BY ITS OWN LABEL (zoom.tsx:
  // stage.title ?? cardLabel ?? card ?? id) — the add door's pick
  // carries the picker's FACE ('Generate Video', the same literal
  // the pick clicked above), while the SEEDED bench tile (#12's arm)
  // carries the bare card id ('h3-timeline'). Drive-13 #14 reddened
  // on the frozen id literal while the dialog said 'Stage Generate
  // Video' (error-context receipt) — the title follows the label
  // law, not the id.
  await expect(page.getByText('Stage Generate Video', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expectNoPageErrors(page, errors)
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
