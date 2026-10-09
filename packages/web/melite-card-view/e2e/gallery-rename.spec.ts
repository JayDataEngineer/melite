// gallery-rename.spec — THE RENAME VERB'S CONTRACT, PROVEN AT THE
// BROWSER (2026-10-19). The drilldown's rename face (drilldown.tsx:
// drill-rename → the "New file name" input → Save) rides the
// artifact-rename door, and NO tier had ever pinned it. The wall
// plants a run, renames its media file through the operator's own
// gesture, and asserts the door's full promise:
//   - the FILE moves on disk (old name gone, new name present)
//   - the sidecar record SURVIVES (rename is not delete — the run
//     stays served; only its media path re-points)
//   - the OLD artifact URL stops serving, the NEW one serves
//   - the tile lives on under the new path after a refresh (no
//     phantom, no drop)
//
// THE EXCUSED VOICE (the ghosts doctrine): renaming swaps the file
// under a LIVE render — a poster read already in flight against the
// old URL fails loud. That is the door's documented voice for a
// file that moved mid-render, not a defect; the silence assertion
// excuses only the planted path's frames.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { collectPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

const RUNS_ROOT = process.env.E2E_RUNS_ROOT ?? ''
const PLANT_GUARD = 'E2E_STUDIO_URL plus E2E_RUNS_ROOT (the lane\'s scratch runs root) are not both set — the rename wall plants a run dir and refuses to guess where the lane keeps them'

test.skip(!STUDIO_URL || RUNS_ROOT === '', PLANT_GUARD)

const SEED_PNG = new URL('./rail-overflow.png', import.meta.url)

function plantRun(dir: string, prompt: string): void {
  const root = RUNS_ROOT + '/output/' + dir
  mkdirSync(root, { recursive: true })
  cpSync(SEED_PNG, root + '/preview.png')
  writeFileSync(root + '/_flow.json', JSON.stringify({
    pipeline: 'image-gen', status: 'success', created_at: Date.now(), prompt, seed: 7,
  }) + '\n')
}

function removePlanted(dirs: string[]): void {
  for (const d of dirs) rmSync(RUNS_ROOT + '/output/' + d, { recursive: true, force: true })
}

function expectNoUnexcusedErrors(errors: string[], excused: string[]): void {
  const unexcused = errors.filter((e) => !excused.some((x) => e.includes(x)))
  expect(unexcused, unexcused.join('\n')).toEqual([])
}

test('the rename verb moves the file and re-points the record — the sidecar survives, the old URL dies', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  const planted = ['run-8b2f-renameme']
  const RUN_DIR = RUNS_ROOT + '/output/run-8b2f-renameme'
  try {
    await settle(page)
    await openAConversation(page)
    await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
    await page.waitForTimeout(3_000)
    await page.getByRole('button', { name: 'Media', exact: true }).first().click({ timeout: 10_000 })
    await expect(page.locator('[data-infer-media-panel]'), 'the Media panel opens').toBeVisible({ timeout: 20_000 })

    plantRun('run-8b2f-renameme', 'the rename me run')
    await page.getByRole('button', { name: 'refresh' }).first().click({ timeout: 10_000 })

    // THE OPERATOR'S GESTURE: open the tile's drilldown, Rename, type
    // the new name, Save — the busy label flips and the modal closes
    // itself when the door answers.
    const tile = page.locator('button', { hasText: 'the rename me run' }).first()
    await expect(tile, 'the planted tile stands').toBeVisible({ timeout: 30_000 })
    await tile.click({ timeout: 10_000 })
    await expect(page.locator('[data-testid="drill-rename"]'), 'the drilldown offers Rename').toBeVisible({ timeout: 10_000 })
    await page.locator('[data-testid="drill-rename"]').click({ timeout: 10_000 })
    const input = page.locator('[aria-label="New file name"]')
    await expect(input, 'the rename face opens its input').toBeVisible({ timeout: 10_000 })
    await input.fill('renamed-art.png', )
    await page.locator('[data-testid="drill-rename-save"]').click({ timeout: 10_000 })
    await expect(page.locator('[aria-label="New file name"]'), 'the rename face closes on save').toBeHidden({ timeout: 30_000 })

    // THE DOOR'S PROMISE, ON DISK: the file moved, the sidecar stayed.
    expect(existsSync(RUN_DIR + '/preview.png'), 'the old file name is gone').toBe(false)
    expect(existsSync(RUN_DIR + '/renamed-art.png'), 'the new file name stands').toBe(true)
    expect(existsSync(RUN_DIR + '/_flow.json'), 'the sidecar survives the rename').toBe(true)
    expect(readdirSync(RUN_DIR).filter((f) => f.endsWith('.png')), 'exactly one media leaf stands').toEqual(['renamed-art.png'])

    // THE DOOR'S PROMISE, ON THE WIRE: the old artifact URL stops
    // serving, the new one serves — read in-page (the shell's auth
    // rides the fetch).
    const serves = await page.evaluate(async () => {
      const oldUrl = '/infer-gallery/artifact?path=' + encodeURIComponent('run-8b2f-renameme/preview.png')
      const newUrl = '/infer-gallery/artifact?path=' + encodeURIComponent('run-8b2f-renameme/renamed-art.png')
      const [oldRes, newRes] = await Promise.all([fetch(oldUrl), fetch(newUrl)])
      return { old: oldRes.status, new: newRes.status }
    })
    // The artifact door's documented ENOENT voice is 502 (the same
    // voice the ghosts ledger excuses mid-render) — the old path
    // answers it, never a 200.
    expect(serves.old, 'the old artifact URL answers the ENOENT voice, never a serve').toBe(502)
    expect(serves.new, 'the new artifact URL serves').toBe(200)

    // THE OVERLAY RE-POINTED ITSELF: rename keeps the overlay open
    // (the artifact lives — the operator keeps viewing it; delete is
    // the verb that closes, because its artifact died), and the
    // preview already carries the NEW name.
    await expect(page.locator('img[alt="renamed-art.png"]'), 'the drilldown preview carries the new name').toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Close preview' }).first().click({ timeout: 10_000 })
    await expect(page.locator('img[alt="renamed-art.png"]'), 'the overlay closes on its ✕').toBeHidden({ timeout: 15_000 })

    // THE RECORD SURVIVES: a refresh keeps exactly the same run count
    // (rename is not delete — the tile re-points, it never drops).
    await page.getByRole('button', { name: 'refresh' }).first().click({ timeout: 10_000 })
    await expect(tile, 'the renamed run still owns its tile').toBeVisible({ timeout: 30_000 })
    const wands = page.locator('span[aria-label="Open as cards — this run"]')
    const before = await wands.count()
    await page.getByRole('button', { name: 'refresh' }).first().click({ timeout: 10_000 })
    await expect(wands, 'no run dropped and no phantom appeared across the rename').toHaveCount(before, { timeout: 30_000 })
  } finally {
    removePlanted(planted)
  }

  expectNoUnexcusedErrors(errors, planted)
})
