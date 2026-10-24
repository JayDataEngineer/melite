// cards-catalog.spec.ts — THE EVERY-CARD WALL (2026-10-11, the
// operator's law: "you do Playwright, you test every last card,
// multiple variations"). The estate's catalog is read LIVE from the
// host's own doors (/v1/forms + /v1/model-catalog) — the wall knows
// the estate TODAY, and a card that lands tomorrow joins the wall
// by itself. Every card is added to a fresh minted bench, its drill
// opens, and its declared face must render with the family's own
// form-spec on the wire; every multi-family card additionally
// SWITCHES model axis to each other family and proves the refetch.
// No compose, no engine run: the receipt is the rendered face, the
// wire, and a zero-error ledger.
import { expect, test, type Page } from '@playwright/test'
import {
  callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL,
} from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

/** The catalog row the sweep drives: a card and the model families
 *  it boards (the variations). */
interface CardRow { card: string; families: string[]; label: string | null }

/** Read the estate's LIVE catalog through the host's own doors (the
 *  same discovery doors the GUI reads — never a baked list). */
async function readCatalog(page: Page): Promise<CardRow[]> {
  return await page.evaluate(async () => {
    const forms = await (await fetch('/v1/forms')).json() as Record<string, unknown>
    const cat = await (await fetch('/v1/model-catalog')).json() as { cards?: Record<string, unknown> }
    const out: Array<{ card: string; families: string[]; label: string | null }> = []
    for (const card of Object.keys(forms).sort()) {
      const row = cat.cards?.[card]
      let families: string[] = []
      let label: string | null = null
      if (Array.isArray(row)) families = row.filter((f): f is string => typeof f === 'string')
      else if (row !== null && typeof row === 'object') {
        const maybe = (row as { families?: unknown }).families
        if (Array.isArray(maybe)) families = maybe.filter((f): f is string => typeof f === 'string')
        // THE PROFESSIONAL NAME (operator 2026-11-06): tiles face the
        // catalog's label, never the id — the tile filter must too.
        const l = (row as { label?: unknown }).label
        if (typeof l === 'string' && l !== '') label = l
      }
      out.push({ card, families, label })
    }
    return out
  })
}

/** THE STABLE CATALOG (the CI-seat lesson, 2026-10-12): a lane booted
 *  off a runtime profile arms hot doors whose patch watcher can
 *  mount→dispose→remount them AT BOOT — the /v1/forms read catches
 *  the transient row and the sweep then boards a card that retracts
 *  under it (the moss 404). The wall's precondition is a catalog
 *  that holds STILL across a beat: read, wait, read again, and the
 *  two reads must NAME THE SAME CARDS AND FAMILIES. One retry after
 *  a longer beat; a catalog that never stabilizes fails HERE, loud,
 *  with the flapping rows named — never silently trimmed. */
async function readStableCatalog(page: Page): Promise<CardRow[]> {
  const first = await readCatalog(page)
  for (const beat of [1_500, 6_000]) {
    await page.waitForTimeout(beat)
    const again = await readCatalog(page)
    const a = JSON.stringify(first)
    const b = JSON.stringify(again)
    if (a === b) return again
    const names = (rows: CardRow[]) => rows.map((r) => r.card + ':' + r.families.join(',')).sort()
    console.log(`catalog flap between reads:\n  A=${names(first).join(' | ')}\n  B=${names(again).join(' | ')}`)
    if (beat === 6_000) {
      throw new Error(`the estate's catalog does not hold still across reads — flapping rows:\n  A=${names(first).join(' | ')}\n  B=${names(again).join(' | ')}`)
    }
  }
  return first
}

/** Expand the sidebar and open the estate's Cards tab — WITHOUT any
 *  card seed (the sweep seeds its own). THE TAB RIDES THE STREAM: it
 *  fires no bench/get on open (probed 2026-10-12 — the tile rail
 *  renders from the resource stream's push), so the bench key is the
 *  MINT's own: the probe proved adds via the minted key render on
 *  the tab, and the sweep's first-tile assertion below IS the proof
 *  the tab holds the minted conversation. */
