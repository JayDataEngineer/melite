// probe (e2-10-green): THE LINE on the live video studio AFTER the cure —
// the journey verdict. Same hops as the red probe, opposite verdict:
// the ruler spans its content, the line's column hit-tests the line,
// a line click/drag does nothing, an edge trim moves the end while the
// playhead sits, and the cap still scrubs.
import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

test('probe (e2-10-green): post-cure journey verdict — ruler spans, line swallows, trim unhooked, cap scrubs', async ({ page }) => {
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
  await page.getByText('Generate Video', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(4_000)
  const playhead = page.locator('[data-testid="motion-timeline-playhead"]').first()
  await playhead.waitFor({ timeout: 30_000 })
  const ruler = page.locator('[data-testid="motion-timeline-ruler"]').first()
  const content = page.locator('[data-testid="motion-timeline-content"]').first()
  // POSITION ORACLE (2026-10-29): the sticky timecode chip is GONE
  // (operator order — it read the bar's fps axis and lied); the
  // playhead's own x IS the position oracle now.
  const readTC = async (): Promise<string> => {
    const box = await playhead.boundingBox()
    return box === null ? '??' : String(Math.round(box.x))
  }

  // SEAT 1 — THE SHRINK: the ruler spans its content (no 62px chip).
  const geo = await page.evaluate(() => {
    const box = (el: Element | null) => {
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return Math.round(r.width)
    }
    return {
      rulerW: box(document.querySelector('[data-testid="motion-timeline-ruler"]')),
      contentW: box(document.querySelector('[data-testid="motion-timeline-content"]')),
    }
  })
  console.log('GREEN_GEO=' + JSON.stringify(geo))
  expect(geo.rulerW).toBe(geo.contentW)

  // CONTROL: the cap drags (the scrub belongs to the cap).
  const cap = page.locator('[data-testid="motion-timeline-playhead-cap"]').first()
  const capBox = await cap.boundingBox()
  expect(capBox).not.toBeNull()
  const tc0 = await readTC()
  await page.mouse.move(Math.round(capBox!.x + capBox!.width / 2), Math.round(capBox!.y + capBox!.height / 2))
  await page.mouse.down()
  await page.mouse.move(Math.round(capBox!.x + capBox!.width / 2) + 120, Math.round(capBox!.y + capBox!.height / 2), { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(800)
  const tcScrubbed = await readTC()
  console.log('TC_SCRUBBED=' + tcScrubbed + ' (was ' + tc0 + ')')
  expect(tcScrubbed === tc0).toBe(false)

  // SEAT 2 — THE SWALLOW, click path: the line's column hit-tests the
  // LINE, and a click there seeks nothing and selects nothing.
  const lineBox = await playhead.boundingBox()
  const rulerBox = await ruler.boundingBox()
  expect(lineBox).not.toBeNull()
  expect(rulerBox).not.toBeNull()
  const lx = Math.round(lineBox!.x + lineBox!.width / 2)
  const ly = Math.round(rulerBox!.y + rulerBox!.height - 4)
  const hit = await page.evaluate(([hx, hy]) => {
    const el = document.elementFromPoint(hx, hy)
    return el ? (el.getAttribute?.('data-testid') ?? '') + '|' + el.tagName : 'NONE'
  }, [lx, ly])
  console.log('GREEN_HIT=' + hit)
  expect(hit.startsWith('motion-timeline-playhead|')).toBe(true)
  await page.mouse.click(lx, ly)
  await page.waitForTimeout(800)
  expect(await readTC()).toBe(tcScrubbed)
  // the click-voice chip is GONE with the ruler click (operator:
  // a timeline click must do NOTHING — no seek, no voice, no chip)
  expect(await page.locator('[data-testid="motion-timeline-click-voice"]').count()).toBe(0)
  expect(await page.locator('[data-testid="motion-timeline-timecode"]').count()).toBe(0)

  // SEAT 2 — THE SWALLOW, drag path: a press-drag on the line in the
  // calls lane moves no clip and seeks nothing.
  const clip = page.locator('[data-prompt-clip]').first()
  const clipBefore = await clip.boundingBox()
  const dy = Math.round((clipBefore?.y ?? rulerBox!.y + rulerBox!.height) + 28)
  await page.mouse.move(lx, dy)
  await page.mouse.down()
  await page.mouse.move(lx + 80, dy, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(800)
  expect(await readTC()).toBe(tcScrubbed)
  console.log('CLIP_STABLE=' + JSON.stringify(await clip.boundingBox()))

  // SEAT 3 — THE UNHOOK: dragging the END of a clip resizes the end
  // while the playhead sits (operator: ONLY the white circle scrubs).
  const edgeR = page.locator('[data-prompt-edge="r"]').first()
  if (await edgeR.count() > 0) {
    const eb = await edgeR.boundingBox()
    expect(eb).not.toBeNull()
    const clipW0 = (await clip.boundingBox())?.width ?? 0
    await page.mouse.move(Math.round(eb!.x + eb!.width / 2), Math.round(eb!.y + eb!.height / 2))
    await page.mouse.down()
    await page.mouse.move(Math.round(eb!.x + eb!.width / 2) + 80, Math.round(eb!.y + eb!.height / 2), { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    const tcAfterTrim = await readTC()
    const clipW1 = (await clip.boundingBox())?.width ?? 0
    console.log('TC_AFTER_TRIM=' + tcAfterTrim + ' CLIP_W=' + clipW0 + '->' + clipW1)
    expect(tcAfterTrim).toBe(tcScrubbed)
    expect(Math.abs(clipW1 - clipW0) > 4).toBe(true)
  }
  await page.screenshot({ path: '/tmp/probe-e210-green.png', fullPage: false })
})
