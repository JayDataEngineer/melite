// melite_view's MESH ARM (vitest, the runs tree REAL in a tmp dir — the
// estate-media walk runs for true).
//
// THE GAP THIS PINS (operator order 2026-09-26, paraphrased: 3d output must
// be reachable from the media doors, visually): a 3D lane's run holds a
// .glb and nothing else, so every arm missed — `melite_view` said "no
// image artifacts" and the model learned NOTHING about a real, finished
// 33MB mesh. The arm now walks the mesh kind, reports the artifact's
// structure, and shows the model the mesh's own raster poster when the
// run emitted one. It never fabricates an image to satisfy the schema.

import { describe, test, beforeAll, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { meliteView } from '../src/tools/melite-view.ts'
import type { ViewedImageValue } from '../src/tools/melite-view.ts'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { Context } from '@deepseek-ai/cordis'

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])

/** A GLB with the real shape of a TRELLIS artifact: one mesh, one
 *  indexed primitive, UV-mapped, three textures, declared bounds. */
function glbBytes(): Uint8Array {
  const gltf = {
    asset: { generator: 'ComfyUI', version: '2.0' },
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 0 }, indices: 1, material: 0 }] }],
    materials: [{}],
    textures: [{}, {}, {}],
    images: [{ mimeType: 'image/png' }, { mimeType: 'image/png' }, { mimeType: 'image/png' }],
    accessors: [
      { count: 1000, min: [-1, 0, -1], max: [1, 2, 1] },
      { count: 3000 },
    ],
  }
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const jsonPad = (4 - (json.length % 4)) % 4
  const total = 12 + 8 + json.length + jsonPad + 8 + 4
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  out.set(json, 20)
  const bin = 20 + json.length + jsonPad
  view.setUint32(bin, 4, true)
  view.setUint32(bin + 4, 0x004e4942, true)
  return out
}

