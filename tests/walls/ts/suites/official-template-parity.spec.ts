/**
 * OFFICIAL TEMPLATE PARITY (operator 2026-11-17: "you need to make
 * some sort of tool that compares our flows for trellis and pixal3d
 * to the actual canonical workflows, and PROVE they are 1:1") — the
 * img-to-mesh lanes against the frozen canonical export
 * (tests/walls/fixtures/official-pixal-trellis2.workflow.json, the
 * ComfyUI template the lanes were ported from).
 *
 * THE BURN THIS WALL EXISTS FOR: the lanes were ported faithfully
 * and then silently DRIFTED at the defaults — remesh_qef and
 * remesh_drop_enclosed shipped schema-default TRUE ("the melite
 * repair default") while the canonical RemeshMesh ships both FALSE;
 * drop_enclosed ON deletes the nested interior shells TRELLIS
 * output carries, punching holes through the visible surface. No
 * wall compared the composed graph against the template, so the
 * deviation lived for weeks. This suite IS that comparison: class
 * parity, calibration parity, and mesh-lineage order per lane.
 *
 * WHAT 1:1 MEANS HERE (honest scope): the canonical template is ONE
 * workflow carrying BOTH conditionings behind ComfySwitchNodes; the
 * walk selects a lane's active leg (PrimitiveBoolean "Switch to
 * Trellis2" true → trellis, false → pixal) and drops scaffold
 * (previews, notes, switches, primitives). The SANCTIONED
 * DEVIATIONS are named rows below with their roadmap references —
 * anything outside the allowlist reds. Widget names are derived
 * from the frozen template's own values (object_info keys sort
 * alphabetically and cannot carry order); a fixture change re-derives
 * them by reding first.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, test } from 'vitest'
import { loadCardDefs, loadFacts, getModel, registryIds, registryModel } from '@melite/comfyui-cordis'
import type { ModelFacts } from '@melite/comfyui-card-kit/facts'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import { primeFamilySeats } from '../../../../packages/3d/img-to-mesh/src/family-seats.ts'

type CanonNode = {
  id: number
  type: string
  title?: string
  widgets_values?: unknown[]
  inputs?: Array<{ name: string; link: number | null }>
}
type Canon = { nodes: CanonNode[]; links: Array<[number, number, number, number, number, string]> }

const ROOT = join(import.meta.dirname, '..', '..', '..', '..')
const CANON = JSON.parse(
  readFileSync(join(ROOT, 'tests', 'walls', 'fixtures', 'official-pixal-trellis2.workflow.json'), 'utf8'),
) as Canon

/** Scaffold never part of a pipeline comparison. */
const SCAFFOLD = new Set(['Note', 'MarkdownNote', 'PreviewImage', 'MaskPreview', 'Preview3DAdvanced', 'PrimitiveBoolean', 'PrimitiveInt', 'ComfySwitchNode'])

/**
 * THE SANCTIONED DEVIATIONS — every row names its owed-roadmap
 * reference; a deviation outside these rows is drift and reds.
 */
const ABSENT_ALLOWED: Record<string, string> = {
  // OPEN roadmap row (2026-11-17, audit 012) — THE BIREFNET CROP
  // LEG: the canonical template cuts the subject before the crop;
  // melite rides the red-channel region on its own live-burn
  // evidence until the operator's provisioning call lands.
  RemoveBackground: 'audit 012 — the BiRefNet cut leg is an OPEN operator call',
  LoadBackgroundRemovalModel: 'audit 012 — the BiRefNet cut leg is an OPEN operator call',
}
const EXTRA_ALLOWED: Record<string, string> = {
  // The bridge standing in for the cut leg: the region rides
  // ImageToMask of the SAME photo (same audit-012 row).
  ImageToMask: 'audit 012 — the red-channel region bridge substitutes the cut leg',
}
/** Calibration inputs NEVER compared (machine/demo-specific). */
const INPUT_IGNORE: Record<string, ReadonlySet<string>> = {
  KSampler: new Set(['seed', 'control_after_generate']),
  Save3DAdvanced: new Set(['filename_prefix']),
  MeshToFile3D: new Set(),
}

