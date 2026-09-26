// melite_read walls (the estate's TEXT observe arm): a run's own text
// files, read through the runs tree the queue seat owns. The runs tree
// here is REAL in a tmp dir; the containment, the vocabularies, the
// caps and every refusal voice are pinned. The read is the point — a
// listing with no body is not a read.

import { describe, test, beforeAll, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { meliteRead, readRunText, listRunText, isTextName, assertRunId, TEXT_BYTE_CAP } from '../src/tools/melite-read.ts'
import type { Context } from '@deepseek-ai/cordis'

let root = ''

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'melite-read-'))
  const run = join(root, 'output', 'run-ab12cd-side')
  mkdirSync(join(run, 'h3-film'), { recursive: true })
  writeFileSync(join(run, '_request.json'), JSON.stringify({ model: 'h3', calls: [{ text: 'a shot' }] }))
  writeFileSync(join(run, '_flow.json'), JSON.stringify({ compose_echo: { seam: 'carry,cut' } }))
  writeFileSync(join(run, 'STATE.md'), '# attempt 034\nlast run_id: run-ab12cd-side\n')
  writeFileSync(join(run, 'h3-film', 'window_01_video.mp4'), Buffer.from([0, 0, 0, 1, 2, 3]))
  writeFileSync(join(run, 'h3-film', 'mix.flac'), Buffer.from('RIFFfake'))
  // a binary wearing a text extension — the sniff must catch it
  writeFileSync(join(run, 'looks-text.json'), Buffer.from([0x7b, 0x00, 0x01, 0x02]))
  // a run with no text at all
  const bare = join(root, 'output', 'run-ff00aa-bare')
  mkdirSync(bare, { recursive: true })
  writeFileSync(join(bare, 'only.png'), Buffer.from([137, 80, 78, 71]))
  // a run whose text file links OUT of the estate
  const escape = join(root, 'output', 'run-0a0b0c-escape')
  mkdirSync(escape, { recursive: true })
  writeFileSync(join(root, 'secret.txt'), 'not yours')
  symlinkSync(join(root, 'secret.txt'), join(escape, 'leak.txt'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

function ctx(seat?: { stateRoot: string }): Context {
  return { get: (name: string): unknown => (name === 'queue' ? (seat ?? { stateRoot: root }) : undefined) } as unknown as Context
}

describe('the run-id gate (containment, melite_view\'s grammar verbatim)', () => {
  test('a run id is run-<hex>-<token>; everything else refuses naming the grammar', () => {
    assertRunId('run-ab12cd-side')
    assert.throws(() => assertRunId('../../etc/passwd'), /is not a run id/)
    assert.throws(() => assertRunId('run-'), /is not a run id/)
    assert.throws(() => assertRunId('sidecar'), /is not a run id/)
  })
})

describe('the text vocabulary (media is melite_view\'s door, never this one)', () => {
  test('sidecar extensions answer; media, checkpoints, and extensionless files do not', () => {
    assert.ok(isTextName('_request.json'))
    assert.ok(isTextName('STATE.md'))
    assert.ok(isTextName('run.jsonl'))
    assert.ok(isTextName('LOG.YAML'))
    assert.ok(!isTextName('mix.flac'))
    assert.ok(!isTextName('window_01_video.mp4'))
    assert.ok(!isTextName('unet.safetensors'))
    assert.ok(!isTextName('Makefile'))
  })
})

describe('listRunText (the discovery arm)', () => {
  test('walks the run tree depth-bounded, newest grammar rows only, media excluded', async () => {
    const rows = await listRunText(join(root, 'output', 'run-ab12cd-side'))
    const paths = rows.map((r) => r.path).sort()
    assert.deepEqual(paths, ['STATE.md', '_flow.json', '_request.json', 'looks-text.json'])
    assert.ok(rows.every((r) => typeof r.bytes === 'number' && r.bytes >= 0))
  })

  test('a media-only run reads as no text files, and a missing dir as empty', async () => {
    assert.deepEqual(await listRunText(join(root, 'output', 'run-ff00aa-bare')), [])
    assert.deepEqual(await listRunText(join(root, 'output', 'run-nope-nope')), [])
    // a non-directory and an unreadable subtree read empty (the walk
    // tolerates a raced/odd tree, never throws)
    // a non-directory reads empty (the walk tolerates an odd tree)
    assert.deepEqual(await listRunText(join(root, 'secret.txt')), [])
    // a PARENT directory walks one level of runs and still stops at
    // the depth bound (its media rows never appear)
    const fromParent = await listRunText(join(root, 'output'))
    assert.ok(fromParent.some((r) => r.path === 'run-ab12cd-side/_request.json'), 'the walk descends a level')
    assert.ok(!fromParent.some((r) => r.path.endsWith('.mp4')), 'media never rides this door')
  })

  test('a DANGLING link is still a row (the read names it, the walk never drops it)', async () => {
    const dangling = join(root, 'output', 'run-dd11ee-dangle')
    mkdirSync(dangling, { recursive: true })
    symlinkSync(join(root, 'gone.txt'), join(dangling, 'ghost.md'))
    const rows = await listRunText(dangling)
    assert.deepEqual(rows.map((r) => r.path), ['ghost.md'])
    assert.equal(rows[0]!.bytes, 0, 'an unstattable link lists as 0 bytes, not as a missing row')
  })

  test('the DEPTH bound holds (a nested run tree stops at run/stage/file)', async () => {
    const deep = join(root, 'output', 'run-f0f0f0-deep')
    mkdirSync(join(deep, 'a', 'b', 'c'), { recursive: true })
    writeFileSync(join(deep, 'top.json'), '{}')
    writeFileSync(join(deep, 'a', 'one.json'), '{}')
    writeFileSync(join(deep, 'a', 'b', 'two.json'), '{}')
    writeFileSync(join(deep, 'a', 'b', 'c', 'three.json'), '{}')
    const paths = (await listRunText(deep)).map((r) => r.path).sort()
    assert.deepEqual(paths, ['a/b/two.json', 'a/one.json', 'top.json'], 'the fourth level is out of bounds')
  })

  test('the listing CAP holds (a pathological run is capped, never unbounded)', async () => {
    const many = join(root, 'output', 'run-e2e2e-many')
    mkdirSync(many, { recursive: true })
    // three subtrees of 120: whichever order the walk meets them, the
    // second saturates the cap in-loop and the third enters the walk
    // with it already full — both halves of the bound are exercised
    for (const sub of ['a', 'b', 'c']) {
      mkdirSync(join(many, sub), { recursive: true })
      for (let i = 0; i < 120; i++) writeFileSync(join(many, sub, 'row-' + String(i) + '.json'), '{}')
    }
    const rows = await listRunText(many)
    assert.equal(rows.length, 200, 'the cap is the door\'s own ROW_CAP')
  })
})

describe('melite_read — the read arm', () => {
  test('reads a run sidecar verbatim (the body rides — that IS the door)', async () => {
    const out = await readRunText({ stateRoot: root }, 'run-ab12cd-side', '_request.json')
    assert.equal(out.runId, 'run-ab12cd-side')
    assert.equal(out.path, '_request.json')
    assert.deepEqual(JSON.parse(out.text!), { model: 'h3', calls: [{ text: 'a shot' }] })
    assert.equal(out.bytes, Buffer.byteLength(out.text!))
  })

  test('a substring filter finds a nested row; the resolved path is the walk\'s own', async () => {
    const out = await readRunText({ stateRoot: root }, 'run-ab12cd-side', 'STATE')
    assert.equal(out.path, 'STATE.md')
    assert.ok(out.text!.includes('attempt 034'))
  })

  test('the listing arm names every readable file with its size', async () => {
    const out = await readRunText({ stateRoot: root }, 'run-ab12cd-side', '')
    assert.ok(out.files!.includes('_request.json ('))
    assert.ok(out.files!.includes('STATE.md ('))
    assert.ok(!out.files!.includes('mp4'), 'media never rides this door')
  })

  test('the render speaks both arms (a listing with no body is not a read)', async () => {
    const tool = meliteRead(ctx())
    const listing = await tool.execute({ run_id: 'run-ab12cd-side' }, {} as never)
    const listText = (tool.output!.render!({} as never, listing as never)[0] as { text: string }).text
    assert.ok(listText.startsWith('melite_read run-ab12cd-side text files: '), listText)
    const read = await tool.execute({ run_id: 'run-ab12cd-side', path: '_flow.json' }, {} as never)
    const readText = (tool.output!.render!({} as never, read as never)[0] as { text: string }).text
    assert.ok(readText.includes('compose_echo'), readText)
  })

  test('presentCall names the run and rides the read kind', async () => {
    const tool = meliteRead(ctx())
    const view = tool.presentCall!({ run_id: 'run-ab12cd-side', path: '_flow.json' })!
    assert.equal(view.kind, 'read')
    assert.equal(view.title, 'Read run file run-ab12cd-side')
    assert.deepEqual(view.rawInput, { run_id: 'run-ab12cd-side', path: '_flow.json' })
    // no path → the listing arm's own card
    assert.deepEqual(tool.presentCall!({ run_id: 'run-ab12cd-side' })!.rawInput, { run_id: 'run-ab12cd-side' })
    assert.equal(tool.presentCall!({})!.title, 'Read run file ?')
    // junk args render the generic card, never a throw
    assert.equal(tool.presentCall!(null)!.title, 'Read run file ?')
    // the tool declares itself concurrency-safe for VALID args (the
    // wrapper soft-gates: invalid args read as exclusive, never parallel)
    assert.equal(tool.isConcurrencySafe!({ run_id: 'run-ab12cd-side' }), true)
    assert.equal(tool.isConcurrencySafe!({}), false)
  })
})

describe('melite_read — every refusal speaks (never a bare miss, never a silent skip)', () => {
  test('an unknown run names the searched roots', async () => {
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-000000-absent', ''),
      /run "run-000000-absent" is not in the runs tree/,
    )
  })

  test('a path miss lists what the run DOES hold', async () => {
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-ab12cd-side', 'nope.json'),
      /has no text file matching that path — the run holds: /,
    )
  })

  test('an ambiguous filter refuses naming every candidate (never a silent pick)', async () => {
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-ab12cd-side', '.json'),
      /matches 3 text files in run "run-ab12cd-side" — name one exactly: _flow\.json, _request\.json/,
    )
  })

  test('a media-only run on the listing arm says so', async () => {
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-ff00aa-bare', ''),
      /run "run-ff00aa-bare" holds no text files/,
    )
  })

  test('a symlink out of the run directory is a refusal, not a read', async () => {
    // it IS a listed row (never a silent skip) — the read is the door
    // that refuses it
    const listing = await readRunText({ stateRoot: root }, 'run-0a0b0c-escape', '')
    assert.ok(listing.files!.includes('leak.txt'), listing.files)
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-0a0b0c-escape', 'leak.txt'),
      /resolves outside run "run-0a0b0c-escape"/,
    )
  })

  test('a binary wearing a text extension refuses naming melite_view', async () => {
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-ab12cd-side', 'looks-text.json'),
      /is not text \(a NUL byte/,
    )
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-ab12cd-side', 'looks-text.json'),
      /media is melite_view's door/,
    )
  })

  test('an over-cap file refuses naming the cap and the reason', async () => {
    const big = join(root, 'output', 'run-b1b1b1-big')
    mkdirSync(big, { recursive: true })
    writeFileSync(join(big, 'huge.json'), 'x'.repeat(TEXT_BYTE_CAP + 1))
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-b1b1b1-big', 'huge.json'),
      new RegExp('is ' + String(TEXT_BYTE_CAP + 1) + ' bytes, over melite_read' + String.fromCharCode(39) + 's ' + String(TEXT_BYTE_CAP) + '-byte text cap'),
    )
    // exactly at the cap is legal
    writeFileSync(join(big, 'edge.json'), 'x'.repeat(TEXT_BYTE_CAP))
    const edge = await readRunText({ stateRoot: root }, 'run-b1b1b1-big', 'edge.json')
    assert.equal(edge.bytes, TEXT_BYTE_CAP)
  })

  test('a run with no text at all names that, and a root-level symlink row is a row', async () => {
    // the miss voice's "holds no text files" arm
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-ff00aa-bare', 'anything.json'),
      /has no text file matching that path — the run holds no text files/,
    )
    // a link at the run ROOT (rel === '') rides the listing like any row
    const atRoot = join(root, 'output', 'run-cc22dd-atroot')
    mkdirSync(atRoot, { recursive: true })
    symlinkSync(join(root, 'secret.txt'), join(atRoot, 'root-leak.txt'))
    const listing = await readRunText({ stateRoot: root }, 'run-cc22dd-atroot', '')
    assert.ok(listing.files!.includes('root-leak.txt'), listing.files)
    await assert.rejects(
      readRunText({ stateRoot: root }, 'run-cc22dd-atroot', 'root-leak.txt'),
      /resolves outside run "run-cc22dd-atroot"/,
    )
  })

  test('the render speaks a refusal and an empty row (never a blank card)', () => {
    const tool = meliteRead(ctx())
    const refused = (tool.output!.render!({} as never, { runId: 'run-ab12cd-side', error: 'nope' } as never)[0] as { text: string }).text
    assert.equal(refused, 'melite_read REFUSED: nope')
    // a value with neither body nor listing still names the file
    const bare = (tool.output!.render!({} as never, { runId: 'run-ab12cd-side' } as never)[0] as { text: string }).text
    assert.equal(bare, 'melite_read run-ab12cd-side/?: ')
  })

  test('a seatless lane refuses naming the door it needs', async () => {
    const tool = meliteRead(ctx(undefined))
    const storeless = { get: (): unknown => undefined } as unknown as Context
    const bare = meliteRead(storeless)
    await assert.rejects(
      bare.execute({ run_id: 'run-ab12cd-side' }, {} as never),
      /the queue seat is not available/,
    )
    void tool
  })
})
