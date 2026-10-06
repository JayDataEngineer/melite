// melite_view walls (vitest, seats faked, the runs tree REAL in a
// tmp dir — the estate-media walk runs for true): the observe arm
// resolves a run's newest image (or the artifact the caller names),
// gates the route on declared image input BEFORE filesystem work,
// commits through the attachment store, and renders one text block
// + one image block re-branded from the structured value. Refusals
// are loud and specific (grammar, no images, no store, no seat,
// non-visual route, byte cap) — never a silent miss.

import { describe, test, beforeAll, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync, copyFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { AttachmentError } from '@deepseek-ai/dsh-attachment'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { meliteView, sniffImageMediaType, imageRefFromValue, viewFilmArtifact, sheetPlan } from '../src/tools/melite-view.ts'
import type { ViewedImageValue, MediaSheetRender } from '../src/tools/melite-view.ts'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { Context } from '@deepseek-ai/cordis'

// ── the runs tree (real files, controlled mtimes) ──────────────────

let root = ''
const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'melite-view-'))
  const run = join(root, 'output', 'run-abc123-hero')
  mkdirSync(run, { recursive: true })
  writeFileSync(join(run, 'gen_00001_.png'), PNG_BYTES)
  writeFileSync(join(run, 'gen_00002_.png'), PNG_BYTES)
  // newest last (the walk sorts files by mtime, newest first)
  utimesSync(join(run, 'gen_00001_.png'), new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))
  utimesSync(join(run, 'gen_00002_.png'), new Date('2026-01-02T00:00:00Z'), new Date('2026-01-02T00:00:00Z'))
  // a run with no images (a text sidecar only)
  const bare = join(root, 'output', 'run-def456-empty')
  mkdirSync(bare, { recursive: true })
  writeFileSync(join(bare, 'notes.txt'), 'no images here')
  // the edge run: an svg the vocab lists but read_image-style tools
  // cannot commit (declared undefined, bytes sniff nowhere), a
  // PNG-bytes-under-svg name (sniff rescues the type), and a gif
  // under an svg name (sniffed type outside a narrow store's limits)
  const edge = join(root, 'output', 'run-abcd99-mix')
  mkdirSync(edge, { recursive: true })
  writeFileSync(join(edge, 'plain.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  writeFileSync(join(edge, 'rescued.svg'), PNG_BYTES)
  writeFileSync(join(edge, 'gifbytes.svg'), new Uint8Array([71, 73, 70, 56, 57, 97, 0, 0]))
  utimesSync(join(edge, 'plain.svg'), new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))
  utimesSync(join(edge, 'rescued.svg'), new Date('2026-01-02T00:00:00Z'), new Date('2026-01-02T00:00:00Z'))
  utimesSync(join(edge, 'gifbytes.svg'), new Date('2026-01-03T00:00:00Z'), new Date('2026-01-03T00:00:00Z'))
  // the film run: the committed 2s fixture (h264 160x120 @10fps,
  // THE CALLER-SIGNAL BOUNDS (2026-10-10, the wedge the operator
// named): the real-binary arms' AbortSignal.timeout was 2000ms —
// fine for a lone suite, fatal under the full fleet's load, where
// real ffmpeg spawns stalled past 2s and fourteen arms bounced a
// commit on a green tree (the SIGPIPE class again: a phantom red).
// The bounds are load-sized (15s) now; the contract they test — a
// caller-provided abort signal — is unchanged.
// 20 frames, 7670 bytes) — the real ffprobe/ffmpeg below prove
  // the success path against the estate's own binaries
  const film = join(root, 'output', 'run-face001-wide')
  mkdirSync(film, { recursive: true })
  copyFileSync(new URL('./fixtures/film-2s.mp4', import.meta.url), join(film, 'film.mp4'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

// ── the seats (structural fakes, the shapes the tool probes) ───────

interface StoreLog { data: number; mediaType: string; name?: string }

function fakeCtx(opts?: { store?: false; seat?: false; visual?: boolean; byteCap?: number; llm?: false; limits?: ImageMediaType[]; fail?: { code: string }; failString?: boolean; plain?: boolean; rich?: boolean; nameless?: boolean }) {
  const saved: StoreLog[] = []
  const attachments = {
    saved,
    saveImage: async (input: { data: Uint8Array; mediaType: ImageMediaType; name?: string }): Promise<ImageAttachmentRef> => {
      if (opts?.plain === true) {
        throw new Error('plain store failure')
      }
      if (opts?.fail !== undefined) {
        throw new AttachmentError('store refused', opts.fail.code as never)
      }
      if (opts?.failString === true) {
        throw 'store string death'
      }
      saved.push({ data: input.data.byteLength, mediaType: input.mediaType, name: input.name })
      const n = saved.length
      return {
        attachmentId: 'att_' + String(n),
        mediaType: input.mediaType,
        bytes: input.data.byteLength,
        width: 8,
        height: 8,
        ...(opts?.nameless === true || input.name === undefined ? {} : { name: input.name }),
        ...(opts?.rich === true ? { originalDimensions: { width: 16, height: 16 } } : {}),
      } as ImageAttachmentRef
    },
    imageLimits: {
      maxImageBytes: opts?.byteCap ?? 10_000_000,
      maxMessageImageBytes: opts?.byteCap ?? 10_000_000,
      maxImageDimension: 8000,
      maxImagePixels: 30_000_000,
      mediaTypes: opts?.limits ?? ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as ImageMediaType[],
    },
  }
  const queue = { stateRoot: root }
  const llm = {
    resolveModelInfo: async () => ({
      inputModalities: opts?.visual === false ? ['text'] as string[] : ['text', 'image'] as string[],
    }),
  }
  const ctx = {
    get: (name: string): unknown => {
      if (name === 'attachments') return opts?.store === false ? undefined : attachments
      if (name === 'queue') return opts?.seat === false ? undefined : queue
      if (name === 'llm') return opts?.llm === false ? undefined : llm
      return undefined
    },
  }
  return { ctx: ctx as unknown as Context, attachments }
}

/** The exec view: a visual routed session (the gate's happy path). */
const visualExec = {
  signal: AbortSignal.timeout(15_000),
  agent: {
    session: { requestHeader: () => ({ config: { provider: 'zai', model: 'glm-5v-turbo' } }) },
    options: {},
  },
}

// ── the walls ──────────────────────────────────────────────────────

describe('melite_view execute — the observe arm', () => {
  test('views the run\'s NEWEST image; the store commits; render pairs text + image block', async () => {
    const { ctx, attachments } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never) as ViewedImageValue
    assert.equal(out.runId, 'run-abc123-hero')
    assert.equal(out.url, '/melite-media/runs/run-abc123-hero/gen_00002_.png')
    assert.equal(out.image!.attachmentId, 'att_1')
    assert.equal(out.image!.mediaType, 'image/png')
    assert.equal(attachments.saved.length, 1)
    assert.equal(attachments.saved[0]!.name, 'gen_00002_.png')
    // THE RENDER (read_image's pairing): text names the artifact, the
    // image block carries the re-branded durable ref
    const blocks = tool.output!.render!({} as never, out as never)
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0]!.type, 'text')
    assert.ok((blocks[0] as { text: string }).text.includes('gen_00002_.png'))
    const img = blocks[1] as { type: string, attachment: { attachmentId: string, mediaType: string } }
    assert.equal(img.type, 'image')
    assert.equal(img.attachment.attachmentId, 'att_1')
    assert.equal(img.attachment.mediaType, 'image/png')
  })

  test('the artifact substring names the pick (the walk stays the authority)', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-abc123-hero', artifact: 'gen_00001' }, visualExec as never) as ViewedImageValue
    assert.equal(out.url, '/melite-media/runs/run-abc123-hero/gen_00001_.png')
  })

  test('a non-run-id shape refuses with the containment grammar', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: '../output' }, visualExec as never),
      /containment grammar/,
    )
  })

  test('a run with no image artifacts refuses naming the run', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-def456-empty' }, visualExec as never),
      /produced no image artifacts/,
    )
  })

  test('an unknown artifact substring refuses listing what the run holds (newest first)', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero', artifact: 'nope' }, visualExec as never),
      /gen_00002_.png, gen_00001_.png/,
    )
  })

  test('THE TEXT-ONLY OBSERVE ARM: a route without image input still gets the observation, in text (a live commission found the refusal threw the facts away)', async () => {
    const { ctx, attachments } = fakeCtx({ visual: false })
    const tool = meliteView(ctx)
    const value = await tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never)
    // the measurements are served …
    const text = String((value as { textObservation?: unknown }).textObservation)
    assert.match(text, /TEXT-ONLY observation/)
    assert.match(text, /declares no image input/)
    assert.match(text, /bytes/)
    // … and NOTHING image-shaped was built or attached: the contact
    // sheet is the only picture this door makes, so it is skipped
    assert.equal((value as { image?: unknown }).image, undefined)
    assert.equal(attachments.saved.length, 0)
  })

  test('a text-only route on a FILM run serves the probe verdict and skips the contact sheet', async () => {
    const { ctx, attachments } = fakeCtx({ visual: false })
    const tool = meliteView(ctx)
    const value = await tool.execute({ run_id: 'run-face001-wide' }, visualExec as never)
    const text = String((value as { textObservation?: unknown }).textObservation)
    assert.match(text, /melite_view film: /)
    assert.match(text, /streams:/)
    assert.match(text, /TEXT-ONLY observation/)
    assert.equal(attachments.saved.length, 0)
  })

  test('the route gate still refuses the unresolvable route (never a silent degrade)', async () => {
    const { ctx } = fakeCtx({ llm: false })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /could not be resolved/,
    )
  })

  test('no attachment store refuses loudly (never a phantom verb)', async () => {
    const { ctx } = fakeCtx({ store: false })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /no attachment service is mounted/,
    )
  })

  test('no queue seat refuses naming the mount law', async () => {
    const { ctx } = fakeCtx({ seat: false })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /queue seat owns the runs tree root/,
    )
  })

  test('an over-cap file refuses with the cap named', async () => {
    const { ctx } = fakeCtx({ byteCap: 4 })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /4-byte image cap/,
    )
  })

  test('a non-string run_id throws at the wrapper gate', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(tool.execute({ run_id: 42 } as never, visualExec as never), ToolArgsError)
  })
})

