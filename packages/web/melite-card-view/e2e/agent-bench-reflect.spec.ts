/**
 * E2E: THE AGENT-JOURNEY WALL (the one-seat burn, 2026-10-28 —
 * operator: "when the agent uses the h3 card, then I open it up, it
 * doesn't reflect the agents work at all. We spent weeks on 'one
 * seat', but that was a complete lie").
 *
 * WHAT BURNED: not the code — the SERVED bytes. The morning's agent
 * h3 stages landed on their conversation benches (disk-proven,
 * provenance agent, full calls), and the repo's studio hydrates them
 * perfectly in-process — but the lane's pre-reboot client bundles
 * predates the per-conversation bench law, so the tab the operator
 * opened streamed a bench that was not the agent's conversation
 * bench. The 17:28 reboot redeployed current bytes and the journey
 * went green (live-drive receipt, same day: conversation → its bench
 * → the agent's 2-call doc read back verbatim in the studio's doc
 * readout). No wall rode that journey, so nothing fired while the
 * operator rebuilt by hand — this spec is that wall.
 *
 * THE JOURNEY (every hop the burn crossed, on the real browser
 * plane — the studio-render precedent: "no in-process wall can see
 * that"):
 *   1. Mint a conversation (the AI-gated mint, same law as every
 *      tour member — the key is captured from the composer's own
 *      session/prompt request).
 *   2. THE AGENT LANDS: one h3-timeline stage, author 'agent', a
 *      TWO-call doc at 24fps × 200 frames (8.3s — no starter shape
 *      reads back as "2 calls", so the reflect assertion cannot
 *      pass on the starter), through the estate's own bench doors —
 *      the same wire melite_construct rides, never a disk write.
 *   3. THE OPERATOR OPENS: sidebar expand, the Melite Bench tab.
 *      The tab binds the OPEN conversation's bench (the one-seat
 *      law under test — a tab bound to 'main' or a stranger's bench
 *      renders no agent tile and this wall reds).
 *   4. THE TILE: the agent stage's tile renders (the card's own
 *      label — Generate Video).
 *   5. THE REFLECT: click the tile; the studio mounts; the doc
 *      readout must read the agent's doc EXACTLY (2 calls · 8.3s),
 *      never the starter (1 call).
 *   6. Zero page errors.
 *
 * Self-skips without E2E_STUDIO_URL and the MELITE_E2E_AI mint gate
 * — same law as studio-render.spec.ts.
 */
import { expect, test, type Page } from '@playwright/test'
import { collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

/** The agent's doc: two calls, 200 frames at 24fps — 8.3s on the
 * readout. The studio's STARTER is ONE call at 3.8s, so the
 * assertion "2 calls · 8.3s" can only pass on the agent's document
 * actually reaching the studio. */
const AGENT_CALLS = [
  { text: 'agent wall: call one — establish wide, hold steady.', start_frame: 0, end_frame: 100 },
  { text: 'agent wall: call two — push in on the reflection.', start_frame: 100, end_frame: 200 },
] as const

async function callBench(page: Page, method: string, args: Record<string, unknown>): Promise<unknown> {
  return await page.evaluate(async ({ method, args }) => {
    const r = await fetch('/api/' + method, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'e2e-' + Date.now(), method, payload: { args } }),
      signal: AbortSignal.timeout(90_000),
    })
    const body = (await r.json().catch(() => null)) as { result?: { ok?: boolean; value?: unknown; error?: { message?: string } } } | null
    const result = body?.result
    if (result === undefined || result.ok === false) {
      throw new Error(method + ' refused: ' + String(result && 'error' in result ? result.error?.message : 'no result'))
    }
    return result.value
  }, { method, args })
}

test('the agent-authored bench stage, opened in the cards tab, IS the studio document', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)
  await settle(page)

  // 1 — the conversation (the mint's key IS the bench session key)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the one-seat law needs the operator\'s seat)').toBe(true)
  if (!opened) test.skip(true, 'no conversation to open on this host')
  await page.waitForTimeout(6_000)

  // 2 — THE AGENT LANDS (the estate's own doors, the construct wire)
  await callBench(page, 'bench/ensure', { doc: { session: sessionKey } }).catch(() => { /* already born */ })
  let benchValue: unknown = await callBench(page, 'bench/get', { sessionKey })
  const parsed = benchValue as { doc?: { stages?: unknown[]; rev?: number }, stages?: unknown[], rev?: number } | undefined
  const doc = parsed?.doc ?? parsed ?? {}
  const rev = typeof doc.rev === 'number' ? doc.rev : 0
  const stages = Array.isArray(doc.stages) ? doc.stages : []
  expect(stages.filter((s) => typeof s === 'object' && s !== null && 'card' in s && (s as { card?: unknown }).card === 'h3-timeline'), 'the minted bench starts without an h3 stage (the seed is idempotent only against re-runs)').toHaveLength(0)
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: {
      card: 'h3-timeline',
      engine: 'comfyui',
      params: { variant: 'h3', quant: 'int8', model: 'h3', calls: AGENT_CALLS },
      inputs: {},
      outputs: { default: 'image' },
      expect_rev: rev,
      author: 'agent',
    },
  })

  // 3 — THE OPERATOR OPENS the tab (the tab's landing read happens at
  // open — the stage is already aboard, never a stream race)
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(7_000)

  // 4 — THE TILE (the tile button owns the onClick — the hour-6 law)
  const tile = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: /Generate Video/ }).first()
  await expect(tile, 'the agent\'s h3 stage renders as a tile on THIS conversation\'s bench (a tab bound to main or a stranger\'s bench reds here)').toBeVisible({ timeout: 20_000 })

  // 5 — THE REFLECT (the studio mounts and reads back the agent's doc)
  await tile.click({ timeout: 10_000 })
  await expect(page.locator('[data-testid="h3-studio-tenant"]'), 'the studio claims the card view').toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-testid="tl-doc-readout"]'), 'the doc readout reads the AGENT\'s document — 2 calls at 8.3s, never the 1-call starter').toHaveText(/^2 calls · 8\.3s · 0 guides$/, { timeout: 20_000 })

  // 6 — the tour stays error-free
  await expectNoPageErrors(page, errors)
})
