/**
 * E2E GPU — ANGLE 1, THE DOOR LAYER (keyless): the automotive's
 * own toggle, /melite-runs, drives the AI run doors through the
 * GUI composer, and the USER'S RUN PRESS STILL OWNS THE BENCH with
 * the doors seated (dev_docs/plans/gpu-playwright-tier-2026-10-12.md).
 *
 * The automotive (operator 2026-10-13): /melite-runs on seats
 * melite_flow + run_status for the model — the AI can then compose
 * AND run, fully autonomously. This spec pins the KEYLESS half of
 * that angle: the toggle's own surface, its state read, and the
 * interface-law regression. The KEYED half (a real LLM driving
 * discover→load→construct→melite_flow) is a later, opt-in spec.
 *
 * The walk:
 *   1. settle + mint a conversation. The keyless lane has NO model
 *      key (by design): the mint's model turn fails HONESTLY
 *      (MISSING_CREDENTIAL in chat, no console error — the pilot's
 *      zero-error ledger proved the failure is chat-surface only).
 *   2. The browser mount boots with the doors ABSENT (the
 *      interface law: the user presses Run) — the no-argument
 *      state READ says so.
 *   3. '/melite-runs on': the command's answer names the seated
 *      doors (melite_flow + run_status) — the automotive is ON.
 *   4. The state read round-trips: still ON (the seat is mount
 *      state, not a hope).
 *   5. THE RUN-PRESS REGRESSION (the operator's core fear, real
 *      GPU): with the doors seated, the user's Run press still
 *      runs the bench — the pilot's own walk, seed → drill →
 *      config change (seed 424242) → Run → done → artifact img.
 *      Seating the AI doors never steals the human path.
 *   6. '/melite-runs off' reverses it; the read says OFF.
 *   7. A page RELOAD boots a fresh mount with the doors absent
 *      again — the seat is per-mount, never persisted.
 *   8. Zero page errors / console errors across the whole tour.
 *
 * The keyless law: this spec runs ONLY through
 * scripts/e2e-gpu-lane.sh (test:e2e:gpu) — E2E_GPU=1 is that
 * launcher's own export, and the default studio config ignores
 * e2e/gpu/ entirely. Self-skips without either gate.
 */
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from '../tour.ts'

test.skip(!STUDIO_URL || process.env.E2E_GPU !== '1', 'the GPU tier needs E2E_STUDIO_URL (the gpu lane) AND E2E_GPU=1 (e2e-gpu-lane.sh — test:e2e:gpu)')

/** The open-conversation composer (the mint flips the placeholder
 * from the empty-state 'Describe what you want to build' to
 * 'Message or run a task, / commands…' — the door spec always
 * types AFTER the mint, so this is the only face it needs). */
function composerOf(page: Page) {
  return page.getByRole('textbox', { name: /Message or run a task/i }).first()
}

/** Type a slash command into the composer and submit it. The
 * command palette opens on the leading '/' but Enter submits the
 * full line verbatim (probed live: the composer holds
 * '/melite-runs on' and the handler receives the argument). The
 * trailing space on no-argument reads keeps the submit on the
 * full-line path the probe proved. */
async function runCommand(page: Page, line: string): Promise<void> {
  const composer = composerOf(page)
  await composer.click({ timeout: 10_000 })
  await composer.fill(line.endsWith(' ') || line.includes(' ') ? line : `${line} `)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1_500)
}

/** The pilot's seed law, image-gen variant: bench/ensure births
 * the conversation's bench, add-stage lands the card row CAS'd on
 * the live rev, idempotent on an existing image-gen stage. */
async function seedBenchImageGen(page: Page, sessionKey: string): Promise<void> {
  let value: unknown
  try {
    value = await callBench(page, 'bench/get', { sessionKey })
  } catch {
    await callBench(page, 'bench/ensure', { doc: { session: sessionKey } })
    value = await callBench(page, 'bench/get', { sessionKey })
  }
  const parsed = value as
    | { stages?: unknown[]; rev?: number; bench?: { rev?: number }; doc?: { stages?: unknown[]; rev?: number }; bench2?: never }
    | undefined
  const doc = (parsed as { doc?: unknown } | undefined)?.doc ?? parsed ?? {}
  const stages = Array.isArray((doc as { stages?: unknown[] }).stages) ? (doc as { stages?: unknown[] }).stages : []
  const revNum = (doc as { rev?: unknown }).rev
  const benchRev = (doc as { bench?: { rev?: unknown } }).bench?.rev
  const rev = typeof revNum === 'number' ? revNum : typeof benchRev === 'number' ? benchRev : 0
  if (stages.some((s) => typeof s === 'object' && s !== null && 'card' in s && (s as { card?: unknown }).card === 'image-gen')) return
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: {
      card: 'image-gen',
      engine: 'comfyui',
      params: { model: 'z-image', prompt: 'a red cube on a wooden table, studio light', seed: -1 },
      inputs: {},
      outputs: { default: 'image' },
      expect_rev: rev,
      author: 'user',
    },
  })
}

