// THE ANCHOR UPLOAD LAW (2026-11-14, the live calls journey): the GPU
// e2e lane's anchor rides ONE upload door that STATES overwrite and
// JUDGES the answer. ComfyUI's /upload/image does not overwrite by
// default — a colliding name is stored beside the old file as
// "name (1).png" while the door still answers the REQUESTED name, so a
// lane loading that name reads whatever stale bytes an earlier session
// left behind. The live burn: a corrupt 93-byte anchor shadowed every
// fresh upload; the door answered 200 and every h3 row died at
// LoadImage. These arms judge the transport law keylessly (a stubbed
// door), so the class is caught on every battery run, engine or not.
import { describe, it, expect } from 'vitest'
import { ANCHOR_NAME, ANCHOR_PNG_B64, uploadAnchorPng } from '../../../e2e/anchor-upload.ts'

/** A door that answers the way ComfyUI answers: JSON naming the file
 *  it says it stored, whether or not that is the file it read next. */
const door = (stored: string, ok = true) => {
  const calls: Array<{ url: string, init: RequestInit }> = []
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => ({ name: stored }),
    } as unknown as Response
  }) as typeof fetch
  return { calls, fetchImpl }
}

describe('the GPU lane anchor upload law', () => {
  it('THE OVERWRITE IS STATED: the upload carries overwrite=true, else the door stores a shadow copy beside the stale anchor', async () => {
    const d = door(ANCHOR_NAME)
    await uploadAnchorPng({ engineUrl: 'http://engine.invalid', fetchImpl: d.fetchImpl }, 'wall')
    expect(d.calls).toHaveLength(1)
    const body = d.calls[0]!.init.body as FormData
    expect(body.get('overwrite'), 'the door is told to overwrite').toBe('true')
    expect((body.get('image') as File).name, 'the file rides the judged name').toBe(ANCHOR_NAME)
    expect(body.get('image'), 'the PIL-verified bytes ride, never a row-local copy').toBeInstanceOf(Blob)
  })

  it('THE ANSWER IS JUDGED: a renamed copy refuses loudly, naming the stale-shadow hazard', async () => {
    const d = door('e2e_anchor (1).png')
    await expect(
      uploadAnchorPng({ engineUrl: 'http://engine.invalid', fetchImpl: d.fetchImpl }, 'wall rename'),
    ).rejects.toThrow(/OVERWRITES its own name.*stale anchor shadowing/)
  })

  it('A REFUSING DOOR refuses the press, never a silent return of the requested name', async () => {
    const d = door(ANCHOR_NAME, false)
    await expect(
      uploadAnchorPng({ engineUrl: 'http://engine.invalid', fetchImpl: d.fetchImpl }, 'wall refuse'),
    ).rejects.toThrow(/wall refuse: the anchor upload lands: 500/)
  })

  it('THE ANCHOR IS THE PIL-VERIFIED ONE: the embedded bytes open as a 64x64 PNG (never the corrupt 64x16 blob)', () => {
    const png = Buffer.from(ANCHOR_PNG_B64, 'base64')
    expect(png.subarray(1, 4).toString('latin1'), 'the PNG signature').toBe('PNG')
    // IHDR width/height live at bytes 16..24 (big-endian u32 each) —
    // the corrupt blob declared 64x16 and died at LoadImage.
    expect(png.readUInt32BE(16), 'width').toBe(64)
    expect(png.readUInt32BE(20), 'height').toBe(64)
    // bit depth 8, colour type 6 (RGBA): the corrupt blob wrote bit
    // depth 0, which PIL refuses outright.
    expect(png[24], 'bit depth').toBe(8)
    expect(png[25], 'colour type').toBe(6)
    expect(png.length, 'the real bytes, not a 93-byte stub').toBeGreaterThan(150)
  })
})
