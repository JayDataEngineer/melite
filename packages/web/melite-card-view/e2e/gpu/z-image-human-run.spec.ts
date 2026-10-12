/**
 * E2E GPU — ANGLE 2, THE PILOT: a human runs the image-gen card
 * (z-image) with configuration changes, and REAL GPU inference
 * answers (dev_docs/plans/gpu-playwright-tier-2026-10-12.md).
 *
 * The human path, exactly as the operator drives it:
 *   1. settle + mint a conversation (the tour spine — never host
 *      history) and seed its bench with an image-gen stage boarding
 *      z-image (weights present on this machine).
 *   2. Open the cards tab; the stage tile renders.
 *   3. Click the tile: the zoom drill opens (params left, Run
 *      right).
 *   4. CHANGE THE CONFIGURATION: type a NEW prompt and pin the seed
 *      (424242 — the value the minted default -1 never collides
 *      with; the CONFIG-CHANGE receipt below reads it back).
 *   5. Press Run. THE GPU DOES REAL WORK: the run composes through
 *      the estate's {model:} door into the live engine, the stage
 *      flips running → success, and the tile paints an artifact
 *      <img> served from the run's own media route.
 *   6. THE CONFIG-CHANGE RECEIPT, both truths: the bench row read
 *      back through the estate's own door carries the EDITED prompt
 *      and the pinned seed (the run ran what the user SAW — the
 *      write-then-run seam, stage-run.ts:56), and the drill's form
 *      holds the values (UI truth).
 *   7. Zero page errors / console errors across the tour.
 *
 * The keyless law: this spec runs ONLY through
 * scripts/e2e-gpu-lane.sh (test:e2e:gpu) — E2E_GPU=1 is that
 * launcher's own export, and the default studio config ignores
 * e2e/gpu/ entirely. Self-skips without either gate, never a fake
 * red on a GPUless host.
 */
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from '../tour.ts'

test.skip(!STUDIO_URL || process.env.E2E_GPU !== '1', 'the GPU tier needs E2E_STUDIO_URL (the gpu lane) AND E2E_GPU=1 (e2e-gpu-lane.sh — test:e2e:gpu)')

/** The tour's seedBenchH3 law, image-gen variant: bench/ensure
 * births the conversation's bench, add-stage lands the card row
 * CAS'd on the live rev, idempotent on an existing image-gen
 * stage. The estate's own doors, never a disk write. */
