// official-parity-core.mjs — THE REUSABLE COMPARATOR ENGINE (operator
// 2026-11-17: "make some sort of tool that compares our flows to the
// actual canonical workflows and PROVE they are 1:1"). PURE: zero
// melite imports, plain node, JSON in / findings out. Two inputs:
//
//   1. a CANONICAL ComfyUI workflow export (nodes/links/widgets —
//      the template a lane claims to port 1:1);
//   2. a COMPOSED lane graph in API-prompt shape ({ id: { class_type,
//      inputs } } — what the card actually builds).
//
// The engine walks the canonical export's ACTIVE leg (following its
// own ComfySwitchNodes — a lane primitive's value is overridden by
// the requested leg), drops scaffold, resolves wired Primitive
// overrides over positional widgets, and diffs three planes:
//   CLASS parity  — missing/extra pipeline nodes (modulo allowlists)
//   CALIBRATION   — per-node inputs vs canonical widgets
//   LINEAGE order — the mesh tail's canonical order
//
// Exit-shape: { missing, extras, calibration, lineage, canonicalClasses,
// ourClasses } — empty arrays are 1:1. The CLI (official-parity.mjs)
// prints this; the wall (official-template-parity.spec.ts) asserts it
// against live-composed lanes, so the engine has exactly ONE home.

/** Widget-name orders derived from frozen template values (types +
 * semantics — object_info keys sort alphabetically and cannot carry
 * order). A fixture carrying values beyond its map REDS first: the
 * re-derivation is forced to be conscious. Override with
 * `widgets` tables passed to compareLane. */
export const DEFAULT_WIDGET_NAMES = {
  RemeshMesh: ['resolution', 'sign_mode', 'sign_mode.qef', 'sign_mode.drop_inverted_components', 'sign_mode.drop_enclosed_components', 'band', 'project_back', 'fix_poles', 'smooth_iters', 'drop_small_components', 'precluster_max_verts'],
  DecimateMesh: ['target_face_count', 'placement_mode'],
  UnwrapMesh: ['segmenter', 'resolution', 'padding', 'weld_distance'],
  MeshSmoothNormals: ['crease_angle'],
  BakeTextureFromVoxel: ['texture_size'],
  BakeAmbientOcclusion: ['resolution', 'samples', 'max_distance', 'strength', 'bias'],
  BakeNormalMapFromMesh: ['resolution', 'cage_distance', 'ignore_backfaces'],
  VaeDecodeStructureTrellis2: ['resolution'],
  // canonical [1024, 1024, 1.1, 0, '#000000'] = width, height, pad, grow, bg
  ImageCropToMask: ['width', 'height', 'pad_factor', 'grow_mask', 'background'],
  CFGOverride: ['cfg', 'start_percent', 'end_percent'],
  RescaleCFG: ['multiplier'],
  ModelSamplingSD3: ['shift'],
  KSampler: ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
}

/** Scaffold classes never part of a pipeline comparison. */
export const SCAFFOLD = new Set(['Note', 'MarkdownNote', 'PreviewImage', 'MaskPreview', 'Preview3DAdvanced', 'PrimitiveBoolean', 'PrimitiveInt', 'ComfySwitchNode'])

/** The canonical mesh tail, in order (the lineage plane). */
export const MESH_LINEAGE = ['VaeDecodeShapeTrellis', 'GetMeshInfo', 'RemeshMesh', 'DecimateMesh', 'MeshSmoothNormals', 'UnwrapMesh', 'BakeTextureFromVoxel', 'BakeAmbientOcclusion', 'BakeNormalMapFromMesh', 'ApplyTextureToMesh', 'MeshToFile3D', 'Save3DAdvanced']

/**
 * Walk the canonical export's ACTIVE pipeline leg: backward from the
 * saved hero (Save3DAdvanced — override via `terminal`), resolving
 * every ComfySwitchNode by its effective selection. A wired `switch`
 * input from a PrimitiveBoolean whose title matches `lanePrimitive`
 * (substring) is OVERRIDDEN to `laneValue` (the frozen export ships
 * one selection; the comparison walks both). Scaffold drops.
 * @param canonical the parsed workflow export
 * @param lanePrimitive substring of the lane-switching primitive's title
 * @param laneValue the requested leg's value for that primitive
 * @param terminal class holding the saved hero (default Save3DAdvanced)
 */