let root = ''

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'melite-view-mesh-'))
  // the plain 3D lane: a mesh and NOTHING else (this is the shape that
  // used to dead-end the door)
  const meshRun = join(root, 'output', 'run-44c30351b94e-db38e826')
  mkdirSync(join(meshRun, 'img-to-mesh'), { recursive: true })
  writeFileSync(join(meshRun, 'img-to-mesh', 'trellis2_native_00004.glb'), glbBytes())
  // the same lane WITH a poster sibling: the model can then SEE it
  const posterRun = join(root, 'output', 'run-9a1b2c3d4e5f-aabbccdd')
  mkdirSync(join(posterRun, 'img-to-mesh'), { recursive: true })
  writeFileSync(join(posterRun, 'img-to-mesh', 'trellis2_native_00009.glb'), glbBytes())
  writeFileSync(join(posterRun, 'img-to-mesh', 'trellis2_native_00009_poster.png'), PNG_BYTES)
  // a .gltf sibling (the OTHER mesh extension the arm accepts)
  const gltfRun = join(root, 'output', 'run-9a1b00000000-aabbccdd')
  mkdirSync(join(gltfRun, 'img-to-mesh'), { recursive: true })
  writeFileSync(join(gltfRun, 'img-to-mesh', 'scene_00001.gltf'), glbBytes())
  writeFileSync(join(gltfRun, 'img-to-mesh', 'scene_00001_poster.png'), PNG_BYTES)
  // a mesh at the run root (no sub-directory in its name)
  const flatRun = join(root, 'output', 'run-f1a70000000-aabbccdd')
  mkdirSync(flatRun, { recursive: true })
  writeFileSync(join(flatRun, 'flat_00001.glb'), glbBytes())
  writeFileSync(join(flatRun, 'flat_00001_poster.png'), PNG_BYTES)
  // a poster that is over the attachment cap
  const bigRun = join(root, 'output', 'run-b1600000000-aabbccdd')
  mkdirSync(join(bigRun, 'img-to-mesh'), { recursive: true })
  writeFileSync(join(bigRun, 'img-to-mesh', 'big_00001.glb'), glbBytes())
  writeFileSync(join(bigRun, 'img-to-mesh', 'big_00001_poster.png'), new Uint8Array(20_000_000))
  // a poster whose BYTES are not an image at all (the path lies)
  const junkRun = join(root, 'output', 'run-ab000000000-aabbccdd')
  mkdirSync(join(junkRun, 'img-to-mesh'), { recursive: true })
  writeFileSync(join(junkRun, 'img-to-mesh', 'junk_00001.glb'), glbBytes())
  writeFileSync(join(junkRun, 'img-to-mesh', 'junk_00001_poster.png'), new TextEncoder().encode('this is not a png'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

function fakeCtx(opts?: { store?: false; visual?: boolean }): { ctx: Context, saved: Array<{ name?: string, mediaType: string }> } {
  const saved: Array<{ name?: string, mediaType: string }> = []
  const attachments = {
    saved,
    saveImage: async (input: { data: Uint8Array, mediaType: ImageMediaType, name?: string }): Promise<ImageAttachmentRef> => {
      saved.push({ ...(input.name === undefined ? {} : { name: input.name }), mediaType: input.mediaType })
      return {
        attachmentId: 'att_mesh',
        mediaType: input.mediaType,
        bytes: input.data.byteLength,
        width: 8,
        height: 8,
        ...(input.name === undefined ? {} : { name: input.name }),
      } as ImageAttachmentRef
    },
    imageLimits: {
      maxImageBytes: 10_000_000,
      maxMessageImageBytes: 10_000_000,
      maxImageDimension: 8000,
      maxImagePixels: 30_000_000,
      mediaTypes: ['image/png', 'image/jpeg'] as ImageMediaType[],
    },
  }
  const ctx = {
    get: (name: string): unknown => {
      if (name === 'attachments') return opts?.store === false ? undefined : attachments
      if (name === 'queue') return { stateRoot: root }
      if (name === 'llm') {
        return { resolveModelInfo: async () => ({ inputModalities: opts?.visual === false ? ['text'] : ['text', 'image'] }) }
      }
      return undefined
    },
  }
  return { ctx: ctx as unknown as Context, saved }
}

const visualExec = {
  signal: AbortSignal.timeout(2000),
  agent: {
    session: { requestHeader: () => ({ config: { provider: 'zai', model: 'glm-5v-turbo' } }) },
    options: {},
  },
}

/** A route the host cannot resolve: no session header and no options
 *  provider/model — the shape assertImageCapableRoute refuses on
 *  (the re-audit, 2026-10-16: the mesh arm is its only caller, so its
 *  unresolvable-route throw was unreachable from any mesh spec — every
 *  one of them passes the full route header). */
const unroutableExec = {
  signal: AbortSignal.timeout(2000),
  agent: { options: {} },
}

describe('melite_view — the mesh arm (3D in the media plane)', () => {
  test('a mesh-only run refuses with the STRUCTURE, not a dead end', async () => {
    // THE DEFECT: this run has a finished 1000-vertex textured mesh and
    // the old door said only "produced no image artifacts". The refusal
    // now carries the facts AND names the upstream gap (no poster).
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-44c30351b94e-db38e826' }, visualExec as never),
      (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        assert.match(msg, /no raster poster beside it/)
        assert.match(msg, /1000 vertices/)
        assert.match(msg, /1000 triangles/)
        assert.match(msg, /3 texture\(s\)/)
        assert.match(msg, /UV-mapped/)
        assert.match(msg, /media drilldown/)
        return true
      },
    )
  })

  test('a mesh WITH a poster sibling shows the model the render + the verdict', async () => {
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-9a1b2c3d4e5f-aabbccdd' }, visualExec as never) as ViewedImageValue
    assert.equal(out.runId, 'run-9a1b2c3d4e5f-aabbccdd')
    assert.match(out.url, /trellis2_native_00009\.glb$/)
    // the IMAGE the model sees is the poster, not a stand-in
    assert.equal(out.image!.mediaType, 'image/png')
    assert.equal(saved.length, 1)
    assert.equal(saved[0]!.name, 'trellis2_native_00009_poster.png')
    // the structural verdict rides alongside
    assert.ok(out.mesh !== undefined)
    assert.equal(out.mesh!.vertices, 1000)
    assert.equal(out.mesh!.triangles, 1000)
    assert.equal(out.mesh!.textured, true)
    assert.equal(out.mesh!.generator, 'ComfyUI')
    assert.equal(out.mesh!.poster, 'img-to-mesh/trellis2_native_00009_poster.png')
    assert.deepEqual(out.mesh!.bounds, { min: [-1, 0, -1], max: [1, 2, 1] })
    // the render pairs the mesh text with the image block
    const blocks = tool.output!.render!({} as never, out as never)
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0]!.type, 'text')
    assert.match((blocks[0] as { text: string }).text, /melite_view mesh:/)
    assert.match((blocks[0] as { text: string }).text, /1000 vertices/)
    assert.equal((blocks[1] as { type: string }).type, 'image')
  })

  test('a named .glb takes the mesh arm directly (no miss-chain walk)', async () => {
    // The img-to-mesh commission named the artifact; the intent check
    // must reach the mesh arm BEFORE the image/film/audio chain, not
    // after three misses.
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-44c30351b94e-db38e826', artifact: 'trellis2_native_00004.glb' }, visualExec as never),
      /no raster poster beside it/,
    )
  })

  test('a mesh miss on a non-visual route still refuses (the gate is not bypassed)', async () => {
    const { ctx, saved } = fakeCtx({ visual: false })
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-9a1b2c3d4e5f-aabbccdd' }, visualExec as never),
      /image input|image capability|visual/i,
    )
    assert.equal(saved.length, 0)
  })

  test('an UNRESOLVABLE route refuses on the mesh poster — nothing is attached', async () => {
    // The strict gate speaks BEFORE the bytes are committed: with no
    // session header and no options provider/model, the route cannot
    // be resolved, so the arm refuses naming the run — the poster on
    // disk is never read into an attachment.
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-9a1b2c3d4e5f-aabbccdd' }, unroutableExec as never),
      /cannot view run "run-9a1b2c3d4e5f-aabbccdd": the current model route could not be resolved/,
    )
    assert.equal(saved.length, 0)
  })

  test('a .gltf sibling and a mesh at the run root both reach the poster arm', async () => {
    // the arm accepts BOTH mesh extensions and a row whose name has no
    // directory in it (the poster sibling is then the bare stem)
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    const gltf = await tool.execute({ run_id: 'run-9a1b00000000-aabbccdd' }, visualExec as never) as ViewedImageValue
    assert.match(gltf.url, /scene_00001\.gltf$/)
    assert.equal(gltf.mesh!.poster, 'img-to-mesh/scene_00001_poster.png')
    const flat = await tool.execute({ run_id: 'run-f1a70000000-aabbccdd' }, visualExec as never) as ViewedImageValue
    assert.match(flat.url, /flat_00001\.glb$/)
    assert.equal(flat.mesh!.poster, 'flat_00001_poster.png', 'a run-root mesh looks for a run-root poster')
    assert.equal(saved.length, 2)
  })

  test('a named mesh that the run does not hold names what the run DOES hold', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-9a1b2c3d4e5f-aabbccdd', artifact: 'no_such_mesh.glb' }, visualExec as never),
      /no mesh artifact containing "no_such_mesh\.glb"/,
    )
  })

  test('an oversize poster refuses and is never attached', async () => {
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-b1600000000-aabbccdd' }, visualExec as never),
      /exceeds the .*-byte image cap/,
    )
    assert.equal(saved.length, 0, 'a refused poster is never attached')
  })

  test('a poster whose BYTES are not an image is refused, not attached under its own name', async () => {
    // the sibling name is minted by the door (`<stem>_poster.png`), so
    // the extension is never in doubt — the BYTES are. A mesh lane that
    // wrote junk under that name is refused: the door states no media
    // type it did not read (2026-09-26)
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-ab000000000-aabbccdd' }, visualExec as never),
      /the bytes are not an image/,
    )
    assert.equal(saved.length, 0)
  })

  test('a run with nothing in it keeps the original miss voice', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-abc123-def456' }, visualExec as never),
      /produced no image artifacts/,
    )
  })
})

