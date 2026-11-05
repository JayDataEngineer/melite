/**
 * E2E: THE AUTHORING-INCOMPLETE JOURNEY (the tts GUI-add burn,
 * 2026-11-14: "TTS: stage 's_6' (tts) would not compose … this lane
 * requires 'text' — 'text' is not stated"). The GUI's ADD refused a
 * textless tts card because the pre-mint projection gate re-voiced
 * the run door's required-word refusal at the WRITE seat — the words
 * are typed in the form that exists only AFTER the stage lands, so
 * the refusal was the chicken-and-egg. The cure (commit 73f69c20a):
 * the authoring-incomplete class NEVER refuses a write seat; the run
 * press owns the required-word voice.
 *
 * The code halves are pinned unit-side (bench-premint-compose arms
 * 22-24; gate-tails' keep-the-code arm). THIS arm rides the whole
 * journey the operator's burn crossed — the GUI's exact add shape
 * through bench/add-stage, the bench diff, the drilled form, the
 * press's refusal voice, the typed words landing through the
 * keystroke door. A red here names the dead hop; no in-process wall
 * can see it.
 *
 * Rides the host's REOPENED conversation (no mint, no AI call).
 * Self-skips without E2E_STUDIO_URL.
 */
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, settle, STUDIO_URL } from './tour.ts'
test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')

/** The bench row through the estate's own door (flat value: rev, stages). */
async function benchRow(page: Page, sessionKey: string): Promise<{ rev: number; stages: Array<Record<string, unknown>> }> {
  const value = await callBench(page, 'bench/get', { sessionKey }) as Record<string, unknown>
  return {
    rev: typeof value['rev'] === 'number' ? value['rev'] : 0,
    stages: Array.isArray(value['stages']) ? value['stages'] as Array<Record<string, unknown>> : [],
  }
}

test('the textless tts add LANDS, the press voices the words, typing cures (the GUI-add burn)', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  await settle(page)

  // the sidebar breath first: the marker lands once the shell has
  // rendered its reopened session (the journey arm's order law — a
  // fresh page's expand seat exists until the bench face engages;
  // 30s owns a cold host's activation grace)
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  const sessionKey = await page.waitForFunction(() => {
    try {
      const raw = window.localStorage.getItem('dsh.sessions.current') ?? ''
      const id = (JSON.parse(raw) as { sessionId?: unknown })?.sessionId
      return typeof id === 'string' && id !== '' ? id : ''
    } catch { return '' }
  }, undefined, { timeout: 20_000 }).then((v) => v.jsonValue(), () => '')
  expect(sessionKey, 'no open conversation key on the host').not.toEqual('')

  // clear every stage: the add must be judged on a clean bench, and
  // the expect_rev arithmetic must be honest
  let cursor = 0
  {
    const row = await benchRow(page, sessionKey)
    cursor = row.rev
    for (const s of row.stages) {
      if (typeof s['id'] !== 'string') continue
      await callBench(page, 'bench/remove-stage', { sessionKey, doc: { stage: s['id'], expect_rev: cursor } })
      cursor += 1
    }
  }

  // STEP 1 — THE BURN'S ADD: the GUI door's exact shape (axis seeds,
  // NO text). Pre-cure this call REFUSED with "this lane requires
  // 'text'". Post-cure it LANDS.
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: {
      card: 'tts',
      author: 'user',
      expect_rev: cursor,
      params: { model: 'qwen3-tts', variant: 'customvoice', voice: null },
    },
  })

  // STEP 2 — the bench diff is the truth: the row is aboard, the rev
  // consumed, the words honestly absent
  const after = await benchRow(page, sessionKey)
  const row = after.stages.find((s) => s['card'] === 'tts')
  expect(row, 'the bench diff shows no tts row — the door said yes but nothing landed').toBeDefined()
  expect((row?.['params'] as Record<string, unknown> | undefined)?.['text'], 'the add seeded text — this is not the burn shape').toBeUndefined()
  expect(after.rev, 'the rev was not consumed').toBeGreaterThan(cursor)

  // STEP 3 — the form exists: drill the tile (the TILE BUTTON owns
  // the onClick); the words box must be on screen for a textless row.
  // The bench face is already engaged from the open above (the
  // expand seat exists only when collapsed).
  const tile = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: /tts/i }).first()
  await tile.waitFor({ state: 'visible', timeout: 30_000 })
  await tile.click({ timeout: 10_000 })
  const words = page.getByLabel('Text to Speak')
  await words.waitFor({ state: 'visible', timeout: 20_000 })

  // STEP 4 — THE RUN PRESS owns the required-word voice: press Run
  // while textless; the refusal NAMES the words (the class voice)
  await page.locator('[data-testid="drill-run"]').click({ timeout: 10_000 })
  const voiced = await page.waitForFunction(
    () => /speaks words|requires 'text'|text is not stated/i.test(document.body.textContent ?? ''),
    undefined,
    { timeout: 30_000 },
  ).then(() => true, () => false)
  expect(voiced, 'the run press did not voice the required word — the run door owns the class voice').toBe(true)

  // STEP 5 — TYPE THE WORDS through the form's real keystroke door
  // (the trailing write-through → drafts/patch): the form exists
  // BECAUSE the add landed — the operator's cure path
  await words.fill('The lanterns are lit. I move at dusk.')
  await page.waitForTimeout(1500) // the 300ms trailing coalesce + the door's landing
  const typed = await benchRow(page, sessionKey)
  const typedRow = typed.stages.find((s) => s['card'] === 'tts')
  expect((typedRow?.['params'] as Record<string, unknown> | undefined)?.['text'],
    'the typed text did not land on the bench row').toEqual('The lanterns are lit. I move at dusk.')

  await expectNoPageErrors(page, errors)
})