describe('melite_view presentCall — the streaming tile', () => {
  test('echoes the args; junk renders generic', () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    // The tile always answers the generic card — narrow the
    // ToolCallView union to read its rawInput.
    assert.deepEqual(
      (tool.presentCall!({ run_id: 'run-abc123-hero', artifact: 'gen_1' } as never)! as GenericCallView).rawInput,
      { run_id: 'run-abc123-hero', artifact: 'gen_1' },
    )
    assert.deepEqual(
      (tool.presentCall!({} as never)! as GenericCallView).rawInput,
      { run_id: undefined, artifact: undefined },
    )
    assert.equal(tool.presentCall!(null as never)!.title, 'View run artifact')
  })

  test('the tool is concurrency-safe (independent views may batch)', () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    // valid args (the wrapper soft-gates junk like presentCall — the
    // defineTool conversion-invariance law)
    assert.equal(tool.isConcurrencySafe!({ run_id: 'run-abc123-hero' } as never), true)
  })
})

describe('melite_view edge refusals — every arm speaks its own reason', () => {
  test('an agent-OPTIONS route serves when the session header is absent', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    const optionsExec = {
      signal: AbortSignal.timeout(15_000),
      agent: { session: { requestHeader: () => undefined }, options: { provider: 'zai', model: 'glm-5v-turbo' } },
    }
    const out = await tool.execute({ run_id: 'run-abc123-hero' }, optionsExec as never) as ViewedImageValue
    assert.equal(out.image!.attachmentId, 'att_1')
  })

  test('no route anywhere (agent absent) refuses — never a guess', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, { signal: AbortSignal.timeout(15_000) } as never),
      /route could not be resolved/,
    )
  })

  test('no llm seat refuses the same way', async () => {
    const { ctx } = fakeCtx({ llm: false })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /route could not be resolved/,
    )
  })

  test('an empty run_id string passes the gate and refuses in the body', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: '  ' }, visualExec as never),
      /run_id must be a non-empty string/,
    )
  })

  test('a declared type the deployment excludes refuses before the read', async () => {
    const { ctx } = fakeCtx({ limits: ['image/jpeg'] })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /image\/png images are not accepted by this deployment/,
    )
  })

  test('a vocab-listed svg whose bytes sniff nowhere refuses as unsupported', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abcd99-mix', artifact: 'plain.svg' }, visualExec as never),
      /not a supported image format/,
    )
  })

  test('PNG bytes under an svg name are RESCUED by the signature sniffer', async () => {
    const { ctx, attachments } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-abcd99-mix', artifact: 'rescued.svg' }, visualExec as never) as ViewedImageValue
    assert.equal(out.image!.mediaType, 'image/png')
    assert.equal(attachments.saved[0]!.mediaType, 'image/png')
  })

  test('a sniffed type outside a narrow store\'s limits refuses naming it', async () => {
    const { ctx } = fakeCtx({ limits: ['image/png'] })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abcd99-mix', artifact: 'gifbytes.svg' }, visualExec as never),
      /image\/gif images are not accepted by this deployment/,
    )
  })

  test('a store dimension refusal maps to the downscale advice', async () => {
    const { ctx } = fakeCtx({ fail: { code: 'IMAGE_DIMENSION_TOO_LARGE' } })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /exceeds the 8000px limit/,
    )
  })

  test('a store pixel-count refusal maps to the downscale advice', async () => {
    const { ctx } = fakeCtx({ fail: { code: 'IMAGE_TOO_MANY_PIXELS' } })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /decoded-size limit/,
    )
  })

  test('a store byte refusal maps to the downscale advice', async () => {
    const { ctx } = fakeCtx({ fail: { code: 'IMAGE_TOO_LARGE' } })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /byte limits/,
    )
  })

  test('an INVALID_IMAGE on sniffer-rescued bytes refuses as undecodable', async () => {
    const { ctx } = fakeCtx({ fail: { code: 'INVALID_IMAGE' } })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abcd99-mix', artifact: 'rescued.svg' }, visualExec as never),
      /do not decode/,
    )
  })

  test('an unrecognized store code rethrows verbatim (never a lying wrap)', async () => {
    const { ctx } = fakeCtx({ fail: { code: 'ATTACHMENT_WRITE_FAILED' } })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      (e: unknown) => e instanceof AttachmentError && e.code === 'ATTACHMENT_WRITE_FAILED',
    )
  })

  test('a NON-AttachmentError store failure rethrows verbatim', async () => {
    const { ctx } = fakeCtx({ plain: true })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      (e: unknown) => e instanceof Error && !(e instanceof AttachmentError) && e.message === 'plain store failure',
    )
  })

  test('a store ref carrying originalDimensions rides it into the value (the normalization note)', async () => {
    const { ctx } = fakeCtx({ rich: true })
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never) as ViewedImageValue
    assert.deepEqual(out.image!.originalDimensions, { width: 16, height: 16 })
    // and the render's re-branded ref carries it too
    const blocks = tool.output!.render!({} as never, out as never)
    const img = blocks[1] as { attachment: { originalDimensions?: { width: number } } }
    assert.equal(img.attachment.originalDimensions!.width, 16)
  })

  test('a nameless store ref stays nameless in the value (never an invented name)', async () => {
    const { ctx } = fakeCtx({ nameless: true })
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never) as ViewedImageValue
    assert.equal('name' in out.image!, false)
  })
})

