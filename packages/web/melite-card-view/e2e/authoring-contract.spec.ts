// authoring-contract.spec — THE AUTHORING CONTRACT, ON THE REAL
// LANE (2026-10-10, the operator's live face: "Generate Image: lane
// 'krea-2/turbo' refuses the state: this lane requires 'prompt' —
// 'prompt' is not stated — every image lane states WHAT the picture
// is — write the prompt", and "THERE SHOULD HAVE BEEN A CONTRACT, SO
// USERS CAN ADD CARDS").
//
// The contract, in one sentence: what you TYPE in a card IS that
// card's state on the bench. The unit tier pins it against the
// fakes (gate-r7b-drill1's authoring-contract describe); this wall
// pins it against the LIVE estate, because the bug's whole shape was
// a seam the fakes cannot see — the typed field lived in the drill's
// React state, the run's fresh-read composed the estate row, and the
// row had never heard the prompt.
//
// The flow: mint a conversation, open its bench, ADD a card through
// the real add door, type into the real form, and read the bench back
// off the wire — the row's params must carry the typed words. No
// compose, no engine: the receipt is the DOC.
import { expect, test } from '@playwright/test'
import { expectNoPageErrors, openAConversation, openCardsWithBench, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')

test('a typed prompt RIDES the bench row (the lane can never say "prompt is not stated")', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 150)}`) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url().slice(0, 150)}`) })

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the bench lives in the conversation)').toBe(true)
  expect(sessionKey, 'the mint names its conversation (the bench read rides this key)').not.toBe('')
  await openCardsWithBench(page, sessionKey)

  // THE ADD DOOR (the operator's own path: add a card to the bench)
  await page.getByRole('button', { name: 'Add a card' }).first().click({ timeout: 20_000 })
  // the card button by its EXACT name — the door also shows the
  // bench's last refusal as prose, and a has-text locator can land
  // on the refusal instead of the card (the operator's own face
  // sits in this very dialog).
  const card = page.getByRole('button', { name: 'Generate Image', exact: true }).first()
  await expect(card, 'the image card offered in the add door').toBeVisible({ timeout: 20_000 })
  await card.click({ timeout: 10_000 })

  // THE DRILL opens on the fresh row (the open-on-add law) — the
  // real form, the real schema: a prompt field the card declares.
  const prompt = page.getByLabel('Prompt', { exact: false }).first()
  await expect(prompt, 'the added card opens with its declared form').toBeVisible({ timeout: 30_000 })
  // UNIQUE PER RUN: the host reopens the LAST conversation on load,
  // so a re-run mints into a bench that still carries the prior run's
  // card — a fixed string would let a leftover mask a dead write.
  const words = `a red cloak on a white horse — wall ${Date.now()}`
  await prompt.fill(words)

  // THE WRITE — the contract's own delay (the trailing coalescing
  // write; the run gate forces it too, and the bench read below is
  // the row the ENGINE would compose).
  await page.waitForTimeout(2_500)

  // THE RECEIPT, off the wire: the bench row carries the typed words.
  const read = await page.evaluate(async (key: string) => {
    const res = await fetch('/v1/bench/' + encodeURIComponent(key), { headers: { accept: 'application/json' } })
    return await res.text()
  }, sessionKey)
  expect(read, 'the bench read answers').toContain(words)

  await expectNoPageErrors(page, errors)
})