async function openCardsTab(page: Page): Promise<void> {
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(5_000)
}

/** The bench's current rev (the CAS token for add-stage) — birthing
 *  the bench first when the mint's conversation has none yet (the
 *  same ensure door the tour's seed rides: bench/get refuses
 *  not-found on a key that never landed a stage). */
async function benchRev(page: Page, sessionKey: string): Promise<number> {
  try {
    var value = await callBench(page, 'bench/get', { sessionKey }) as { rev?: unknown; doc?: { rev?: unknown } }
  } catch {
    await callBench(page, 'bench/ensure', { doc: { session: sessionKey } })
    value = await callBench(page, 'bench/get', { sessionKey }) as { rev?: unknown; doc?: { rev?: unknown } }
  }
  const rev = (value?.doc ?? value)?.rev
  return typeof rev === 'number' ? rev : 0
}

/** Add one stage, CAS-retrying once on a rev race (the stream push
 *  and the add can interleave on a warm tab). */
async function addStage(page: Page, sessionKey: string, card: string, model: string | undefined): Promise<void> {
  const params = model !== undefined ? { model } : {}
  for (let attempt = 0; attempt < 2; attempt++) {
    const rev = await benchRev(page, sessionKey)
    try {
      await callBench(page, 'bench/add-stage', {
        sessionKey,
        doc: { card, author: 'user', expect_rev: rev, params },
      })
      return
    } catch (e) {
      if (attempt === 1) throw e
      await page.waitForTimeout(1_000)
    }
  }
}

/** The drill's zoom card, once a tile is clicked. */
function zoomOf(page: Page) {
  return page.locator('div[class*="zoomCard"]').first()
}