describe('the signature sniffer + ref re-brand (read_image copies)', () => {
  test('sniffs PNG, JPEG, GIF87a, WEBP; unknown stays undefined', () => {
    assert.equal(sniffImageMediaType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png')
    assert.equal(sniffImageMediaType(new Uint8Array([255, 216, 255, 0])), 'image/jpeg')
    assert.equal(sniffImageMediaType(new Uint8Array([71, 73, 70, 56, 55, 97])), 'image/gif')
    assert.equal(sniffImageMediaType(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])), 'image/webp')
    assert.equal(sniffImageMediaType(new Uint8Array([0, 1, 2, 3])), undefined)
    assert.equal(sniffImageMediaType(new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4, 5, 6, 7, 8])), undefined)
  })

  test('imageRefFromValue re-brands the structured value (optional fields ride only when present)', () => {
    const ref = imageRefFromValue({
      attachmentId: 'att_9', mediaType: 'image/png', bytes: 12, width: 4, height: 4,
    })
    assert.equal(ref.attachmentId, 'att_9')
    assert.equal(ref.mediaType, 'image/png')
    assert.equal('name' in ref, false)
    assert.equal('originalDimensions' in ref, false)
    const named = imageRefFromValue({
      attachmentId: 'att_8', mediaType: 'image/webp', bytes: 9, width: 2, height: 2,
      name: 'shot.webp', originalDimensions: { width: 4, height: 4 },
    })
    assert.equal(named.name, 'shot.webp')
    assert.deepEqual(named.originalDimensions, { width: 4, height: 4 })
  })
})

