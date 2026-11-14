/**
 * E2E GPU — THE ANNY VERB-BAR PROOF (MHR slice 2's owed live half,
 * 2026-11-13): a registered verb a human cannot press is still a
 * dead verb — this is the LIVE lane receipt that the Estimate verb
 * is served, pressable, and hydrating.
 *
 * The walk (the operator's own path, end to end):
 *  1. the served spec carries the verbs arm — the bar renders on
 *     the anny drill with the Estimate button (slice 1 + slice 2 on
 *     the live door);
 *  2. the dialog derives from the served envelope (the Person
 *     field) and names the intake mapping (photo ← body_image);
 *  3. ONE press rides the {flow:} door (anny-hmr-estimator) with
 *     the stage's body_image as the photo initial — REAL inference:
 *     SAM 3D Body → MHR → SOMA on the operator's engine;
 *  4. the settled run's artifact seats through the drafts/patch
 *     ledger — body_glb lands on the stage (UI note + server row)
 *     and the seated URL SERVES a real GLB through the estate's
 *     own media route.
 *
 * VRAM PREP (the honest seat): the estimator declares a 15500 MB
 * budget and the execute door proves headroom BEFORE submit — a
 * stale resident model starves it. The estate's own free door
 * (POST /v1/manage {action:'free'} — native /free + the warmed-seat
 * chain) clears the seat first; on an empty engine it is a no-op.
 * The estate never evicts on the run path — this is the operator's
 * own manage gesture, driven once as prep.
 *
 * Keyless law: runs ONLY through scripts/e2e-gpu-lane.sh
 * (E2E_GPU=1). The mint burns one model turn (MELITE_E2E_AI=1) —
 * on the keyless lane the turn itself fails HONESTLY
 * (MISSING_CREDENTIAL in chat) while the session key still rides
 * the request frame (the automotive spec's own finding).
 */
import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL, waitForEstate } from '../tour.ts'

test.skip(
  !STUDIO_URL || process.env.E2E_GPU !== '1',
  'the verb-bar proof needs E2E_STUDIO_URL (the gpu lane) AND E2E_GPU=1 (e2e-gpu-lane.sh)',
)

/** The estimator's photo — a portrait from the estate's own input
 * dir (host-path input: rides the staging walk verbatim). */
function estimatorPhoto(): string {
  const rel = 'data/input/00075-2286428479.jpg'
  for (const base of [process.cwd(), resolve(process.cwd(), '../../..')]) {
    const p = resolve(base, rel)
    if (existsSync(p)) return p
  }
  throw new Error('estimator photo not found relative to ' + process.cwd())
}

