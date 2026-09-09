/**
 * Playwright driver for the media 3D click-chain e2e (audit gap 3).
 * Offline: serves the built harness + the BUILT client bundle from a
 * local http server, drives real Chromium, asserts the chain the Sep-6
 * outage broke: panel mounts → 3D tile lists → click → overlay → glb
 * viewer component with the gateway URL. Run: node test/e2e/e2e.mjs
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

    const viewer = page.locator('[data-e2e-glb-viewer]')
    await viewer.waitFor({ timeout: 5_000 })
    const url = await viewer.getAttribute('data-e2e-glb-viewer')
    check(url === '/artifact/scene.glb', '3D click chain: overlay → registry viewer with the gateway URL (got ' + String(url) + ')')

    await page.keyboard.press('Escape')
    check((await page.locator('[data-e2e-glb-viewer]').count()) === 0, 'Esc closes the overlay')

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
