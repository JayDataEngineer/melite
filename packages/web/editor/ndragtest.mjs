import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(`<!doctype html><html><body>
<div id="s" draggable="true" style="width:60px;height:60px;background:#48c">SRC</div>
<div id="t" style="width:200px;height:200px;background:#eee;margin-top:120px">TGT</div>
<script>
window.events = []
const s = document.getElementById('s'), t = document.getElementById('t')
s.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-test', 'hello'); window.events.push('dragstart') })
t.addEventListener('dragover', e => { e.preventDefault(); window.events.push('dragover') })
t.addEventListener('drop', e => { e.preventDefault(); window.events.push('drop:' + e.dataTransfer.getData('application/x-test')) })
</script></body></html>`)
try {
  await page.locator('#s').dragTo(page.locator('#t'), { timeout: 6000 })
  console.log('dragTo ok')
} catch (e) { console.log('dragTo timeout') }
await page.waitForTimeout(500)
console.log('EVENTS:', JSON.stringify(await page.evaluate(() => window.events)))
try {
  await page.dragAndDrop('#s', '#t', { timeout: 6000 })
  console.log('dragAndDrop ok')
} catch { console.log('dragAndDrop timeout') }
await page.waitForTimeout(500)
console.log('EVENTS2:', JSON.stringify(await page.evaluate(() => window.events)))
await browser.close()