/** Widget-name orders derived from the frozen template's own
 * values (types + semantics; object_info cannot carry order). */
const WIDGET_NAMES: Record<string, string[]> = {
  RemeshMesh: ['resolution', 'sign_mode', 'sign_mode.qef', 'sign_mode.drop_inverted_components', 'sign_mode.drop_enclosed_components', 'band', 'project_back', 'fix_poles', 'smooth_iters', 'drop_small_components', 'precluster_max_verts'],
  DecimateMesh: ['target_face_count', 'placement_mode'],
  UnwrapMesh: ['segmenter', 'resolution', 'padding', 'weld_distance'],
  MeshSmoothNormals: ['crease_angle'],
  BakeTextureFromVoxel: ['texture_size'],
  BakeAmbientOcclusion: ['resolution', 'samples', 'max_distance', 'strength', 'bias'],
  BakeNormalMapFromMesh: ['resolution', 'cage_distance', 'ignore_backfaces'],
  VaeDecodeStructureTrellis2: ['resolution'],
  // [1024, 1024, 1.1, 0, '#000000'] = width, height, pad, grow, bg
  ImageCropToMask: ['width', 'height', 'pad_factor', 'grow_mask', 'background'],
  CFGOverride: ['cfg', 'start_percent', 'end_percent'],
  RescaleCFG: ['multiplier'],
  ModelSamplingSD3: ['shift'],
  KSampler: ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
}

const canonNodes = new Map(CANON.nodes.map((n) => [n.id, n]))
const linksTo = new Map<number, Array<[number, number]>>() // toNode -> [linkId, fromNode]
for (const l of CANON.links) {
  const arr = linksTo.get(l[3]) ?? []
  arr.push([l[0], l[1]])
  linksTo.set(l[3], arr)
}
const linkFrom = (linkId: number): number | undefined => CANON.links.find((l) => l[0] === linkId)?.[1]

/** The ACTIVE pipeline leg: backward walk from the saved hero
 * (Save3DAdvanced), resolving every ComfySwitchNode by its
 * effective selection (the lane primitive's value is OVERRIDDEN by
 * the requested leg — the frozen export ships pixal-selected) and
 * dropping scaffold. */
function activePipeline(trellis: boolean): Map<number, CanonNode> {
  const save = CANON.nodes.find((n) => n.type === 'Save3DAdvanced')
  if (save === undefined) throw new Error('canonical template carries no Save3DAdvanced')
  const seen = new Set<number>()
  const queue: number[] = [save.id]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    const node = canonNodes.get(id)
    if (node === undefined) continue
    if (node.type === 'ComfySwitchNode') {
      // effective selection: a wired 'switch' input rides the lane
      // primitive ("Switch to Trellis2" — overridden by the
      // requested leg); else the switch's own widget
      const sw = node.inputs?.find((i) => i.name === 'switch')
      let select: boolean = node.widgets_values?.[0] === true
      if (sw?.link != null) {
        const producer = linkFrom(sw.link)
        const prim = producer !== undefined ? canonNodes.get(producer) : undefined
        if (prim?.type === 'PrimitiveBoolean') select = trellis
      }
      const wanted = select ? 'on_true' : 'on_false'
      for (const input of node.inputs ?? []) {
        if (input.name === wanted && input.link != null) {
          const from = linkFrom(input.link)
          if (from !== undefined) queue.push(from)
        }
      }
      continue
    }
    for (const input of node.inputs ?? []) {
      if (input.link != null) {
        const from = linkFrom(input.link)
        if (from !== undefined) queue.push(from)
      }
    }
  }
  const out = new Map<number, CanonNode>()
  for (const id of seen) {
    const node = canonNodes.get(id)!
    if (!SCAFFOLD.has(node.type)) out.set(id, node)
  }
  return out
}

/** Canonical calibration: widget values keyed by derived name — a
 * wired input (PrimitiveInt/PrimitiveBoolean override, e.g. the
 * template's 4096 texture-resolution primitive overriding the 2048
 * widgets) WINS over the positional widget value. */
