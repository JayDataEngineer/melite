// prove-live.mjs — THE RECEIPT: the live chat's h3_timeline call now
// claims the conversation card (toolview seat keyed by the tool-plane
// name); the card's row opens the Cards tab at the draft stage; the
// studio mounts. Read-only against the operator's bench.
import { chromium } from '@playwright/test'

const URL = 'http://127.0.0.1:3088/?token=' + process.env.LIVE_TOKEN
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1856, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(11_000)

// the chat session (its title moved as turns landed — find it by the
// beach prompt text in the session list, else first titled row)
const rows0 = await page.locator('[role="treeitem"]').allTextContents()
console.log('rows:', JSON.stringify(rows0.slice(10, 20)))
let sess = page.locator('[role="treeitem"]', { hasText: /beach|h3|timeline|tool call/i }).first()
if (await sess.count() === 0) sess = page.locator('[role="treeitem"]').nth(11)
await sess.click({ timeout: 8_000 })
await page.waitForTimeout(2_000)
const treeItems = await page.evaluate(() =>
  [...document.querySelectorAll('[role="treeitem"]')].map((e, i) => `${i}: ${(e.textContent || '').trim().slice(0, 46)}`))
console.log('TREE ITEMS:', JSON.stringify(treeItems))
let switched = false
for (let i = 0; i < 6 && !switched; i++) {
  switched = await page.evaluate(() => document.body.innerText.includes('beach at dusk'))
  if (!switched) {
    await page.keyboard.press('Escape').catch(() => {})
    const byText = page.locator('[role="treeitem"]').filter({ hasText: 'melite_flow' }).first()
    const cnt = await byText.count()
    console.log('retry', i, 'target count', cnt)
    if (cnt > 0) await byText.click({ timeout: 4_000, force: true }).catch(() => {})
    await page.waitForTimeout(3_500)
  }
}
console.log('switched to chat session:', switched)
await page.waitForTimeout(4_000)

// the conversation card: FlowCards rows titled by stage id — search
// the TRANSCRIPT pane (the main pane), not the sidebar-dominated body
const paneTxt = async () => page.evaluate(() => {
  const cands = []
  for (const d of document.querySelectorAll('div')) {
    const t = d.textContent || ''
    if (t.includes('beach at dusk') && !t.includes('Workspaces')) cands.push({ len: t.length, txt: (d.innerText || '').slice(0, 60) })
  }
  const main = document.querySelector('main')
  return JSON.stringify({ n: cands.length, main: main ? main.innerText.slice(0, 500) : 'NO MAIN', body: document.body.innerText.slice(-400) })
})
let rows = 0, transcript = ''
for (let i = 0; i < 12; i++) {
  transcript = await paneTxt()
  rows = await page.getByText('s_0', { exact: true }).count()
  if (rows > 0 || transcript !== '') break
  await page.waitForTimeout(2_500)
}
console.log('card rows (s_0):', rows)
console.log('TRANSCRIPT:\n' + transcript.slice(0, 900).split('\n').slice(0, 26).join('\n'))

