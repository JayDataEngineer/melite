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

/** THE AI OPT-IN (operator order 2026-10-17): openAConversation's
 *  mint is an ACTUAL AI CALL — the typed composer message rides
 *  /api/session/prompt to the lane's real model, one model turn per
 *  mint, tokens burned, a keyed live lane required. Every minting
 *  spec self-skips unless MELITE_E2E_AI=1 opts in; this spine refuses
 *  loud (never silently) if a caller reaches it anyway. */
export const AI_OPT_IN = process.env.MELITE_E2E_AI === '1'

/** The composer the mint types into: the reachability probe that
 *  PROVES the masking dialogs are gone. A locator RESOLVING is not
 *  reachability — under a mask Playwright reports the intercepting
 *  subtree instead of clicking (2026-10-11: the composer resolved
 *  fine and the click still timed out on the API-key input). */
function composerOf(page: Page) {
  return page.getByRole('textbox', { name: /Describe what you want to build/i }).first()
}

/** Dismiss the first-run masking dialogs — and only RETURN once the
 *  composer is genuinely clickable.
 *
 *  Both dialogs are CLIENT state: they return for EVERY fresh browser
 *  context (exactly what a wall drives) even on a configured host, and
 *  each mask intercepts every pointer. The preview notice (0.2.0-rc.1
 *  shells) cost the 2026-09-29 run five clicks into its mask and every
 *  spec timing out at the same seat; a standing operator browser
 *  dismissed it long ago. The shells retitle it mid-arc ("Preview
 *  Notice" → "Internal Testing Notice", 2026-10-10), so the filter
 *  matches the NOTICE CLASS by heading, never one baked title.
 *
 *  THE BUDGET IS WAITED OUT, NOT GUESSED (2026-10-11): a fixed 3s/5s
 *  click — and then an instant `isVisible()` presence check — both
 *  race a COLD host's first boot and swallow the miss, so test 1 of 6
 *  on a freshly booted lane reproducibly timed out at the composer's
 *  click with the API-key dialog still masking, while tests 2-6
 *  passed warm. A dismissal that is merely ATTEMPTED is not a
 *  dismissal: the loop re-tries until a real click lands, and DSH's
 *  own web wall waits these same surfaces out the same way
 *  (apps/web/tests/preview-boot.e2e.ts).
 *
 *  The loop is bounded: a host with NO dialogs probes true on the
 *  first round and pays ~2s, and a composer slow to BOOT gets the last
 *  round's full budget instead of the probe's. */
export async function dismissOnboarding(page: Page): Promise<void> {
  const ROUNDS = 3
  for (let round = 0; round < ROUNDS; round++) {
    // The last round waits properly for a late-booting composer; the
    // earlier rounds only ask "is anything still masking?".
    const last = round === ROUNDS - 1
    try {
      await composerOf(page).click({ timeout: last ? 30_000 : 2_000 })
      return
    } catch { /* still masked (or not booted) — dismiss, then re-probe */ }
    // THE NOTICE FIRST: it stacks OVER the API-key dialog, so the
    // other order leaves the composer masked behind it.
    try {
      await page.getByRole('dialog').filter({ hasText: /Notice/ })
        .getByRole('button', { name: 'Continue' }).click({ timeout: 10_000 })
    } catch { /* no first-run notice on this host */ }
    try {
      await page.getByRole('button', { name: 'Configure later' }).click({ timeout: 30_000 })
    } catch { /* host already configured — no onboarding dialog */ }
  }
}

/** THE ACTIVATION GRACE (doors.ts `estateStillActivating`): every seat
 *  door answers 503 `estate/pending` while ANY fiber is still
 *  mid-transition, bounded by ESTATE_PENDING_GRACE_MS = 120s.
 *  MEASURED on a cold throwaway lane home (2026-09-29): the gate held
 *  the FULL 120s — a fiber stays activating and only the grace expiry
 *  (the wedge escape the law was written for) released it — then
 *  answered 200 on the first poll past the window. So on a freshly
 *  booted host the browser plane is NOT ready when the shell paints,
 *  and a wall that reads a seat door once, early, reads the boot race
 *  and calls it a contract failure (the mint wall died exactly there).
 *  The browser walls WAIT THE GRACE OUT rather than shortening it. */
export const ESTATE_ACTIVATION_GRACE_MS = 150_000

/** THE PENDING ANSWER, read as the CLASS the door speaks: a body
 *  carrying the estate/pending code is the documented boot-race
 *  transport, whatever the frame's status. */
const isPendingBody = (body: string): boolean => body.includes('estate/pending')

/** One poll grammar for every seat door the browser plane reads: ask
 *  again until the door stops answering the boot race, bounded by the
 *  grace plus slack. A gate that NEVER lifts returns its pending body,
 *  so the caller still fails — with the door's own words — instead of
 *  waiting forever. */
