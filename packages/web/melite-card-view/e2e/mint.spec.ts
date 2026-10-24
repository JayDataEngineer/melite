// mint.spec — THE BENCH TOUR MINT, on the real lane (operator
// commission 2026-10-24: "e2e wall: bench tour mint").
//
// The tour spine (tour.ts) mints a conversation for every browser
// wall, and every spec asserts SOMETHING over the mint's leftover
// state — but no wall pinned the mint hop's OWN contract end to end.
// This one does, riding only the hops the mint itself crosses:
//
//   1. THE READINESS GATE — settle() waits the estate's boot-race
//      pending gate out before the mint types (a wall that reads a
//      seat door once, early, reads the boot race and calls it a
//      contract failure — the mint wall died exactly there,
//      tour.ts's 2026-09-29 note).
//   2. THE MINT NAMES ITS CONVERSATION — openAConversation captures
//      the session/prompt REQUEST frame's sessionId; the returned
//      key is a RECEIPT (never a guess off host history) and MUST be
//      a legal bench session key (the floor's SESSION_RE — the same
//      grammar the bench doors admit), not a shaped-up lookalike.
//   3. THE CONVERSATION OPENS — the expand seat is visible (the
//      open-conversation face) and the composer flipped to the
//      open-conversation placeholder.
//   4. THE BIRTH RIDES THE ENSURE DOOR ONLY — a minted conversation
//      owns NO bench until its first write: bench/get refuses
//      bench/not-found ("no such bench: …", bench.ts) BEFORE any
//      ensure, and bench/ensure is the only creating arm.
//   5. THE KEY IS THE BENCH SESSION KEY — the ensured doc's `session`
//      field names the minted key VERBATIM (benchSessionOf admits it,
//      no sanitize fallback to 'main'), and the birthed bench is
//      empty at rev 0.
//
// One test, ONE mint: every mint is a real model turn.
import { expect, test } from '@playwright/test'
import { SESSION_RE } from '@melite/contracts/benchStage'
import {
  callBench,
  collectPageErrors,
  expectNoPageErrors,
  openAConversation,
  settle,
  STUDIO_URL,
} from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

/** The bench doc's wire face (the bench/get row's own shape). */
interface BenchDoc {
  session?: string
  rev?: number
  stages?: unknown
}

test('the mint names its conversation, the bench births empty through the ensure door, and the minted key IS the bench session key', async ({ page }) => {
  // THE SHARED LEDGER, not a local copy: the boot-race pending frames
  // (503 estate/pending) are classified by code and awaited before
  // the assertion (tour.ts's law — never a local re-spelling).
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const mint = await openAConversation(page)

  // ARM 2+3 — the mint named a legal bench session key and the
  // conversation actually opened (the expand seat is the
  // open-conversation face).
  expect(mint.sessionKey, 'the mint names its conversation (the bench rides this key)').not.toBe('')
  expect.soft(mint.sessionKey, 'the minted key IS a bench session key (the floor grammar the doors admit)').toMatch(SESSION_RE)
  expect.soft(mint.opened, 'the conversation opened (the expand seat visible)').toBe(true)

  // The composer flipped to the open-conversation placeholder — the
  // mint's own UI receipt (the empty-state face is gone).
  await expect
    .soft(page.getByRole('textbox', { name: /Message or run a task/i }).first(), 'the composer flipped to the open-conversation face')
    .toBeVisible({ timeout: 10_000 })

  // ARM 4 — the fresh mint owns NO bench yet: the get refuses the
  // door's own not-found voice BEFORE the ensure. Birth rides the
  // ensure door only (the only creating arm); a mint that silently
  // pre-birthed a bench would pass the ensure below while lying about
  // the birth law.
  const preflight = await callBench(page, 'bench/get', { sessionKey: mint.sessionKey }).then(
    (v) => v,
    (e: unknown) => e,
  )
  expect
    .soft(preflight, 'bench/get refuses the fresh mint (birth rides the ensure door, not the mint)')
    .toBeInstanceOf(Error)
  expect
    .soft(String(preflight instanceof Error ? preflight.message : preflight), 'the refusal is the door\'s own not-found voice')
    .toMatch(/no such bench/)

  // ARM 5 — the ensure births; the doc's session field names the
  // minted key VERBATIM and the bench is empty at rev 0.
  await callBench(page, 'bench/ensure', { doc: { session: mint.sessionKey } })
  const doc = (await callBench(page, 'bench/get', { sessionKey: mint.sessionKey })) as BenchDoc
  expect(doc.session, 'the bench doc names the minted key verbatim (no sanitize fallback)').toBe(mint.sessionKey)
  expect(doc.rev, 'the birthed bench sits at rev 0').toBe(0)
  expect(doc.stages, 'the birthed bench carries no stages').toEqual([])

  await expectNoPageErrors(page, errors)
})