export function activePipeline (canonical, { lanePrimitive = 'Switch to Trellis2', laneValue = true, terminal = 'Save3DAdvanced' } = {}) {
  const nodes = new Map(canonical.nodes.map((n) => [n.id, n]))
  const linkFrom = (linkId) => canonical.links.find((l) => l[0] === linkId)?.[1]
  const save = canonical.nodes.find((n) => n.type === terminal)
  if (save === undefined) throw new Error(`canonical export carries no ${terminal}`)
  const seen = new Set()
  const queue = [save.id]
  while (queue.length > 0) {
    const id = queue.shift()
    if (seen.has(id)) continue
    seen.add(id)
    const node = nodes.get(id)
    if (node === undefined) continue
    if (node.type === 'ComfySwitchNode') {
      const sw = node.inputs?.find((i) => i.name === 'switch')
      let select = node.widgets_values?.[0] === true
      if (sw?.link != null) {
        const producerId = linkFrom(sw.link)
        const prim = producerId !== undefined ? nodes.get(producerId) : undefined
        if (prim?.type === 'PrimitiveBoolean') {
          select = (prim.title ?? '').includes(lanePrimitive) ? laneValue : (prim.widgets_values?.[0] === true)
        }
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
  const out = new Map()
  for (const id of seen) {
    const node = nodes.get(id)
    if (node !== undefined && !SCAFFOLD.has(node.type)) out.set(id, node)
  }
  return out
}

/** Canonical calibration for one node: positional widgets keyed by
 * derived names; a wired PrimitiveInt/PrimitiveBoolean input WINS
 * over the widget value (the template's 4096 texture primitive
 * overriding its own 2048 widgets is the precedent). */
export function canonCalibration (node, widgetNames) {
  const names = widgetNames[node.type]
  const values = node.widgets_values ?? []
  if (names === undefined) return {}
  const out = {}
  names.forEach((name, i) => { if (i < values.length) out[name] = values[i] })
  const linkFrom = (linkId) => null // resolved by caller-owned closure below
  void linkFrom
  return out
}

/**
 * The full comparison. `ours` is the composed lane graph (API-prompt
 * shape); `leg` is activePipeline()'s walked canonical leg.
 * Allowlists name SANCTIONED deviations; everything else reds.
 * @returns {{missing: string[], extras: string[], calibration: string[], lineage: string[], unmappedWidgets: string[]}}
 */
export function compareLane ({ canonical, leg, ours, lanePrimitive, laneValue, absentAllowed = {}, extraAllowed = {}, inputIgnore = {}, widgetNames = DEFAULT_WIDGET_NAMES, lineageClasses = MESH_LINEAGE }) {
  // canonical calibration needs link resolution for primitive overrides
  const nodes = new Map(canonical.nodes.map((n) => [n.id, n]))
  const linkFrom = (linkId) => canonical.links.find((l) => l[0] === linkId)?.[1]
  const canonClasses = [...leg.values()].map((n) => n.type).sort()
  const ourClasses = Object.values(ours).map((n) => n.class_type).sort()

  const missing = []
  for (const cls of new Set(canonClasses)) {
    const need = canonClasses.filter((c) => c === cls).length
    const have = ourClasses.filter((c) => c === cls).length
    if (have < need && absentAllowed[cls] === undefined) missing.push(`${cls}: canonical ${need}, ours ${have}`)
  }
  const extras = []
  for (const cls of new Set(ourClasses)) {
    const have = ourClasses.filter((c) => c === cls).length
    const need = canonClasses.filter((c) => c === cls).length
    if (have > need && extraAllowed[cls] === undefined) extras.push(`${cls}: ours ${have}, canonical ${need}`)
  }

  const unmappedWidgets = []
  const calibration = []
  for (const node of leg.values()) {
    const names = widgetNames[node.type]
    const values = node.widgets_values ?? []
    if (names !== undefined && values.length > names.length) {
      unmappedWidgets.push(`${node.type}: ${values.length} widgets, ${names.length} derived names — re-derive the widget map for the new fixture`)
      continue
    }
    if (names === undefined) continue
    const cal = {}
    names.forEach((name, i) => { if (i < values.length) cal[name] = values[i] })
    for (const input of node.inputs ?? []) {
      if (input.link == null || !(input.name in cal)) continue
      const producerId = linkFrom(input.link)
      const producer = producerId !== undefined ? nodes.get(producerId) : undefined
      if (producer?.type === 'PrimitiveInt' || producer?.type === 'PrimitiveBoolean') cal[input.name] = producer.widgets_values?.[0]
    }
    // single-instance compared classes only (multi-instance order
    // comparison is the lineage plane's job)
    const oursOfCls = Object.values(ours).filter((n) => n.class_type === node.type)
    if (oursOfCls.length !== 1) continue
    const ignore = inputIgnore[node.type] ?? new Set()
    for (const [name, want] of Object.entries(cal)) {
      if (ignore.has(name)) continue
      const got = oursOfCls[0].inputs[name]
      if (Array.isArray(got)) continue // link inputs are topology
      if (name in oursOfCls[0].inputs && String(got) !== String(want)) {
        calibration.push(`${node.type}.${name}: canonical ${String(want)} vs ours ${String(got)}`)
      }
    }
  }

  // lineage: topological order of our graph from the terminal, walked
  // against the canonical tail classes
  const lineage = []
  const terminalId = Object.entries(ours).find(([, n]) => n.class_type === lineageClasses[lineageClasses.length - 1])?.[0]
  if (terminalId !== undefined) {
    const order = []
    const seen = new Set()
    const visit = (id) => {
      if (seen.has(id)) return
      seen.add(id)
      const node = ours[id]
      if (node === undefined) return
      for (const v of Object.values(node.inputs)) {
        if (Array.isArray(v) && typeof v[0] === 'string' && ours[v[0]] !== undefined) visit(v[0])
      }
      order.push(node.class_type)
    }
    visit(terminalId)
    let cursor = 0
    const walked = []
    for (const cls of order) {
      if (cls === lineageClasses[cursor]) { walked.push(cls); cursor += 1 }
    }
    if (walked.length !== lineageClasses.length) {
      lineage.push(`the composed tail must visit the canonical chain in order (walked: ${order.join(' → ')})`)
    }
  } else {
    lineage.push(`the composed graph carries no ${lineageClasses[lineageClasses.length - 1]} terminal`)
  }
  void lanePrimitive; void laneValue
  return { missing, extras, calibration, lineage, unmappedWidgets }
}
