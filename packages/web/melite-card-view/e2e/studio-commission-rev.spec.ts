/**
 * E2E: F53's LIVE HOP — the commission rail follows an AGENT patch
 * through the real estate, without a re-open (2026-11-12 QA finding:
 * "patching the h3 stage's loras bag landed correctly in the BENCH
 * STATE — the next run's _request.json carries NO loras key — but
 * the UI's video timeline bar did NOT re-render the swap; the
 * operator watched the old lora persist").
 *
 * The view halves are pinned unit-side (studio-commission-rev.spec:
 * the rail re-derives on prop rev; bench-view's drilled-row-follows
 * effect). THIS arm rides the whole journey the operator's burn
 * crossed: bench/patch door → store → notifyBenchChange → the
 * browser's bench stream → the drilled studio's rail. A red here
 * names the dead hop; no in-process wall can see it.
 *
 * Rides the host's REOPENED conversation (the estate host reopens
 * its last session itself — no mint, no AI call; the conversation's
 * own bench/get names the key). Self-skips without E2E_STUDIO_URL.
 */
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openCardsWithBench, seedBenchH3, settle, STUDIO_URL } from './tour.ts'
test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')

const TURBO8 = { loras: [{ id: 'turbo8_v2.safetensors', strength: 0.8 }] }
const SILVER = { loras: [{ id: 'silver_v10.safetensors', strength: 1 }] }

/** The last h3-timeline stage on the bench row (flat rev, stages). */
async function benchRow(page: Page, sessionKey: string): Promise<{ rev: number; stageId: string }> {
  const value = await callBench(page, 'bench/get', { sessionKey }) as Record<string, unknown>
  const stages = Array.isArray(value['stages']) ? value['stages'] as Array<Record<string, unknown>> : []
  const h3 = [...stages].reverse().find((s) => s['card'] === 'h3-timeline')
  if (h3 === undefined) throw new Error('no h3-timeline stage on the bench — the seed did not land')
  return { rev: typeof value['rev'] === 'number' ? value['rev'] : 0, stageId: String(h3['id']) }
}

/** Patch the h3 stage's params through the estate's own bench door
 *  (the agent's verb, the operator's journey). */
async function patchLoras(page: Page, sessionKey: string, params: Record<string, unknown>): Promise<void> {
  const { rev, stageId } = await benchRow(page, sessionKey)
  await callBench(page, 'bench/patch', {
    sessionKey,
    doc: { stage: stageId, params, expect_rev: rev, author: 'agent' },
  })
}

test('the drilled studio\'s commission rail swaps on an agent patch (F53: no re-open, no re-mint)', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  await settle(page)

  // SEED FIRST, THEN OPEN (openCardsWithBench's stream law): the
  // key arrives from the shell below; the helper's own mintedKey path
  // seeds-first with it. No mint — the estate host reopens its own
  // last session.
  const sessionKey = await page.evaluate(() => {
    try {
      const raw = window.localStorage.getItem('dsh.sessions.current') ?? ''
      // the marker is a JSON envelope: {"sessionId":"session-…"}
      const id = (JSON.parse(raw) as { sessionId?: unknown })?.sessionId
      return typeof id === 'string' ? id : ''
    } catch { return '' }
  })
  expect(sessionKey, 'the reopened conversation\'s bench key (the shell\'s own current-session marker)').toMatch(/^[A-Za-z0-9_-]{1,64}$/)
  // the open conversation may hold no bench yet (a blank session) —
  // the tour's own seed births it and lands the proven h3 row
  await seedBenchH3(page, sessionKey)
  // the tab opened pre-seed reads once at open — re-enter so the
  // stream watches the born bench (the helper's own order law)
  await openCardsWithBench(page, sessionKey)
  // ARM the bag onto the tour-seeded stage through the agent's own
  // verb — the journey's live hop under judgment (no mint, no wires)
  await patchLoras(page, sessionKey, { ...TURBO8 })

  // the tile lands through the stream (the push we are about to
  // judge downstream) — then drill in (the click-target law: the
  // TILE BUTTON owns the onClick)
  const tile = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }).first()
  await tile.waitFor({ state: 'visible', timeout: 30_000 })
  await tile.click({ timeout: 10_000 })
  await page.locator('[data-testid="h3-studio-tenant"]').waitFor({ state: 'visible', timeout: 30_000 })
  const lane = page.locator('[data-commission-lane="loras"]')
  await lane.waitFor({ state: 'visible', timeout: 20_000 })
  await expect(lane).toContainText('turbo8_v2.safetensors')

  // THE BURN'S EXACT PATCH: the bag cleared (merge-patch null — the
  // next run's _request.json carries no loras key)
  await patchLoras(page, sessionKey, { loras: null })
  // the stream push window — no re-open, no tile re-click
  await expect(lane, 'the cleared bag clears the rail without a re-open (F53)').toHaveCount(0, { timeout: 15_000 })

  // the swap direction: a new row arms through the same door
  await patchLoras(page, sessionKey, SILVER)
  await lane.waitFor({ state: 'visible', timeout: 15_000 })
  await expect(lane).toContainText('silver_v10.safetensors')

  await expectNoPageErrors(page, errors)
})
