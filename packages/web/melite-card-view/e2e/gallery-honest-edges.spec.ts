// gallery-honest-edges.spec — THE TWO EDGE VOICES THE OPERATOR'S
// LAW OWNS (2026-10-19), pinned at the browser after the inline gap
// hunt (dev_docs/audits/2026-10-19-inline-gap-hunt.md):
//
// G7 — the wand on a sidecar-less run. The file-era law serves the
// run (media, no _flow.json = success row), and MediaPanel.openCards
// probes the run's sidecar FIRST. For a run with no sidecar the
// probe 404s, the draft fallback is refused (a planted run owns no
// draft), and the panel must surface the honest refusal
// (bench-load.ts:246: "that run keeps no readable sidecar (…)") —
// NEVER a ghost board: the conversation's bench stays empty and no
// tile renders. The probe's own 404 is the door's documented voice
// for exactly this ask, excused in the ledger like the ghosts'
// ENOENT 502s.
//
// G11 — the unclassifiable artifact. kindOf (MediaPanel.tsx:139)
// returns null for an extension-less URL with no type field, and a
// null-kind artifact owns NO tile — while the run still renders its
// classifiable media. The law cuts both ways: the classifiable file
// MUST render (never a drop), the unclassifiable one MUST NOT (no
// broken-img phantom for a file the grid cannot even name).
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

const RUNS_ROOT = process.env.E2E_RUNS_ROOT ?? ''
const PLANT_GUARD = 'E2E_STUDIO_URL plus E2E_RUNS_ROOT (the lane\'s scratch runs root) are not both set — the edge wall plants run dirs and refuses to guess where the lane keeps them'

test.skip(!STUDIO_URL || RUNS_ROOT === '', PLANT_GUARD)
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

const SEED_PNG = new URL('./rail-overflow.png', import.meta.url)

function plantRun(dir: string, prompt: string, withSidecar: boolean, extraFiles: string[] = []): void {
  const root = RUNS_ROOT + '/output/' + dir
  mkdirSync(root, { recursive: true })
  cpSync(SEED_PNG, root + '/preview.png')
  for (const f of extraFiles) writeFileSync(root + '/' + f, 'not media\n')
  if (withSidecar) {
    writeFileSync(root + '/_flow.json', JSON.stringify({
      pipeline: 'image-gen', status: 'success', created_at: Date.now(), prompt, seed: 7,
    }) + '\n')
  }
}

function removePlanted(dirs: string[]): void {
  for (const d of dirs) rmSync(RUNS_ROOT + '/output/' + d, { recursive: true, force: true })
}

function expectNoUnexcusedErrors(errors: string[], excused: string[]): void {
  const unexcused = errors.filter((e) => !excused.some((x) => e.includes(x)))
  expect(unexcused, unexcused.join('\n')).toEqual([])
}

async function openArtifactsFace(page: Page): Promise<void> {
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: 'Media', exact: true }).first().click({ timeout: 10_000 })
  await expect(page.locator('[data-infer-media-panel]'), 'the Media panel opens').toBeVisible({ timeout: 20_000 })
}

async function stageCount(page: Page, sessionKey: string): Promise<number> {
  const doc = (await callBench(page, 'bench/get', { sessionKey }).catch(() => null)) as
    | { stages?: unknown }
    | null
  if (doc === null || !Array.isArray(doc.stages)) return 0
  return doc.stages.length
}

test('G7: the wand on a sidecar-less run refuses honest — nothing boards, no ghost tile', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  const planted = ['run-9c4f-noside']
  try {
    await settle(page)
    const mint = await openAConversation(page)
    await callBench(page, 'bench/ensure', { doc: { session: mint.sessionKey } })
    expect(await stageCount(page, mint.sessionKey), 'the bench starts empty').toBe(0)

    await openArtifactsFace(page)
    plantRun('run-9c4f-noside', 'the no sidecar run', false)
    await page.getByRole('button', { name: 'refresh' }).first().click({ timeout: 10_000 })

    // The file-era law served the run: its tile stands — located by
    // its ARTIFACT URL (a sidecar-less run keeps no prompt, so no
    // caption text exists to find).
    const tile = page.locator('button', { has: page.locator('img[src*="run-9c4f-noside%2Fpreview.png"]') }).first()
    await expect(tile, 'the sidecar-less run is served (file-era law)').toBeVisible({ timeout: 30_000 })

    // THE GESTURE: the run's own wand.
    await tile.locator('span[aria-label="Open as cards — this run"]').click({ timeout: 10_000 })

    // THE HONEST REFUSAL, verbatim (bench-load.ts:246).
    await expect(page.getByText('that run keeps no readable sidecar', { exact: false })).toBeVisible({ timeout: 20_000 })

    // NEVER A GHOST BOARD: the bench stays empty, no tile renders.
    await page.waitForTimeout(3_000)
    expect(await stageCount(page, mint.sessionKey), 'no stage boarded from a sidecar-less run').toBe(0)
    const rail = page.locator('button[class*="tileInner"]:not([aria-label="Add a card"])')
    expect(await rail.count(), 'no tile renders from a sidecar-less run').toBe(0)
  } finally {
    removePlanted(planted)
  }

  // The probe's own 404 is the door's documented voice for this ask.
  expectNoUnexcusedErrors(errors, ['run-9c4f-noside'])
})

test('G11: an unclassifiable artifact never owns a tile — the classifiable one beside it still renders', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  const planted = ['run-2e8d-kinds']
  try {
    await settle(page)
    await openAConversation(page)
    await openArtifactsFace(page)

    plantRun('run-2e8d-kinds', 'the kinds run', true, ['mystery'])
    await page.getByRole('button', { name: 'refresh' }).first().click({ timeout: 10_000 })

    // THE CLASSIFIABLE FILE RENDERS (never a drop): a served image
    // tile whose artifact URL names this run's preview.
    const img = page.locator(`img[src*="run-2e8d-kinds%2Fpreview.png"]`)
    await expect(img.first(), 'the classifiable artifact owns its tile').toBeVisible({ timeout: 30_000 })

    // THE UNCLASSIFIABLE FILE NEVER RENDERS (no broken-img phantom):
    // nothing on the panel names it — no img, no caption, no alt.
    await expect(page.locator('img[src*="run-2e8d-kinds%2Fmystery"]'), 'no img serves the unclassifiable file').toHaveCount(0)
    await expect(page.getByText('mystery', { exact: false }), 'nothing captions the unclassifiable file').toHaveCount(0)

    // THE RUN ITSELF STANDS (one wand — the ghost law holds at the
    // run tier even when an artifact is skipped at the tile tier).
    await expect(
      page.locator('button', { hasText: 'the kinds run' }).locator('span[aria-label="Open as cards — this run"]'),
      'the run keeps its wand',
    ).toHaveCount(1)
  } finally {
    removePlanted(planted)
  }

  expectNoUnexcusedErrors(errors, planted)
})
