/**
 * tour.ts — the shared e2e tour spine (a plain harness file, never a
 * spec: importing a spec re-registers its describe — testing.md's
 * harness rule).
 *
 * Every browser-plane wall drives the SAME fresh-host pre-states and
 * the SAME bench spine, so the spine lives here once:
 *   1. dismissOnboarding — the first-run API-key dialog ("Add an API
 *      key to get started") is CLIENT state: its mask intercepts
 *      every pointer, and it returns for each fresh browser context
 *      even on a configured host.
 *   2. settle — goto + onboarding dismissal + boot-noise wait.
 *   3. openAConversation — the wall never passes/fails on host
 *      HISTORY: when no conversation is open, MINT one through the
 *      GUI's own composer and capture the mint's session key from
 *      the session/prompt REQUEST frame (the shell stages the id
 *      client-side; response events stay invisible to late-attached
 *      listeners — requests do not).
 *   4. callBench — one typed client-request frame over the host's
 *      own /api wire, in-page so the fetch carries the shell's auth.
 *   5. seedBenchH3 — birth the conversation's bench (bench/ensure)
 *      and idempotently add the h3-timeline stage, CAS'd on the live
 *      rev; the estate's own doors, never a disk write.
 *   6. openCardsWithBench — seed FIRST (the tab's landing view reads
 *      the bench once at open; a stage seeded after can miss the
 *      render), then expand the sidebar and open the estate's guide
 *      tab by the plugin's OWN hard-coded title.
 *
 * The workspace pre-state (no workspace chosen → empty session tree)
 * is HOST state and belongs to the README's lane recipe, which seeds
 * storages/workspace.json BEFORE boot; UI-walking that choice from
 * the spec proved fragile and is deliberately not done here.
 */
import { expect, type Page } from '@playwright/test'

export const STUDIO_URL = process.env.E2E_STUDIO_URL ?? ''

/** Dismiss the first-run API-key onboarding dialog when present. */
export async function dismissOnboarding(page: Page): Promise<void> {
  try {
    await page.getByRole('button', { name: 'Configure later' }).click({ timeout: 3_000 })
  } catch { /* host already configured — no onboarding dialog */ }
  // THE PREVIEW NOTICE (0.2.0-rc.1 shells): a fresh browser context
  // gets the shell's "Preview Notice" dialog whose mask intercepts
  // EVERY pointer — the 2026-09-29 run clicked the expand seat into
  // that mask five times and every spec timed out at the same click.
  // A standing operator browser dismissed it long ago, so only fresh
  // contexts (exactly what a wall drives) ever see it.
  try {
    await page.getByRole('dialog').filter({ hasText: 'Preview Notice' })
      .getByRole('button', { name: 'Continue' }).click({ timeout: 5_000 })
  } catch { /* no preview notice on this host */ }
}

/** Let the host's own boot noise land before the tour's ledger. */
export async function settle(page: Page): Promise<void> {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await dismissOnboarding(page)
  await page.waitForTimeout(9_000)
}

/** Open SOME conversation (stroke 83): the wall must never pass or
 *  fail on host HISTORY (the pre-stroke spec leaned on the operator's
 *  accumulated session list). The tour needs an open conversation —
 *  the expand seat lives in the "conversation.session.header.corner"
 *  slot, which only an OPEN conversation renders — so when no seat is
 *  up, MINT a session through the GUI's own composer (type a first
 *  message, Enter): the only GUI-honest door to a real conversation,
 *  and it opens the conversation directly (no tree row surgery). */
export async function openAConversation(page: Page): Promise<{ opened: boolean; sessionKey: string }> {
  const seat = page.locator('[data-sidebar-right-expand]').first()
  if (await seat.isVisible().catch(() => false)) return { opened: true, sessionKey: '' }
  // THE MINT'S OWN KEY: the composer's first send is a
  // session/prompt REQUEST whose args carry the conversation's
  // sessionId — the same wire the GUI rode — and a well-formed
  // sessionId IS the bench session key (BENCH_SESSION_RE admits it
  // verbatim; benchSessionKey spells the law). Captured from the
  // REQUEST, not the response: the shell stages the session id
  // client-side (a fresh host shows NO session/create frame at all)
  // and request events stay visible to listeners attached after
  // load, where response events did not. The bench/get frame only
  // fires once the tab OPENS the bench resource — after the first
  // stage lands — the seed's own chicken-and-egg, broken by holding
  // the mint's key up front.
  let mintedKey = ''
  const onPrompt = (r: { url(): string; postDataJSON(): unknown }): void => {
    if (!r.url().includes('/api/session/prompt')) return
    try {
      const body = r.postDataJSON() as { payload?: { args?: { request?: { sessionId?: unknown } } } } | null
      const id = body?.payload?.args?.request?.sessionId
      if (typeof id === 'string' && mintedKey === '') mintedKey = id
    } catch { /* a stranger's frame shape is ignored */ }
  }
  page.on('request', onPrompt)
  const composer = page.getByRole('textbox', { name: /Describe what you want to build/i }).first()
  await composer.click({ timeout: 10_000 })
  await page.keyboard.type('e2e wall: bench tour mint', { delay: 15 })
  await page.keyboard.press('Enter')
  await seat.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {})
  const opened = await seat.isVisible().catch(() => false)
  await page.waitForTimeout(2_000)
  page.off('request', onPrompt)
  return { opened, sessionKey: mintedKey }
}

