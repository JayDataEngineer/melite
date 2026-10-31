/**
 * E2E: THE OPEN STUDIO FOLLOWS THE AGENT (2026-11-12 — the
 * operator's report, live: "when the AI used one of these
 * specialized mods, IT WOULD NOT UPDATE THE TIMELINE VISUALS").
 *
 * WHAT BURNED: not editing — the VIEW. With the studio open, an
 * agent's bench writes (the §8 mod bags, calls) landed on the shared
 * doc and the tab's own `bench/subscribe` tail delivered them, but
 * two seams re-pinned the open-time snapshot:
 *   1. the zoom drill captured the stage OBJECT it was clicked with,
 *      so a later bench frame updated the tile grid and never the
 *      drill's row;
 *   2. the drill seeds its form layer with EVERY held key at open
 *      (seedUser's pass-along law) and fed `{ ...held, ...user }` to
 *      the card surface, so a key that existed at open (calls, an
 *      existing mod bag) stayed frozen while only NEW keys (the
 *      freshly armed mod) flowed through.
 * The operator saw a studio that showed a mod armed before open and
 * never one armed after it, and a timeline whose calls never redrew.
 *
 * THE WALL (browser plane, the real estate doors — no AI mint, no
 * disk writes): seed one bagless h3-timeline stage, open its zoom,
 * then — with the studio STILL OPEN — drive bench/patch exactly as
 * the agent does and judge the rendered DOM after each write:
 *   a. arm `extend` → the commission lane appears with its 2x209f
 *      windows (379f > 362 takes the solver branch);
 *   b. change the bag in place → one window;
 *   c. disarm (`null` deletes the key) → no row;
 *   d. write four `calls` splits → four `[data-prompt-clip]` clips;
 *   e. arm `replace` → the swap commission row draws.
 * Every step runs on the SAME open zoom — a reload, or a reopen
 * between steps, would pass while the bug stood.
 *
 * RED PROOF (2026-11-12): toggling seam 2 out (`params: { ...held,
 * ...user }`) fails at step (d); toggling seam 1 out (the drill row
 * re-map in bench-view) fails at step (a). The receipt carries both
 * runs.
 */
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')

const WALL_TEXT = 'WALL — studio follows the agent (safe to delete)'
const WALL_CLIP = 'clips/wall-follow-a.mp4'
/** The wall stage's durable fingerprint: the calls patch rewrites the
 *  call text, so cleanup may not rely on it alone — the seed key
 *  survives every step of the wall. */
const WALL_SEED = 987654
const WALL_SPLITS = ['split 1', 'split 2', 'split 3', 'split 4']

interface BenchStage { id?: string; card?: string; params?: Record<string, unknown> }
interface BenchRow { rev?: number; stages?: BenchStage[]; doc?: { rev?: number; stages?: BenchStage[] } }

/** One bench read through the estate's own door. */
async function benchOf(page: Page, sessionKey: string): Promise<{ rev: number; stages: BenchStage[] }> {
  const raw = await callBench(page, 'bench/get', { sessionKey }) as BenchRow
  const doc = raw.doc ?? raw
  return { rev: typeof doc.rev === 'number' ? doc.rev : 0, stages: Array.isArray(doc.stages) ? doc.stages : [] }
}

/** Remove every stage THIS wall has left in the conversation —
 *  identified by its own params (the seed key or any bag/call the
 *  wall writes), never by position: a failed run must not poison the
 *  next ride's stage count. */
async function removeWallStages(page: Page, sessionKey: string): Promise<void> {
  for (;;) {
    const bench = await benchOf(page, sessionKey)
    const mine = bench.stages.find((s) => {
      if (s.params?.seed === WALL_SEED) return true
      const calls = s.params?.calls
      const text = Array.isArray(calls) ? (calls[0] as { text?: unknown } | undefined)?.text : undefined
      if (text === WALL_TEXT || (typeof text === 'string' && WALL_SPLITS.includes(text))) return true
      for (const key of ['extend', 'replace'] as const) {
        const bag = s.params?.[key]
        const clip = Array.isArray(bag) ? (bag[0] as { source_clip?: unknown } | undefined)?.source_clip : undefined
        if (clip === WALL_CLIP) return true
      }
      return false
    })
    if (mine?.id === undefined) return
    await callBench(page, 'bench/remove-stage', { sessionKey, doc: { stage: mine.id, expect_rev: bench.rev } })
  }
}