describe('melite_view film — the §24 observe arm (fakes for the engine render seam; the vendored nodes own the decode proof)', () => {
  // a fake proc: canned probe text, then PNG bytes written to every
  // ffmpeg out path (the tests pin the plumbing, not the pixels —
  // the pixels are proven once against the real binaries above)
  // the fakes serve the SHEET build only — the probe is TypeScript now
  // and never asks a process for anything
  // a fake render seam: PNG bytes back for the sheet ask (the
  // engine-produced decode is the vendored nodes' own pytest — the
  // TS plane pins the plumbing: probe verdict, attach, provenance)
  const fakeProc = (opts?: { ffmpegThrow?: unknown }): MediaSheetRender =>
    async () => {
      // true rides the Error voice; any other value is thrown raw
      // (a foreign rejection shape — the door still speaks)
      if (opts?.ffmpegThrow !== undefined) {
        throw opts.ffmpegThrow === true ? new Error('ffmpeg exploded') : opts.ffmpegThrow
      }
      return PNG_BYTES
    }

  test('a film run serves probe summary + contact sheet; the run tree stays untouched', async () => {
    const { ctx, attachments } = fakeCtx()
    const tool = meliteView(ctx, fakeProc())
    const out = await tool.execute({ run_id: 'run-face001-wide' }, visualExec as never) as ViewedImageValue
    assert.equal(out.runId, 'run-face001-wide')
    assert.equal(out.url, '/melite-media/runs/run-face001-wide/film.mp4')
    // THE PROBE VERDICT (the §24 gate: duration/streams/frame count
    // pinned on the fixture — h264 160x120 @10fps, 20 frames, 2s)
    assert.equal(out.film!.file, 'film.mp4')
    assert.equal(out.film!.duration_s, 2)
    assert.equal(out.film!.size_bytes, 7670)
    assert.deepEqual(out.film!.streams, [{ codec: 'h264', codec_type: 'video', width: 160, height: 120, fps: '10/1', frames: 20 }])
    assert.equal(out.film!.sheet_of, 4)
    // the viewed image IS the sheet (the seam's PNG bytes, attached
    // verbatim — the decode itself is the vendored nodes' pytest)
    assert.equal(out.image!.mediaType, 'image/png')
    assert.equal(out.image!.name, 'film-sheet.png')
    assert.equal(out.image!.bytes, PNG_BYTES.byteLength)
    assert.equal(attachments.saved.length, 1)
    // PROVENANCE (a view mints nothing): the run still holds exactly
    // the film — the sheet lived in tmpdir, never the runs tree
    assert.deepEqual(readdirSync(join(root, 'output', 'run-face001-wide')), ['film.mp4'])
    // the render leads with the probe verdict
    const blocks = tool.output!.render!({} as never, out as never)
    const text = (blocks[0] as { text: string }).text
    assert.ok(text.startsWith('melite_view film: '), text)
    assert.ok(text.includes('film.mp4') && text.includes('2s') && text.includes('h264') && text.includes('20f') && text.includes('contact sheet of 4'), text)
  })

  test('THE SEAM CONTRACT: the sheet ask names the vendored node + the walked path, never a binary', async () => {
    const { ctx } = fakeCtx()
    const asks: Array<{ node: string, inputs: Record<string, unknown> }> = []
    const spy: MediaSheetRender = async (node, inputs) => {
      asks.push({ node, inputs: inputs as Record<string, unknown> })
      return PNG_BYTES
    }
    const tool = meliteView(ctx, spy)
    await tool.execute({ run_id: 'run-face001-wide' }, visualExec as never)
    assert.equal(asks.length, 1)
    assert.equal(asks[0]!.node, 'MeliteFrameSheet')
    assert.ok(String(asks[0]!.inputs['video']).endsWith(join('run-face001-wide', 'film.mp4')), String(asks[0]!.inputs['video']))
    assert.equal(asks[0]!.inputs['stamps'], 4)
    assert.equal(asks[0]!.inputs['width'], 320)
  })

  test('the artifact substring picks the film; a miss lists the holdings', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx, fakeProc())
    const out = await tool.execute({ run_id: 'run-face001-wide', artifact: 'film' }, visualExec as never) as ViewedImageValue
    assert.equal(out.film!.file, 'film.mp4')
    await assert.rejects(
      tool.execute({ run_id: 'run-face001-wide', artifact: 'nope' }, visualExec as never),
      /has no film artifact containing "nope" — the run holds: film\.mp4/,
    )
  })

  test('a run with neither images nor film keeps the old voice, extended', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx, fakeProc())
    await assert.rejects(
      tool.execute({ run_id: 'run-def456-empty' }, visualExec as never),
      /produced no image artifacts \(and no viewable film/,
    )
    // §23 NAME-THE-ROOT: the miss names the searched tree
    await assert.rejects(
      tool.execute({ run_id: 'run-def456-empty' }, visualExec as never),
      new RegExp('\\(searched ' + root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)'),
    )
  })

  test('THE PROBE IS TYPESCRIPT: no binary, no subprocess — an unreadable artifact names itself', async () => {
    const { ctx } = fakeCtx()
    // the ffmpeg seam still serves the SHEET build; the probe never asks
    // it anything, which is the point: a film is described from bytes
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-dead00-gone', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc()),
      /produced no image artifacts \(and no viewable film/,
    )
  })

  test('an unreadable container refuses with the door voice (never a throw-through)', async () => {
    // a file whose bytes are not a container the in-repo parser knows
    const junk = join(root, 'output', 'run-face003-junk')
    mkdirSync(junk, { recursive: true })
    writeFileSync(join(junk, 'film.mp4'), Buffer.from('this is not a container at all'))
    const { ctx } = fakeCtx()
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face003-junk', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc()),
      /cannot view the film "film\.mp4": the media probe recognized neither/,
    )
    // and a container with no track row speaks the corrupt-file voice
    const bare = join(root, 'output', 'run-face004-bare')
    mkdirSync(bare, { recursive: true })
    // ftyp (16b) + an empty moov (8b): a real container, no track
    writeFileSync(join(bare, 'film.mp4'), Buffer.concat([
      Buffer.from([0, 0, 0, 16, 102, 116, 121, 112, 109, 115, 110, 109, 0, 0, 2, 0]),
      Buffer.from([0, 0, 0, 8, 109, 111, 111, 118]),
    ]))
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face004-bare', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc()),
      /cannot view the film "film\.mp4": the media probe found no streams/,
    )
  })

  test('a failed sheet build refuses naming the film (never a silent miss)', async () => {
    const { ctx } = fakeCtx()
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc({ ffmpegThrow: true })),
      /the contact sheet could not be built \(ffmpeg exploded\)/,
    )
    // a foreign rejection shape still speaks (the String arm, never
    // a throw-through)
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc({ ffmpegThrow: 'sheet blew up' })),
      /the contact sheet could not be built \(sheet blew up\)/,
    )
    const refusing = fakeCtx({ failString: true })
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, refusing.ctx, (refusing.ctx.get('attachments') as never), fakeProc()),
      /cannot commit the film contact sheet for "film\.mp4": store string death/,
    )
  })

  test('an over-cap sheet and a refusing store both speak the sheet voice', async () => {
    const tiny = fakeCtx({ byteCap: 10 })
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, tiny.ctx, (tiny.ctx.get('attachments') as never), fakeProc()),
      /its contact sheet exceeds the 10-byte image cap/,
    )
    const refusing = fakeCtx({ fail: { code: 'IMAGE_TOO_LARGE' } })
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, refusing.ctx, (refusing.ctx.get('attachments') as never), fakeProc()),
      /cannot commit the film contact sheet/,
    )
  })

  test('the probe read arm: an unreadable artifact speaks, and a single-stamp sheet still tiles', async () => {
    const { ctx } = fakeCtx()
    const { viewFilmArtifact } = await import('../src/tools/melite-view.ts')
    // THE READ SEAM: an artifact that vanishes between the walk and the
    // read (a race, or a mount that went away) speaks the door's voice
    // rather than leaking an fs error
    const raced = async (): Promise<Uint8Array> => { throw new Error('EIO: input/output error') }
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root } as never, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc(), raced),
      /cannot view the film "film\.mp4": the artifact could not be read \(EIO/,
    )

    // THE SINGLE-FRAME ARM: a container with no mvhd has NO duration,
    // so the plan is one early frame — and the sheet builder must not
    // tile a lone frame into a 2x2 grid
    const box = (type: string, body: Buffer): Buffer => {
      const head = Buffer.alloc(8)
      head.writeUInt32BE(8 + body.length, 0)
      head.write(type, 4, 'latin1')
      return Buffer.concat([head, body])
    }
    const nodur = join(root, 'output', 'run-a5a5a5-nodur')
    mkdirSync(nodur, { recursive: true })
    const avc1 = box('avc1', Buffer.concat([Buffer.alloc(6), Buffer.from([0, 1]), Buffer.alloc(16), Buffer.from([0x01, 0x2c, 0x01, 0x90])]))
    const stsd = box('stsd', Buffer.concat([Buffer.alloc(4), Buffer.from([0, 0, 0, 1]), avc1]))
    const stbl = box('stbl', stsd)
    const hdlr = box('hdlr', Buffer.concat([Buffer.alloc(8), Buffer.from('vide', 'latin1'), Buffer.alloc(12)]))
    const mdia = box('mdia', Buffer.concat([hdlr, box('minf', box('stbl', stbl))]))
    const moov = box('moov', box('trak', mdia)) // NO mvhd → no duration
    writeFileSync(join(nodur, 'film.mp4'), Buffer.concat([
      box('ftyp', Buffer.from('isom', 'latin1')), moov,
    ]))
    const one = await viewFilmArtifact({ stateRoot: root } as never, 'run-a5a5a5-nodur', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc())
    assert.equal(one.film!.sheet_of, 1, 'a duration-less film plans one early frame')
    assert.equal('duration_s' in one.film!, false, 'and states no duration rather than zero')
  })

  test('a sparse container states what it knows and omits what it does not', async () => {
    const { ctx } = fakeCtx()
    const tool0 = meliteView(ctx, fakeProc())
    const { viewFilmArtifact } = await import('../src/tools/melite-view.ts')
    const box = (type: string, body: Buffer): Buffer => {
      const head = Buffer.alloc(8)
      head.writeUInt32BE(8 + body.length, 0)
      head.write(type, 4, 'latin1')
      return Buffer.concat([head, body])
    }
    // a video track whose sample entry is TRUNCATED: no geometry, no
    // sample table. The row carries the codec and says nothing else —
    // never a zero width or a fabricated frame count.
    const sparse = join(root, 'output', 'run-b6b6b6-sparse')
    mkdirSync(sparse, { recursive: true })
    const short = box('avc1', Buffer.concat([Buffer.alloc(6), Buffer.from([0, 1])]))
    const stsd = box('stsd', Buffer.concat([Buffer.alloc(4), Buffer.from([0, 0, 0, 1]), short]))
    const hdlr = box('hdlr', Buffer.concat([Buffer.alloc(8), Buffer.from('vide', 'latin1'), Buffer.alloc(12)]))
    const moov = box('moov', box('trak', box('mdia', Buffer.concat([hdlr, box('minf', box('stbl', stsd))]))))
    writeFileSync(join(sparse, 'film.mp4'), Buffer.concat([box('ftyp', Buffer.from('isom', 'latin1')), moov]))
    const out = await viewFilmArtifact({ stateRoot: root } as never, 'run-b6b6b6-sparse', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc())
    assert.deepEqual(out.film!.streams, [{ codec: 'h264', codec_type: 'video' }])
    assert.equal('width' in out.film!.streams[0]!, false)
    // an UNKNOWN codec fourcc: the row names what the file says and
    // states no family, and the render prints no 'undefined'
    const unknown = join(root, 'output', 'run-c7c7c7-unknown')
    mkdirSync(unknown, { recursive: true })
    const stsdU = box('stsd', Buffer.concat([Buffer.alloc(4), Buffer.from([0, 0, 0, 1]), box('zzzz', Buffer.alloc(4))]))
    const hdlrU = box('hdlr', Buffer.concat([Buffer.alloc(8), Buffer.from('xunk', 'latin1'), Buffer.alloc(12)]))
    const moovU = box('moov', box('trak', box('mdia', Buffer.concat([hdlrU, box('minf', box('stbl', stsdU))]))))
    writeFileSync(join(unknown, 'film.mp4'), Buffer.concat([box('ftyp', Buffer.from('isom', 'latin1')), moovU]))
    const named = await viewFilmArtifact({ stateRoot: root } as never, 'run-c7c7c7-unknown', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc())
    assert.deepEqual(named.film!.streams, [{ codec: 'zzzz' }])
    const namedText = (tool0.output!.render!({} as never, named as never)[0] as { text: string }).text
    assert.ok(!namedText.includes('undefined'), namedText)
    // and the RENDER never prints an undefined
    const tool = meliteView(ctx, fakeProc())
    const text = (tool.output!.render!({} as never, out as never)[0] as { text: string }).text
    assert.ok(!text.includes('undefined'), text)
  })

  test('nameless+rich refs ride through the film arm', async () => {
    const { ctx } = fakeCtx({ nameless: true, rich: true })
    const out = await viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc())
    assert.equal(out.film!.sheet_of, 4)
    assert.equal(out.film!.duration_s, 2)
    assert.equal(out.film!.size_bytes, 7670)
    assert.equal('name' in out.image!, false)
    assert.deepEqual(out.image!.originalDimensions, { width: 16, height: 16 })
  })

  test('a width-without-height stream renders without geometry (never a half "160xundefined")', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx, fakeProc())
    const text = (tool.output!.render!({} as never, {
      runId: 'run-face001-wide', url: '/melite-media/runs/run-face001-wide/film.mp4',
      image: { attachmentId: 'att_1', mediaType: 'image/png', bytes: 99, width: 8, height: 8 },
      film: { file: 'film.mp4', streams: [{ codec: 'h264', width: 160 }], sheet_of: 1 },
    } as never)[0] as { text: string }).text
    assert.ok(text.includes('h264') && !text.includes('160x') && !text.includes('@') && text.includes('contact sheet of 1'), text)
  })

  test('sheetPlan spans the film or falls back to one early frame', () => {
    assert.deepEqual(sheetPlan(2), [0.2, 0.8, 1.4, 1.9])
    assert.deepEqual(sheetPlan(undefined), [0.5])
    assert.deepEqual(sheetPlan(Number.NaN), [0.5])
    assert.deepEqual(sheetPlan(0), [0.5])
    assert.deepEqual(sheetPlan(-3), [0.5])
  })
})

