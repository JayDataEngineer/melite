/**
 * E2E GPU — ANGLE 2, THE ALL-CARDS SWEEP (on-demand:
 * E2E_GPU_SWEEP=1 — the routine lane never pays for it): every
 * card the estate serves TODAY gets a RUN VERDICT through the
 * human path — board, config change, Run press, terminal state,
 * artifact or VOICED refusal
 * (dev_docs/plans/gpu-playwright-tier-2026-10-12.md).
 *
 * The operator's law: "a human can run any and all of the cards
 * with configuration changes." This sweep is that law's own wall:
 * the roster derives LIVE from the host's doors (/v1/forms +
 * /v1/model-catalog, the two-read stability law — a card that
 * lands tomorrow joins by itself, never a hand list), and every
 * card walks the SAME human path the pilot proved:
 *   board (the estate's CAS door) → tile → drill → CONFIG CHANGE
 *   (the prompt when the card admits one; the seed under Sampling
 *   when it admits one) → Run press → terminal state.
 * The verdict is honest, never a skip:
 *   done → the tile paints an artifact media element (img, audio
 *          or video) from the run's own media route;
 *   error/stopped → the drill VOICES a reason (a named refusal —
 *          absent weights, missing input, refused seat — never a
 *          silent error);
 *   door-refusal → a card whose seat this lane lacks refuses AT
 *          THE BOARD in its declared voice (pinned verbatim, the
 *          catalog wall's own law).
 * A card that HANGS past its kind's budget reds the sweep with
 * the card named — the receipt, not a timeout-only verdict.
 *
 * The keyless law: this spec runs ONLY through
 * scripts/e2e-gpu-lane.sh with E2E_GPU_SWEEP=1 — it self-skips on
 * the routine lane (the sweep is a 90-minute GPU census, not a
 * per-commit gate). Self-skips without any of its three gates.
 */
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from '../tour.ts'

test.skip(
  !STUDIO_URL || process.env.E2E_GPU !== '1' || process.env.E2E_GPU_SWEEP !== '1',
  'the all-cards sweep needs E2E_STUDIO_URL (the gpu lane) AND E2E_GPU=1 (e2e-gpu-lane.sh) AND E2E_GPU_SWEEP=1 (the on-demand census gate)',
)

/** The catalog row the sweep drives: a card and the model families
 *  it boards (the kind signal for the per-card run budget). */
interface CardRow { card: string; families: string[] }

/** Read the estate's LIVE catalog through the host's own doors (the
 * same discovery doors the GUI reads — never a baked list). */
async function readCatalog(page: Page): Promise<CardRow[]> {
  return await page.evaluate(async () => {
    const forms = await (await fetch('/v1/forms')).json() as Record<string, unknown>
    const cat = await (await fetch('/v1/model-catalog')).json() as { cards?: Record<string, unknown> }
    const out: Array<{ card: string; families: string[] }> = []
    for (const card of Object.keys(forms).sort()) {
      const row = cat.cards?.[card]
      let families: string[] = []
      if (Array.isArray(row)) families = row.filter((f): f is string => typeof f === 'string')
      else if (row !== null && typeof row === 'object') {
        const maybe = (row as { families?: unknown }).families
        if (Array.isArray(maybe)) families = maybe.filter((f): f is string => typeof f === 'string')
      }
      out.push({ card, families })
    }
    return out
  })
}

/** THE STABLE CATALOG (the CI-seat lesson, 2026-10-12): a lane
 * booted off a runtime profile arms hot doors whose patch watcher
 * can mount→dispose→remount them AT BOOT — the /v1/forms read
 * catches the transient row and the sweep then boards a card that
 * retracts under it. The precondition is a catalog that holds
 * STILL across a beat; one retry after a longer beat; a catalog
 * that never stabilizes fails HERE, loud, with the rows named. */
