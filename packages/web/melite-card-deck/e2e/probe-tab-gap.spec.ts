import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

// probe (tab-gap): the media flow card's tab-title gap — measure the
// vertical seam between the tab strip (top), the bench rev bar, and
// the panel's content at rest and after scrolling. Read-only probe.
test('probe (tab-gap): gap between the tab title and the rev bar', async ({ page }) => {
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

  const geo = await page.evaluate(() => {
    const pick = (label: string, el: Element | null) => {
      if (el === null) return { label, missing: true }
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { label, top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
        position: cs.position, overflowY: cs.overflowY, paddingTop: cs.paddingTop, scrollTop: Math.round(el.scrollTop) }
    }
    const revBar = document.querySelector('[class*="benchHead"]')
    const revTag = document.querySelector('[class*="revTag"]')
    const panel = revBar !== null ? revBar.parentElement : null
    const scrollers: Element[] = []
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el)
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.clientHeight > 100) scrollers.push(el)
    })
    return {
      revBar: pick('benchHead', revBar),
      revTag: pick('revTag', revTag),
      panel: pick('panel(parentOf benchHead)', panel),
      scrollers: scrollers.slice(0, 6).map((el) => pick('scroller.' + el.className.toString().slice(0, 40), el)),
    }
  })
  console.log('GEO_AT_REST=' + JSON.stringify(geo))

  // scroll the innermost scroller that contains the rev bar, then re-measure
  await page.evaluate(() => {
    const revBar = document.querySelector('[class*="benchHead"]')
    if (revBar === null) return
    let el: Element | null = revBar.parentElement
    while (el !== null) {
      const cs = getComputedStyle(el)
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') { el.scrollTop += 400; break }
      el = el.parentElement
    }
  })
  await page.waitForTimeout(800)
  const geo2 = await page.evaluate(() => {
    const revBar = document.querySelector('[class*="benchHead"]')
    const out: Record<string, unknown> = {}
    if (revBar !== null) {
      const r = revBar.getBoundingClientRect()
      out.revBarTop = Math.round(r.top)
      let el: Element | null = revBar.parentElement
      while (el !== null) {
        const cs = getComputedStyle(el)
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') { out.scrollerClass = el.className.toString().slice(0, 60); out.scrollerScrollTop = Math.round(el.scrollTop); out.scrollerTop = Math.round(el.getBoundingClientRect().top); break }
        el = el.parentElement
      }
    }
    return out
  })
  console.log('GEO_SCROLLED=' + JSON.stringify(geo2))
  await page.screenshot({ path: '/tmp/probe-tabgap.png', fullPage: false })
  expect(geo.revBar.missing ?? false, 'bench header renders').toBe(false)
})