describe('melite_view cross-roots (§23 manifest)', () => {
  test('an image run living only on the maker root is viewed; the miss names every root', async () => {
    const maker = mkdtempSync(join(tmpdir(), 'melite-view-maker-'))
    const run = join(maker, 'output', 'run-cafe77-only')
    mkdirSync(run, { recursive: true })
    writeFileSync(join(run, 'gen_00001_.png'), PNG_BYTES)
    process.env['MELITE_STATE_ROOTS'] = maker
    try {
      const { ctx } = fakeCtx()
      const out = await meliteView(ctx).execute({ run_id: 'run-cafe77-only' }, visualExec as never) as ViewedImageValue
      assert.equal(out.runId, 'run-cafe77-only')
      // the miss names BOTH roots (own + maker)
      await assert.rejects(
        meliteView(ctx).execute({ run_id: 'run-0abcde-ghost' }, visualExec as never) as never,
        (e: Error) => e.message.includes('(searched ' + root + ', ' + maker + ')'),
      )
    } finally {
      delete process.env['MELITE_STATE_ROOTS']
      rmSync(maker, { recursive: true, force: true })
    }
  })

  test('own root wins a run-id collision (the maker copy is shadowed)', async () => {
    const maker = mkdtempSync(join(tmpdir(), 'melite-view-maker-'))
    const mkRun = join(maker, 'output', 'run-abc123-hero')
    mkdirSync(mkRun, { recursive: true })
    writeFileSync(join(mkRun, 'gen_00001_.png'), PNG_BYTES)
    process.env['MELITE_STATE_ROOTS'] = maker
    try {
      const { ctx } = fakeCtx()
      // own tree holds TWO images (newest-first: gen_00002_) — the
      // maker's single-image copy must NOT answer this view.
      const out = await meliteView(ctx).execute({ run_id: 'run-abc123-hero' }, visualExec as never) as ViewedImageValue
      assert.equal(out.url, '/melite-media/runs/run-abc123-hero/gen_00002_.png')
    } finally {
      delete process.env['MELITE_STATE_ROOTS']
      rmSync(maker, { recursive: true, force: true })
    }
  })
})

