/**
 * THE BROWSER-PLANE WALL FOR THE 3D MEDIA DOOR (2026-09-26).
 *
 * WHY THIS FILE EXISTS: every other test of the mesh door ran in jsdom,
 * which has no WebGL — so "the modal renders the mesh" was a claim about
 * React wiring, never about pixels. The operator's doubt was correct:
 * nothing had ever asked a browser to draw one. This wall does.
 *
 * WHAT IS REAL HERE (nothing stubbed but the page around it):
 *   • the component — the SAME `MeshView` module the drilldown mounts,
 *     imported from src, bundled by the sibling vite config;
 *   • the substrate — the estate's shared stage core (three + OrbitControls)
 *     and the estate's ONE GLB parse policy (DRACO-configured GLTFLoader);
 *   • the artifact — the 33,568,560-byte .glb minted by the live
 *     img-to-mesh run, served over HTTP with the media route's own
 *     content type (model/gltf-binary).
 *
 * WHAT IT ASSERTS (each a way the door could be broken and still pass a
 * jsdom test):
 *   1. a WebGL context is actually created (a canvas element can exist
 *      while getContext returns null — jsdom proved nothing about this);
 *   2. the artifact is fetched and parses (a 404 or a decode failure is
 *      the classic "it loads but shows nothing");
 *   3. THE MESH IS DRAWN — the canvas is read back and its pixels are
 *      neither uniform nor transparent. A black canvas, a cleared
 *      buffer and an empty scene all fail this;
 *   4. the loading line clears and no page/console error occurred;
 *   5. the honest-failure arm still speaks in a real browser (a
 *      non-mesh url renders the refusal, not a blank canvas).
 *
 * Run: pnpm --filter @melite-plugin/dsh-gallery exec playwright test
 * (self-contained: it boots its own static server; no lane, no token).
 */
import { expect, test, type Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(HERE, 'mesh-door', 'dist')

/** The live artifact, by default: the run this session minted. A 3D run
 *  under any state root works — point MESH_DOOR_GLB at another .glb. */
const REPO = join(HERE, '..', '..', '..', '..')
const DEFAULT_GLB = join(
  REPO,
  'data/probe-img-to-mesh-0102/output/run-44c30351b94e-db38e826/img-to-mesh/trellis2_native_00004.glb',
)
const GLB = process.env['MESH_DOOR_GLB'] ?? DEFAULT_GLB

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  // the media route's own spelling for a mesh (contentTypeForArtifact)
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
}

/** A static server for the built harness + the one artifact. The .glb is
 *  STREAMED, not read into memory: the file is 32MiB and the wall must
 *  not turn a big artifact into an OOM in the test runner. */
function serve(): Promise<{ server: Server, origin: string }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    // THE CATALOG ROUTE (2026-10-24): the viewer's import graph boots
    // the catalog contract store, which fetches /v1/model-catalog on
    // mount. This static host is the page AROUND the component — the
    // harness's own law stubs exactly that — so it answers the
    // contract's empty shape (zero families, zero models; the store's
    // own validation judges the body) instead of a console-error 404
    // the no-errors wall would rightly fire on.
    if (url.pathname === '/v1/model-catalog') {
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"families":{},"models":{}}')
      return
    }
    // THE ARTIFACT ROUTE, AS THE PRODUCT SERVES IT (the operator's
    // 2026-09-26 bug: the wall served `/mesh.glb` directly, so the
    // viewer's gate saw a real filename and passed — while every mesh
    // the studio opens arrives at
    // `/infer-gallery/artifact?path=<run>/<file>`, whose URL path is
    // the ROUTE's word and whose real name is in the query. The wall
    // now drives the product's shape, so a regression in the name law
    // is caught HERE, in a real browser, with real pixels.
    const artifactRoute = url.pathname === '/infer-gallery/artifact'
    const directRoute = url.pathname === '/mesh.glb'
    if (artifactRoute || directRoute) {
      if (artifactRoute) {
        const wanted = url.searchParams.get('path') ?? ''
        if (!/\.(glb|gltf)$/i.test(wanted.split('?')[0] ?? '')) {
          res.writeHead(400, { 'content-type': 'text/plain' }).end('not a mesh artifact: ' + wanted)
          return
        }
      }
      if (!existsSync(GLB)) {
        res.writeHead(404).end('no artifact')
        return
      }
      const size = statSync(GLB).size
      const range = req.headers.range
      if (range !== undefined) {
        // the estate media route serves ranges; three's loader may ask
        const m = /bytes=(\d+)-(\d*)/.exec(range)
        const start = m === null ? 0 : Number(m[1])
        const end = m === null || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
        res.writeHead(206, {
          'content-type': MIME['.glb'] as string,
          'content-length': String(end - start + 1),
          'content-range': `bytes ${start}-${end}/${size}`,
          'accept-ranges': 'bytes',
        })
        createReadStream(GLB, { start, end }).pipe(res)
        return
      }
      res.writeHead(200, {
        'content-type': MIME['.glb'] as string,
        'content-length': String(size),
        'accept-ranges': 'bytes',
      })
      createReadStream(GLB).pipe(res)
      return
    }
    const rel = url.pathname === '/' ? '/index.html' : url.pathname
    const file = join(DIST, normalize(rel).replace(/^(\.\.[/\\])+/, ''))
    if (!existsSync(file)) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      resolve({ server, origin: `http://127.0.0.1:${port}` })
    })
  })
}