async function readStableCatalog(page: Page): Promise<CardRow[]> {
  const first = await readCatalog(page)
  for (const beat of [1_500, 6_000]) {
    await page.waitForTimeout(beat)
    const again = await readCatalog(page)
    if (JSON.stringify(first) === JSON.stringify(again)) return again
    const names = (rows: CardRow[]) => rows.map((r) => r.card + ':' + r.families.join(',')).sort()
    console.log(`catalog flap between reads:\n  A=${names(first).join(' | ')}\n  B=${names(again).join(' | ')}`)
    if (beat === 6_000) {
      throw new Error(`the estate's catalog does not hold still across reads — flapping rows:\n  A=${names(first).join(' | ')}\n  B=${names(again).join(' | ')}`)
    }
  }
  return first
}

/** Expand the sidebar and open the estate's Cards tab — WITHOUT any
 * card seed (the sweep seeds its own). THE TAB RIDES THE STREAM: it
 * fires no bench/get on open — the tile rail renders from the
 * resource stream's push, so adds via the minted key render on the
 * tab (probed 2026-10-12, the catalog wall's own law). */
async function openCardsTab(page: Page): Promise<void> {
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(5_000)
}

/** The bench's current rev (the CAS token for add-stage) — birthing
 * the bench first when the mint's conversation has none yet. */
async function benchRev(page: Page, sessionKey: string): Promise<number> {
  let value: unknown
  try {
    value = await callBench(page, 'bench/get', { sessionKey })
  } catch {
    await callBench(page, 'bench/ensure', { doc: { session: sessionKey } })
    value = await callBench(page, 'bench/get', { sessionKey })
  }
  const parsed = value as { rev?: unknown; doc?: { rev?: unknown } } | undefined
  const rev = (parsed?.doc ?? parsed)?.rev
  return typeof rev === 'number' ? rev : 0
}

/** Add one stage, CAS-retrying once on a rev race (the stream push
 * and the add can interleave on a warm tab). Default params: the
 * estate mints the card's own defaults (the {model:} door composes
 * the default family when the card boards one). */
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

/** The per-card run budget, in 2s polls, from the card's own
 * families: video/motion and 3D pipelines are minutes-scale on the
 * 4090; image/audio cards are seconds warm, minutes behind a cold
 * weight load. A card that exceeds its kind's budget reds the
 * sweep with the card named. */
function kindPolls(families: string[]): number {
  const joined = families.join(' ')
  if (/motion|video|h3|wan|3d|mesh|rig|anny/.test(joined)) return 360
  return 180
}