test('an agent\'s bench writes redraw the open studio timeline', async ({ page }) => {
  // No local timeout override (2026-10-30): this spec ran at 120s while
  // the config's own budget is 420s BECAUSE the host's activation grace
  // alone can hold 120s+ on a cold lane home (the config comment's
  // measured case) — settle() pays that grace before the spec's first
  // step, so a cold host red the spec inside settle with the browser
  // torn down mid-poll ("Target page, context or browser has been
  // closed"), never reaching the contract. The 120s override predated
  // the grace measurement; every sibling spec rides the config budget.
  const errors = collectPageErrors(page)
  await settle(page)

  // open the first listed conversation; the shell persists the key.
  // HOST-HISTORY GUARD (the CI red, 2026-10-30): the tour's stroke-83
  // law — a wall must never pass or fail on host HISTORY — and this
  // row was exactly that: the treeitem is the SHELL's conversation
  // sidebar, fed by DSH_HOME session logs, and a fresh keyless lane
  // home has none (a conversation is birthed by a session/prompt
  // mint, an actual AI turn — the tour's keyed mint spine). On
  // the operator's lane (history present) the contract runs in full;
  // on a fresh home the spec self-skips naming the law instead of
  // failing on a row no keyless host can carry. (This spec never
  // calls the mint spine — the comment names no symbol so the AI
  // opt-in census keeps reading the call sites it judges.)
  const row = page.locator('[role="treeitem"]').filter({ hasText: /\d+(?:s|min|m|h|d)\b/ }).first()
  const rowCount = await row.count()
  test.skip(rowCount === 0, 'no conversation on this host — this wall rides an OPEN conversation (host history on the operator lane, or a keyed mint); a fresh keyless lane has neither, and the tour law forbids failing on host history')
  await row.click({ timeout: 8_000 })
  await page.waitForTimeout(2_000)
  const sessionKey = await page.evaluate(() => {
    const raw = localStorage.getItem('dsh.sessions.current') ?? ''
    try { return String((JSON.parse(raw) as { sessionId?: unknown }).sessionId ?? '') } catch { return '' }
  })
  expect(sessionKey, 'the open conversation key').toMatch(/^session-/)

  // a clean stage with NO bag, then the cards tab and the studio.
  await removeWallStages(page, sessionKey)
  const bench0 = await benchOf(page, sessionKey)
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: {
      card: 'h3-timeline',
      engine: 'comfyui',
      params: {
        variant: 'h3', quant: 'int8', model: 'h3',
        seed: WALL_SEED,
        calls: [{ text: WALL_TEXT, start_frame: 0, end_frame: 175 }],
      },
      inputs: {},
      outputs: { default: 'image' },
      expect_rev: bench0.rev,
      author: 'user',
    },
  })
  const bench1 = await benchOf(page, sessionKey)
  const stageId = bench1.stages.find((s) => s.params?.seed === WALL_SEED)?.id ?? ''
  expect(stageId, 'the wall stage id').not.toBe('')

  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(2_000)
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(5_000)
  // the fresh stage appends LAST; the zoom must be ON it (an older h3
  // row would be a different doc — the wall's own burn, never evidence).
  const tiles = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' })
  await expect(tiles.last(), 'the wall h3-timeline tile').toBeVisible({ timeout: 30_000 })
  await tiles.last().click({ timeout: 15_000 })
  await expect(page.locator('[data-testid="h3-studio-tenant"]'), 'the studio mounted').toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-testid="motion-timeline-bar"]')).toBeVisible()
  await expect(page.getByText(WALL_TEXT).first(), 'the zoom shows the wall stage').toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-commission-lane]'), 'a bagless doc draws no commission row').toHaveCount(0)

  // 1 — ARM the mod while the studio is open (the agent's own bench
  //     door). 379f > 362 takes the solver branch: 2x209f under the
  //     39f carry.
  const entry = {
    source_clip: WALL_CLIP,
    extend_prompt: 'wall continuation',
    extend_seconds: 379 / 24,
    seed: 0,
    steps: 6,
    overlap_frames: 39,
    resolution: '736p',
  }
  const rev1 = (await benchOf(page, sessionKey)).rev
  await callBench(page, 'bench/patch', { sessionKey, doc: { stage: stageId, params: { extend: [entry] }, expect_rev: rev1 } })
  const lane = page.locator('[data-commission-lane="extend"]').first()
  await expect(lane, 'the agent-armed extend must appear on the OPEN timeline').toBeVisible({ timeout: 20_000 })
  const segments = page.locator('[data-commission-segment^="extend-"]')
  await expect(segments, 'two drawn windows (2x209f)').toHaveCount(2, { timeout: 20_000 })

  // 2 — CHANGE the bag while the studio stays open: one 124f window.
  const rev2 = (await benchOf(page, sessionKey)).rev
  await callBench(page, 'bench/patch', { sessionKey, doc: { stage: stageId, params: { extend: [{ ...entry, extend_seconds: 5.17 }] }, expect_rev: rev2 } })
  await expect(segments, 'the open timeline must follow the bag — one window now').toHaveCount(1, { timeout: 20_000 })

  // 3 — DISARM: null deletes the key; the row must go.
  const rev3 = (await benchOf(page, sessionKey)).rev
  await callBench(page, 'bench/patch', { sessionKey, doc: { stage: stageId, params: { extend: null }, expect_rev: rev3 } })
  await expect(page.locator('[data-commission-lane="extend"]'), 'disarmed = no row').toHaveCount(0, { timeout: 20_000 })

  // 4 — FOUR SPLITS while the same open studio looks on: the calls
  //     lane must redraw four clip segments (the key that existed at
  //     open is the frozen-seed class this seam cures).
  const rev4 = (await benchOf(page, sessionKey)).rev
  await callBench(page, 'bench/patch', {
    sessionKey,
    doc: {
      stage: stageId,
      params: {
        calls: [
          { text: 'split 1', start_frame: 0, end_frame: 124 },
          { text: 'split 2', start_frame: 124, end_frame: 243 },
          { text: 'split 3', start_frame: 243, end_frame: 362 },
          { text: 'split 4', start_frame: 362, end_frame: 481 },
        ],
      },
      expect_rev: rev4,
    },
  })
  await expect(page.locator('[data-prompt-clip]'), 'four split windows drawn on the OPEN timeline').toHaveCount(4, { timeout: 20_000 })

  // 5 — a character-swap commission (replace bag) arms and draws.
  const rev5 = (await benchOf(page, sessionKey)).rev
  await callBench(page, 'bench/patch', {
    sessionKey,
    doc: {
      stage: stageId,
      params: { replace: [{ source_clip: WALL_CLIP, still: 'images/wall-still.png', mannequin: 'clips/wall-mannequin.mp4', mask: 'images/wall-mask.png', swap_prompt: 'wall swap', keep_audio: true, seed: 0, steps: 6, resolution: '736p' }] },
      expect_rev: rev5,
    },
  })
  await expect(page.locator('[data-commission-lane="replace"]'), 'the swap commission row').toBeVisible({ timeout: 20_000 })

  await removeWallStages(page, sessionKey)
  // the lane's web host does not mount DSH's deliverables plugin, so
  // the shell's own change-summary poll answers 404 — environmental,
  // outside this wall's scope.
  await expectNoPageErrors(page, errors.filter((e) => !e.includes('/api/changes.summary')))
})