test.skip(!existsSync(DIST), 'run `vite build --config e2e/mesh-door/vite.config.mts` first (the harness bundle)')
test.skip(!existsSync(GLB), `no .glb artifact to render (${GLB}) — set MESH_DOOR_GLB`)

/** The pixel read: a WebGL canvas with preserveDrawingBuffer:false is
 *  blank when read outside its own frame, so this reads INSIDE a rAF
 *  immediately after a render — the only honest moment to sample it. */
async function readCanvasPixels(page: Page): Promise<{ uniform: boolean, opaque: number, w: number, h: number }> {
  return page.evaluate(() => new Promise<{ uniform: boolean, opaque: number, w: number, h: number }>((resolve) => {
    requestAnimationFrame(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
      if (canvas === null) {
        resolve({ uniform: true, opaque: 0, w: 0, h: 0 })
        return
      }
      const w = canvas.width
      const h = canvas.height
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      if (gl === null || w === 0 || h === 0) {
        resolve({ uniform: true, opaque: 0, w, h })
        return
      }
      const px = new Uint8Array(w * h * 4)
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)
      let opaque = 0
      let first = -1
      let differs = false
      for (let i = 0; i < px.length; i += 4) {
        // the composite is opaque under the mesh; count pixels the mesh
        // could not have produced (alpha 0 = nothing was drawn there)
        if (px[i + 3]! > 0) opaque += 1
        if (first < 0) first = px[i]! + px[i + 1]! + px[i + 2]!
        else if (px[i]! + px[i + 1]! + px[i + 2]! !== first) differs = true
      }
      resolve({ uniform: !differs, opaque, w, h })
    })
  }))
}

test.describe('the 3D media door in real Chromium', () => {
  let server: Server
  let origin: string

  test.beforeAll(async () => {
    const s = await serve()
    server = s.server
    origin = s.origin
  })

  test.afterAll(async () => {
    await new Promise<void>((resolve) => { server.close(() => { resolve() }) })
  })

  test('the mesh IS DRAWN: a real WebGL context, a real parse, real pixels', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`) })
    const fetched: Array<{ url: string, status: number, type: string }> = []
    page.on('response', (r) => {
      // the PATHNAME must be the mesh — the page URL itself carries
      // `?url=/mesh.glb`, and matching on the raw url captured the
      // document response (text/html) instead of the artifact
      const parsed = new URL(r.url())
      const path = parsed.pathname
      if (path.endsWith('.glb') || path.endsWith('.gltf') || (path === '/infer-gallery/artifact' && parsed.searchParams.has('path'))) {
        fetched.push({ url: r.url(), status: r.status(), type: r.headers()['content-type'] ?? '' })
      }
    })

    await page.goto(
      `${origin}/?url=` + encodeURIComponent(
        `${origin}/infer-gallery/artifact?path=` + encodeURIComponent('run-door/img-to-mesh/trellis2_native_00004.glb'),
      ) + '&file=trellis2_native_00004.glb',
    )

    // 1 — the canvas seat exists and a WebGL context was really created
    await expect(page.locator('canvas')).toHaveCount(1)
    const ctxOk = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement
      const gl = c.getContext('webgl2') ?? c.getContext('webgl')
      return gl !== null
    })
    expect(ctxOk, 'a real WebGL context (jsdom never proved this)').toBe(true)

    // 2 — the artifact was fetched, served as a mesh, and parsed
    await expect.poll(() => fetched.length, { timeout: 120_000, message: 'the .glb fetch' }).toBeGreaterThan(0)
    expect(fetched[0]!.status, 'the artifact is served').toBeLessThan(300)
    expect(fetched[0]!.type, 'served as the media route serves a mesh').toContain('model/gltf-binary')

    // 3 — the loading line clears (the load RESOLVED, not just started)
    await expect(page.getByTestId('mesh-view-loading')).toHaveCount(0, { timeout: 180_000 })
    await expect(page.getByTestId('mesh-view-failure')).toHaveCount(0)

    // 4 — THE PIXELS. A 412,903-vertex textured mesh under two lights
    // cannot produce a uniform frame: this is the assertion that would
    // have caught a black canvas, a cleared buffer, or an empty scene.
    const px = await readCanvasPixels(page)
    expect(px.w, 'the canvas has real dimensions').toBeGreaterThan(100)
    expect(px.h).toBeGreaterThan(100)
    expect(px.opaque, 'something was actually drawn into the GL buffer').toBeGreaterThan(1000)
    expect(px.uniform, 'the frame is not one flat colour (a black canvas fails here)').toBe(false)

    expect(errors, 'no page or console errors across the render').toEqual([])

    // 5 — the RECEIPT: the frame itself, on disk. A boolean pixel check
    // can be satisfied by a plausible-looking gradient; a human (or a
    // later reader) must be able to SEE the mesh this door claims to
    // render. Written next to the spec, not into test-results/.
    const shot = join(HERE, 'mesh-door-render.png')
    await page.locator('canvas').screenshot({ path: shot })
    expect(existsSync(shot), 'the frame receipt is on disk').toBe(true)
  })

  test('the honest-failure arm speaks in a real browser too', async ({ page }) => {
    // a non-mesh url must SAY so, not present an empty canvas
    await page.goto(`${origin}/?url=/not-mesh.png&file=not-mesh.png`)
    await expect(page.getByTestId('mesh-view-failure')).toContainText('is not a .glb/.gltf artifact')
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})