/** One typed client-request frame over the gateway's own /api wire
 * (the api-gateway.md envelope — the same frame wire.ts spells for
 * manage/act). In-page so the fetch carries the shell's auth. */
export async function callBench(page: Page, method: string, args: Record<string, unknown>): Promise<unknown> {
  return await page.evaluate(async ({ method, args }) => {
    const r = await fetch('/api/' + method, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'e2e-' + Date.now(), method, payload: { args } }),
    })
    const body = (await r.json().catch(() => null)) as { result?: { ok?: boolean; value?: unknown; error?: { message?: string } } } | null
    const result = body?.result
    if (result === undefined || result.ok === false) {
      throw new Error(method + ' refused: ' + String(result && 'error' in result ? result.error?.message : 'no result'))
    }
    return result.value
  }, { method, args })
}

/** The tour's bench (stroke 83's history-law fix): a FRESH host (or a
 * freshly minted conversation) carries an EMPTY bench — the old spec
 * leaned on the operator's accumulated bench-main and passed/failed
 * on host HISTORY. Seed THIS conversation's bench through the
 * estate's own doors (the same doors melite_construct rides — never
 * a disk write), idempotently: bench/ensure BIRTHS the bench when
 * the mint's conversation has none yet (bench/get refuses not-found
 * on a key that never landed a stage), then add-stage only when no
 * h3-timeline stage is aboard, CAS'd against the live rev. */
export async function seedBenchH3(page: Page, sessionKey: string): Promise<void> {
  let value: unknown
  try {
    value = await callBench(page, 'bench/get', { sessionKey })
  } catch {
    // no such bench yet — birth it through the ensure door (the
    // same door the README lane seed rides)
    await callBench(page, 'bench/ensure', { doc: { session: sessionKey } })
    value = await callBench(page, 'bench/get', { sessionKey })
  }
  const parsed = value as
    | { stages?: unknown[]; bench?: { rev?: number }; doc?: { stages?: unknown[]; bench?: { rev?: number } } }
    | undefined
  const doc = parsed?.doc ?? parsed ?? {}
  const stages = Array.isArray(doc.stages) ? doc.stages : []
  if (stages.some((s) => typeof s === 'object' && s !== null && 'card' in s && (s as { card?: unknown }).card === 'h3-timeline')) return
  const rev = typeof doc.bench?.rev === 'number' ? doc.bench.rev : 0
  await callBench(page, 'bench/add-stage', {
    sessionKey,
    doc: {
      card: 'h3-timeline',
      engine: 'comfyui',
      params: { variant: 'h3', quant: 'int8', model: 'h3', calls: [{ text: 'A single shot — describe the action, camera, and mood.', start_frame: 0, end_frame: 175 }] },
      inputs: {},
      outputs: { default: 'image' },
      expect_rev: rev,
      author: 'user',
    },
  })
}

/** Steps 2-3 of every tour: seed the h3 stage, expand the right
 *  sidebar, open the estate's guide tab. ORDER IS THE LOAD-BEARING
 *  PART on a fresh sidebar: the tab's landing view reads the bench
 *  once at open (a stage seeded after lands only if the tab's
 *  stream is already watching — which itself starts only once the
 *  bench resource opens), so a stage seeded post-open can miss the
 *  render entirely. The mint's own session/prompt frame named the
 *  key (openAConversation); hosts where a conversation was already
 *  open fall back to capturing the tab's bench/get frame and
 *  seeding after — the pinned-address host the wall was born on. */
export async function openCardsWithBench(page: Page, mintedKey = ''): Promise<void> {
  let sessionKey = mintedKey
  if (mintedKey !== '') await seedBenchH3(page, mintedKey)
  page.on('request', (r) => {
    if (!r.url().includes('/api/bench/get')) return
    try {
      const body = r.postDataJSON() as { payload?: { args?: { sessionKey?: unknown } } }
      if (typeof body.payload?.args?.sessionKey === 'string' && sessionKey === '') sessionKey = body.payload.args.sessionKey
    } catch { /* the tab's own frame shapes it; a stranger's frame is ignored */ }
  })
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  // THE GUIDE TAB — matched by the estate plugin's OWN hard-coded
  // title ('Media Flow', src/client/index.ts), never the shell's
  // locale copy and never a stale pinned label on the operator's
  // shared host: both drift, our plugin title does not.
  await page.getByRole('button', { name: /Media Flow/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(7_000)
  if (sessionKey !== '' && mintedKey === '') await seedBenchH3(page, sessionKey)
  // the resource stream pushes the rev drift; give the tile time
  await page.waitForTimeout(4_000)
}

/** The zero-error ledger every tour closes with: page errors,
 *  console errors, and any ≥400 HTTP frame (named — a bare "404"
 *  hides WHICH route; the diagnosis law). */
export async function expectNoPageErrors(page: Page, errors: string[]): Promise<void> {
  expect(errors, errors.join('\n')).toEqual([])
}

/** Attach the error collectors a tour asserts on at its end. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 150)}`) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url().slice(0, 150)}`) })
  return errors
}
