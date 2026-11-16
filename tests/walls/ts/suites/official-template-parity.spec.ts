/**
 * OFFICIAL TEMPLATE PARITY (operator 2026-11-17: "you need to make
 * some sort of tool that compares our flows for trellis and pixal3d
 * to the actual canonical workflows, and PROVE they are 1:1") — the
 * img-to-mesh lanes against the frozen canonical export
 * (tests/walls/fixtures/official-pixal-trellis2.workflow.json).
 *
 * ONE ENGINE, TWO DOORS: the comparator core lives in
 * tools/official-parity-core.mjs (plain node, zero melite imports)
 * behind the reusable CLI (tools/official-parity.mjs — any canonical
 * export vs any composed API-prompt graph, exit 1 on drift). This
 * wall drives the SAME core against lanes composed LIVE through the
 * real card + real family facts, and pins the snapshots the CLI
 * consumes — a compose drift reds here first.
 *
 * THE BURN THIS WALL EXISTS FOR: the lanes were ported faithfully
 * and then silently DRIFTED at the defaults — remesh_qef and
 * remesh_drop_enclosed shipped schema-default TRUE ("the melite
 * repair default") while the canonical RemeshMesh ships both FALSE;
 * drop_enclosed ON deletes the nested interior shells TRELLIS
 * output carries, punching holes through the visible surface.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, test } from 'vitest'
import { loadCardDefs, loadFacts, getModel, registryIds, registryModel } from '@melite/comfyui-cordis'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { primeFamilySeats } from '../../../../packages/3d/img-to-mesh/src/family-seats.ts'
import { activePipeline, compareLane } from '../../../../tools/official-parity-core.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..', '..')
const CANON = JSON.parse(
  readFileSync(join(ROOT, 'tests', 'walls', 'fixtures', 'official-pixal-trellis2.workflow.json'), 'utf8'),
) as Parameters<typeof activePipeline>[0]

/**
 * THE SANCTIONED DEVIATIONS — every row names its owed-roadmap
 * reference; a deviation outside these rows is drift and reds.
 * The audit-012 BiRefNet cut leg: canonical cuts the subject before
 * the crop; melite rides the red-channel region bridge on its own
 * live-burn evidence until the operator's provisioning call lands.
 */
const ABSENT_ALLOWED: Record<string, string> = {
  RemoveBackground: 'audit 012 — the BiRefNet cut leg is an OPEN operator call',
  LoadBackgroundRemovalModel: 'audit 012 — the BiRefNet cut leg is an OPEN operator call',
}
const EXTRA_ALLOWED: Record<string, string> = {
  ImageToMask: 'audit 012 — the red-channel region bridge substitutes the cut leg',
}
const INPUT_IGNORE: Record<string, ReadonlySet<string>> = {
  KSampler: new Set(['seed', 'control_after_generate']),
  Save3DAdvanced: new Set(['filename_prefix']),
}

type OurNode = { class_type: string; inputs: Record<string, unknown> }

async function composeLane (family: string): Promise<Record<string, OurNode>> {
  await primeFamilySeats()
  const def = (await loadCardDefs()).get('img-to-mesh')
  if (def === undefined) throw new Error('img-to-mesh card missing')
  const facts: ModelFacts = loadFacts(join(ROOT, 'packages', 'engines', 'comfyui-cordis', 'data', 'model-facts.json'), { getModel, registryIds, registryModel }).models[family]
  if (facts === undefined) throw new Error(`family facts row missing: ${family}`)
  // camera_fov rides the family default ('auto') so OUR pixal MoGe
  // leg composes — the 1:1 comparison walks both lanes' own geometry.
  // seed AFTER the spread: the route default carries the -1 sentinel
  // and a spread-order slip mints a fresh seed per process (snapshot
  // instability); 7 is concrete and deterministic.
  const g = new GraphBuilder()
  def.compose({ input_image: '/m/photo.png', ...facts.defaults, seed: 7 }, facts, g, 'parity')
  return g.toJSON() as Record<string, OurNode>
}

describe.each([
  { lane: 'trellis', family: 'trellis2-native' },
  { lane: 'pixal', family: 'pixal3d' },
])('official template parity — the $lane lane', ({ lane, family }) => {
  test("CLASS + CALIBRATION + LINEAGE: the live-composed lane is 1:1 with the canonical leg (the holes-burn class — defaults are the template's, never \"repairs\")", async () => {
    const ours = await composeLane(family)
    const leg = activePipeline(CANON, { lanePrimitive: 'Switch to Trellis2', laneValue: lane === 'trellis' })
    const f = compareLane({
      canonical: CANON,
      leg,
      ours,
      absentAllowed: ABSENT_ALLOWED,
      extraAllowed: EXTRA_ALLOWED,
      inputIgnore: INPUT_IGNORE,
    })
    const drift = [...f.missing, ...f.extras, ...f.calibration, ...f.lineage, ...f.unmappedWidgets]
    expect(drift,
      `${lane}: the composed lane deviates from the canonical template:\n  ${drift.join('\n  ')}`).toEqual([])
  })

  test("SNAPSHOT: the composed lane matches the CLI's snapshot (a compose drift reds here — regenerate the fixture from this arm's compose)", async () => {
    const ours = await composeLane(family)
    const snap: Record<string, OurNode> = JSON.parse(
      readFileSync(join(ROOT, 'tests', 'walls', 'fixtures', 'composed-lane-snapshots', `${lane}.json`), 'utf8'),
    )
    expect(ours, `${lane}: the live compose drifted from the frozen snapshot the parity CLI judges — regenerate tests/walls/fixtures/composed-lane-snapshots/${lane}.json`).toEqual(snap)
  })
})
