import { test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listRunsAcross, runThumbnail } from '../../../../packages/harness/estate-queue/src/runsList.ts'
import { decodeRuns } from '../../../../packages/web/infer-gallery/src/client/decode.ts'

/** THE DEMO SEED PACK WALL (2026-11-13, the blank-media-sidebar demo lane).
 *
 *  The demo machine blanks the media sidebar by pointing `stateRoot` at
 *  `bench/demo-state-seed/runs` — an empty root renders the panel's own empty
 *  faces, and a seeded root renders synthetic rows with NO code path aware of
 *  "demo" (the listing is a pure disk scan). The pack is therefore data with a
 *  contract: every seed must survive the REAL doors — the estate listing
 *  (`listRunsAcross`) must build a row for it, the browser decoder
 *  (`decodeRuns`) must accept every row with zero errors, and every artifact
 *  it names must exist on disk (a seed that 404s is a broken tile, not a demo).
 *
 *  RED when: a seed loses its `run_id` shape, a sidecar names a pipeline the
 *  user-surface law drops, an artifact file is renamed or deleted, or a seed
 *  row stops decoding — the wall names the offending run/file. */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..', '..')
const PACK = join(ROOT, 'bench', 'demo-state-seed', 'runs')
const OUTPUT = join(PACK, 'output')
const SEEDS = readdirSync(OUTPUT).filter((n) => n.startsWith('run-')).sort()

test('the demo seed pack lists through the estate door, decodes in the panel, and every artifact exists', async () => {
  assert.ok(SEEDS.length >= 3, `the pack ships its seeds (found ${SEEDS.length})`)
  const { count, runs } = await listRunsAcross([PACK], 50, async () => false)
  assert.equal(count, SEEDS.length, 'every seed dir counts')
  assert.equal(runs.length, SEEDS.length,
    'every seed BUILDS a row — a seed the row gate drops is invisible in the demo')
  assert.deepEqual(
    runs.map((r) => r['run_id']).sort(),
    SEEDS,
    'the served rows are exactly the pack\'s seeds',
  )
  const feed = decodeRuns({ gateway: '', runs })
  assert.equal(feed.errors.length, 0,
    `the panel decodes every seed row (${feed.errors.map((e) => e.message).join('; ')})`)
  assert.equal(feed.runs.length, SEEDS.length, 'no row is dropped by the decoder')
})

test('every seeded artifact path exists on disk and the film seed thumbnails to its clip', () => {
  for (const seed of SEEDS) {
    const dir = join(OUTPUT, seed)
    const sidecar = join(dir, '_flow.json')
    assert.ok(existsSync(sidecar), `${seed} carries a _flow.json sidecar`)
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const p = join(d, n)
        return statSync(p).isDirectory() ? walk(p) : [p]
      })
    const files = walk(dir)
    assert.ok(files.length > 1, `${seed} ships at least one artifact beside its sidecar`)
    for (const f of files) {
      assert.ok(f.startsWith(dir), `${seed}: artifact containment holds for ${f}`)
    }
  }
  const film = join(OUTPUT, 'run-0000000000a1-h3film')
  const thumb = runThumbnail(film, 'run-0000000000a1-h3film')
  assert.match(thumb, /\/_poster\.jpg$/,
    'the film seed ships its own cached poster — the tile paints without decoding the clip')
  const filmOnly = join(OUTPUT, 'run-0000000000b2-h3still')
  assert.match(runThumbnail(filmOnly, 'run-0000000000b2-h3still'), /demo_still\.png$/,
    'a still-only seed falls back to its image (no video to lead with)')
})