async function pollPastPending(page: Page, url: string, budgetMs: number): Promise<string> {
  const body = await page.evaluate(async ({ target, budget }: { target: string; budget: number }) => {
    const deadline = Date.now() + budget
    for (;;) {
      const res = await fetch(target, { headers: { accept: 'application/json' } })
      const body = await res.text().catch(() => '')
      if (!body.includes('estate/pending')) return body
      if (Date.now() > deadline) return body
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
  }, { target: url, budget: budgetMs })
  return body
}

/** THE READINESS GATE — a step of every tour, before the mint. Wait
 *  for the estate composition to leave its boot-race pending gate, so
 *  the mint types into a host whose seat doors actually serve.
 *
 *  Read on a never-authored key: while the gate is closed the door
 *  refuses BEFORE the estate is asked, so the probe proves readiness
 *  without touching any conversation's bench. A 404 (no such bench) is
 *  the READY answer — this wall wants the gate OPEN, not a row. */
export const READY_PROBE_KEY = '__e2e_wall_ready__'
export async function waitForEstate(page: Page, budgetMs = ESTATE_ACTIVATION_GRACE_MS): Promise<void> {
  const settled = await pollPastPending(page, '/v1/bench/' + READY_PROBE_KEY, budgetMs)
  expect(settled, 'the estate composition leaves its boot-race pending gate (doors.ts grace)').not.toContain('estate/pending')
}

/** THE RECEIPT, off the wire and past the grace: the bench row the
 *  ENGINE would compose. The same door the wall has always read; the
 *  only change is that the documented pending answer is waited out
 *  rather than asserted against. */
export async function readBenchRow(page: Page, sessionKey: string, budgetMs = ESTATE_ACTIVATION_GRACE_MS): Promise<string> {
  return await pollPastPending(page, '/v1/bench/' + encodeURIComponent(sessionKey), budgetMs)
}

/** Let the host's own boot noise land before the tour's ledger. */
export async function settle(page: Page): Promise<void> {
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await dismissOnboarding(page)
  await page.waitForTimeout(9_000)
  // THE LATE MOUNT (the first spec on a fresh lane home, 2026-10-11):
  // the API-key step's readiness join resolves DURING boot, so on a
  // cold host the dialog lands after the first dismissal pass — and
  // its mask then ate the mint's composer click, failing the wall
  // where the mint types. The second pass runs after the boot-noise
  // wait, by which point the dialog is definitively up; a host that
  // never shows it pays the presence check alone.
  await dismissOnboarding(page)
  // THE HOST IS NOT SERVED YET (2026-09-29): the shell paints long
  // before the estate composition leaves its activation gate, and the
  // mint's own doors answer the boot race until it does.
  await waitForEstate(page)
}

/** Open SOME conversation (stroke 83): the wall must never pass or
 *  fail on host HISTORY (the pre-stroke spec leaned on the operator's
 *  accumulated session list). The tour needs an open conversation —
 *  the expand seat lives in the "conversation.session.header.corner"
 *  slot, which only an OPEN conversation renders — so ALWAYS mint
 *  through the GUI's own composer (type a message, Enter), even when
 *  a seat is already up: the host reopens the LAST conversation on
 *  load (2026-10-10: a leftover "New Session" from an aborted run
 *  handed the authoring-contract wall an EMPTY key and its bench
 *  read fell through to the seatless arm), and a send into the OPEN
 *  conversation fires the SAME session/prompt frame with THAT
 *  conversation's id — the returned key is always the conversation
 *  the tab is about to show, never a guess off host history. */
export async function openAConversation(page: Page): Promise<{ opened: boolean; sessionKey: string }> {
  if (!AI_OPT_IN) {
    throw new Error(
      'THE MINT IS AN ACTUAL AI CALL — the composer send rides /api/session/prompt to the lane\'s real model '
      + '(one model turn per mint, tokens burned, a keyed live lane required). Opt in with MELITE_E2E_AI=1; '
      + 'minting specs self-skip without it — reaching this spine uninvited is a spec bug, never a silent skip.',
    )
  }
  const seat = page.locator('[data-sidebar-right-expand]').first()
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
  const composer = composerOf(page)
  await composer.click({ timeout: 10_000 })
  await page.keyboard.type('e2e wall: bench tour mint', { delay: 15 })
  // THE TURN'S OWN ANSWER (2026-10-24): a keyed lane answers the
  // mint in 10–40s (glm-5.3-flash high effort), and a spec that
  // proceeds mid-turn races the reply's rerenders — the panel-delete
  // red class: the Media toggle vanished behind the in-flight turn's
  // re-layout for the whole 10s click budget. The listener attaches
  // BEFORE Enter (a later attach can miss the response), and the
  // wait is bounded — a dead brain must still fail at the mint's own
  // named cause, never here.
  const answered = page.waitForResponse(
    (r) => r.url().includes('/api/session/prompt') && r.request().method() === 'POST',
    { timeout: 90_000 },
  ).catch(() => null)
  await page.keyboard.press('Enter')
  await answered
  // THE TURN'S END, not its start (2026-10-24, the drafts-face red
  // class): the prompt RESPONSE frame arrives when generation
  // STARTS — the turn keeps streaming after it, and an in-flight
  // turn's rerenders hide the melite face (the fresh conversation
  // rides its Start view with the gallery verbs unmounted) for the
  // whole downstream click budget. The send verb's re-enable IS
  // the turn's completion signal; bounded so a dead brain still
  // fails at the mint's own named cause, never here.
  const sendAgain = page.getByRole('button', { name: 'Send message' })
  for (let i = 0; i < 45; i++) {
    if (await sendAgain.isDisabled().catch(() => true) === false) break
    await page.waitForTimeout(1_000)
  }
  await seat.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {})
  const opened = await seat.isVisible().catch(() => false)
  // THE KEY IS A RECEIPT, not a hope: poll for the mint's own frame
  // (a flat wait can outrun a slow send), and a wall whose mint never
  // named a key fails HERE with a named cause — never downstream on
  // an empty-key URL that falls through to the seatless arm.
  for (let i = 0; i < 40 && mintedKey === ''; i++) await page.waitForTimeout(250)
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
    | { stages?: unknown[]; rev?: number; bench?: { rev?: number }; doc?: { stages?: unknown[]; rev?: number; bench?: { rev?: number } } }
    | undefined
  const doc = parsed?.doc ?? parsed ?? {}
  const stages = Array.isArray(doc.stages) ? doc.stages : []
  // THE REV IS FLAT on the bench doc ({"draft_id","session","rev",
  // "stages"} — the ensure/get wire's own shape). The old parser read
  // only doc.bench.rev, which never exists: it silently held 0, which
  // only ever matched because ensure BIRTHS at 0 — a leftover bench
  // at rev≥1 refused the seed with a CAS conflict (2026-10-10).
  const rev = typeof doc.rev === 'number' ? doc.rev : typeof doc.bench?.rev === 'number' ? doc.bench.rev : 0
  if (stages.some((s) => typeof s === 'object' && s !== null && 'card' in s && (s as { card?: unknown }).card === 'h3-timeline')) return
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
  // title ('Melite Bench', src/client/index.ts), never the shell's
  // locale copy and never a stale pinned label on the operator's
  // shared host: both drift, our plugin title does not.
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(7_000)
  if (sessionKey !== '' && mintedKey === '') await seedBenchH3(page, sessionKey)
  // the resource stream pushes the rev drift; give the tile time
  await page.waitForTimeout(4_000)
}