test('the live lane: the Estimate verb is served, pressable, and seats its body_glb', async ({ page }) => {
  test.setTimeout(12 * 60_000)
  const errors: string[] = collectPageErrors(page)
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await settle(page)
  await waitForEstate(page)

  // ── VRAM PREP: the estate's own free door ──────────────────────
  const freed = await page.evaluate(async () => {
    const r = await fetch('/v1/manage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'free' }),
      signal: AbortSignal.timeout(60_000),
    })
    return { status: r.status, body: await r.text().catch(() => '') }
  })
  expect(freed.status, 'the free door answers (VRAM prep for the 15500 MB estimator): ' + freed.body.slice(0, 300)).toBe(200)

  // ── the bench: an anny stage carrying the photo ────────────────
  const mint = await openAConversation(page)
  expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
  const sessionKey = mint.sessionKey
  const annyFamily = await page.evaluate(async () => {
    const cat = await (await fetch('/v1/model-catalog')).json() as { cards?: Record<string, { families?: string[] }> }
    return cat.cards?.anny?.families?.[0]
  })
  expect(annyFamily, 'the catalog seats the anny family').toBeTruthy()
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
    doc: {
      card: 'anny', author: 'user', expect_rev: await benchRev(),
      params: { model: annyFamily, body_image: estimatorPhoto() },
    },
  })

  // ── the drill: the bar renders from the SERVED spec ────────────
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(5_000)
  const tile = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])').first()
  await tile.click({ timeout: 15_000, force: true })
  await expect(page.locator('div[class*="zoomCard"]').first(), 'the drill opens').toBeVisible({ timeout: 30_000 })

  const bar = page.getByTestId('verb-bar')
  await expect(bar, 'THE SERVED ARM: the verbs ride the live form-spec — the bar renders').toBeVisible({ timeout: 30_000 })
  const estimate = bar.getByRole('button', { name: /Estimate body from photo/ })
  await expect(estimate, 'the Estimate verb is a PRESS on the drill (a dead button is a dead verb)').toBeVisible()

  // ── the dialog: served fields + the intake mapping ─────────────
  await estimate.click()
  const dialog = page.getByTestId('verb-dialog')
  await expect(dialog, 'the dialog opens from the served envelope').toBeVisible({ timeout: 10_000 })
  await expect(dialog.getByText('Person'), 'the Person field derives from the served fields envelope').toBeVisible()
  const intake = dialog.getByTestId('verb-intake')
  await expect(intake, 'the intake note names the mapping (photo ← body_image)').toContainText('body_image')

  // ── ONE press: real inference, then the seated write ───────────
  // The verb's flow run lives on the VERB NOTE (running → seated /
  // refused — the stage tile's own status does not track an inline
  // flow run), so the poll walks the note until it leaves the
  // running face, then the verdict is named, never a bare timeout.
  await page.getByTestId('verb-run').click()
  const note = page.getByTestId('verb-note')
  let verdict = ''
  for (let waited = 0; waited < 8 * 60_000; waited += 3_000) {
    const text = (await note.textContent({ timeout: 10_000 }).catch(() => '')) ?? ''
    if (text !== '' && !text.includes('Running…')) { verdict = text; break }
    await page.waitForTimeout(3_000)
  }
  expect(verdict, 'the verb voiced a terminal verdict (SAM 3D Body → MHR → SOMA — real inference)').not.toBe('')
  expect(verdict, 'the estimator SUCCEEDED and seated its write (any refusal voice is a named red): ' + verdict).toContain('body_glb seated from run')
  // the dialog stays open through the run (its button carries the
  // running face) — close it so the screenshot shows the seated bar.
  // The Close button rides the MODAL's header, outside the
  // verb-dialog content div (the testid names the fields region) —
  // scope through the modal's dialog role, which the title names.
  await page.getByRole('dialog', { name: 'Estimate body from photo' })
    .getByRole('button', { name: 'Close' }).click()

  // ── server truth: the ledger row carries the artifact ──────────
  const row = await callBench(page, 'bench/get', { sessionKey }) as
    | { stages?: Array<{ params?: Record<string, unknown> }> ; doc?: { stages?: Array<{ params?: Record<string, unknown> }> } }
    | undefined
  const stages = (row?.doc ?? row)?.stages ?? []
  const bodyGlb = stages[0]?.params?.['body_glb']
  expect(typeof bodyGlb, 'the bench row carries body_glb (the drafts/patch ledger write)').toBe('string')
  // The seated value is the MEDIA ROUTE URL (the live consumer path,
  // /melite-media/runs/<run>/<rel>) — prove it SERVES through the
  // estate's own door with GLB magic bytes, never a filesystem join
  // against the throwaway root (the route owns the layout).
  const served = await page.evaluate(async (url: string) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    const buf = await r.arrayBuffer().catch(() => new ArrayBuffer(0))
    return { status: r.status, type: r.headers.get('content-type') ?? '', bytes: buf.byteLength,
      magic: new TextDecoder().decode(new Uint8Array(buf.slice(0, 4))) }
  }, String(bodyGlb))
  expect(served.status, 'the seated body_glb URL serves (the estate\'s own media route): ' + String(bodyGlb)).toBe(200)
  expect(served.bytes, 'the served GLB is non-empty').toBeGreaterThan(0)
  expect(served.magic, 'the served artifact carries the GLB magic (glTF binary)').toBe('glTF')

  await page.screenshot({ path: 'e2e/gpu/anny-verb-bar-proof.png', fullPage: false })
  // THE PREVIEW SEAM, dropped by its exact shape (the 503-pending
  // precedent — a documented transport state, never a blanket code
  // drop): the drill paints a source-photo preview for the stage's
  // body_image, and that param is the ABSOLUTE host path this spec
  // seeded (the engine stages it fine — the run above completed and
  // the GLB served). The preview img builds a URL from the raw path,
  // which the dev host 404s. That preview builder is owed its own
  // cure (an estate file door for absolute-path params); until it
  // lands, exactly this one frame — 404 on THIS photo's path — is
  // not this proof's red. Every other ≥400 frame still fails.
  const preview = `http 404: `
  const photoTail = estimatorPhoto()
  const real = errors.filter((e) => !(e.startsWith(preview) && e.endsWith(photoTail)))
  expect(real, 'only the drill\'s known preview seam may 404: ' + errors.join('\n')).toEqual([])
  await expectNoPageErrors(page, real)
})
