// Rail-flash probe — cards view boot, REAL host :3088.
// Samples the deck iframe's DOM from the frame's first attach through
// settle. PASS = the ActivityBar rail column (div.w-12.flex-col) and the
// skeleton drawer (div.w-64.border-r) are NEVER visibly painted inside
// the iframe at any sample.
import { chromium } from '@playwright/test'

const HOST = process.env.PROBE_HOST ?? 'http://127.0.0.1:3088'
const POLL_MS = 30
const MAX_MS = 15000

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
})
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
await page.goto(HOST + '/', { waitUntil: 'domcontentloaded' })

// The Cards sidebar entry row (vendored sidebar-entry-core injection).
const entry = page.locator('[data-melite-cards-entry]')
await entry.waitFor({ state: 'visible', timeout: 20000 })
await entry.click()

const frameLoc = page.locator('[data-plugin="melite-card-deck-canvas"] iframe')
await frameLoc.waitFor({ state: 'attached', timeout: 20000 })

let samples = 0
let railVisibleSamples = []
let drawerVisibleSamples = []
let railPresentHidden = 0
let skeletonSeen = false
let centerSettled = false
const t0 = Date.now()

while (Date.now() - t0 < MAX_MS) {
  const doc = await frameLoc.evaluate((frame) => {
    const d = frame.contentDocument
    if (!d || !d.body) return null
    const vis = (el) => {
      if (!el) return false
      const cs = d.defaultView.getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
      const r = el.getBoundingClientRect()
      return r.width > 2 && r.height > 2
    }
    // the real ActivityBar column signature
    let railVis = false
    let railHidden = false
    for (const el of d.querySelectorAll('div.w-12.flex-col')) {
      if (vis(el)) { railVis = true } else { railHidden = true }
    }
    // the skeleton's fake rail + fake drawer signatures
    const skelRail = [...d.querySelectorAll('div.tn-seam')].some(vis)
    const skelDrawer = [...d.querySelectorAll('div.w-64.border-r')].some(vis)
    const settled = !!d.querySelector('[data-workspace-content]')
    return { railVis, railHidden, skelRail, skelDrawer, settled }
  }).catch(() => null)

  if (doc) {
    samples++
    if (doc.railVis) railVisibleSamples.push(Date.now() - t0)
    if (doc.skelDrawer) drawerVisibleSamples.push(Date.now() - t0)
    if (doc.railHidden) railPresentHidden++
    if (doc.skelRail || doc.skelDrawer) skeletonSeen = true
    if (doc.settled && !centerSettled) centerSettled = true
    // settle + grace: keep sampling 2s past first workspace paint so a
    // late bridge race would still be caught
    if (centerSettled && Date.now() - t0 > 4000) break
  }
  await new Promise(r => setTimeout(r, POLL_MS))
}

console.log(JSON.stringify({
  probe: 'cards-view-rail-flash',
  samples,
  railVisibleSamples,
  drawerVisibleSamples,
  railMountedButHiddenSamples: railPresentHidden,
  bootSkeletonObserved: skeletonSeen,
  workspaceSettled: centerSettled,
  verdict: (railVisibleSamples.length === 0 && drawerVisibleSamples.length === 0) ? 'PASS' : 'FAIL',
}, null, 2))

await page.screenshot({ path: import.meta.dirname + '/_probe_cards_settled.png' })
await browser.close()
