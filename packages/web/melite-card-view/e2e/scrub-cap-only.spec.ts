// scrub-cap-only.spec.ts — THE PLAYWRIGHT-CLASS SCRUB LAW (item b,
// the operator's demand: "a high level of testing" for the one defect
// failed multiple times under green claims). The jsdom tier pins the
// wiring (studio-strip-pane.spec.tsx: the line has no handler, the
// css rule is pointer-events:none, a dispatched press opens no
// session). THIS tier rides the REAL browser's hit-testing: with
// pointer-events:none the browser targets the element UNDER the line,
// and this spec proves the live seat obeys — a real mouse drag on the
// line's midpoint moves NOTHING, the same drag on the cap moves the
// frame. Screenshots at every stage (data/runtime, gitignored).
//
// Keyless law: self-skips without E2E_STUDIO_URL (the studio lane
// owns the boot — scripts/e2e-studio-lane.sh). The mint law: the
// seat's open is an ACTUAL AI CALL — self-skips without the opt-in
// (e2e-ai-opt-in.spec.ts's derived census reads this guard).
import { expect, test } from '@playwright/test'
import { collectPageErrors, expectNoPageErrors, openAConversation, openCardsWithBench, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

test('the playhead LINE drags nothing; the CAP scrubs (real pointer, real hit-testing)', async ({ page }) => {
  const pageErrors = collectPageErrors(page)
  await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' })
  await dismiss(page)
  const { sessionKey } = await openAConversation(page)
  // OPEN THE PANE OURSELVES (drive-15's #11 corpse): seeding alone
  // leaves the bench hidden behind whatever pane state the mint's
  // turn-churn dropped — the tile wait then burns the whole budget
  // (the snapshot's reply shows the brain exploring past the
  // one-word order; the rerenders own the pane). openCardsWithBench
  // seeds AND expands AND seats the cards tab, the same door every
  // studio sibling rides.
  await openCardsWithBench(page, sessionKey)
  await settle(page)
  // the h3 studio door (the strip pane's live mount)
  await page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }).first().click()
  const studio = page.locator('[data-testid="h3-studio-tenant"]')
  await expect(studio).toBeVisible({ timeout: 30_000 })

  const line = page.locator('[data-testid="motion-timeline-playhead"]')
  const cap = page.locator('[data-testid="motion-timeline-playhead-cap"]')
  // THE POSITION ORACLE (2026-10-29): the sticky timecode chip is
  // GONE (operator: constantly inaccurate — it read the bar's fps
  // axis); the playhead's own x IS the position.
  const timecode = { textContent: async (): Promise<string | null> => {
    const box = await line.boundingBox()
    return box === null ? null : String(Math.round(box.x))
  } }
  await expect(line).toBeVisible({ timeout: 20_000 })
  await expect(cap).toBeVisible()

  const shot = (name: string) => page.screenshot({ path: `data/runtime/e2e-scrub-${name}.png`, fullPage: false })
  await shot('1-studio-open')

  // ── THE LINE: a real press-drag-release on the line's midpoint ──
  const lineBox = await line.boundingBox()
  expect(lineBox, 'the playhead line rendered with a box').toBeTruthy()
  const midX = lineBox!.x + lineBox!.width / 2
  // well BELOW the cap (the cap's 18px halo must not eat the press —
  // the grab target is the white ball, not a generous line neighborhood)
  const midY = lineBox!.y + Math.min(lineBox!.height / 2, 160)
  const before = await timecode.textContent()
  await page.mouse.move(midX, midY)
  await page.mouse.down()
  await shot('2-line-pressed')
  for (const dx of [10, 30, 60, 90, 60, 30, 0]) await page.mouse.move(midX + dx, midY)
  await shot('3-line-dragged')
  await page.mouse.up()
  const afterLine = await timecode.textContent()
  expect(afterLine, 'a drag on the LINE moved nothing (the operator item b, verbatim)').toBe(before)
  await shot('4-line-released')

  // ── THE CAP: the same real gesture on the white ball scrubs ──
  const capBox = await cap.boundingBox()
  expect(capBox, 'the playhead cap rendered with a box').toBeTruthy()
  const capX = capBox!.x + capBox!.width / 2
  const capY = capBox!.y + capBox!.height / 2
  await page.mouse.move(capX, capY)
  await page.mouse.down()
  await shot('5-cap-pressed')
  for (const dx of [10, 30, 60, 90]) await page.mouse.move(capX + dx, capY)
  await shot('6-cap-dragged')
  await page.mouse.up()
  const afterCap = await timecode.textContent()
  expect(afterCap, 'the same drag on the CAP scrubs the frame').not.toBe(before)
  await shot('7-cap-released')

  expectNoPageErrors(page, pageErrors)
})

async function dismiss(page: import('@playwright/test').Page): Promise<void> {
  // onboarding overlays ride their own seat in tour.ts; here a best-
  // effort click-away keeps the arm readable — the studio's own doors
  // assert visibility below, which is the real gate.
  const btn = page.locator('button', { hasText: /start|begin|got it/i }).first()
  if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {})
}
