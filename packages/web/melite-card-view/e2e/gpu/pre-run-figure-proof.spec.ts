/**
 * E2E GPU — THE PRE-RUN FIGURE PROOF + THE DISPLAY FOLD PROOF (the
 * operator's two catches, 2026-10-12, browser-verified):
 *
 *  1. THE QWEN DISPLAY FOLD: the live door /v1/form-spec?model=tts
 *     serves families === ["qwen3-tts"] — ONE model row, the naming
 *     law (MODEL = atom, VARIANT = flavor, QUANT = size). The
 *     operator saw five; the wall proved the code; this is the LIVE
 *     lane receipt.
 *  2. THE ANNY PRE-RUN FIGURE: open the anny card → the BODY is
 *     visible IMMEDIATELY, before any run — the figure viewport
 *     mounts with a real canvas (WebGL), and the image tombstone
 *     never appears. Screenshot for the operator.
 *
 * Keyless law: runs ONLY through scripts/e2e-gpu-lane.sh
 * (E2E_GPU=1). This proof never presses Run — the whole point is
 * the face BEFORE any run.
 */
import { expect, test } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from '../tour.ts'

test.skip(
  !STUDIO_URL || process.env.E2E_GPU !== '1',
  'the pre-run proofs need E2E_STUDIO_URL (the gpu lane) AND E2E_GPU=1 (e2e-gpu-lane.sh)',
)

test('the live lane: one qwen model row, and anny opens on the body pre-run', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await settle(page)

  // ── PROOF 1: the display fold on the LIVE door ────────────────
  const spec = await page.evaluate(async () => {
    const r = await fetch('/v1/form-spec?model=tts')
    return await r.json() as { families?: Array<{ id?: string }> }
  })
  const famIds = (spec.families ?? []).map((f) => f.id ?? '')
  expect(famIds, 'the tts card serves exactly ONE model row — the naming law on the live door').toEqual(['qwen3-tts'])

  // ── PROOF 2: anny opens on the BODY, pre-run ───────────────────
  const mint = await openAConversation(page)
  expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
  const sessionKey = mint.sessionKey
  const annyFamily = await page.evaluate(async () => {
    const cat = await (await fetch('/v1/model-catalog')).json() as { cards?: Record<string, { families?: string[] }> }
    return cat.cards?.anny?.families?.[0]
  })
  const benchRev = async (): Promise<number> => {
    const value = await callBench(page, 'bench/get', { sessionKey }).catch(async () => {
      await callBench(page, 'bench/ensure', { doc: { session: sessionKey } })
      return await callBench(page, 'bench/get', { sessionKey })
    })
    const parsed = value as { rev?: unknown; doc?: { rev?: unknown } } | undefined
    const rev = (parsed?.doc ?? parsed)?.rev
    return typeof rev === 'number' ? rev : 0
  }
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: { card: 'anny', author: 'user', expect_rev: await benchRev(), params: annyFamily !== undefined ? { model: annyFamily } : {} },
  })

  // open the cards tab, click the anny tile — the drill's preview
  // seat must show the FIGURE VIEWPORT with a live canvas
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(5_000)
  const tile = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])').first()
  await tile.click({ timeout: 15_000, force: true })
  await expect(page.locator('div[class*="zoomCard"]').first(), 'the drill opens').toBeVisible({ timeout: 30_000 })

  const viewport = page.locator('[data-viewport^="poser-figure"]')
  await expect(viewport, 'THE BODY FACE: the figure viewport mounts pre-run (no run was ever pressed)').toBeVisible({ timeout: 30_000 })
  await expect(
    page.locator('[data-testid="stage-preview-figure"]'),
    'the figure canvas mounted (WebGL body, not a tombstone)',
  ).toBeVisible({ timeout: 30_000 })
  await expect(
    page.getByText('No render yet — run lands the image here'),
    'the image tombstone never shows on a figure-declaring card',
  ).toHaveCount(0)

  await page.screenshot({ path: 'e2e/gpu/anny-pre-run-figure-proof.png', fullPage: false })
  await expectNoPageErrors(page, errors)
})
