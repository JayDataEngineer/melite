// gallery-ghosts.spec — NOTHING RENDERS THAT THE ESTATE DOES NOT
// SERVE (the browser plane, 2026-10-19). The operator's ghost law:
// a run the feed does not list must never own a tile, by every path
// a phantom can arrive — a malformed run dir on disk, a record
// deleted from under the panel, and the panel's own delete verb.
// The agreement is the same three-way count as gallery-history
// (door ⟺ pill ⟺ wands), driven across a plant/remove cycle.
//
// THE PLANT GUARD (never the operator's tree): the spec writes run
// dirs ONLY when E2E_RUNS_ROOT names the lane's scratch runs root —
// the canonical lane script exports it for the lane IT booted, my
// loop lane exports its own, and a manual run against the operator's
// 3088 (no E2E_RUNS_ROOT) skips the plant tests instead of touching
// data/runs. Cleanup is try/finally: a failed assert still removes
// every planted dir, so no phantom survives into the next spec.
//
// THE FILE-ERA LAW (runsList.ts buildRunCard, pinned by
// runs-list.spec): a run- dir with media but NO _flow.json is served
// as a success row — a completed run whose sidecar was lost still
// restores its media. The ghost wall asserts the law's exact shape:
// sidecar-less media IS served (never a drop), while bad dirnames
// (outside run-) and `_`-prefixed pipelines never render (never a
// phantom).
//
// THE EXCUSED VOICE: these tests delete files from under a LIVE
// render — a tile's poster read already in flight then fails loud
// (http 502 on the artifact route). That is the door's documented
// ENOENT voice for a file that vanished mid-render, not a defect:
// no product change can keep a request issued against a live URL
// from failing when the test deletes the file under it. So the
// silence assertion is scoped: every ledger entry must either be
// absent (the rule) or name a planted path the test itself removed
// (the excused voice) — anything else fails the wall. Phantom
// freedom itself is proved by the count + door assertions, never by
// the ledger's shape.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { collectPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

const RUNS_ROOT = process.env.E2E_RUNS_ROOT ?? ''
const PLANT_GUARD = 'E2E_STUDIO_URL plus E2E_RUNS_ROOT (the lane\'s scratch runs root) are not both set — the ghost wall plants run dirs and refuses to guess where the lane keeps them'

test.skip(!STUDIO_URL || RUNS_ROOT === '', PLANT_GUARD)

const SEED_PNG = new URL('./rail-overflow.png', import.meta.url)

/** The served run ids, read in-page past the boot race (the same
 *  poll grammar as gallery-history: the wait voices are transport). */
async function readRunIds(page: Page): Promise<string[]> {
  const body = await page.evaluate(async () => {
    const deadline = Date.now() + 150_000
    for (;;) {
      const res = await fetch('/infer-gallery/runs?limit=50', { headers: { accept: 'application/json' } })
      const text = await res.text().catch(() => '')
      if (!text.includes('estate/pending')) return text
      if (Date.now() > deadline) return text
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
  })
  expect(body, 'the runs door stops answering the boot race').not.toContain('estate/pending')
  return (JSON.parse(body) as { runs: Array<{ run_id: string }> }).runs.map((r) => r.run_id)
}

async function openArtifactsFace(page: Page): Promise<void> {
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: 'Media', exact: true }).first().click({ timeout: 10_000 })
  await expect(page.locator('[data-infer-media-panel]'), 'the Media panel opens').toBeVisible({ timeout: 20_000 })
}

async function refreshFeed(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'refresh' }).first().click({ timeout: 10_000 })
}

function wandsOf(page: Page) {
  return page.locator('span[aria-label="Open as cards — this run"]')
}

/** A well-formed run dir on the lane's scratch root (the lane
 *  recipe's own grammar: run-<hex>-<word>, a servable media leaf,
 *  and the _flow.json sidecar the row builder byte-scans). */