function canonCalibration(node: CanonNode): Record<string, unknown> {
  const names = WIDGET_NAMES[node.type]
  const values = node.widgets_values ?? []
  if (names === undefined) return {}
  const out: Record<string, unknown> = {}
  names.forEach((name, i) => { if (i < values.length) out[name] = values[i] })
  for (const input of node.inputs ?? []) {
    if (input.link == null || !(input.name in out)) continue
    const producerId = linkFrom(input.link)
    const producer = producerId !== undefined ? canonNodes.get(producerId) : undefined
    if (producer?.type === 'PrimitiveInt' || producer?.type === 'PrimitiveBoolean') {
      out[input.name] = producer.widgets_values?.[0]
    }
  }
  return out
}

type OurNode = { class_type: string; inputs: Record<string, unknown> }

async function composeLane(family: string, extra: Record<string, unknown> = {}): Promise<Record<string, OurNode>> {
  await primeFamilySeats()
  const defs = await loadCardDefs()
  const def = defs.get('img-to-mesh')
  if (def === undefined) throw new Error('img-to-mesh card missing')
  const facts: ModelFacts = loadFacts(join(ROOT, 'packages', 'engines', 'comfyui-cordis', 'data', 'model-facts.json'), { getModel, registryIds, registryModel }).models[family]
  if (facts === undefined) throw new Error(`family facts row missing: ${family}`)
  const g = new GraphBuilder()
  def.compose({ input_image: '/m/photo.png', seed: 7, ...facts.defaults, ...extra }, facts, g, 'parity')
  return g.toJSON() as Record<string, OurNode>
}

const ourNodes = (graph: Record<string, OurNode>): OurNode[] => Object.values(graph)
const byClass = (nodes: OurNode[], cls: string): OurNode[] => nodes.filter((n) => n.class_type === cls)

/** THE MESH LINEAGE — the ordered tail from decode to the saved
 * hero, topologically read off our composed graph by following the
 * mesh-carrying link (inputs whose value is an upstream node ref). */
function ourLineage(graph: Record<string, OurNode>): string[] {
  const idOf = new Map<string, string>() // nodeId -> class_type is direct: toJSON keys are ids
  for (const [id, node] of Object.entries(graph)) idOf.set(id, node.class_type)
  const follow = (id: string): Array<{ cls: string; node: OurNode }> => {
    const node = graph[id]
    if (node === undefined) return []
    const parents: string[] = []
    for (const v of Object.values(node.inputs)) {
      if (Array.isArray(v) && typeof v[0] === 'string' && idOf.has(v[0])) parents.push(v[0])
    }
    const out: Array<{ cls: string; node: OurNode }> = [{ cls: node.class_type, node }]
    for (const p of parents) out.push(...follow(p))
    return out
  }
  const saveId = Object.entries(graph).find(([, n]) => n.class_type === 'Save3DAdvanced')?.[0]
  if (saveId === undefined) return []
  // topological order: reverse of the DFS discovery from the save node
  const seen = new Set<string>()
  const order: string[] = []
  const visit = (id: string): void => {
    if (seen.has(id)) return
    seen.add(id)
    const node = graph[id]
    if (node === undefined) return
    for (const v of Object.values(node.inputs)) {
      if (Array.isArray(v) && typeof v[0] === 'string' && graph[v[0]] !== undefined) visit(v[0])
    }
    order.push(node.class_type)
  }
  visit(saveId)
  void follow
  return order
}