describe('melite_view audio — the §33 gap-6 observe arm (fakes for the engine render seam; the vendored nodes own the decode proof)', () => {
  const fakeAudioProc = (opts?: { ffmpegThrow?: unknown }): MediaSheetRender =>
    async () => {
      if (opts?.ffmpegThrow !== undefined) {
        throw opts.ffmpegThrow === true ? new Error('ffmpeg exploded') : opts.ffmpegThrow
      }
      return PNG_BYTES
    }

  beforeAll(() => {
    // the audio run: the committed 0.5s tone fixture (pcm_s16le
    // 8000Hz mono, 8078 bytes) — real ffprobe/ffmpeg prove the
    // success path; fakes pin the refusals below
    const audio = join(root, 'output', 'run-a0d10-tone')
    mkdirSync(audio, { recursive: true })
    copyFileSync(new URL('./fixtures/tone-05s.wav', import.meta.url), join(audio, 'line.wav'))
  })

  test('an audio-only run serves the probe verdict + waveform sheet; the run tree stays untouched', async () => {
    const { ctx, attachments } = fakeCtx()
    const tool = meliteView(ctx, fakeAudioProc())
    const out = await tool.execute({ run_id: 'run-a0d10-tone' }, visualExec as never) as ViewedImageValue
    assert.equal(out.runId, 'run-a0d10-tone')
    assert.equal(out.url, '/melite-media/runs/run-a0d10-tone/line.wav')
    // THE PROBE VERDICT (duration/size/codec/rate/channels pinned on
    // the fixture — THE MINT-TIME DURATION the gap asked for)
    assert.equal(out.audio!.file, 'line.wav')
    assert.equal(out.audio!.duration_s, 0.5)
    assert.equal(out.audio!.size_bytes, 8078)
    assert.deepEqual(out.audio!.streams, [{ codec: 'pcm_s16le', codec_type: 'audio', sample_rate: 8000, channels: 1 }])
    assert.equal(out.audio!.waveform_of, true)
    // the viewed image IS the waveform sheet (a real PNG)
    assert.equal(out.image!.mediaType, 'image/png')
    assert.ok(out.image!.name!.endsWith('-waveform.png'))
    assert.equal(attachments.saved.length, 1)
    // PROVENANCE: a view mints nothing — the run still holds exactly the clip
    assert.deepEqual(readdirSync(join(root, 'output', 'run-a0d10-tone')), ['line.wav'])
  })

  test('THE TEXT-ONLY AUDIO TWIN: a route without image input gets the clip facts, and no ffmpeg waveform is spent', async () => {
    const { ctx, attachments } = fakeCtx({ visual: false })
    const tool = meliteView(ctx, fakeAudioProc())
    const value = await tool.execute({ run_id: 'run-a0d10-tone' }, visualExec as never)
    const text = String((value as { textObservation?: unknown }).textObservation)
    // the probe verdict rides whole: name, duration, bytes, streams
    assert.match(text, /melite_view audio: line\.wav, 0\.5s, 8078 bytes/)
    assert.match(text, /streams: pcm_s16le 8000Hz 1ch/)
    assert.match(text, /TEXT-ONLY observation/)
    assert.match(text, /no waveform sheet was rendered/)
    assert.match(text, /The measurements above are complete\./)
    // and NOTHING image-shaped was built or attached
    assert.equal((value as { image?: unknown }).image, undefined)
    assert.equal(attachments.saved.length, 0)
    // the run tree stays exactly the clip
    assert.deepEqual(readdirSync(join(root, 'output', 'run-a0d10-tone')), ['line.wav'])
  })

  test('THE STUB DETECTOR: a near-zero duration reads in the verdict (the 032 receipt closes natively)', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx, fakeAudioProc())
    // a real WAV header over ONE data byte: 1 / (8000*1*2) = 62.5µs
    const stub = join(root, 'output', 'run-c1c1c1-stub')
    mkdirSync(stub, { recursive: true })
    const le32 = (n: number): Buffer => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
    const le16 = (n: number): Buffer => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b }
    const fmt = Buffer.concat([le16(1), le16(1), le32(8000), le32(16000), le16(2), le16(16)])
    const wav = Buffer.concat([
      Buffer.from('RIFF'), le32(4 + 8 + fmt.length + 8 + 1), Buffer.from('WAVE'),
      Buffer.from('fmt '), le32(fmt.length), fmt,
      Buffer.from('data'), le32(1), Buffer.from([0]),
    ])
    writeFileSync(join(stub, 'line.wav'), wav)
    const { viewAudioArtifact } = await import('../src/tools/melite-view.ts')
    const out = await viewAudioArtifact({ stateRoot: root } as never, 'run-c1c1c1-stub', 'line.wav', visualExec as never, ctx, (ctx.get('attachments') as never), fakeAudioProc())
    assert.ok(out.audio!.duration_s !== undefined && out.audio!.duration_s < 0.001, 'a sub-millisecond clip reads as a stub: ' + String(out.audio!.duration_s))
  })

  test('an explicit audio artifact name observes the CLIP even when the run also holds images', async () => {
    // the mixed run: an image AND the clip — explicit intent wins
    const mixed = join(root, 'output', 'run-b1e5d-mix2')
    mkdirSync(mixed, { recursive: true })
    writeFileSync(join(mixed, 'portrait.png'), PNG_BYTES)
    copyFileSync(new URL('./fixtures/tone-05s.wav', import.meta.url), join(mixed, 'line.flac'))
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx, fakeAudioProc())
    const out = await tool.execute({ run_id: 'run-b1e5d-mix2', artifact: 'line.flac' }, visualExec as never) as ViewedImageValue
    assert.equal(out.audio!.file, 'line.flac')
    assert.equal(out.audio!.duration_s, 0.5)
  })

  test('an audio artifact whose codec the container does not name states no family', async () => {
    // an MP4 served on the audio arm with a handler AND a fourcc the
    // parser does not know: the row names the fourcc, states no family,
    // and the render prints no 'undefined'
    const box = (type: string, body: Buffer): Buffer => {
      const head = Buffer.alloc(8)
      head.writeUInt32BE(8 + body.length, 0)
      head.write(type, 4, 'latin1')
      return Buffer.concat([head, body])
    }
    const stsd = box('stsd', Buffer.concat([Buffer.alloc(4), Buffer.from([0, 0, 0, 1]), box('qqqq', Buffer.alloc(4))]))
    const hdlr = box('hdlr', Buffer.concat([Buffer.alloc(8), Buffer.from('yunk', 'latin1'), Buffer.alloc(12)]))
    const moov = box('moov', box('trak', box('mdia', Buffer.concat([hdlr, box('minf', box('stbl', stsd))]))))
    const run = join(root, 'output', 'run-d4d4d4-odd')
    mkdirSync(run, { recursive: true })
    writeFileSync(join(run, 'line.mp3'), Buffer.concat([box('ftyp', Buffer.from('isom', 'latin1')), moov]))
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx, fakeAudioProc())
    // the fake serves the sheet build; the PROBE reads these bytes
    const { viewAudioArtifact } = await import('../src/tools/melite-view.ts')
    const out = await viewAudioArtifact({ stateRoot: root } as never, 'run-d4d4d4-odd', 'line.mp3', visualExec as never, ctx, (ctx.get('attachments') as never), fakeAudioProc())
    assert.deepEqual(out.audio!.streams, [{ codec: 'qqqq' }])
    const text = (tool.output!.render!({} as never, out as never)[0] as { text: string }).text
    assert.ok(!text.includes('undefined'), text)
  })

  test('a probe refusal names the clip LOUD (never a silent stub)', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx, fakeAudioProc())
    // a truncated clip: a RIFF header with no fmt and no data
    const broken = join(root, 'output', 'run-d2d2d2-trunc')
    mkdirSync(broken, { recursive: true })
    const le32b = (n: number): Buffer => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
    writeFileSync(join(broken, 'line.wav'), Buffer.concat([Buffer.from('RIFF'), le32b(4), Buffer.from('WAVE')]))
    const { viewAudioArtifact } = await import('../src/tools/melite-view.ts')
    await assert.rejects(
      viewAudioArtifact({ stateRoot: root } as never, 'run-d2d2d2-trunc', 'line.wav', visualExec as never, ctx, (ctx.get('attachments') as never), fakeAudioProc()),
      /cannot view the audio "line\.wav": the media probe found no streams/,
    )
  })

  test('a named clip that is not there lists what the run DOES hold', async () => {
    // the audio twin of the film's miss: the holdings, never a bare
    // "not found"
    const { ctx } = fakeCtx()
    const { viewAudioArtifact } = await import('../src/tools/melite-view.ts')
    await assert.rejects(
      viewAudioArtifact({ stateRoot: root } as never, 'run-a0d10-tone', 'nope.wav', visualExec as never, ctx, (ctx.get('attachments') as never), fakeAudioProc()),
      /has no audio artifact containing "nope\.wav" — the run holds: line\.wav/,
    )
  })

  test('the audio arms refusals speak: a foreign rejection shape, a failed sheet, and the byte cap', async () => {
    // THE AUDIO TWIN of the film's three walls — the arm ships its own
    // voices, so each one is pinned here rather than assumed
    const { ctx, attachments } = fakeCtx()
    const { viewAudioArtifact } = await import('../src/tools/melite-view.ts')
    const call = (proc: MediaSheetRender, c: unknown = ctx, read?: (p: string) => Promise<Uint8Array>) => viewAudioArtifact(
      { stateRoot: root } as never, 'run-a0d10-tone', 'line.wav', visualExec as never,
      c as never, ((c as { get(n: string): unknown }).get('attachments') as never), proc, read,
    )
    // NOTE: the probe has no proc arm at all — the file is read as
    // bytes, so there is no rejection shape to speak for it. Its READ
    // seam still speaks both shapes (a mount that went away):
    const vanished = async (): Promise<Uint8Array> => { throw 'mount vanished' }
    await assert.rejects(
      call(fakeAudioProc(), ctx, vanished),
      /cannot view the audio "line\.wav": the artifact could not be read \(mount vanished\)/,
    )
    // a failed waveform build names the clip — both rejection shapes
    await assert.rejects(
      call(fakeAudioProc({ ffmpegThrow: true })),
      /cannot view the audio "line\.wav": the waveform sheet could not be built \(ffmpeg exploded\)/,
    )
    await assert.rejects(
      call(fakeAudioProc({ ffmpegThrow: 'sheet blew up' })),
      /cannot view the audio "line\.wav": the waveform sheet could not be built \(sheet blew up\)/,
    )
    // the cap speaks its own voice, and a refusing store speaks after it
    const tiny = fakeCtx({ byteCap: 1 })
    await assert.rejects(
      call(fakeAudioProc(), tiny.ctx),
      /its waveform sheet exceeds the 1-byte image cap/,
    )
    const refusing = fakeCtx({ fail: { code: 'IMAGE_TOO_LARGE' } })
    await assert.rejects(
      call(fakeAudioProc(), refusing.ctx),
      /cannot commit the audio waveform sheet/,
    )
    const plain = fakeCtx({ plain: true })
    await assert.rejects(
      call(fakeAudioProc(), plain.ctx),
      /cannot commit the audio waveform sheet for "line\.wav": plain store failure/,
    )
    // a store that rejects with a NON-Error still speaks (the String arm)
    const stringy = { get: (n: string): unknown => (n === 'attachments' ? {
      saveImage: async () => { throw 'store string death' },
      imageLimits: { maxImageBytes: 10_000_000, maxMessageImageBytes: 10_000_000, maxImageDimension: 8000, maxImagePixels: 30_000_000, mediaTypes: ['image/png'] },
    } : n === 'queue' ? { stateRoot: root }
      : n === 'llm' ? { resolveModelInfo: async () => ({ inputModalities: ['text', 'image'] }) }
        : undefined) } as unknown as Context
    await assert.rejects(
      call(fakeAudioProc(), stringy),
      /cannot commit the audio waveform sheet for "line\.wav": store string death/,
    )
    // the optional reference fields ride when the store provides them
    // and stay absent when it does not (both arms, both shapes)
    const rich = fakeCtx({ rich: true })
    const richOut = await call(fakeAudioProc(), rich.ctx) as { image: { originalDimensions?: { width: number, height: number } } }
    assert.deepEqual(richOut.image.originalDimensions, { width: 16, height: 16 })
    const nameless = fakeCtx({ nameless: true })
    const plainOut = await call(fakeAudioProc(), nameless.ctx) as { image: { name?: string } }
    assert.equal(plainOut.image.name, undefined)
    // and the audio row's OPTIONAL fields stay ABSENT when the probe
    // omits them (never null, never a fabricated zero)
    // a WAV whose fmt chunk is TRUNCATED after the format tag: the row
    // names the codec and omits rate/channels, and the render prints no
    // 'undefined' and no invented zeros
    const thin = join(root, 'output', 'run-f6f6f6-thin')
    mkdirSync(thin, { recursive: true })
    writeFileSync(join(thin, 'line.wav'), Buffer.concat([
      Buffer.from('RIFF'), Buffer.from([36, 0, 0, 0]), Buffer.from('WAVE'),
      Buffer.from('fmt '), Buffer.from([4, 0, 0, 0]), Buffer.from([1, 0]),
    ]))
    const thinOut = await viewAudioArtifact({ stateRoot: root } as never, 'run-f6f6f6-thin', 'line.wav', visualExec as never, ctx, (ctx.get('attachments') as never), fakeAudioProc()) as {
      audio: { duration_s?: number, streams: Array<{ sample_rate?: number, channels?: number }> }
    }
    assert.deepEqual(thinOut.audio.streams, [{ codec: 'pcm', codec_type: 'audio' }])
    const thinText = (meliteView(ctx, fakeAudioProc()).output!.render!({} as never, thinOut as never)[0] as { text: string }).text
    assert.ok(!thinText.includes('undefined') && !thinText.includes('Hz') && !thinText.includes('ch)'), thinText)
    // a real RIFF/WAVE whose data chunk is missing: the stream row
    // reads, the duration stays ABSENT (never a fabricated zero)
    const nodata = join(root, 'output', 'run-e3e3e3-nodata')
    mkdirSync(nodata, { recursive: true })
    const fmtOnly = Buffer.concat([
      Buffer.from('RIFF'), Buffer.from([36, 0, 0, 0]), Buffer.from('WAVE'),
      Buffer.from('fmt '), Buffer.from([16, 0, 0, 0]),
      Buffer.from([1, 0, 1, 0]), Buffer.from([0x40, 0x1f, 0, 0]),
      Buffer.from([0x80, 0x3e, 0, 0]), Buffer.from([2, 0, 16, 0]),
    ])
    writeFileSync(join(nodata, 'line.wav'), fmtOnly)
    const bare = await viewAudioArtifact({ stateRoot: root } as never, 'run-e3e3e3-nodata', 'line.wav', visualExec as never, ctx, (ctx.get('attachments') as never), fakeAudioProc()) as {
      audio: { duration_s?: number, size_bytes?: number, streams: Array<{ sample_rate?: number, channels?: number }> }
    }
    // the LENGTH is unknown (no data chunk) and stays absent; the SIZE
    // is known (we just read the file) and is published
    assert.equal('duration_s' in bare.audio, false)
    assert.equal(bare.audio.size_bytes, 36)
    assert.deepEqual(bare.audio.streams, [{ codec: 'pcm_s16le', codec_type: 'audio', sample_rate: 8000, channels: 1 }])
    // THE AUDIO RENDER, the twin of the film's: the probe verdict leads
    // the text and the waveform sheet is named as the image
    const tool = meliteView(ctx, fakeAudioProc())
    const rendered = await call(fakeAudioProc())
    const blocks = tool.output!.render!({} as never, rendered as never)
    const text = (blocks[0] as { text: string }).text
    assert.ok(text.startsWith('melite_view audio: '), text)
    assert.ok(text.includes('line.wav') && text.includes('0.5s') && text.includes('8000Hz') && text.includes('1ch') && text.includes('waveform sheet:'), text)
    assert.equal((blocks[1] as { type: string }).type, 'image')
    // and the SAME render on a bare probe: the optional clauses stay
    // off the sentence (no "undefined", no fake zeros)
    const bareText = (tool.output!.render!({} as never, bare as never)[0] as { text: string }).text
    assert.ok(bareText.startsWith('melite_view audio: '), bareText)
    assert.ok(!bareText.includes('undefined') && !bareText.includes('NaN'), bareText)
    assert.ok(bareText.includes('streams: pcm_s16le 8000Hz 1ch'), bareText)
    void attachments
  })
})

