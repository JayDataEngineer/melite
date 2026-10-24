/**
 * E2E: THE ONE-ROW CENSUS, at the browser plane (operator order
 * 2026-10-01: "WHY IS THERE TWO THAT IS A HUGE BUG" — the zoom
 * card's param surface carried two css-module hashes of the same
 * specField class because every consumer bundle inlined its own
 * compiled copy of the @melite/card-base atoms).
 *
 * The unit wall (packages/harness/melite-tools/test/
 * card-one-row.spec.ts) pins the BUNDLES — one registration, zero
 * inlined atoms per consumer. This wall pins what the operator
 * actually saw: the RENDERED zoom. A drill can only show one hash
 * prefix if every atom instance on screen came from the one row.
 *
 * The tour reuses the authoring contract's own steps (mint a
 * conversation, open the bench, add a Generate Image card): the
 * added card opens its drill — the spec form IS the zoom's param
 * UI. Read-only against the bench state; census over the DOM.
 *
 * Self-skips without E2E_STUDIO_URL (the token-authenticated shell
 * URL) — same law as the sibling specs.
 *
 * Run: E2E_STUDIO_URL='http://127.0.0.1:3907/?token=…' pnpm --filter
 *   @melite-plugin/dsh-card-view exec playwright test zoom-one-row
 */
import { expect, test } from '@playwright/test'
import { collectPageErrors, expectNoPageErrors, openAConversation, openCardsWithBench, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

test('the zoom renders ONE compiled atom set — exactly one css-module hash prefix on screen', async ({ page }) => {
  const errors: string[] = collectPageErrors(page)

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the bench lives in the conversation)').toBe(true)
  expect(sessionKey, 'the mint names its conversation').not.toBe('')
  await openCardsWithBench(page, sessionKey)

  await page.getByRole('button', { name: 'Add a card' }).first().click({ timeout: 20_000 })
  const card = page.getByRole('button', { name: 'Generate Image', exact: true }).first()
  await expect(card, 'the image card offered in the add door').toBeVisible({ timeout: 20_000 })
  await card.click({ timeout: 10_000 })

  // The drill's spec form must be live before the census counts
  // anything — an unbuilt studio would render the generic form and
  // the census would pass vacuously on zero atoms.
  const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true })
  await expect(prompt, 'the added card opens with its declared form (the zoom param UI)').toBeVisible({ timeout: 30_000 })

  // THE CENSUS: every class attribute on screen, harvested for
  // css-module atom names — <hash>_<local> pairs whose local names
  // the card-base spec surface owns. Distinct hash prefixes must be
  // EXACTLY ONE: two prefixes on one screen is the compiled-twice
  // defect this wall exists to catch (the operator's two hashes).
  const prefixes = await page.evaluate(() => {
    const found = new Set<string>()
    for (const el of document.querySelectorAll('[class]')) {
      for (const cls of (el as HTMLElement).className.split?.(/\s+/) ?? []) {
        const m = cls.match(/^([A-Za-z0-9]+)_(specSliderValue|specFieldKey|specFieldRow|specFieldLabel)$/)
        if (m !== null) found.add(m[1]!)
      }
    }
    return [...found]
  })
  expect(prefixes, `exactly one compiled atom set on screen (got ${prefixes.join(', ') || 'NONE'})`).toHaveLength(1)

  await expectNoPageErrors(page, errors)
})