describe.each([
  // camera_fov rides the family default ('auto') so OUR MoGe leg
  // composes — the 1:1 comparison walks both lanes' own geometry
  { lane: 'trellis', family: 'trellis2-native', trellis: true, extra: {} },
  { lane: 'pixal', family: 'pixal3d', trellis: false, extra: {} },
])('official template parity — the $lane lane', ({ lane, family, trellis, extra }) => {
  test('CLASS PARITY: the lane composes the canonical leg — no missing pipeline node, no unsanctioned extra', async () => {
    const canon = activePipeline(trellis)
    const canonClasses = [...canon.values()].map((n) => n.type).sort()
    const ours = ourNodes(await composeLane(family, extra)).map((n) => n.class_type).sort()
    const missing: string[] = []
    for (const cls of new Set(canonClasses)) {
      const need = canonClasses.filter((c) => c === cls).length
      const have = ours.filter((c) => c === cls).length
      if (have < need) missing.push(`${cls}: canonical ${need}, ours ${have}`)
    }
    const sanctionedMissing = missing.filter((m) => ABSENT_ALLOWED[m.split(':')[0]] !== undefined)
    expect(missing.filter((m) => !sanctionedMissing.includes(m)),
      `${lane}: the composed lane is missing canonical pipeline nodes (unsanctioned):\n  ${missing.join('\n  ')}`).toEqual([])
    const extras: string[] = []
    for (const cls of new Set(ours)) {
      const have = ours.filter((c) => c === cls).length
      const need = canonClasses.filter((c) => c === cls).length
      if (have > need) extras.push(`${cls}: ours ${have}, canonical ${need}`)
    }
    const sanctionedExtras = extras.filter((m) => EXTRA_ALLOWED[m.split(':')[0]] !== undefined)
    expect(extras.filter((m) => !sanctionedExtras.includes(m)),
      `${lane}: the composed lane carries nodes the canonical leg does not have (unsanctioned):\n  ${extras.join('\n  ')}`).toEqual([])
  })

  test('CALIBRATION PARITY: every compared node matches the canonical widgets (the holes-burn class — defaults are the template\'s, never "repairs")', async () => {
    const canon = activePipeline(trellis)
    const graph = await composeLane(family, extra)
    const findings: string[] = []
    for (const node of canon.values()) {
      const cal = canonCalibration(node)
      if (Object.keys(cal).length === 0) continue
      // single-instance compared classes on the active leg
      const ours = byClass(ourNodes(graph), node.type)
      if (ours.length !== 1) continue
      const ignore = INPUT_IGNORE[node.type] ?? new Set<string>()
      for (const [name, want] of Object.entries(cal)) {
        if (ignore.has(name)) continue
        const got = ours[0].inputs[name]
        // mesh/link inputs are topology, not calibration
        if (Array.isArray(got)) continue
        if (name in ours[0].inputs && String(got) !== String(want)) {
          findings.push(`${node.type}.${name}: canonical ${String(want)} vs ours ${String(got)}`)
        }
      }
    }
    expect(findings,
      `${lane}: composed calibration deviates from the canonical template:\n  ${findings.join('\n  ')}`).toEqual([])
  })
})

test('MESH LINEAGE PARITY: the tail rides the canonical order decode → info → remesh → decimate → smooth → unwrap → bake → apply → save', async () => {
  const graph = await composeLane('trellis2-native')
  const lineage = ourLineage(graph)
  const tail = ['VaeDecodeShapeTrellis', 'GetMeshInfo', 'RemeshMesh', 'DecimateMesh', 'MeshSmoothNormals', 'UnwrapMesh', 'BakeTextureFromVoxel', 'BakeAmbientOcclusion', 'BakeNormalMapFromMesh', 'ApplyTextureToMesh', 'MeshToFile3D', 'Save3DAdvanced'] as const
  let cursor = 0
  const walked: string[] = []
  for (const cls of lineage) {
    if (cls === tail[cursor]) { walked.push(cls); cursor += 1 }
  }
  expect(walked, `the composed mesh tail must visit the canonical chain in order (walked: ${lineage.join(' → ')})`).toEqual([...tail])
})

test('THE FIXTURE MAPS: every compared canonical widget value lands on a derived name (a fixture change re-derives by reding first)', () => {
  for (const trellis of [true, false]) {
    for (const node of activePipeline(trellis).values()) {
      const names = WIDGET_NAMES[node.type]
      if (names === undefined) continue
      const values = node.widgets_values ?? []
      if (values.length > names.length) {
        throw new Error(`${node.type} carries ${values.length} widgets but the derived map names ${names.length} — re-derive WIDGET_NAMES from the new fixture`)
      }
    }
  }
})