describe('melite_view — the bytes-are-truth law (035 attempt-16 gap #5)', () => {
  beforeAll(() => {
    // a JPEG-bytes file under a .png name — the exact disagreement shape
    const edge = join(root, 'output', 'run-abcd99-mix')
    writeFileSync(join(edge, 'liar.png'), new Uint8Array([255, 216, 255, 224, 0, 0]))
    utimesSync(join(edge, 'liar.png'), new Date('2026-01-04T00:00:00Z'), new Date('2026-01-04T00:00:00Z'))
  })

  test('a signature disagreeing with the extension voices the SNIFF (bytes are truth)', async () => {
    const { ctx, attachments } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-abcd99-mix', artifact: 'liar.png' }, visualExec as never) as ViewedImageValue
    assert.equal(out.image!.mediaType, 'image/jpeg')
    assert.equal(attachments.saved[0]!.mediaType, 'image/jpeg')
  })

  test('the TEXT-ONLY twins: the sniff verdict rides in text, and a lying extension is NAMED', async () => {
    // a non-visual route still gets the sniff law in prose: the
    // un-sniffable svg states "not sniffed", a rescued PNG under an
    // svg name prints the sniffed type, and the liar's disagreement
    // is spelled out — the bytes win, even when only text is served
    const { ctx, attachments } = fakeCtx({ visual: false })
    const tool = meliteView(ctx)
    const plain = await tool.execute({ run_id: 'run-abcd99-mix', artifact: 'plain.svg' }, visualExec as never)
    assert.match(String((plain as { textObservation?: unknown }).textObservation), /format not sniffed/)
    const rescued = await tool.execute({ run_id: 'run-abcd99-mix', artifact: 'rescued.svg' }, visualExec as never)
    const rescuedText = String((rescued as { textObservation?: unknown }).textObservation)
    assert.match(rescuedText, /image\/png/)
    assert.doesNotMatch(rescuedText, /bytes win/, 'nothing disagrees: the svg extension declares no image type at all')
    const liar = await tool.execute({ run_id: 'run-abcd99-mix', artifact: 'liar.png' }, visualExec as never)
    assert.match(
      String((liar as { textObservation?: unknown }).textObservation),
      /the extension declares image\/png and the BYTES say image\/jpeg — the bytes win/,
    )
    assert.equal(attachments.saved.length, 0, 'a text-only route attaches nothing')
  })
});