/** In-flight body reads for the ≥400 frames whose pending-ness is only
 *  knowable by reading them — drained by expectNoPageErrors before it
 *  asserts, so a slow classification can never be mistaken for a
 *  clean ledger. */
const pendingReads: Array<Promise<void>> = []

/** The zero-error ledger every tour closes with: page errors,
 *  console errors, and any ≥400 HTTP frame (named — a bare "404"
 *  hides WHICH route; the diagnosis law).
 *
 *  THE BOOT RACE IS NOT A PAGE ERROR: a cold host answers the seat
 *  doors with 503 `estate/pending` until the activation grace expires
 *  (see ESTATE_ACTIVATION_GRACE_MS), and the shell's own background
 *  reads collect those frames while the walls wait it out. Counting
 *  them would fail every spec on a freshly booted lane for a transport
 *  state the host documents as transient — so exactly the pending
 *  answer is dropped, by its CODE, and every other ≥400 still fails
 *  the wall. */
export async function expectNoPageErrors(page: Page, errors: string[]): Promise<void> {
  await Promise.all(pendingReads.splice(0))
  expect(errors, errors.join('\n')).toEqual([])
}

/** Attach the error collectors a tour asserts on at its end. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text().slice(0, 150)
    // THE HTTP ARM OWNS HTTP (2026-09-29): Chromium logs one "Failed
    // to load resource: …503" line for EVERY failed fetch, so the
    // console arm double-counts frames the response arm below already
    // sees — with the URL, and with the body it classifies by code.
    // A console line carries neither, so it can only ever be a blind
    // duplicate: keeping it made every spec on a cold lane fail on the
    // host's own documented boot race. Only the JS arm's errors (real
    // script failures, unhandled rejections) are this arm's business.
    if (/Failed to load resource/.test(text)) return
    errors.push(`console: ${text}`)
  })
  page.on('response', (r) => {
    if (r.status() < 400) return
    // THE WALL'S OWN PROBE, never a page error: the readiness gate
    // reads a key that deliberately has no bench, so its 404 IS the
    // ready answer. A request the tour made is not the app's error.
    if (r.url().includes(READY_PROBE_KEY)) return
    // THE PENDING FRAME, identified by the door's own code: read the
    // body rather than the status, so a 503 that is NOT the boot race
    // (a real engine refusal) still lands in the ledger.
    const status = r.status()
    const url = r.url().slice(0, 150)
    // AWAITED, NOT FIRED: the ledger closes its books synchronously,
    // so a classification still in flight when the wall asserts could
    // hide a real failure behind a wall that already passed. The
    // handles are drained by expectNoPageErrors before the assertion.
    pendingReads.push(r.text().then(
      (body) => {
        if (isPendingBody(body)) return
        errors.push(`http ${status}: ${url}`)
      },
      () => { errors.push(`http ${status}: ${url}`) },
    ))
  })
  return errors
}