function plantRun(dir: string, prompt: string): void {
  const root = RUNS_ROOT + '/output/' + dir
  mkdirSync(root, { recursive: true })
  cpSync(SEED_PNG, root + '/preview.png')
  writeFileSync(root + '/_flow.json', JSON.stringify({
    pipeline: 'image-gen', status: 'success', created_at: Date.now(), prompt, seed: 7,
  }) + '\n')
}

function removePlanted(dirs: string[]): void {
  for (const dir of dirs) rmSync(RUNS_ROOT + '/output/' + dir, { recursive: true, force: true })
}

/** The scoped silence assertion (the excused-voice doctrine above):
 *  every ledger entry must name a planted path the test itself
 *  removed — any other entry (a real script failure, an unhandled
 *  rejection, a failed frame for a NON-planted URL) fails the wall
 *  with the full list. excused are substring matches on the entry. */
function expectNoUnexcusedErrors(errors: string[], excused: string[]): void {
  const unexcused = errors.filter((e) => !excused.some((x) => e.includes(x)))
  expect(unexcused, unexcused.join('\n')).toEqual([])
}

test('the runs feed serves exactly the lawful set — sidecar-less media reads success, bad names and _ pipelines never render', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  const planted = ['run-9f3e-ghostproof', 'run-ab12-nosidecar', 'not-a-run', 'run-77aa-badpipe']
  try {
    await settle(page)
    await openAConversation(page)
    await openArtifactsFace(page)
    const baseline = await readRunIds(page)

    // ONE well-formed plant (the control: the feed MUST grow) beside
    // THREE edge siblings: a sidecar-less media dir (the file-era
    // law serves it as success — a second MUST-grow), a dirname
    // outside the run- grammar (never served), and a `_`-prefixed
    // pipeline (the user-surface law skips it — never served).
    plantRun('run-9f3e-ghostproof', 'the ghost proof run')
    mkdirSync(RUNS_ROOT + '/output/run-ab12-nosidecar', { recursive: true })
    cpSync(SEED_PNG, RUNS_ROOT + '/output/run-ab12-nosidecar/preview.png')
    mkdirSync(RUNS_ROOT + '/output/not-a-run', { recursive: true })
    writeFileSync(RUNS_ROOT + '/output/not-a-run/_flow.json', '{"pipeline":"image-gen","status":"success","created_at":1}\n')
    mkdirSync(RUNS_ROOT + '/output/run-77aa-badpipe', { recursive: true })
    cpSync(SEED_PNG, RUNS_ROOT + '/output/run-77aa-badpipe/preview.png')
    writeFileSync(RUNS_ROOT + '/output/run-77aa-badpipe/_flow.json', '{"pipeline":"_hidden","status":"success","created_at":1}\n')

    await refreshFeed(page)
    await expect(wandsOf(page), 'the control and the file-era row land; the unlawful two never do').toHaveCount(baseline.length + 2, { timeout: 30_000 })
    await expect(page.getByText('the ghost proof run'), 'the control renders its own caption').toBeVisible({ timeout: 30_000 })
    const after = await readRunIds(page)
    expect(after, 'the door agrees: exactly the lawful two added').toEqual(expect.arrayContaining([...baseline, 'run-9f3e-ghostproof', 'run-ab12-nosidecar']))
    expect(after.length, 'the door lists no unlawful row').toBe(baseline.length + 2)
  } finally {
    removePlanted(planted)
  }
  await refreshFeed(page)
  const back = await readRunIds(page)
  await expect(wandsOf(page), 'removal leaves no phantom tile').toHaveCount(back.length, { timeout: 30_000 })

  expectNoUnexcusedErrors(errors, planted)
})

