/**
 * @vitest-environment happy-dom
 * Session snapshot scenario (keyless replay): THE STRIP DOOR'S FITTED
 * COMMIT — the D9 audit's owed E3
 * (dev_docs/audits/journey/d9-keyframe-image-identity-2026-10-17.md §7:
 * "E3 refresh/naming owed for the strip keyframe door's commit value").
 *
 * The strip lane's add door (StudioStripPane's kf provider — the D7
 * track-head door) hands every pick to ONE commit spine — refUtils'
 * commitKeyframePinImage, the judge AND the fit in one seat — and
 * lands the spine's value in the doc at the playhead. Replay drives
 * that REAL spine with the recorded ask's From-flow pick: an
 * off-aspect run artifact (a 2688x768 banner into the 1344x768 film
 * frame). The byUrl→NAME arm resolves, the servable URL fits, and the
 * commit is the fitted data: URL — the saved doc's pin value differs
 * from the unfittable bare name the pre-cure seam stamped.
 *
 * THE ONE STUB SEAM: the browser decode + canvas faces, the same
 * shape the package spec's stubFitDecode rides (happy-dom has no
 * image decoder). Everything judged here — classifyImageSrc's name
 * arm, the URL refit, fitRect's contain math, the commit value, the
 * doc hop through the REAL tool — rides the real modules; the stub
 * only hands the decode a fixed source and records the draw rect.
 */
import { describe, it, vi } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commitKeyframePinImage } from '../../../packages/video/h3-timeline/src/ui/studio/refUtils.ts'
import { buildH3TimelineTool } from '../../../packages/video/h3-timeline/src/tool.ts'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'

const here = dirname(fileURLToPath(import.meta.url))

// THE RECORDED PICK'S SHAPE: the From-flow row's servable URL, the
// artifact index's url → ctx-key name map, and the film frame the
// door passes (StudioStripPane's `layerA.width ?? 1344, layerA.height
// ?? 768`).
const BANNER_URL = 'https://engine:8188/view?filename=banner_wide.png'
const BANNER_NAME = 'video_w1_banner'
const byUrl = new Map([[BANNER_URL, BANNER_NAME]])
const FILM_W = 1344
const FILM_H = 768

/** Stub the decode to an (nw, nh) source and the canvas to a
 *  recorder — the package spec's own decode-shape (queueMicrotask
 *  onload, no timer waits). @returns the restore fn + the draws. */
function stubFitDecode(nw: number, nh: number): { restore: () => void; draws: unknown[][] } {
  const draws: unknown[][] = []
  class StubImg {
    naturalWidth = nw
    naturalHeight = nh
    set src(_v: string) { queueMicrotask(() => { this.onload?.() }) }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
  }
  const origCreate = document.createElement.bind(document)
  const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0, height: 0,
        getContext: () => ({ drawImage: (...a: unknown[]) => { draws.push(a) } }),
        toDataURL: () => 'data:image/png;base64,FITTED',
      } as unknown as HTMLCanvasElement
    }
    return origCreate(tag)
  })
  vi.stubGlobal('Image', StubImg as unknown as typeof Image)
  return { draws, restore: () => { spy.mockRestore(); vi.unstubAllGlobals() } }
}

describe('h3 strip keyframe commit (keyless replay)', () => {
  it('a From-flow off-aspect pick saves the FITTED data: — the doc pin value, never the bare name', async () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.equal(manifest.recordingPolicy, 'replay')
    const parent = selectGeneration(here)
    assert.equal(String(parent.rows[0]?.format), manifest.headerClass)
    // the recorded ask names the off-aspect pick and the playhead;
    // the reply names the fitted save (the cure's own words)
    assert.match(String(parent.rows[1]?.text), /2688x768/)
    assert.match(String(parent.rows[1]?.text), /frame 45/)
    assert.match(String(parent.rows[2]?.text), /fitted/)

    // THE STRIP DOOR'S COMMIT — the door's own call shape: the picked
    // URL, the artifact index, the film frame, one spine.
    const stub = stubFitDecode(2688, 768)
    try {
      const got = await commitKeyframePinImage(BANNER_URL, byUrl, FILM_W, FILM_H)
      if ('refusal' in got) throw new Error(`the strip door refused the run's own artifact: ${got.refusal}`)
      // the fitted data: is the commit — the unfittable bare name
      // died at this seam (the D9 cure's letter)
      assert.equal(got.image, 'data:image/png;base64,FITTED')
      assert.notEqual(got.image, BANNER_NAME)
      // the fit is REAL: fitRect's contain math on the decoded
      // 2688x768 → scale 0.5, centered on the mismatch axis
      assert.equal(stub.draws.length, 1)
      assert.deepEqual(stub.draws[0]!.slice(1), [0, 192, 1344, 384])

      // THE SAVED DOC: the door's continuation lands the committed
      // image at the playhead, and the doc rides the real tool to
      // both estate doors — the run receives the fitted value.
      const savedPin = { image: got.image, frame: 45 }
      const posts: Array<{ path: string; body: Record<string, unknown> }> = []
      const tool = buildH3TimelineTool(async (_method, path, body) => {
        posts.push({ path, body: (body ?? {}) as Record<string, unknown> })
        if (path === '/v1/flows/drafts') return { draftId: 'd-kf-commit' }
        return { run_id: 'r-kf-commit', status: 'queued' }
      })
      const result = await tool.execute?.({
        model: 'h3',
        prompt: 'A courier runs through a rainy market.',
        calls: [{ text: 'The courier pushes into the rain.', start_frame: 0, end_frame: 90 }],
        keyframes: [savedPin],
      }, undefined) as { run_id?: string }
      assert.equal(result.run_id, 'r-kf-commit')
      const draft = posts.find((post) => post.path === '/v1/flows/drafts')
      const start = posts.find((post) => post.path === '/v1/flows/start')
      const draftParams = (draft?.body.stages as Array<{ params?: Record<string, unknown> }>)[0]?.params
      assert.deepEqual(draftParams?.keyframes, [savedPin], 'the draft door saves the fitted pin value')
      assert.deepEqual(start?.body.keyframes, [savedPin], 'the start door carries the fitted pin value')
      assert.ok(!JSON.stringify(posts).includes(BANNER_NAME), 'the bare name never reaches the run')
    } finally {
      stub.restore()
    }
  })

  it('a same-aspect pick rides the NAME — the courtesy law (the commit never depends on the fit)', async () => {
    // the fit's own gate: a same-aspect decode rides verbatim, so the
    // name arm's commit stays the name (engine currency) — the fitted
    // commit fires only where the fit is real.
    const stub = stubFitDecode(1344, 768)
    try {
      const got = await commitKeyframePinImage(BANNER_URL, byUrl, FILM_W, FILM_H)
      if ('refusal' in got) throw new Error(`the strip door refused the run's own artifact: ${got.refusal}`)
      assert.equal(got.image, BANNER_NAME)
      assert.equal(stub.draws.length, 0)
    } finally {
      stub.restore()
    }
  })
})