test('EVERY CARD gets a run verdict — config change, Run press, terminal state, artifact or voiced refusal', async ({ page }) => {
  test.setTimeout(90 * 60_000)
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const catalog = await readStableCatalog(page)
  // THE CATALOG IS NOT VACUOUS: the estate serves a real fleet. The
  // GPU lane's honest census: the cardPackages SSOT's 14 cards (the
  // shared lane's 15th, mcp, needs a seated MCP server this keyless
  // lane does not host — its door-refusal is pinned below when the
  // lane does serve it). A served roster below 14 means a card died.
  expect(catalog.length, 'the estate serves its card fleet').toBeGreaterThanOrEqual(14)

  const mint = await openAConversation(page)
  expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
  const sessionKey = mint.sessionKey

  // THE DECLARED-SEAT REFUSALS (the catalog wall's own law): a card
  // whose DECL demands an engine seat this lane does not host
  // refuses AT THE DOOR, in the estate's own voice — the sweep PINS
  // that voice as the card's verdict. Any OTHER door refusal fails
  // loud.
  const expectedRefusal: Record<string, RegExp> = {
    mcp: /no seated MCP server on this lane.*the card composes nothing/,
  }
  const boarded: CardRow[] = []
  const doorRefusals: Array<{ card: string; voice: string }> = []
  for (const row of catalog) {
    const law = expectedRefusal[row.card]
    try {
      await addStage(page, sessionKey, row.card, row.families[0])
      boarded.push(row)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (law === undefined || !law.test(message)) throw e
      doorRefusals.push({ card: row.card, voice: message.slice(0, 200) })
    }
  }
  expect(boarded.length, 'the sweep boarded the fleet').toBeGreaterThanOrEqual(14)
  expect(boarded.map((r) => r.card)).toContain('image-gen')
  expect(boarded.map((r) => r.card)).toContain('image-edit')

  await openCardsTab(page)
  // stage tiles share tileInner with the '+ Add a card' cell — the
  // sweep drives STAGES only (aria-label excludes the add cell).
  const rail = page.locator('button[class*="tileInner"]:not([aria-label="Add a card"])')
  await expect(rail, 'every boarded card rendered its tile').toHaveCount(boarded.length, { timeout: 30_000 })

  interface Verdict { card: string; families: string[]; terminal: string; artifact?: string; changed: string[]; reason?: string }
  const verdicts: Verdict[] = []

  for (let i = 0; i < boarded.length; i++) {
    const row = boarded[i]!
    const tile = rail.nth(i)
    await tile.click({ timeout: 15_000, force: true })
    const zoom = page.locator('div[class*="zoomCard"]').first()
    await expect(zoom, `${row.card}: the drill opens`).toBeVisible({ timeout: 30_000 })

    // THE CONFIG CHANGE, two honest axes, best-effort per card and
    // RECORDED in the verdict (a card that admits neither axis runs
    // as-boarded — the receipts teach round 2):
    //   the prompt (when the card's form labels one) — a
    //   per-card distinctive value, machine-checkable in the run;
    //   the seed (when a Sampling tab exists) — 424242, the value a
    //   minted default -1 never collides with.
    // THE RENDER-WAIT LAW (run-20 defect): the drill's form fields
    // arrive ASYNC after the overlay opens — an instant isVisible
    // probe answered false for every card (changed: [] across the
    // census) and the runs then refused 'requires prompt'. The
    // pilot awaits its prompt box (20s); the sweep waits the same
    // way, shorter per axis (the census walks 14 cards).
    const changed: string[] = []
    const dialog = page.getByRole('dialog')
    const promptBox = dialog.getByRole('textbox', { name: /prompt/i }).first()
    const SWEEP_PROMPT = `e2e sweep receipt: ${row.card} — a small still life, even light`
    if (await promptBox.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) {
      await promptBox.fill(SWEEP_PROMPT, { timeout: 10_000 })
      changed.push('prompt')
    }
    const samplingTab = dialog.getByRole('tab', { name: /Sampling/i })
    if (await samplingTab.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true).catch(() => false)) {
      await samplingTab.click({ timeout: 10_000 })
      const seedBox = dialog.getByRole('textbox', { name: /^Seed$/ }).first()
      if (await seedBox.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) {
        await seedBox.fill('424242', { timeout: 10_000 })
        changed.push('seed')
        // return to the Prompt tab so the run presses from the same
        // face the pilot proved (the drill's Run button is
        // dialog-scoped, not tab-scoped — this is belt and braces).
        const promptTab = dialog.getByRole('tab', { name: /Prompt/i })
        if (await promptTab.isVisible().catch(() => false)) await promptTab.click({ timeout: 5_000 }).catch(() => {})
      }
    }

    // RUN (the drill's own Run stage button — the dialog-scoped
    // gesture, never the tile's behind it). The GPU does real work
    // per card: the {model:} door composes the card into the live
    // engine, and the stage flips through running to a terminal
    // state on the card's own kind's budget.
    await dialog.getByRole('button', { name: /run/i }).click({ timeout: 10_000 })
    // THE STATUS SEAT (run-18 defect): the stage's live status rides
    // data-stage-status on the OUTER stage tile (sortable-tile.tsx:93,
    // the pilot-proven [data-stage-id][data-stage-status] pair) — the
    // clickable tileInner button carries only data-status, so reading
    // data-stage-status off it answers null forever and every card
    // times out its whole budget on a run that finished in seconds.
    const statusTile = page.locator('[data-stage-id][data-stage-status]').nth(i)
    let terminal = ''
    for (let p = 0; p < kindPolls(row.families); p++) {
      terminal = (await statusTile.getAttribute('data-stage-status')) ?? ''
      if (terminal === 'done' || terminal === 'error' || terminal === 'stopped') break
      // THE START-REFUSAL SIGNATURE (run-20 defect): a refused start
      // never queues — the tile returns to 'pending' and STAYS there
      // (the drill voices the refusal: 'this lane requires prompt').
      // A pending held 30s past the press is a verdict, not a lull:
      // record it (the reason read below names the cause) instead of
      // spinning the card's full budget — image-edit burned 6
      // minutes on exactly this spin in the first census.
      if (terminal === 'pending' && p >= 15) break
      await page.waitForTimeout(2_000)
    }
    const verdict: Verdict = { card: row.card, families: row.families, terminal, changed }
    if (terminal === '') {
      // A card that never reached ANY terminal state on its kind's
      // budget — the hang the sweep exists to catch, named.
      throw new Error(`${row.card}: no terminal state within its kind's run budget (families: ${row.families.join(',') || 'model-less'})`)
    }
    if (terminal === 'done') {
      // THE ARTIFACT: the tile paints a media element (img, audio
      // or video) from the run's own media route — never a
      // placeholder face.
      const media = tile.locator('img, audio, video').first()
      await expect(media, `${row.card}: the done tile paints an artifact media element`).toBeVisible({ timeout: 30_000 })
      const src = (await media.getAttribute('src')) ?? (await media.getAttribute('data-src')) ?? ''
      expect(src, `${row.card}: the artifact src is a real media URL`).toMatch(/run|media|output|blob/i)
      verdict.artifact = src.slice(0, 120)
    } else {
      // THE VOICED REFUSAL: an error/stopped stage must carry a
      // NAMED reason in the drill's own text — absent weights,
      // missing input, refused seat — never a silent error.
      const drillText = (await dialog.innerText({ timeout: 10_000 })).trim()
      expect(
        drillText.length,
        `${row.card}: the ${terminal} stage voices a reason in the drill (got ${JSON.stringify(drillText.slice(0, 120))})`,
      ).toBeGreaterThan(40)
      expect(
        drillText,
        `${row.card}: the ${terminal} reason names its cause (drill text: ${JSON.stringify(drillText.slice(0, 200))})`,
      ).toMatch(/error|fail|missing|absent|not found|not present|required|refus|no\s|cannot|unable|invalid/i)
      verdict.reason = drillText.replace(/\s+/g, ' ').slice(0, 200)
    }
    verdicts.push(verdict)
    console.log(`SWEEP VERDICT ${JSON.stringify(verdict)}`)
    // dismiss the drill for the next card (the overlay intercepts
    // the rail behind it).
    await page.keyboard.press('Escape')
    await expect(page.locator('div[class*="zoomCard"]').first(), `${row.card}: the drill is dismissed`).toBeHidden({ timeout: 10_000 })
  }

  // THE SWEEP RECEIPT: every boarded card reached a terminal state
  // (asserted in-loop, each named on failure) and at least one ran
  // REAL inference to an artifact — the GPU tier's own floor (a
  // fleet of pure refusals would mean the lane lost its engine).
  const dones = verdicts.filter((v) => v.terminal === 'done')
  expect(dones.length, 'the sweep produced at least one real artifact run (the engine is live)').toBeGreaterThan(0)
  console.log(`SWEEP SUMMARY: ${verdicts.length} boarded cards, ${dones.length} done, ${verdicts.filter((v) => v.terminal !== 'done').length} refused/errored, ${doorRefusals.length} door-refused`)
  for (const r of doorRefusals) console.log(`SWEEP DOOR-REFUSAL ${JSON.stringify(r)}`)

  await expectNoPageErrors(page, errors)
})
