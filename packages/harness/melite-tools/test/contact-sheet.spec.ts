// melite_contact_sheet walls (B9, promgen handoff 2026-11-17): the
// sweep judge's ONE call — N run ids × an artifact filter → ONE
// labeled grid PNG. The runs tree is REAL (a tmp dir, controlled
// mtimes), the fixture images are REAL PNGs minted through sharp
// itself (the composer's own binary), and the composed sheet is
// judged at PIXEL level — the judgment surface is the picture, so
// the wall decodes it and samples cells. Refusals are loud and
// named (empty list, cap, grammar, no store, no seat, blind route,
// all-missing with the searched-roots voice, byte cap) — never a
// silent miss. A run without an image artifact is a GRAY LABELED
// CELL (a sweep's failures are the data being judged), and the
// value/render NAME the missing runs — never imply them.
// @contract flows-contact-sheet-door
import { describe, test, beforeAll, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import { meliteContactSheet } from '../src/tools/contact-sheet.ts'
import type { ContactSheetValue } from '../src/tools/contact-sheet.ts'

// ── fixtures: a real runs tree, real PNGs (sharp-minted) ───────────

let root = ''
/** 64×64 solid PNGs — distinct colors so the cell sample is proof
 *  the sheet carries THE run's own image (not a neighbor's, not a
 *  placeholder). */
const RED = { create: { width: 64, height: 64, channels: 3 as const, background: '#cc0000' } }
const BLUE = { create: { width: 64, height: 64, channels: 3 as const, background: '#0000cc' } }
const GREEN = { create: { width: 64, height: 64, channels: 3 as const, background: '#00cc00' } }
const png = async (spec: typeof RED): Promise<Buffer> => await sharp(spec).png().toBuffer()

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'melite-sheet-'))
  // run-aa-red: TWO images — newest wins by mtime (red newer)
  const aa = join(root, 'output', 'run-aa-red')
  mkdirSync(aa, { recursive: true })
  writeFileSync(join(aa, 'gen_00001_.png'), await png(BLUE))
  writeFileSync(join(aa, 'gen_00002_.png'), await png(RED))
  utimesSync(join(aa, 'gen_00001_.png'), new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))
  utimesSync(join(aa, 'gen_00002_.png'), new Date('2026-01-02T00:00:00Z'), new Date('2026-01-02T00:00:00Z'))
  // run-bb-green: ONE image
  const bb = join(root, 'output', 'run-bb-green')
  mkdirSync(bb, { recursive: true })
  writeFileSync(join(bb, 'gen_00001_.png'), await png(GREEN))
  // run-cc-none: a finished run with NO image artifacts (its failure
  // is the sweep's data — the gray cell)
  const cc = join(root, 'output', 'run-cc-none')
  mkdirSync(cc, { recursive: true })
  writeFileSync(join(cc, 'params.json'), '{"seed":1}')
  // run-dd-test: a test:true start — the artifact lives under
  // test-output/, and the reader must walk BOTH leaves (the serve
  // arm's law; an output/-only read grayed every test run's cell)
  const dd = join(root, 'test-output', 'run-dd-test')
  mkdirSync(dd, { recursive: true })
  writeFileSync(join(dd, 'gen_00001_.png'), await png(BLUE))
  // run-ee-garbage: the walk lists it (a .png leaf) but the bytes do
  // not decode — an honest gray cell labeled "unreadable"
  const ee = join(root, 'output', 'run-ee-garbage')
  mkdirSync(ee, { recursive: true })
  writeFileSync(join(ee, 'gen_00001_.png'), Buffer.from('not a png at all'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

// ── the seats (melite-view.spec's structural fakes, mirrored) ─────

interface SavedRow { data: Uint8Array, mediaType: string, name?: string }
const saved: SavedRow[] = []

function fakeCtx(opts?: {
  store?: false
  seat?: false
  visual?: boolean
  llm?: false
  byteCap?: number
  maxDimension?: number
  maxPixels?: number
  extras?: string[]
}) {
  saved.length = 0
  const attachments = {
    saveImage: async (input: { data: Uint8Array, mediaType: ImageMediaType, name?: string }): Promise<ImageAttachmentRef> => {
      saved.push({ data: input.data, mediaType: input.mediaType, name: input.name })
      const n = saved.length
      return {
        attachmentId: 'att_' + String(n),
        mediaType: input.mediaType,
        bytes: input.data.byteLength,
        width: 8,
        height: 8,
        ...(input.name === undefined ? {} : { name: input.name }),
      } as ImageAttachmentRef
    },
    imageLimits: {
      maxImageBytes: opts?.byteCap ?? 10_000_000,
      maxMessageImageBytes: opts?.byteCap ?? 10_000_000,
      maxImageDimension: opts?.maxDimension ?? 8000,
      maxImagePixels: opts?.maxPixels ?? 30_000_000,
      mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as ImageMediaType[],
    },
  }
  const queue = { stateRoot: root, stateRoots: opts?.extras ?? [] }
  const llm = {
    resolveModelInfo: async () => ({
      inputModalities: (opts?.visual === false ? ['text'] : ['text', 'image']) as string[],
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
  return ctx as unknown as Context
}

/** A vision-routed session (the route gate's happy path). */
const visualExec = {
  signal: AbortSignal.timeout(15_000),
  agent: {
    session: { requestHeader: () => ({ config: { provider: 'zai', model: 'glm-5v-turbo' } }) },
    options: {},
  },
}

/** Decode the saved sheet and sample one pixel (the judgment surface
 *  is the picture — the wall judges it as one).
 *  @param data the committed PNG bytes.
 *  @param x the pixel column.
 *  @param y the pixel row. */
async function pixel(data: Uint8Array, x: number, y: number): Promise<[number, number, number]> {
  const { data: raw, info } = await sharp(Buffer.from(data)).raw().toBuffer({ resolveWithObject: true })
  const i = (y * info.width + x) * info.channels
  return [raw[i] ?? 0, raw[i + 1] ?? 0, raw[i + 2] ?? 0]
}

const DEFAULT_CELL = 384
const LABEL_H = 34

// ── the walls ──────────────────────────────────────────────────────

describe('melite_contact_sheet execute — the sweep judge\'s one call', () => {
  test('N runs → ONE committed PNG: rows carry artifact/url/host, the missing run is NAMED, render pairs text + image', async () => {
    const ctx = fakeCtx()
    const tool = meliteContactSheet(ctx)
    const out = await tool.execute(
      { run_ids: ['run-aa-red', 'run-bb-green', 'run-cc-none'] },
      visualExec as never,
    ) as ContactSheetValue
    assert.equal(saved.length, 1, 'ONE attachment — the whole sweep in one image')
    assert.equal(saved[0]!.mediaType, 'image/png')
    assert.equal(saved[0]!.name, 'contact-sheet-3-runs.png')
    assert.equal(out.runs.length, 3)
    assert.equal(out.runs[0]!.run_id, 'run-aa-red')
    assert.equal(out.runs[0]!.artifact, 'gen_00002_.png', 'the NEWEST image wins (mtime, the view door\'s pick)')
    assert.equal(out.runs[0]!.url, '/melite-media/runs/run-aa-red/gen_00002_.png')
    assert.equal(out.runs[0]!.host, join(root, 'output', 'run-aa-red', 'gen_00002_.png'), 'the host-path voice (F7\'s twin — an ls-able path)')
    assert.equal(out.runs[2]!.missing, true, 'the failed run is judgment data: NAMED, never dropped')
    // THE RENDER (melite_view's pairing): one text block naming the
    // gray cells + one image block re-branded from the durable ref
    const blocks = tool.output!.render!({} as never, out as never)
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0]!.type, 'text')
    const text = (blocks[0] as { text: string }).text
    assert.ok(text.includes('3 runs'))
    assert.ok(text.includes('no image artifact: run-cc-none (gray cells)'), 'the render prints the missing runs')
    const img = blocks[1] as { type: string, attachment: { attachmentId: string, mediaType: string } }
    assert.equal(img.type, 'image')
    assert.equal(img.attachment.attachmentId, 'att_1')
    assert.equal(img.attachment.mediaType, 'image/png')
  })

  test('THE JUDGMENT SURFACE IS THE PICTURE: cell pixels carry each run\'s own image; the missing run is a gray cell', async () => {
    const ctx = fakeCtx()
    const tool = meliteContactSheet(ctx)
    const out = await tool.execute(
      { run_ids: ['run-aa-red', 'run-bb-green', 'run-cc-none'], columns: 3, cell: 256 },
      visualExec as never,
    ) as ContactSheetValue
    assert.equal(out.columns, 3)
    assert.equal(out.cell, 256)
    const cell = out.cell
    // cell 0 (run-aa-red, red art): image area center is the art's own color
    const red = await pixel(saved[0]!.data, Math.floor(cell / 2), Math.floor(cell / 2))
    assert.ok(red[0]! > 150 && red[1]! < 60 && red[2]! < 60, 'cell 0 samples RED (the run\'s newest image), got ' + String(red))
    // cell 1 (run-bb-green): green
    const green = await pixel(saved[0]!.data, cell + Math.floor(cell / 2), Math.floor(cell / 2))
    assert.ok(green[1]! > 150 && green[0]! < 60 && green[2]! < 60, 'cell 1 samples GREEN, got ' + String(green))
    // cell 2 (run-cc-none): the flat gray (#585858)
    const gray = await pixel(saved[0]!.data, 2 * cell + Math.floor(cell / 2), Math.floor(cell / 2))
    assert.ok(Math.abs(gray[0]! - 88) < 12 && Math.abs(gray[1]! - 88) < 12 && Math.abs(gray[2]! - 88) < 12, 'cell 2 is the GRAY missing cell, got ' + String(gray))
    // THE LABEL STRIP: below every cell — dark label background (#3a3a3a)
    const label = await pixel(saved[0]!.data, Math.floor(cell / 2), cell + Math.floor(LABEL_H / 2))
    assert.ok(Math.abs(label[0]! - 58) < 12 && Math.abs(label[1]! - 58) < 12, 'the label strip rides under the art, got ' + String(label))
    // sheet geometry: columns × (cell + label) — the store's echo is
    // the fake's; the PNG's own metadata is the truth
    const meta = await sharp(Buffer.from(saved[0]!.data)).metadata()
    assert.equal(meta.width, 3 * cell)
    assert.equal(meta.height, cell + LABEL_H)
  })

  test('the artifact filter narrows per-run (the view door\'s matcher): naming the older spelling picks it', async () => {
    const ctx = fakeCtx()
    const tool = meliteContactSheet(ctx)
    const out = await tool.execute(
      { run_ids: ['run-aa-red'], artifact: 'gen_00001' },
      visualExec as never,
    ) as ContactSheetValue
    assert.equal(out.runs[0]!.artifact, 'gen_00001_.png', 'the filter overrode the newest pick')
  })

  test('THE TEST-TREE ARM: an artifact under test-output/ is read (both leaves, the serve arm\'s law)', async () => {
    const ctx = fakeCtx()
    const tool = meliteContactSheet(ctx)
    const out = await tool.execute({ run_ids: ['run-dd-test'] }, visualExec as never) as ContactSheetValue
    assert.equal(out.runs[0]!.artifact, 'gen_00001_.png')
    assert.equal(out.runs[0]!.host, join(root, 'test-output', 'run-dd-test', 'gen_00001_.png'))
  })

  test('undecodable bytes are an honest gray cell — the row keeps its artifact, the sheet still commits', async () => {
    const ctx = fakeCtx()
    const tool = meliteContactSheet(ctx)
    const out = await tool.execute({ run_ids: ['run-ee-garbage', 'run-bb-green'] }, visualExec as never) as ContactSheetValue
    assert.equal(out.runs[0]!.artifact, 'gen_00001_.png', 'the walk found the row')
    assert.equal(out.runs[0]!.host, join(root, 'output', 'run-ee-garbage', 'gen_00001_.png'))
    assert.equal(out.runs[0]!.missing, undefined, 'not a missing run — an unreadable one')
    assert.equal(saved.length, 1, 'the sheet composed anyway: one gray cell, one green cell')
  })

  test('duplicate ids collapse to one cell; the default columns are near-square', async () => {
    const ctx = fakeCtx()
    const tool = meliteContactSheet(ctx)
    const out = await tool.execute(
      { run_ids: ['run-aa-red', 'run-aa-red', 'run-bb-green', 'run-dd-test'] },
      visualExec as never,
    ) as ContactSheetValue
    assert.equal(out.runs.length, 3, 'duplicates collapsed')
    assert.equal(out.columns, Math.ceil(Math.sqrt(3)), 'default columns: near-square')
  })

  test('the sheet shrinks to the store\'s own dimension limit (the limits bind the grid, never the caller)', async () => {
    const ctx = fakeCtx({ maxDimension: 400 })
    const tool = meliteContactSheet(ctx)
    const out = await tool.execute({ run_ids: ['run-bb-green'], cell: 768 }, visualExec as never) as ContactSheetValue
    assert.ok(out.cell < 768, 'the cell clamped down')
    assert.ok(out.cell <= 400, 'and inside the dimension cap')
    const meta = await sharp(Buffer.from(saved[0]!.data)).metadata()
    assert.ok(meta.width! <= 400 && meta.height! <= 400 + LABEL_H)
  })
})

describe('melite_contact_sheet refusals — loud and named', () => {
  test('an empty run_ids refuses (never a sheet of nothing)', async () => {
    const tool = meliteContactSheet(fakeCtx())
    await assert.rejects(
      tool.execute({ run_ids: [] }, visualExec as never) as never,
      /run_ids is empty — name the 1-36 estate runs to judge/,
    )
  })

  test('over 36 runs refuses (the sweep cap names its law)', async () => {
    const tool = meliteContactSheet(fakeCtx())
    const ids = Array.from({ length: 37 }, (_, i) => 'run-' + String(i).padStart(4, '0') + '-x')
    await assert.rejects(
      tool.execute({ run_ids: ids }, visualExec as never) as never,
      /carries 37 runs — the sheet caps at 36 cells \(split the sweep into two calls\)/,
    )
  })

  test('a typo\'d id refuses WITH ITS INDEX (grammar gate — a wrong id would judge a wrong cell)', async () => {
    const tool = meliteContactSheet(fakeCtx())
    await assert.rejects(
      tool.execute({ run_ids: ['run-aa-red', 'knight-24'] }, visualExec as never) as never,
      /run_ids\[1\] "knight-24" is not a run id — a run id is a "run-…" directory name/,
    )
  })

  test('NO run holding an image refuses (a sheet of gray judges nothing) and names the searched roots', async () => {
    const tool = meliteContactSheet(fakeCtx({ extras: ['/tmp/other-root'] }))
    await assert.rejects(
      tool.execute({ run_ids: ['run-cc-none'] }, visualExec as never) as never,
      new RegExp('none of the 1 runs hold an image artifact.*\\(searched ' + root.replace(/\//g, '\\/') + ', /tmp/other-root\\)'),
    )
  })

  test('no attachment store refuses before any walk', async () => {
    const tool = meliteContactSheet(fakeCtx({ store: false }))
    await assert.rejects(
      tool.execute({ run_ids: ['run-aa-red'] }, visualExec as never) as never,
      /no attachment service is mounted — the sheet commits as an image attachment/,
    )
  })

  test('no queue seat refuses (the seat owns the runs tree root)', async () => {
    const tool = meliteContactSheet(fakeCtx({ seat: false }))
    await assert.rejects(
      tool.execute({ run_ids: ['run-aa-red'] }, visualExec as never) as never,
      /the queue seat owns the runs tree root — mount @melite-plugin\/dsh-estate/,
    )
  })

  test('a text-only route refuses BEFORE any filesystem work (the sheet is pixels; there is no text arm)', async () => {
    const tool = meliteContactSheet(fakeCtx({ visual: false }))
    await assert.rejects(
      tool.execute({ run_ids: ['run-aa-red'] }, visualExec as never) as never,
      /declares no image input — the sheet is one image for the model to see/,
    )
    assert.equal(saved.length, 0)
  })

  test('over the store\'s byte cap, the composed sheet refuses to commit', async () => {
    const tool = meliteContactSheet(fakeCtx({ byteCap: 64 }))
    await assert.rejects(
      tool.execute({ run_ids: ['run-bb-green'] }, visualExec as never) as never,
      /bytes — over the 64-byte image cap \(shrink the cell or split the sweep into two calls\)/,
    )
    assert.equal(saved.length, 0)
  })

  // the render boundary's own refusal tails (the JsonValue narrow the
  // tool contract hands the renderer): every malformed saved value is
  // refused BY NAME at the render door — never rendered as a broken
  // sheet.
  test('the render narrow refuses every malformed saved value by name — object, runs, image, grid, ref key', () => {
    const tool = meliteContactSheet(fakeCtx())
    const render = tool.output!.render!
    assert.throws(() => render({} as never, 'a bare string' as never), /the run value is not an object/)
    assert.throws(() => render({} as never, {} as never), /the value carries no runs array/)
    assert.throws(() => render({} as never, { runs: [], image: 5 } as never), /the value carries no image object/)
    assert.throws(() => render({} as never, { runs: [], image: {}, columns: '3', cell: 4 } as never), /the value carries no grid counts/)
    assert.throws(
      () => render({} as never, { runs: [], image: { attachmentId: 'a', mediaType: 'm', bytes: 1, width: 2 }, columns: 1, cell: 4 } as never),
      /the image ref carries no height/,
    )
  })

  // the concurrency law's own face: the sheet only READS the runs tree
  // and the store — the harness may fan it out with its siblings.
  test('the tool declares itself concurrency-safe (a read-only sweep)', () => {
    const tool = meliteContactSheet(fakeCtx()) as { isConcurrencySafe?: (args: unknown) => boolean }
    assert.ok(typeof tool.isConcurrencySafe === 'function', 'the face is served')
    // valid args (the wrapper soft-gates junk — the defineTool
    // conversion-invariance law, melite-view's twin arm)
    assert.equal(tool.isConcurrencySafe!({ run_ids: ['run-aa-red'] } as never), true)
  })

  // a row that lists but cannot be read (mode 000 — the walk finds
  // the file, both leaf reads miss with EACCES): the cell goes gray
  // through the named-null path — a raced/vanished artifact is
  // judgment data, never a crash. A healthy run rides along so the
  // sheet still judges something (the all-gray refusal stands guard).
  test('a listed-but-unreadable row grays through the null read (both leaves miss)', async () => {
    const ff = join(root, 'output', 'run-ff-vanished')
    mkdirSync(ff, { recursive: true })
    const hostile = join(ff, 'gen_00001_.png')
    writeFileSync(hostile, Buffer.from('x'))
    chmodSync(hostile, 0o000)
    try {
      const tool = meliteContactSheet(fakeCtx())
      const out = await tool.execute({ run_ids: ['run-bb-green', 'run-ff-vanished'] }, visualExec as never) as ContactSheetValue
      const row = out.runs.find((r) => r.run_id === 'run-ff-vanished')
      assert.ok(row !== undefined, 'the row is never dropped')
      assert.equal(row.artifact, 'gen_00001_.png', 'the row was listed')
      assert.equal(row.host, undefined, 'the read missed both leaves — the host field stays absent (the named-null path)')
    } finally {
      rmSync(ff, { recursive: true, force: true })
    }
  })

  // the label is SVG and the run id is its text: the GRAMMAR gate is
  // the guard (a markup-bearing id can never reach the label — the
  // escape in the label builder is defense-in-depth behind it, and
  // its tails stay uncovered past the gate by design).
  test('a markup-bearing run id is refused at the grammar gate — it can never reach the SVG label', async () => {
    const tool = meliteContactSheet(fakeCtx())
    await assert.rejects(
      tool.execute({ run_ids: ['run-zz<a>&b'] }, visualExec as never) as never,
      /is not a run id — a run id is a "run-…" directory name/,
    )
    assert.equal(saved.length, 0, 'nothing composed — the refusal precedes the walk')
  })
})

describe('melite_contact_sheet presentation', () => {
  test('presentCall titles the sweep (a generic read card, the run count named)', () => {
    const tool = meliteContactSheet(fakeCtx())
    const present = tool.presentCall
    assert.ok(present !== undefined, 'the tool serves its presentCall face')
    const view = present({ run_ids: ['run-aa-red', 'run-bb-green'] } as never)
    assert.ok(view !== undefined, 'the call renders a view')
    if (view.card !== 'generic') throw new Error('the sweep card is generic, saw ' + view.card)
    assert.equal(view.kind, 'read')
    assert.ok(view.title.includes('2 runs'), 'the title carries the sweep size')
  })
})