// scope to the VISIBLE row (two text matches exist — one rides a
// hidden/ARIA mirror; the visible one is the toolview card's row)
const row0 = page.getByText('s_0', { exact: true }).locator('xpath=ancestor-or-self::*[self::button or self::a or self::div][1]').filter({ has: page.getByText('s_0', { exact: true }) }).first()
const visRow = page.locator('span[class*="rowTitle"]:visible').filter({ hasText: /^s_0$/ }).first()
const dump = await page.evaluate(() => {
  const els = [...document.querySelectorAll('*')].filter((e) => (e.childNodes.length === 1 && e.textContent === 's_0'))
  return els.map((e) => {
    const r = e.getBoundingClientRect()
    return { tag: e.tagName, cls: String(e.className).slice(0, 60), vis: r.width > 0 && r.height > 0, parent: e.parentElement ? e.parentElement.tagName + '.' + String(e.parentElement.className).slice(0, 40) : '' }
  })
})
console.log('s_0 NODES:', JSON.stringify(dump))
await page.screenshot({ path: '/tmp/live-lane-before-click.png' })
if (rows > 0) {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('span[class*="rowTitle"]')].find((e) => e.textContent === 's_0')
    el?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(1_500)
  // WHY not visible: walk the ancestor chain and report the first
  // ancestor chain break (display/visibility/rects)
  const diag = await page.evaluate(() => {
    const el = [...document.querySelectorAll('span[class*="rowTitle"]')].find((e) => e.textContent === 's_0')
    if (!el) return 'GONE'
    const chain = []
    let n = el
    for (let i = 0; n && i < 14; i++, n = n.parentElement) {
      const cs = getComputedStyle(n)
      const r = n.getBoundingClientRect()
      chain.push(`${n.tagName}.${String(n.className).slice(0, 28)} d=${cs.display} v=${cs.visibility} op=${cs.opacity} rect=${Math.round(r.width)}x${Math.round(r.height)} rects=${n.getClientRects().length}`)
    }
    return chain.join(' | ')
  })
  console.log('ANCESTORS:', diag)
  // the toolview rides a collapsed tool-call disclosure (flowItem
  // height 0) — expand the tool call row first, then click the stage
  const disclosure = page.locator('text=/1 tool call/').first()
  console.log('disclosure count:', await disclosure.count())
  await disclosure.click({ timeout: 6_000 }).catch(async (e) => {
    console.log('disclosure click failed:', String(e).slice(0, 120))
  })
  await page.waitForTimeout(1_200)
  const h = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[class*="flowItem"]')].find((e) => (e.textContent || '').includes('s_0'))
    return el ? Math.round(el.getBoundingClientRect().height) : -1
  })
  console.log('flowItem height after expand:', h)
  // the row is PAINTED (920x32) but trapped under a host-transcript
  // wrapper with height:0 — dispatch the pointer sequence on the
  // button itself (the real React onClick path; no synthetic
  // reimplementation)
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[data-stage="s_0"]')
    if (!btn) return 'no button'
    const r = btn.getBoundingClientRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    window.__rowClicked = false
    btn.addEventListener('click', () => { window.__rowClicked = true }, { once: true })
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      btn.dispatchEvent(type === 'click'
        ? new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy })
        : new PointerEvent(type, { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'mouse' }))
    }
    return `dispatched at ${Math.round(cx)},${Math.round(cy)}`
  })
  console.log('row dispatch:', clicked)
  await page.waitForTimeout(16_000)
  // what DID the click do: right column text + any cards tab markers
  const right = await page.evaluate(() => {
    const cols = [...document.querySelectorAll('div')].filter((d) => d.getBoundingClientRect().width > 240 && d.getBoundingClientRect().width < 700 && d.getBoundingClientRect().right > innerWidth - 700 && d.scrollHeight > 100)
    return cols.length ? cols[cols.length - 1].innerText.slice(0, 400) : 'NO RIGHT COL'
  })
  console.log('RIGHT COL:\n' + right)
  const cardArea = await page.evaluate(() => {
    const btn = document.querySelector('button[data-stage="s_0"]')
    let n = btn
    for (let i = 0; n.parentElement && i < 6; i++) n = n.parentElement
    return n ? n.innerText.slice(0, 500) : 'CARD GONE'
  })
  console.log('CARD AREA AFTER CLICK:\n' + cardArea)
  await page.waitForTimeout(2_000)
  const post = await page.evaluate(() => ({
    domClick: window.__rowClicked === true,
    drill: document.body.innerText.includes('Back to the bench') || document.body.innerText.includes('Remove'),
    benchWord: document.body.innerText.includes('Bench'),
    rightColTabs: [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim()).slice(0, 8),
  }))
  console.log('POST-CLICK STATE:', JSON.stringify(post))
  const panel = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const t = tabs.find((x) => (x.textContent || '').includes('draft/'))
    if (!t) return 'NO DRAFT TAB'
    const pane = document.querySelector('[role="tabpanel"]')
    const host = t.closest('[class*="sidebar"],[class*="Sidebar"],aside') || pane
    const scope = host && host.scrollHeight > 50 ? host : document.body
    return 'PANE: ' + (pane ? pane.innerText.slice(0, 300) : 'no tabpanel el') + ' || SCOPE: ' + scope.innerText.slice(0, 400)
  })
  console.log('PANEL DUMP: ' + panel.split('\n').slice(0, 12).join(' / '))
  // activate the draft tab itself, then read the ACTIVE pane
  const draftTab = page.locator('[role="tab"]', { hasText: 'draft/bench-default' }).first()
  if (await draftTab.count() > 0) {
    await draftTab.click({ timeout: 6_000 }).catch(() => {})
    await page.waitForTimeout(4_000)
  }
  const active = await page.evaluate(() => {
    const t = [...document.querySelectorAll('[role="tab"]')].find((x) => (x.textContent || '').includes('draft/'))
    if (!t) return 'TAB GONE'
    const r = t.getBoundingClientRect()
    // the pane: the large sibling container to the left of the tab strip in the same column
    let col = t
    for (let i = 0; i < 8 && col.parentElement; i++) {
      col = col.parentElement
      if (col.getBoundingClientRect().width > 240 && col.getBoundingClientRect().height > 300) break
    }
    const tabs = [...col.querySelectorAll('[role="tab"]')].length
    return `tabY=${Math.round(r.top)} colW=${Math.round(col.getBoundingClientRect().width)} colH=${Math.round(col.getBoundingClientRect().height)} tabsInCol=${tabs} COL TEXT: ` + col.innerText.slice(0, 500)
  })
  console.log('ACTIVE PANE: ' + active.split('\n').slice(0, 16).join(' / '))
  // the CURRENT studio surface (2026-09-20 fold): tl-recipe-chrome +
  // tl-mods-panel succeeded the retired tl-route-select/tl-lora-panel
  const markers = ['h3-studio-tenant', 'tl-filmstrip', 'tl-doc-readout', 'motion-timeline-bar', 'tl-run-panel', 'tl-audio-upload', 'tl-recipe-chrome', 'tl-mods-panel']
  const found = {}
  for (const m of markers) found[m] = await page.locator(`[data-testid="${m}"]`).count()
  console.log('STUDIO MARKERS:', JSON.stringify(found))
}
await page.screenshot({ path: '/tmp/live-lane-chat-card-to-studio.png' })
console.log('page errors:', errors.length === 0 ? 'none' : errors.slice(0, 6))
await browser.close()