test('a run deleted from disk leaves no phantom tile on refresh', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  const planted = ['run-5d1e-vanish']
  try {
    await settle(page)
    await openAConversation(page)
    await openArtifactsFace(page)
    const baseline = await readRunIds(page)

    plantRun('run-5d1e-vanish', 'the vanishing run')
    await refreshFeed(page)
    await expect(wandsOf(page), 'the plant lands').toHaveCount(baseline.length + 1, { timeout: 30_000 })

    // Deleted from UNDER the panel: the next load must drop it, not
    // phantom it. The drop itself is pruning, never a transport
    // failure — no banner; the only ledger voice the deletion may
    // raise is the excused one (the tile's in-flight poster read).
    removePlanted(planted)
    await refreshFeed(page)
    await expect(wandsOf(page), 'the deleted run owns no tile').toHaveCount(baseline.length, { timeout: 30_000 })
    await expect(page.getByText('failed to load runs'), 'pruning is silent, never a banner').toHaveCount(0)
    const after = await readRunIds(page)
    expect(after, 'the door dropped the record too').toEqual(expect.arrayContaining(baseline))
    expect(after.length, 'the door lists exactly the baseline').toBe(baseline.length)
  } finally {
    removePlanted(planted)
  }

  expectNoUnexcusedErrors(errors, planted)
})

test('the panel delete verb unlinks the artifact file and drops its tile — the sidecar record survives', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  const planted = ['run-51ac-uiwipe']
  try {
    await settle(page)
    await openAConversation(page)
    await openArtifactsFace(page)
    const baseline = await readRunIds(page)

    plantRun('run-51ac-uiwipe', 'the ui wiped run')
    await refreshFeed(page)
    await expect(wandsOf(page), 'the plant lands').toHaveCount(baseline.length + 1, { timeout: 30_000 })

    // THE OPERATOR'S GESTURE: open the tile's drilldown, Delete,
    // confirm — the modal closes itself and the feed reloads behind
    // it. No manual refresh may be needed for the tile to die.
    // THE VERB'S TRUE CONTRACT (drilldown aria 'Delete media file',
    // MediaPanel deleteItem → artifact-delete): the FILE is unlinked,
    // never the record — the sidecar stays served, so the door keeps
    // listing the run (now artifact-less) while the grid owns no tile
    // for it. A tile for a fileless row would be the phantom; an
    // honest surviving record is not.
    const tile = page.locator('button', { hasText: 'the ui wiped run' }).first()
    await expect(tile, 'the planted tile stands').toBeVisible({ timeout: 30_000 })
    await tile.click({ timeout: 10_000 })
    await expect(page.locator('[data-testid="drill-delete"]'), 'the drilldown offers Delete').toBeVisible({ timeout: 10_000 })
    await page.locator('[data-testid="drill-delete"]').click({ timeout: 10_000 })
    await expect(page.locator('[data-testid="drill-delete-confirm"]'), 'the confirm face names the file').toBeVisible({ timeout: 10_000 })
    await page.locator('[data-testid="drill-delete-confirm"]').click({ timeout: 10_000 })
    await expect(page.locator('[data-testid="drill-delete-confirm"]'), 'the modal closes on confirm').toBeHidden({ timeout: 30_000 })
    await expect(wandsOf(page), 'the deleted file owns no tile without a manual refresh').toHaveCount(baseline.length, { timeout: 30_000 })
    await expect(page.getByText('failed to load runs'), 'the delete stays silent, never a banner').toHaveCount(0)
    const after = await readRunIds(page)
    expect(after, 'the sidecar record survives the file delete').toEqual(expect.arrayContaining([...baseline, 'run-51ac-uiwipe']))
    expect(after.length, 'the door lists exactly the baseline plus the surviving record').toBe(baseline.length + 1)
    expect(existsSync(RUNS_ROOT + '/output/run-51ac-uiwipe/preview.png'), 'the door unlinked the artifact file').toBe(false)
    expect(existsSync(RUNS_ROOT + '/output/run-51ac-uiwipe/_flow.json'), 'the sidecar survives beside the unlinked file').toBe(true)
    // AND IT STAYS DEAD: a manual reload must not resurrect the tile.
    await refreshFeed(page)
    await expect(wandsOf(page), 'no resurrection on reload').toHaveCount(baseline.length, { timeout: 30_000 })
  } finally {
    removePlanted(planted)
  }

  expectNoUnexcusedErrors(errors, planted)
})