describe('melite_view — the stripped containers (a probe that states only what it knows)', () => {
  // hand-built MP4s with the MINIMUM legal track: a handler naming the
  // kind, a sample entry too short to carry geometry or rate — no
  // tkhd, no stts, no mvhd. The probe publishes codec alone, and the
  // text observations must state that row without inventing dims,
  // rates, durations, or frame counts (no "undefined", no zeros).
  const box = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, out.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8)
    return out
  }
  const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
  const hdlr = (fourcc: string): Uint8Array =>
    box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, ...fourcc.split('').map((c) => c.charCodeAt(0)), ...new Uint8Array(12)]))
  /** the sample entry stops after reserved+dri: the geometry/rate
   * readers run past the end and state nothing rather than guessing */
  const bareEntry = (type: string): Uint8Array => box(type, new Uint8Array(8))
  const strippedMp4 = (fourcc: string, entryType: string): Uint8Array => {
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...bareEntry(entryType)]))
    const stbl = box('stbl', stsd)
    const minf = box('minf', stbl)
    const mdia = box('mdia', new Uint8Array([...hdlr(fourcc), ...minf]))
    const moov = box('moov', box('trak', mdia))
    return new Uint8Array([...box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0])), ...moov])
  }

  beforeAll(() => {
    // the runs: one video-kind file, one audio-kind file — the walk
    // needs real names on disk; the read seam below serves the bytes
    const filmRun = join(root, 'output', 'run-5e1111-strip')
    mkdirSync(filmRun, { recursive: true })
    writeFileSync(join(filmRun, 'strip.mp4'), new Uint8Array(8))
    const audioRun = join(root, 'output', 'run-5e2222-strip')
    mkdirSync(audioRun, { recursive: true })
    writeFileSync(join(audioRun, 'strip.mp3'), new Uint8Array(8))
  })

  test('a film probe with no geometry/duration states the bare codec row', async () => {
    const { ctx, attachments } = fakeCtx({ visual: false })
    const bytes = strippedMp4('vide', 'avc1')
    const read = async (): Promise<Uint8Array> => bytes
    const out = await viewFilmArtifact(
      { stateRoot: root } as never, 'run-5e1111-strip', 'strip.mp4', visualExec as never, ctx,
      ctx.get('attachments') as never, undefined as never, read,
    )
    const text = String(out.textObservation)
    assert.match(text, new RegExp('melite_view film: strip\\.mp4, ' + String(bytes.length) + ' bytes, streams: h264; TEXT-ONLY'), 'the row carries codec alone — no dims, no fps, no frames, no duration')
    assert.ok(!text.includes('undefined') && !text.includes('NaN'), text)
    assert.equal(attachments.saved.length, 0)
  })

  test('an audio probe with no rate/channels/duration states the bare codec row', async () => {
    const { ctx, attachments } = fakeCtx({ visual: false })
    const { viewAudioArtifact } = await import('../src/tools/melite-view.ts')
    const bytes = strippedMp4('soun', 'mp4a')
    const read = async (): Promise<Uint8Array> => bytes
    const out = await viewAudioArtifact(
      { stateRoot: root } as never, 'run-5e2222-strip', 'strip.mp3', visualExec as never, ctx,
      ctx.get('attachments') as never, undefined as never, read,
    )
    const text = String(out.textObservation)
    assert.match(text, new RegExp('melite_view audio: strip\\.mp3, ' + String(bytes.length) + ' bytes, streams: aac; TEXT-ONLY'), 'the row carries codec alone — no rate, no channels, no duration')
    assert.ok(!text.includes('undefined') && !text.includes('NaN'), text)
    assert.equal(attachments.saved.length, 0)
  })
})

describe('melite_view — the route micro-arms (every fallback has an owner)', () => {
  test('a session header WITHOUT provider/model falls to the agent options', async () => {
    // the header exists but its config names no route: the ?? second
    // arm reads the options seat — the route is still resolvable
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    const halfHeaderExec = {
      signal: AbortSignal.timeout(15_000),
      agent: {
        session: { requestHeader: () => ({ config: {} }) },
        options: { provider: 'zai', model: 'glm-5v-turbo' },
      },
    }
    const out = await tool.execute({ run_id: 'run-abc123-hero' }, halfHeaderExec as never) as ViewedImageValue
    assert.equal(out.image!.attachmentId, 'att_1')
  })

  test('a text-only value RENDERS as one text block (no image block is fabricated)', async () => {
    // the render seam's textObservation arm: the value carries no
    // image, and the render says so in prose instead of pairing a
    // fabricated block
    const { ctx } = fakeCtx({ visual: false })
    const tool = meliteView(ctx)
    const value = await tool.execute({ run_id: 'run-face001-wide' }, visualExec as never)
    const blocks = tool.output!.render!({} as never, value as never)
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0]!.type, 'text')
    assert.match((blocks[0] as { text: string }).text, /TEXT-ONLY observation/)
  })
})
