/**
 * @vitest-environment happy-dom
 * Web snapshot scenario (DSH tier 7): the CARDS TAB's row face,
 * replayed WITHOUT a booted host (roadmap §9's riding debt — the
 * playwright wall covers the LIVE surface, stronger, but it needs a
 * booted lane; this scenario pins the same face keylessly through
 * benchRow, the tab's pure distillation).
 *
 * THE REPLAY LAW (hello's): borrows the canonical session from
 * snapshots/session/hello, reads the owner's selected parent
 * generation read-only, CI forces DSH_SNAPSHOT=replay. The bench
 * rows exercised here mirror the e2e lane's seeded stage (card
 * h3-timeline — the same stage the studio wall drives live).
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'
// THE KEYLESS IMPORT LAW (the web lane's alias table lives in
// vitest.web.config.ts; the spec-source import is the cards tab's
// own module — pure functions, no host):
import { benchRow } from '../../../packages/web/melite-card-view/src/client/CardsTab.tsx'
import type { BenchStageRow } from '../../../packages/web/melite-card-view/src/client/cards-resource.ts'

const here = dirname(fileURLToPath(import.meta.url))
const snapshotsRoot = resolve(here, '..', '..')

describe('web cards-tab (the tab face, keyless)', () => {
  it('replays against the borrowed canonical session', () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.ok(manifest.borrows, 'web scenario without a local fixture must declare borrows')
    const parent = selectGeneration(join(snapshotsRoot, manifest.borrows!), 'parent')
    assert.ok(parent.rows.length > 0, 'the borrowed session carries rows')
  })

  it('distills the e2e lane\'s seeded stage (h3-timeline) to the tab\'s face', () => {
    // the same stage the studio wall seeds live
    // (scripts/e2e-studio-lane.sh: bench/add-stage card h3-timeline)
    const stage: BenchStageRow = {
      engine: 'comfyui',
      id: 's_0',
      card: 'h3-timeline',
      title: 'the film',
      params: { calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }] },
      result: { activity: 'sampling 7/20', progress: { value: 7, max: 20 } },
    } as unknown as BenchStageRow

    const row = benchRow(stage)
    assert.equal(row.kind, 'h3-timeline', "kind carries the card id (only 'group' stages distill to 'group')")
    assert.equal(row.title, 'the film', 'the stage title captions the row')
    assert.equal(row.activity, 'sampling 7/20', 'the live activity carries (the drill shows it live)')
    assert.deepEqual(row.progress, { value: 7, max: 20 }, 'the progress carries')
  })

  it('renders the distilled rows as the tab DOM (happy-dom)', () => {
    const stage: BenchStageRow = {
      engine: 'comfyui',
      id: 's_1',
      card: 'h3-timeline',
      params: {},
    } as unknown as BenchStageRow
    const row = benchRow(stage)
    document.body.innerHTML = `<div data-testid="cards-tab-row" data-kind="${row.kind}">${row.title}</div>`
    const el = document.querySelector('[data-testid="cards-tab-row"]')
    assert.ok(el, 'the row renders')
    assert.equal(el.getAttribute('data-kind'), 'h3-timeline')
    assert.equal(el.textContent, 'h3-timeline', 'the card captions when no title (never an empty caption)')
  })

  // STROKE 95 (the mask rework — two bars, everything mod-owned):
  // the reworked card still distills to the tab face carrying its bag
  // entries VERBATIM (the wire is the storage; the row never
  // re-derives or flattens the mods — that was the butchered shape
  // this rework killed).
  it('distills the reworked mask card with its mod bags intact', () => {
    const stage: BenchStageRow = {
      engine: 'comfyui',
      id: 's_2',
      card: 'mask',
      title: 'the cloak mask',
      params: {
        input_image: '/state/drafts/pic.png',
        sam3: [{ prompt: 'the red cloak' }, { name: 'dog', prompt: 'the dog', sam_threshold: 0.95 }],
        draw: [{ payload: '/state/drafts/paint.png' }],
      },
    } as unknown as BenchStageRow
    const row = benchRow(stage)
    assert.equal(row.kind, 'mask', 'the reworked card id serves')
    assert.equal(row.title, 'the cloak mask', 'the stage title captions')
    // the bags ride the row's params verbatim — the base card carries
    // ONLY input_image flat; every knob rides its entry
    const params = stage.params as Record<string, unknown>
    assert.deepEqual(Object.keys(params).sort(), ['draw', 'input_image', 'sam3'],
      'the flat pollution is dead — input_image + the mod bags, nothing else')
    assert.deepEqual((params['sam3'] as Array<Record<string, unknown>>)[1], { name: 'dog', prompt: 'the dog', sam_threshold: 0.95 },
      'an entry owns its own tune (per-entry sam_threshold — never a flat scalar)')
  })
})