async function seedBenchImageGen(page: Page, sessionKey: string): Promise<void> {
  let value: unknown
  try {
    value = await callBench(page, 'bench/get', { sessionKey })
  } catch {
    await callBench(page, 'bench/ensure', { doc: { session: sessionKey } })
    value = await callBench(page, 'bench/get', { sessionKey })
  }
  const parsed = value as
    | { stages?: unknown[]; rev?: number; bench?: { rev?: number }; doc?: { stages?: unknown[]; rev?: number; bench?: { rev?: number } } }
    | undefined
  const doc = parsed?.doc ?? parsed ?? {}
  const stages = Array.isArray(doc.stages) ? doc.stages : []
  const rev = typeof doc.rev === 'number' ? doc.rev : typeof doc.bench?.rev === 'number' ? doc.bench.rev : 0
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

test('a human runs image-gen (z-image) with configuration changes — real GPU inference answers', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  // 1 — settle + mint (the tour spine; never host history)
  await settle(page)
  const { sessionKey } = await openAConversation(page)
  expect(sessionKey, 'the mint named a session key (the bench seed needs it)').not.toBe('')

  // 2 — seed this conversation's bench, then open the cards tab
  // (ORDER IS LOAD-BEARING: the tab's landing view reads the bench
  // once at open — the tour's own law).
  await seedBenchImageGen(page, sessionKey)
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Media Flow/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(7_000)

  // 3 — the image-gen tile renders with its live status
  const tile = page.locator('[data-stage-id][data-stage-status]').first()
  await expect(tile, 'the seeded image-gen stage renders a tile').toBeVisible({ timeout: 30_000 })

  // 4 — open the zoom drill (params left, Run right)
  await tile.click()
  const promptBox = page.getByRole('textbox', { name: /prompt/i }).first()
  await expect(promptBox, 'the drill renders the prompt field (the config surface)').toBeVisible({ timeout: 20_000 })

  // 5 — CHANGE THE CONFIGURATION: a NEW prompt + a pinned seed. The
  // seed pin is the machine-checkable half of the change (a fixed
  // value the minted -1 never collides with); the prompt is the
  // human half — both ride the SAME write-then-run seam. The seed
  // field lives under the drill's Sampling TAB (the form is
  // schema-grouped; only the open tab's fields are in the DOM) and
  // renders as a RAW-STRING textbox (atoms.tsx:372 — "seed, text —
  // the raw-string Input"; the estate coerces once at patch), never
  // a number input.
  const EDITED_PROMPT = 'a blue sphere on a glass pedestal, overcast light'
  await promptBox.fill(EDITED_PROMPT)
  await page.getByRole('tab', { name: /Sampling/i }).click()
  const seedBox = page.getByRole('textbox', { name: /^Seed$/ }).first()
  await expect(seedBox, 'the Sampling tab renders the seed field (the config surface)').toBeVisible({ timeout: 10_000 })
  await seedBox.fill('424242')

  // 6 — RUN (the drill's own Run stage button — the dialog-scoped
  // gesture, never the tile's behind it). The GPU does real work:
  // the {model:} door composes the card into the live engine
  // (127.0.0.1:8188 — the lane's engine row), the stage flips
  // through running to a terminal state, and the tile paints an
  // artifact <img> from the run's media route.
  await page.getByRole('dialog').getByRole('button', { name: /run/i }).click()
  const statusTile = page.locator('[data-stage-id][data-stage-status]').first()
  // THE GPU RENDER WINDOW (the CardStatus vocabulary: pending |
  // queued | running → done | error | stopped): z-image turbo on a
  // 4090 is seconds warm, minutes behind a cold load of the int8
  // weights — the window covers the cold case; a FAILED run reds
  // with the stage's own terminal status, never a timeout-only
  // verdict.
  let terminal = ''
  for (let i = 0; i < 210; i++) {
    terminal = (await statusTile.getAttribute('data-stage-status')) ?? ''
    if (terminal === 'done' || terminal === 'error' || terminal === 'stopped') break
    await page.waitForTimeout(2_000)
  }
  expect(terminal, `the run reached a terminal state through the GPU (got '${terminal}')`).toBe('done')

  // 7 — THE ARTIFACT: the tile paints an <img> whose src is the
  // run's own media route (never a placeholder face).
  const artifactImg = page.locator('[data-stage-id] img').first()
  await expect(artifactImg, 'the success tile paints an artifact image').toBeVisible({ timeout: 30_000 })
  const src = await artifactImg.getAttribute('src')
  expect(src, 'the artifact src is a real media URL').toMatch(/run|media|output/i)

  // 8 — THE CONFIG-CHANGE RECEIPT, both truths:
  //   SERVER: the bench row read back through the estate's own door
  //   carries the EDITED prompt and the pinned seed — the run ran
  //   what the user SAW (write-then-run; the FRESH-READ law,
  //   stage-run.ts:56 — the run reads the row fresh estate-side).
  //   UI: the drill's own form still holds the edited values.
  const benchValue = await callBench(page, 'bench/get', { sessionKey }) as
    | { stages?: unknown[]; doc?: { stages?: unknown[] } }
    | undefined
  const benchDoc = benchValue?.doc ?? benchValue ?? {}
  const rows = (Array.isArray(benchDoc.stages) ? benchDoc.stages : []) as Array<{ card?: unknown; params?: { prompt?: unknown; seed?: unknown } }>
  const genRow = rows.find((r) => r?.card === 'image-gen')
  expect(genRow?.params?.prompt, 'the bench row carries the edited prompt (server truth)').toBe(EDITED_PROMPT)
  expect(genRow?.params?.seed, 'the bench row carries the pinned seed (server truth)').toBe(424242)
  await page.getByRole('tab', { name: /Prompt/i }).click()
  await expect(promptBox, 'the drill form holds the edited prompt (UI truth)').toHaveValue(EDITED_PROMPT)

  await expectNoPageErrors(page, errors)
})
