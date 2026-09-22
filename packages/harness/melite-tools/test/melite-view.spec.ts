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
import { meliteView, sniffImageMediaType, imageRefFromValue, viewFilmArtifact, parseProbeSummary, sheetPlan } from '../src/tools/melite-view.ts'
import type { ViewedImageValue, FilmProc } from '../src/tools/melite-view.ts'
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
  signal: AbortSignal.timeout(2000),
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
    assert.equal(out.image.attachmentId, 'att_1')
    assert.equal(out.image.mediaType, 'image/png')
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

  test('a text-only route refuses BEFORE the store commits (the gate)', async () => {
    const { ctx, attachments } = fakeCtx({ visual: false })
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never),
      /does not declare image input/,
    )
    assert.equal(attachments.saved.length, 0)
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
    assert.deepEqual(
      tool.presentCall!({ run_id: 'run-abc123-hero', artifact: 'gen_1' } as never).rawInput,
      { run_id: 'run-abc123-hero', artifact: 'gen_1' },
    )
    assert.deepEqual(
      tool.presentCall!({} as never).rawInput,
      { run_id: undefined, artifact: undefined },
    )
    assert.equal(tool.presentCall!(null as never).title, 'View run artifact')
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
      signal: AbortSignal.timeout(2000),
      agent: { session: { requestHeader: () => undefined }, options: { provider: 'zai', model: 'glm-5v-turbo' } },
    }
    const out = await tool.execute({ run_id: 'run-abc123-hero' }, optionsExec as never) as ViewedImageValue
    assert.equal(out.image.attachmentId, 'att_1')
  })

  test('no route anywhere (agent absent) refuses — never a guess', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    await assert.rejects(
      tool.execute({ run_id: 'run-abc123-hero' }, { signal: AbortSignal.timeout(2000) } as never),
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
    assert.equal(out.image.mediaType, 'image/png')
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
    assert.deepEqual(out.image.originalDimensions, { width: 16, height: 16 })
    // and the render's re-branded ref carries it too
    const blocks = tool.output!.render!({} as never, out as never)
    const img = blocks[1] as { attachment: { originalDimensions?: { width: number } } }
    assert.equal(img.attachment.originalDimensions!.width, 16)
  })

  test('a nameless store ref stays nameless in the value (never an invented name)', async () => {
    const { ctx } = fakeCtx({ nameless: true })
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-abc123-hero' }, visualExec as never) as ViewedImageValue
    assert.equal('name' in out.image, false)
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

describe('melite_view film — the §24 observe arm (real binaries on the committed fixture, fakes for every refusal)', () => {
  const PROBE_FULL = '{"format":{"duration":"2.000000","size":"7670"},"streams":[{"codec_name":"h264","width":160,"height":120,"r_frame_rate":"10/1","nb_frames":"20"}]}'
  // a fake proc: canned probe text, then PNG bytes written to every
  // ffmpeg out path (the tests pin the plumbing, not the pixels —
  // the pixels are proven once against the real binaries above)
  const fakeProc = (opts?: { probe?: string, ffprobeThrow?: unknown, ffmpegThrow?: unknown }): FilmProc =>
    async (bin, args) => {
      if (bin === 'ffprobe') {
        if (opts?.ffprobeThrow !== undefined) throw opts.ffprobeThrow
        return { stdout: opts?.probe ?? PROBE_FULL }
      }
      // true rides the Error voice; any other value is thrown raw
      // (a foreign rejection shape — the door still speaks)
      if (opts?.ffmpegThrow !== undefined) {
        throw opts.ffmpegThrow === true ? new Error('ffmpeg exploded') : opts.ffmpegThrow
      }
      writeFileSync(args[args.length - 1]!, PNG_BYTES)
      return { stdout: '' }
    }

  test('a film run serves probe summary + contact sheet; the run tree stays untouched', async () => {
    const { ctx, attachments } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-face001-wide' }, visualExec as never) as ViewedImageValue
    assert.equal(out.runId, 'run-face001-wide')
    assert.equal(out.url, '/melite-media/runs/run-face001-wide/film.mp4')
    // THE PROBE VERDICT (the §24 gate: duration/streams/frame count
    // pinned on the fixture — h264 160x120 @10fps, 20 frames, 2s)
    assert.equal(out.film!.file, 'film.mp4')
    assert.equal(out.film!.duration_s, 2)
    assert.equal(out.film!.size_bytes, 7670)
    assert.deepEqual(out.film!.streams, [{ codec: 'h264', width: 160, height: 120, fps: '10/1', frames: 20 }])
    assert.equal(out.film!.sheet_of, 4)
    // the viewed image IS the sheet (a real multi-KB PNG, not bytes
    // the test invented)
    assert.equal(out.image.mediaType, 'image/png')
    assert.equal(out.image.name, 'film-sheet.png')
    assert.ok(out.image.bytes > 5000, 'expected a real contact sheet, got ' + String(out.image.bytes) + ' bytes')
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

  test('the artifact substring picks the film; a miss lists the holdings', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    const out = await tool.execute({ run_id: 'run-face001-wide', artifact: 'film' }, visualExec as never) as ViewedImageValue
    assert.equal(out.film!.file, 'film.mp4')
    await assert.rejects(
      tool.execute({ run_id: 'run-face001-wide', artifact: 'nope' }, visualExec as never),
      /has no film artifact containing "nope" — the run holds: film\.mp4/,
    )
  })

  test('a run with neither images nor film keeps the old voice, extended', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
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

  test('a missing ffprobe refuses loud naming the binary (images stay viewable)', async () => {
    const { ctx } = fakeCtx()
    const missing = Object.assign(new Error('spawn ffprobe ENOENT'), { code: 'ENOENT' })
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc({ ffprobeThrow: missing })),
      /ffprobe is not installed on the estate host/,
    )
  })

  test('an unreadable probe refuses with the door voice (never a throw-through)', async () => {
    const { ctx } = fakeCtx()
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc({ probe: 'not json at all' })),
      /cannot view the film "film\.mp4": the film probe returned unparsable output/,
    )
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc({ ffprobeThrow: new Error('boom') })),
      /cannot view the film "film\.mp4": boom/,
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
    await assert.rejects(
      viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never), fakeProc({ ffprobeThrow: 'probe string death' })),
      /cannot view the film "film\.mp4": probe string death/,
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

  test('a duration-less probe plans one early frame; nameless+rich refs ride through', async () => {
    const { ctx } = fakeCtx({ nameless: true, rich: true })
    const out = await viewFilmArtifact({ stateRoot: root }, 'run-face001-wide', '', visualExec as never, ctx, (ctx.get('attachments') as never),
      fakeProc({ probe: '{"streams":[{"codec_name":"h264"}]}' }))
    assert.equal(out.film!.sheet_of, 1)
    assert.equal('duration_s' in out.film!, false)
    assert.equal('size_bytes' in out.film!, false)
    assert.deepEqual(out.film!.streams, [{ codec: 'h264' }])
    assert.equal('name' in out.image, false)
    assert.deepEqual(out.image.originalDimensions, { width: 16, height: 16 })
  })

  test('a width-without-height stream renders without geometry (never a half "160xundefined")', async () => {
    const { ctx } = fakeCtx()
    const tool = meliteView(ctx)
    const text = (tool.output!.render!({} as never, {
      runId: 'run-face001-wide', url: '/melite-media/runs/run-face001-wide/film.mp4',
      image: { attachmentId: 'att_1', mediaType: 'image/png', bytes: 99, width: 8, height: 8 },
      film: { file: 'film.mp4', streams: [{ codec: 'h264', width: 160 }], sheet_of: 1 },
    } as never)[0] as { text: string }).text
    assert.ok(text.includes('h264') && !text.includes('160x') && !text.includes('@') && text.includes('contact sheet of 1'), text)
  })

  test('parseProbeSummary narrows every row; sheetPlan spans or falls back', () => {
    const full = parseProbeSummary(PROBE_FULL)
    assert.equal(full.duration_s, 2)
    assert.equal(full.size_bytes, 7670)
    assert.deepEqual(full.streams, [{ codec: 'h264', width: 160, height: 120, fps: '10/1', frames: 20 }])
    // junk rows skip; junk numbers stay absent; a junk format rides {}
    const mixed = parseProbeSummary('{"format":{"duration":"abc","size":5},"streams":[null,{"width":3},{"codec_name":"aac","nb_frames":""},{"codec_name":"h264","nb_frames":"xx"}]}')
    assert.equal('duration_s' in mixed, false)
    assert.equal('size_bytes' in mixed, false)
    assert.deepEqual(mixed.streams, [{ codec: 'aac' }, { codec: 'h264' }])
    assert.throws(() => parseProbeSummary('{{{'), /unparsable output/)
    assert.throws(() => parseProbeSummary('"just a string"'), /unparsable output/)
    assert.throws(() => parseProbeSummary('{"streams":[]}'), /found no streams/)
    assert.throws(() => parseProbeSummary('{}'), /found no streams/)
    assert.deepEqual(sheetPlan(2), [0.2, 0.8, 1.4, 1.9])
    assert.deepEqual(sheetPlan(undefined), [0.5])
    assert.deepEqual(sheetPlan(Number.NaN), [0.5])
    assert.deepEqual(sheetPlan(0), [0.5])
    assert.deepEqual(sheetPlan(-3), [0.5])
  })
})