test('the automotive doors: /melite-runs seats the AI run doors and the Run press still owns the bench', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  // 1 — settle + mint; the keyless mint's model turn fails HONESTLY
  await settle(page)
  const { sessionKey } = await openAConversation(page)
  expect(sessionKey, 'the mint named a session key').not.toBe('')
  await expect(
    page.getByText('MISSING_CREDENTIAL').first(),
    'the keyless lane has no model key — the mint turn fails honestly in chat',
  ).toBeVisible({ timeout: 30_000 })

  // 2 — the browser mount boots with the doors ABSENT (the
  //     interface law): the no-argument read says OFF.
  await runCommand(page, '/melite-runs')
  await expect(
    page.getByText('runs start at the user').last(),
    'a fresh browser mount boots with the AI run doors absent',
  ).toBeVisible({ timeout: 15_000 })

  // 3 — ON: the command's answer names the seated doors.
  await runCommand(page, '/melite-runs on')
  await expect(
    page.getByText('melite_flow + run_status seated').last(),
    'the toggle-ON answer names the automotive doors',
  ).toBeVisible({ timeout: 15_000 })

  // 4 — the state read round-trips: still ON (mount state).
  await runCommand(page, '/melite-runs')
  await expect(
    page.getByText('melite_flow + run_status seated').last(),
    'the no-argument read reports the doors still seated',
  ).toBeVisible({ timeout: 15_000 })

  // 5 — THE RUN-PRESS REGRESSION (real GPU): doors seated, the
  //     user's Run press still runs the bench. The pilot's own
  //     walk, compressed to its machine-checkable spine.
  await seedBenchImageGen(page, sessionKey)
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Media Flow/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(7_000)
  const tile = page.locator('[data-stage-id][data-stage-status]').first()
  await expect(tile, 'the seeded image-gen stage renders a tile').toBeVisible({ timeout: 30_000 })
  await tile.click()
  const promptBox = page.getByRole('textbox', { name: /prompt/i }).first()
  await expect(promptBox, 'the drill renders the prompt field').toBeVisible({ timeout: 20_000 })
  const EDITED_PROMPT = 'a glass pyramid on black velvet, single spotlight'
  await promptBox.fill(EDITED_PROMPT)
  await page.getByRole('tab', { name: /Sampling/i }).click()
  const seedBox = page.getByRole('textbox', { name: /^Seed$/ }).first()
  await expect(seedBox, 'the Sampling tab renders the seed field').toBeVisible({ timeout: 10_000 })
  await seedBox.fill('424242')
  await page.getByRole('dialog').getByRole('button', { name: /run/i }).click()
  const statusTile = page.locator('[data-stage-id][data-stage-status]').first()
  let terminal = ''
  for (let i = 0; i < 210; i++) {
    terminal = (await statusTile.getAttribute('data-stage-status')) ?? ''
    if (terminal === 'done' || terminal === 'error' || terminal === 'stopped') break
    await page.waitForTimeout(2_000)
  }
  expect(terminal, `with the doors seated the user's Run press still runs the GPU (got '${terminal}')`).toBe('done')
  const artifactImg = page.locator('[data-stage-id] img').first()
  await expect(artifactImg, 'the success tile paints an artifact image').toBeVisible({ timeout: 30_000 })
  const src = await artifactImg.getAttribute('src')
  expect(src, 'the artifact src is a real media URL').toMatch(/run|media|output/i)
  const benchValue = await callBench(page, 'bench/get', { sessionKey }) as
    | { stages?: unknown[]; doc?: { stages?: unknown[] } }
    | undefined
  const benchDoc = benchValue?.doc ?? benchValue ?? {}
  const rows = (Array.isArray(benchDoc.stages) ? benchDoc.stages : []) as Array<{ card?: unknown; params?: { prompt?: unknown; seed?: unknown } }>
  const genRow = rows.find((r) => r?.card === 'image-gen')
  expect(genRow?.params?.seed, 'the bench row carries the pinned seed (server truth)').toBe(424242)

  // 6 — OFF reverses it. The drill's zoom overlay stays open after
  //     the run (the pilot ends inside it; this walk returns to the
  //     composer) — dismiss it first or it intercepts the click.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog'), 'the drill overlay is dismissed').toBeHidden({ timeout: 10_000 })
  await runCommand(page, '/melite-runs off')
  await expect(
    page.getByText('runs start at the user').last(),
    'toggle-OFF returns runs to the user press',
  ).toBeVisible({ timeout: 15_000 })

  // 7 — a reload boots a FRESH mount: the doors are absent again
  //     (the seat is per-mount, never persisted).
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settle(page)
  await runCommand(page, '/melite-runs')
  await expect(
    page.getByText('runs start at the user').last(),
    'a fresh mount boots with the doors absent (per-mount seat)',
  ).toBeVisible({ timeout: 15_000 })

  await expectNoPageErrors(page, errors)
})
