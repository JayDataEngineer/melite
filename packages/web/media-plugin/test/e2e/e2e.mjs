/**
 * Playwright driver for the media e2e (audit gap 3; hunk 4 shape).
 * Offline: serves the built harness + the BUILT client bundle from a
 * local http server, drives real Chromium, asserts the two
 * openResource chains that live ONLY in the built artifact: the 3D
 * tile → estate-artifact address (b64url of the same-origin URL) and
 * the ✦ CARDS wand → cards run address (hunk 4: the deck seam is
 * gone; the wand is one native call). Run: node test/e2e/e2e.mjs
 * (exit 0 = pass). Chromium comes from the repo's playwright install.
 */
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(import.meta.dirname, '..', '..')
const e2eDir = join(root, 'test', 'e2e')
const require = createRequire(import.meta.url)

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.map': 'application/json', '.ts': 'text/plain',
}

function serve(port0) {
  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]
    const asset = async (prefix) => {
      // Prefer the .js chunk: prefix match alone grabs the .css twin
      // first (readdir order) once a bundled CSS asset exists — serving
      // CSS as the module script dies on strict MIME checking.
      const dir = join(e2eDir, 'dist', 'assets')
      const files = await readdir(dir)
      const js = files.find((f) => f.startsWith(prefix) && f.endsWith('.js'))
      if (js) return join(dir, js)
      throw new Error('no built asset ' + prefix)
    }
    const fileP = url === '/' ? Promise.resolve(join(e2eDir, 'index.html'))
      : url === '/client.js' ? Promise.resolve(join(root, 'lib', 'client.js'))
      : url === '/client.js.map' ? Promise.resolve(join(root, 'lib', 'client.js.map'))
      : url === '/harness-entry.js' ? asset('harness-entry')
      : Promise.reject(new Error('no route ' + url))
    void fileP.then((file) => readFile(file).then((buf) => {
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      res.end(buf)
    })).catch((e) => {
      res.writeHead(404)
      res.end(String(e))
    })
  })
  return new Promise((resolveSrv) => {
    server.listen(port0, '127.0.0.1', () => {
      const port = server.address().port
      resolveSrv({
        url: 'http://127.0.0.1:' + String(port),
        close: () => new Promise((done) => server.close(() => done())),
      })
    })
  })
}

async function main() {
  // chromium via the sibling card-deck's @playwright/test install
  // (playwright is not a direct dep of this package).
  const testPkg = require.resolve('@playwright/test', {
    paths: [resolve(root, '..', 'melite-card-deck', 'node_modules')],
  })
  const pw = await import(testPkg)
  const chromium = pw.chromium ?? pw.default?.chromium

  const srv = await serve(0)
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const failures = []
  const check = (ok, what) => {
    console.log((ok ? 'PASS ' : 'FAIL ') + what)
    if (!ok) failures.push(what)
  }
  try {
    await page.goto(srv.url + '/', { waitUntil: 'load' })
    await page.waitForSelector('[data-infer-media-panel]', { timeout: 10_000 })
    check(true, 'panel mounts from the BUILT client bundle')

    check(await page.getByText(/1 runs · 1 artifacts/).count() > 0, 'stat line lists the stubbed run')
    check(await page.getByText('3D 1').count() > 0, '3D chip derived from the SSOT kinds')

    // Structural locator (button wrapping the tile text — the `.im-tile`
    // styling hook died with the primitives port; tests pin behavior,
    // not class names).
    const tile = page.locator('button', { hasText: 'scene.glb' }).first()
    await tile.waitFor({ timeout: 5_000 })
    await tile.click()

    // The 3D affordance routes through the tab action as an
    // estate-artifact address (hunk 3's regression fix, pinned here on
    // the BUILT bundle).
    const open3d = page.getByText(/open 3D view in sidebar/)
    await open3d.waitFor({ timeout: 5_000 })
    await open3d.click()
    const opened3d = await page.evaluate(() => (window.__e2eOpened ?? []).at(-1))
    const want3d = 'dsh-resource://estate-artifact/L2FydGlmYWN0L3NjZW5lLmdsYg'
    check(opened3d === want3d, '3D click chain: openResource carries the estate-artifact b64url address (got ' + String(opened3d) + ')')

    // Close the overlay (the wand lives on the tile, under it).
    await page.keyboard.press('Escape')

    // THE WAND (hunk 4): one native call — the cards run address.
    const wand = page.locator('span', { hasText: '✦ CARDS' }).first()
    await wand.waitFor({ timeout: 5_000 })
    await wand.click()
    const openedRun = await page.evaluate(() => (window.__e2eOpened ?? []).at(-1))
    check(openedRun === 'dsh-resource://cards/run/e2e-run', 'wand: openResource carries the cards run address (got ' + String(openedRun) + ')')

    const harnessFail = await page.locator('#harness-failure').count()
    check(harnessFail === 0, 'harness itself error-free')
  } catch (e) {
    failures.push('driver exception: ' + String(e))
    console.log('DRIVER-EXCEPTION', String(e))
  } finally {
    await browser.close()
    await srv.close()
  }
  if (failures.length > 0) {
    console.error('E2E FAILED: ' + String(failures.length) + ' check(s)')
    process.exit(1)
  }
  console.log('E2E OK')
}

void main()
