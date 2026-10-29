// probe (e2-10-red): THE LINE on the live video studio — press/drag the
// white line (not the cap) and read what the lane does. RED probe: any
// seek/session/select from the line's pixels is the operator's burn.
import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

test('probe (e2-10-red): the video studio line press/drag does nothing; the cap scrubs', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try { await notice.click({ timeout: 10_000 }); await page.waitForTimeout(1_000) } catch { /* again */ }
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  await page.getByText('Melite Bench', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  // the h3 video tile → its studio (drill)
  const tile = page.getByText('Generate Video', { exact: true }).first()
  await tile.click({ timeout: 30_000 })
  await page.waitForTimeout(4_000)
  const playhead = page.locator('[data-testid="motion-timeline-playhead"]').first()
  await playhead.waitFor({ timeout: 30_000 })
  const ruler = page.locator('[data-testid="motion-timeline-ruler"]').first()
  // POSITION ORACLE (2026-10-29): the sticky timecode chip is GONE;
  // the playhead's own x IS the position oracle.
  const readTC = async (): Promise<string> => {
    const box = await playhead.boundingBox()
    return box === null ? '??' : String(Math.round(box.x))
  }
  const lineBox = await playhead.boundingBox()
  const rulerBox = await ruler.boundingBox()
  console.log('LINE_BOX=' + JSON.stringify(lineBox))
  console.log('RULER_BOX=' + JSON.stringify(rulerBox))
  console.log('TC_BEFORE=' + await readTC())
  await page.screenshot({ path: '/tmp/probe-e210-studio.png', fullPage: false })

  // CONTROL FIRST: the cap drags (the scrub belongs to the cap) — and it
  // moves the playhead OFF zero so later seeks are observable.
  const cap = page.locator('[data-testid="motion-timeline-playhead-cap"]').first()
  const capBox = await cap.boundingBox()
  console.log('CAP_BOX=' + JSON.stringify(capBox))
  if (capBox !== null) {
    const x = Math.round(capBox.x + capBox.width / 2)
    const y = Math.round(capBox.y + capBox.height / 2)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 120, y, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    console.log('TC_AFTER_CAP_DRAG=' + await readTC())
  }
  await page.screenshot({ path: '/tmp/probe-e210-scrubbed.png', fullPage: false })

  // re-read geometry: the playhead moved; the line's column moved with it.
  const lineBox2 = await playhead.boundingBox()
  const rulerBox2 = await ruler.boundingBox()
  console.log('LINE_BOX2=' + JSON.stringify(lineBox2))

  // BURN 1: click the LINE's column near the BOTTOM of the ruler band —
  // below the cap's 18px hit zone, still ruler pixels, still the line's
  // 2px column. The hit chain is read with elementFromPoint (the real
  // browser hit-test): pre-cure it names the ruler/tick beneath (the
  // pass-through); post-cure it must name the playhead itself.
  if (lineBox2 !== null && rulerBox2 !== null) {
    const x = Math.round(lineBox2.x + lineBox2.width / 2)
    const y = Math.round(rulerBox2.y + rulerBox2.height - 4)
    const hit = await page.evaluate(([hx, hy]) => {
      const el = document.elementFromPoint(hx, hy)
      const chain: string[] = []
      let cur: Element | null = el
      while (cur !== null && chain.length < 6) {
        chain.push(
          (cur.getAttribute?.('data-testid') ?? '') + '|' +
          String(cur.className ?? '').slice(0, 40) + '|' +
          cur.tagName,
        )
        cur = cur.parentElement
      }
      return chain
    }, [x, y])
    console.log('HIT_CHAIN_LINE_COLUMN=' + JSON.stringify(hit))
    await page.mouse.click(x, y)
    await page.waitForTimeout(800)
    console.log('TC_AFTER_LINE_CLICK_IN_RULER=' + await readTC())
    const voice = page.locator('[data-testid="motion-timeline-click-voice"]').first()
    console.log('RULER_VOICE_AFTER_LINE_CLICK=' + JSON.stringify((await voice.count()) === 0 ? '(chip deleted 2026-10-29)' : await voice.textContent()))
  }

  // BURN 2: press-drag the LINE in the calls lane (below the ruler).
  // The C1 clip box is read before/after: pre-cure the press falls
  // through the dead line onto the clip body and the CLIP moves.
  const clip = page.locator('[data-prompt-clip]').first()
  const clipBefore = await clip.boundingBox()
  console.log('CLIP_BEFORE=' + JSON.stringify(clipBefore))
  if (lineBox2 !== null && rulerBox2 !== null) {
    const x = Math.round(lineBox2.x + lineBox2.width / 2)
    // boundingBox has no .bottom (that is DOMRect) — add height by hand.
    // y lands mid-C1 (the clip box read above spans the calls lane).
    const y = Math.round((clipBefore?.y ?? rulerBox2.y + rulerBox2.height) + 28)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 80, y, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    console.log('TC_AFTER_LINE_DRAG=' + await readTC())
  }
  console.log('CLIP_AFTER_LINE_DRAG=' + JSON.stringify(await clip.boundingBox()))

  // BURN 3 (the operator's HOOKS-ON note): drag the END of the video
  // bits — the clip's right edge — and read the playhead. Pre-cure the
  // trim-follow yanks the playhead to the trimmed edge (the preview
  // hooks on). Post-cure the playhead sits while the end moves.
  const edgeR = page.locator('[data-prompt-edge="r"]').first()
  const tc3 = await readTC()
  if (await edgeR.count() > 0) {
    const eb = await edgeR.boundingBox()
    console.log('EDGE_BOX=' + JSON.stringify(eb))
    if (eb !== null) {
      const x = Math.round(eb.x + eb.width / 2)
      const y = Math.round(eb.y + eb.height / 2)
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + 80, y, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(800)
      console.log('TC_AFTER_EDGE_DRAG=' + await readTC() + ' (was ' + tc3 + ')')
      console.log('CLIP_AFTER_EDGE_DRAG=' + JSON.stringify(await clip.boundingBox()))
    }
  }
  await page.screenshot({ path: '/tmp/probe-e210-after.png', fullPage: false })
})