describe('melite_view — the poster/mesh chain micro-arms', () => {
  beforeAll(() => {
    // a poster-NAMED image with NO mesh sibling: the pattern alone
    // must not reroute a plain image to a mesh that does not exist
    const orphanRun = join(root, 'output', 'run-0f9111-orphan')
    mkdirSync(orphanRun, { recursive: true })
    writeFileSync(join(orphanRun, 'orphan_poster.png'), PNG_BYTES)
    // a run whose audio probe dies for its OWN reason beside a mesh:
    // the chain must rethrow that reason, not mask it with the mesh miss
    const brokenRun = join(root, 'output', 'run-0f9222-broken')
    mkdirSync(brokenRun, { recursive: true })
    writeFileSync(join(brokenRun, 'garbage.wav'), new TextEncoder().encode('not a container at all'))
    writeFileSync(join(brokenRun, 'plain_00001.glb'), glbBytes())
  })

  test('a poster-named image WITHOUT a mesh sibling is served as the plain image it is', async () => {
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-0f9111-orphan' }, visualExec as never) as ViewedImageValue
    assert.match(out.url, /orphan_poster\.png$/)
    assert.equal(out.mesh, undefined, 'no mesh beside it — the poster pattern claims nothing on its own')
    assert.equal(out.image!.mediaType, 'image/png')
    assert.equal(saved.length, 1)
  })

  test('a NAMED mesh with a poster observes through the early arm (no walk, no misses)', async () => {
    // the 3D lane names its artifact: the intent check reaches the
    // mesh arm directly and the poster rides with the verdict
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute(
      { run_id: 'run-9a1b2c3d4e5f-aabbccdd', artifact: 'trellis2_native_00009.glb' },
      visualExec as never,
    ) as ViewedImageValue
    assert.match(out.url, /trellis2_native_00009\.glb$/)
    assert.equal(out.mesh!.poster, 'img-to-mesh/trellis2_native_00009_poster.png')
    assert.equal(saved.length, 1, 'the poster is the attached image')
  })

  test('an audio probe that dies for its OWN reason is rethrown, not masked by the mesh miss', async () => {
    // the chain\'s law: only the "no artifacts of that kind" miss
    // delegates onward — a working arm\'s real failure surfaces
    const { ctx, saved } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      () => tool.execute({ run_id: 'run-0f9222-broken' }, visualExec as never),
      /cannot view the audio "garbage\.wav"/,
    )
    assert.equal(saved.length, 0)
  })
})