test("the agent's settled run lands on the open timeline — no conversation, no host history", async ({ page }) => {
  // THE LIVE HALF of the 2026-10-31 freeze (operator: "when the AI
  // uses a mod to make a video in the video timeline, the timeline
  // card isn't updated visually"). The doc half is walled keyless at
  // tests/walls/ts/suites/timeline-agent-run-projection.spec.ts
  // (every carrier's body → the real drafts door → the strip's one
  // harvest owner). THIS arm owns the half the pure wall cannot: an
  // OPEN studio view following the settle carrier WITHOUT a reload.
  //
  // STROKE-83 LAW: no conversation, no host history — the wall keys
  // its own bench (the tab's own bench/get frame names the session;
  // the stage carries the WALL_SEED fingerprint for cleanup), drives
  // the drafts stage door EXACTLY as melite-flow's attribution does
  // (observeAndAttribute's live stamp, then the terminal rich body;
  // the seat's own PATCH /v1/flows/drafts/:id/stages/:stage arm,
  // expectRev null — telemetry never fences), and judges the
  // rendered strip ([data-testid="tl-run-history"], chips from
  // stageHistoryRows) plus the mid-run non-chip (W1 at the view).
  const errors = collectPageErrors(page)
  await settle(page)

  // capture the tab's own bench key (the openCardsWithBench capture
  // arm, inlined so the seeding below can fingerprint its own stage)
  let sessionKey = ''
  page.on('request', (r) => {
    if (!r.url().includes('/api/bench/get')) return
    try {
      const body = r.postDataJSON() as { payload?: { args?: { sessionKey?: unknown } } }
      if (typeof body.payload?.args?.sessionKey === 'string' && sessionKey === '') sessionKey = body.payload.args.sessionKey
    } catch { /* a stranger's frame is ignored */ }
  })
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(2_000)
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(5_000)
  // no conversation on a fresh home → the tab may carry no key; the
  // wall then births its own bench (the ensure door, never a disk write)
  if (sessionKey === '') {
    sessionKey = 'session-wall-agent-run'
    await callBench(page, 'bench/ensure', { doc: { session: sessionKey } }).catch(() => {})
  }
  expect(sessionKey, 'a bench key to seed').not.toBe('')

  await removeWallStages(page, sessionKey)
  const bench0 = await benchOf(page, sessionKey)
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: {
      card: 'h3-timeline',
      engine: 'comfyui',
      params: {
        variant: 'h3', quant: 'int8', model: 'h3',
        seed: WALL_SEED,
        calls: [{ text: WALL_TEXT, start_frame: 0, end_frame: 175 }],
      },
      inputs: {},
      outputs: { default: 'image' },
      expect_rev: bench0.rev,
      author: 'user',
    },
  })
  const bench1raw = await callBench(page, 'bench/get', { sessionKey }) as { rev?: number; stages?: BenchStage[]; draft_id?: string }
  const stageId = (Array.isArray(bench1raw.stages) ? bench1raw.stages : []).find((s) => s.params?.seed === WALL_SEED)?.id ?? ''
  expect(stageId, 'the wall stage id').not.toBe('')
  // the bench/get wire carries draft_id at the TOP level (the ensure
  // row's own shape — {draft_id, session, rev, intent, stages, log})
  const draftId = typeof bench1raw.draft_id === 'string' ? bench1raw.draft_id : ''
  expect(draftId, 'the bench doc names its draft — the run carrier addresses it').not.toBe('')

  // open the studio zoom on the wall stage (the fresh stage appends last)
  const tiles = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' })
  await expect(tiles.last(), 'the wall h3-timeline tile').toBeVisible({ timeout: 30_000 })
  await tiles.last().click({ timeout: 15_000 })
  await expect(page.locator('[data-testid="h3-studio-tenant"]'), 'the studio mounted').toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(WALL_TEXT).first(), 'the zoom shows the wall stage').toBeVisible({ timeout: 10_000 })

  const RID = 'run-e2e-agent0x42'
  const FILM = 'h3_t4_w0_1_0_.mp4'
  const MEDIA_URL = `/melite-media/runs/${RID}/${FILM}`
  const stageDoor = async (patch: Record<string, unknown>): Promise<void> => {
    const r = await page.evaluate(async ({ draftId, stageId, patch }) => {
      const res = await fetch(`/v1/flows/drafts/${encodeURIComponent(draftId)}/stages/${encodeURIComponent(stageId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
        signal: AbortSignal.timeout(90_000),
      })
      return { status: res.status, body: await res.text().catch(() => '') }
    }, { draftId, stageId, patch })
    if (r.status !== 200) throw new Error(`drafts stage patch refused: ${r.status} ${r.body.slice(0, 200)}`)
  }
  // the LIVE stamp — no chip mid-run (W1 at the view)
  await stageDoor({ runStatus: 'running', result: { run_id: RID } })
  await expect(page.locator('[data-testid="tl-run-history"]'),
    'a live run never archives — no chip mid-run').toHaveCount(0, { timeout: 10_000 })
  // the TERMINAL rich stamp — the chip appears on the OPEN studio
  await stageDoor({
    runStatus: 'done',
    result: { run_id: RID, url: MEDIA_URL, artifacts: { [FILM]: MEDIA_URL }, assetUrls: [MEDIA_URL] },
  })
  const hist = page.locator('[data-testid="tl-run-history"]')
  await expect(hist, 'the settled agent run draws the strip — no reload').toBeVisible({ timeout: 20_000 })
  await expect(hist, 'the chip names the agent run').toContainText(RID, { timeout: 10_000 })

  await removeWallStages(page, sessionKey)
  await expectNoPageErrors(page, errors.filter((e) => !e.includes('/api/changes.summary')))
})