test.describe('the every-card wall (live catalog, every family a variation)', () => {
  test('EVERY CARD boards and opens its declared face', async ({ page }) => {
    const errors = collectPageErrors(page)
    await settle(page)
    const catalog = await readStableCatalog(page)
    // THE CATALOG IS NOT VACUOUS: the estate serves a real fleet —
    // a host that serves nothing must fail HERE, not pass silently.
    // The floor is DERIVED from the cardPackages SSOT (canon axis 4:
    // a derived roster over a hand-bumped count — the literal 15
    // this replaced outlived the fleet it was minted from and fired
    // red on a truthful 14-card estate, 2026-10-24).
    const { readFile } = await import('node:fs/promises')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    // import.meta.url, never __dirname: the specs ride ESM (the
    // package's "type": "module") and __dirname is undefined there.
    const ssot = await readFile(
      path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../engines/comfyui-cordis/src/cardDefs.ts'),
      'utf8',
    )
    const block = /export const cardPackages[^]*?\n\]/.exec(ssot)?.[0] ?? ''
    const declared = block.match(/'@melite\//g)?.length ?? 0
    expect(declared, 'the cardPackages SSOT holds its rows').toBeGreaterThan(0)
    expect(catalog.length, 'the estate serves its card fleet (the cardPackages SSOT count)').toBeGreaterThanOrEqual(declared)
    expect(catalog.map((r) => r.card)).toContain('image-edit')
    expect(catalog.map((r) => r.card)).toContain('image-gen')

    // THE TAB NAMES ITS BENCH only once a stage exists (the bench/get
    // frame fires when the tab opens a bench that HAS a stage) — so
    // the mint births the bench with the first boardable card BEFORE
    // the tab opens, then the tab's own frame must name THE SAME key:
    // on a shared host the shell reopens the last conversation, and a
    // key mismatch means the wall would write a bench the tab never
    // renders — refused HERE, by name.
    const mint = await openAConversation(page)
    expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
    const firstBoardable = catalog.find((r) => r.card !== 'mcp')
    expect(firstBoardable, 'the catalog holds a boardable card').toBeDefined()
    await addStage(page, mint.sessionKey, firstBoardable!.card, firstBoardable!.families[0])
    await openCardsTab(page)
    const sessionKey = mint.sessionKey

    // THE TAB HOLDS THE MINTED CONVERSATION: its first tile is the
    // birth stage the mint added — the stream pushed it, so the rail
    // below is the mint's bench, never a stranger's.
    const rail = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])')
    await expect(rail, 'the tab renders the minted bench').toHaveCount(1, { timeout: 30_000 })

    const boarded: CardRow[] = []
    // THE DECLARED-SEAT REFUSALS: a card whose DECL demands an engine
    // seat this lane does not host refuses AT THE DOOR, in the
    // estate's own voice — the wall PINS that voice as the card's
    // receipt (a self-skip is not a pass; a bypassed refusal would
    // hide drift). Any OTHER refusal fails loud.
    const expectedRefusal: Record<string, RegExp> = {
      mcp: /no seated MCP server on this lane.*the card composes nothing/,
    }
    for (const row of catalog) {
      // the birth stage: already on the bench (added pre-tab), still
      // driven in this sweep — the bench's first tile is its face
      if (row.card === firstBoardable!.card) { boarded.push(row); continue }
      const law = expectedRefusal[row.card]
      try {
        await addStage(page, sessionKey, row.card, row.families[0])
        boarded.push(row)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        if (law === undefined || !law.test(message)) throw e
        expect(message, `${row.card}: the estate refuses it in its declared voice`).toMatch(law)
      }
    }
    expect(boarded.length, 'the sweep boarded the fleet').toBeGreaterThanOrEqual(14)
    expect(boarded.map((r) => r.card)).toContain('image-edit')
    expect(boarded.map((r) => r.card)).toContain('image-gen')

    // stage tiles share tileInner with the '+ Add a card' cell — the
    // wall drives STAGES only (aria-label excludes the add cell; a
    // data-status filter is NOT enough — probed: a fresh draft tile
    // can render status-less). The mint's bench was born empty, so
    // the rail counts the fleet exactly.
    const tiles = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])')
    await expect(tiles, 'every boarded card rendered its tile').toHaveCount(boarded.length, { timeout: 30_000 })
    const specUrls: string[] = []
    page.on('request', (r) => { if (r.url().includes('/v1/form-spec')) specUrls.push(r.url()) })

    for (let i = 0; i < boarded.length; i++) {
      const row = boarded[i]!
      const tile = tiles.nth(i)
      await tile.click({ timeout: 15_000, force: true })
      const zoom = zoomOf(page)
      await expect(zoom, `${row.card}: the drill opens`).toBeVisible({ timeout: 30_000 })
      // THE DECLARED FACE, three honest arms: a spec form carries
      // the model axis; a studio renders the preview seat; a custom
      // studio (motion's pose/generation panel) renders its own
      // controls (sliders, seeds, selects) with NO model axis at all
      // (single-family cards omit it). Zero of the three = a drill
      // that opened to nothing — refused by name.
      await page.waitForTimeout(2_500)
      const overlay = page.locator('div[class*="zoomOverlay"]')
      // the S7e face of the model axis is the menu trigger, never a
      // <select> (SpecMenuSelect, card-base atoms.tsx)
      const hasForm = await page.locator('button[data-axis="Model"]').count()
      const hasStudio = await page.locator('[data-testid="stage-preview-seat"]').count()
      const hasControls = await overlay.locator('input, select, textarea, [role="slider"]').count()
      expect(hasForm + hasStudio + hasControls, `${row.card}: the drill renders a declared face (form, studio, or controls)`).toBeGreaterThan(0)
      if (row.families.length > 0 && hasForm > 0) {
        expect(specUrls.some((u) => u.includes(`model=${encodeURIComponent(row.families[0]!)}`)),
          `${row.card}: the wire fetched ${row.families[0]}'s own form-spec`).toBe(true)
      }
      // close the drill: the drill's OWN close seat (the zoom bar's
      // ✕ Close button) — the backdrop corner can fall inside the
      // scroll container (target !== currentTarget, no close) and a
      // covered-tile click is hit-test luck, never a gesture
      await page.getByRole('button', { name: 'Collapse card' }).click({ timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(800)
    }
    // THE UNPROVISIONED-MODEL STATE IS NOT A PAGE ERROR: a custom
    // studio probes its family's provision doors on open (motion →
    // /v1/models/kimodo/provisions/skin_standard.npz) and a lane that
    // never downloaded that model answers 502 — the DECLARED state,
    // same class as a card whose engine seat is absent. The face
    // render above is the receipt that the card still serves; the
    // ledger drops EXACTLY this door-pattern (provisions + 502) and
    // keeps every other ≥400 loud.
    const unprovisioned = /http 502: \S*\/v1\/models\/[^/]+\/provisions\//
    await expectNoPageErrors(page, errors.filter((e) => !unprovisioned.test(e)))
  })

  test('EVERY MULTI-FAMILY CARD switches model axis and refetches each family', async ({ page }) => {
    const errors = collectPageErrors(page)
    await settle(page)
    const catalog = (await readStableCatalog(page)).filter((r) => r.families.length > 1)
    expect(catalog.length, 'the estate serves multi-family cards').toBeGreaterThanOrEqual(5)

    // the same birth law as the fleet sweep: the tab names its bench
    // only once a stage exists, so the first multi-family card boards
    // pre-tab and the tab's own frame must name the mint's key
    const mint = await openAConversation(page)
    expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
    await addStage(page, mint.sessionKey, catalog[0]!.card, catalog[0]!.families[0])
    await openCardsTab(page)
    const sessionKey = mint.sessionKey
    const boarded = catalog.slice()
    // stage tiles share tileInner with the add cell — stages only;
    // the mint's bench was born empty, so the rail counts the boarded
    // rows exactly
    const tiles = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])')
    const specUrls: string[] = []
    page.on('request', (r) => { if (r.url().includes('/v1/form-spec')) specUrls.push(r.url()) })

    for (const row of catalog.slice(1)) {
      await addStage(page, sessionKey, row.card, row.families[0])
    }
    await expect(tiles, 'every multi-family card rendered its tile').toHaveCount(boarded.length, { timeout: 30_000 })

    for (const row of boarded) {
      // THE TILE BY ITS OWN CARD NAME (the tile carries the card id in
      // its text): a positional nth() click can hit a stale target —
      // probed 2026-10-12, a drill left up makes later clicks land on
      // the covered rail and the drill never retargets. The named
      // filter drives THIS card's tile, and the option list below is
      // the retarget receipt.
      const tile = tiles.filter({ hasText: row.label ?? row.card }).first()
      await tile.click({ timeout: 15_000, force: true })
      const zoom = zoomOf(page)
      await expect(zoom, `${row.card}: the drill opens`).toBeVisible({ timeout: 30_000 })
      // THE FAMILY AXIS IS WHERE THE FAMILIES LIVE: usually the
      // Model select; a matrix/studio card may seat them on a group
      // axis (data-axis Variant/Quant/Recipe) instead. Scan every
      // select the drill rendered and take the one whose options
      // carry THIS card's families — the retarget receipt rides it.
      await page.waitForTimeout(1_000)
      // THE MENU AXES (S7e): the family axis is the Model menu — the
      // trigger Button renders in place, the rows live in the open
      // menu. A family's face is its DECL label or the title-case of
      // its id; match exact title-case first, then a segment regex
      // (first..last segment, case-insensitive — the refetch
      // assertion below is the loud catch for any wrong row).
      const modelTrigger = page.getByRole('button', { name: 'Model', exact: true })
      await expect(modelTrigger, `${row.card}: the family axis renders`).toBeVisible({ timeout: 30_000 })
      await modelTrigger.click()
      // THE PORTAL MOUNT IS ASYNC (Menu portal: true — the rows render
      // a React tick AFTER the anchor's click; an immediate
      // allTextContents reads an empty DOM: the axisSeat null class,
      // 2026-10-24). The first row's visibility gates the read.
      await expect(page.getByRole('menuitem').first(), `${row.card}: the family menu opens`).toBeVisible({ timeout: 5_000 })
      const faces = (await page.getByRole('menuitem').allTextContents()).map((f) => f.trim())
      await modelTrigger.click()
      const faceFor = (id: string): RegExp => {
        const segs = id.split(/[-_]/).filter(Boolean)
        return new RegExp(`${segs[0] ?? id}.*${segs[segs.length - 1] ?? id}`, 'i')
      }
      // THE DOTTED-DECIMAL FACE: a DECL label renders "2.1" where the
      // id says "21" (qwen-img-edit-21 → "Qwen Image Edit 2.1") —
      // the face is matched with dots and spaces stripped, so the id
      // segment law holds across both spellings (2026-10-24).
      const faceNorm = (f: string): string => f.replace(/[.\s]/g, '')
      const titleCaseId = (id: string): string =>
        id.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      // THE MATRIX SEAT (2026-10-24, drive-11's named evidence): a
      // family in the card's VARIANT MATRIX (axes.tsx: familyRows
      // flatMap f.inMatrix ? [] : [row]) is lawfully ABSENT from the
      // Model menu — it boards through a seated family's Variant
      // axis (image-edit: 2511 rides 2.1's variant rail, proven by
      // cards-variations' reseed arm). A declared family is
      // REACHABLE through EITHER menu; the reachability of the
      // matrix lane itself is the variations wall's own receipt.
      const seatedOnModelMenu = (menuFaces: string[], ff: (id: string) => RegExp, norm: (f: string) => string) =>
        (fam: string) => menuFaces.some((f) => f === titleCaseId(fam) || ff(fam).test(norm(f)))
      const variantTrigger = page.locator('button[data-axis="Variant"]').first()
      let variantFaces: string[] = []
      if (await variantTrigger.count() > 0) {
        await variantTrigger.click()
        await expect(page.getByRole('menuitem').first(), `${row.card}: the variant menu opens`).toBeVisible({ timeout: 5_000 })
        variantFaces = (await page.getByRole('menuitem').allTextContents()).map((f) => f.trim())
        await variantTrigger.click()
      }
      const seated = (fam: string): boolean =>
        faces.some((f) => f === titleCaseId(fam) || faceFor(fam).test(faceNorm(f)))
        || variantFaces.some((f) => f === titleCaseId(fam) || faceFor(fam).test(faceNorm(f)))
      const axisSeat = row.families.every(seated) ? 'Model' : null
      expect(axisSeat, `${row.card}: every declared family is reachable (Model menu or variant matrix) (${row.families.join(', ')}) — model menu [${faces.join(' | ')}] variant menu [${variantFaces.join(' | ')}]`).not.toBeNull()
      // EVERY MODEL-MENU FAMILY is a variation: pick it, the wire must
      // refetch that family's own form-spec (the face follows the
      // boarded model — the lying-cap lesson at the browser plane).
      // Matrix-seated families are EXCLUDED here: their variant pick
      // and refetch are cards-variations' own wall.
      for (const family of row.families.slice(1).filter(seatedOnModelMenu(faces, faceFor, faceNorm))) {
        const before = specUrls.length
        await modelTrigger.click()
        await expect(page.getByRole('menuitem').first(), `${row.card}: the family menu reopens for ${family}`).toBeVisible({ timeout: 5_000 })
        const exact = page.getByRole('menuitem', { name: titleCaseId(family), exact: true })
        const row_ = (await exact.count()) > 0 ? exact : page.getByRole('menuitem', { name: faceFor(family) }).first()
        await row_.click()
        await page.waitForTimeout(4_000)
        expect(specUrls.slice(before).some((u) => u.includes(`model=${encodeURIComponent(family)}`)),
          `${row.card}: switching to ${family} refetches its form-spec`).toBe(true)
      }
      await page.getByRole('button', { name: 'Collapse card' }).click({ timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(800)
    }
    await expectNoPageErrors(page, errors)
  })
})
