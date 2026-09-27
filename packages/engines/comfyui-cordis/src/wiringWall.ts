// wiringWall.ts — THE WIRING WALL, ONE OWNER (2026-10-10; reseated
// 2026-10-10 by the operator's law: ON SUBMIT IS A HACK).
//
// Every graph that reaches the engine is walked against the doc the
// estate holds: an unknown class_type or an input the node does not
// declare is refused HERE, in the declaring door's voice, naming the
// doc — instead of dying at the engine, in the engine's voice, far
// from the declaration that authored it.
//
// THE TWO SEATS (the schema system, not a submit-time opt): the
// card-compose seat walks at COMPOSE (service.assertWiring — a bad
// card graph never reaches a run), and the RUN seat walks the BUILT
// ROWS in its pre-flight (runsExecute's wiring fence, before any
// engine action) — the seat every path (start, restore, queue
// replay) already walks. The first shape threaded an opt through
// ONE engine submit call; its default crashed a live run as
// `ReferenceError: assertWiringAtSubmit is not defined`, and the
// operator named the shape for what it was: a wall someone
// remembered to build at one door is not the schema system. The
// judge stayed; the opt is gone.

import { ComposeRefusal } from './errors.ts'

/**
 * THE ENGINE'S DECLARED-NODE CENSUS (the doc handle).
 *
 * The card-plane service arms it when /object_info lands; the HOST —
 * a separate class that owns the merge and splice submits — reads it at
 * submit. It lives HERE rather than on a service because it is engine
 * state, not service state: the two classes share the seat name
 * (`comfyui`), so one cannot look the other up, and a graph that reaches
 * the engine must be walkable by whoever submits it.
 */
let objectInfo: { nodes: Set<string>; inputs: Map<string, Set<string>> | undefined } | null = null

/** Arm the wall (the card-plane service, when the doc lands). */
export function setObjectInfoDoc(
  nodes: Set<string> | null,
  inputs?: Map<string, Set<string>> | null,
): void {
  objectInfo = nodes === null ? null : { nodes, inputs: inputs ?? undefined }
}

/** The doc as it stands (null = unarmed: the wall stands down). */
export function objectInfoDoc(): { nodes: Set<string>; inputs: Map<string, Set<string>> | undefined } | null {
  return objectInfo
}

/** Walk a graph against the armed doc — THE RUN SEAT'S FENCE CALL
 *  (runsExecute imports this from the package index; unarmed, no
 *  doc, the wall stands down — the standing law). This is not a
 *  submit-time opt: the run seat calls it on the BUILT ROWS before
 *  any engine action, the same fence as its splice refusal. */
export function assertWiringNow(cardId: string, graph: unknown): void {
  if (objectInfo === null) return
  assertWiringAgainst(objectInfo.nodes, objectInfo.inputs, cardId, graph)
}

export function assertWiringAgainst(
  nodes: ReadonlySet<string> | null,
  declaredInputs: ReadonlyMap<string, ReadonlySet<string>> | null | undefined,
  cardId: string,
  graph: unknown,
): void {
  if (nodes === null) return
  if (graph === null || typeof graph !== 'object') return
  for (const [id, node] of Object.entries(graph as Record<string, unknown>)) {
    if (node === null || typeof node !== 'object') continue
    const row = node as { class_type?: unknown; inputs?: unknown }
    const ct = row.class_type
    if (typeof ct !== 'string' || ct === '') {
      throw new ComposeRefusal('unknown-node',
        `card '${cardId}' built node '${id}' with no class_type — the graph is not addressable`)
    }
    if (!nodes.has(ct)) {
      throw new ComposeRefusal('unknown-node',
        `card '${cardId}' wired node class '${ct}' (as '${id}') — no such class lives on the engine (/object_info names none); the card's compose is stale against the engine build`)
    }
    const declared = declaredInputs?.get(ct)
    if (declared === undefined) continue // names-only doc: the input gate waits
    const inputs = row.inputs
    if (inputs === null || typeof inputs !== 'object') continue
    for (const key of Object.keys(inputs as Record<string, unknown>)) {
      if (declared.has(key)) continue
      // A DOTTED WIDGET SUB-KEY IS A DECLARED INPUT (the shipped-graph
      // receipt, 2026-10-10): ComfyUI's /object_info declares a
      // widget by its top-level name and the graph addresses its
      // sub-widgets with a dotted suffix — 'values.a',
      // 'ref_images.ref_image_0', 'format.quality',
      // 'sign_mode.qef'. None of those can ever appear in a doc,
      // so the first cut of this wall refused every music, h3,
      // miniMax and remesh graph the estate has actually shipped.
      // The base segment IS the declaration; the suffix is the
      // widget's own addressing.
      if (declared.has(key.split('.')[0] ?? key)) continue
      // WIDGET-SERIALIZATION KEYS: a small, receipt-named set of
      // keys ComfyUI serializes but never declares (the same
      // receipt). Each one is listed with the node that carries it;
      // this is an allowlist with a reason per entry, never a
      // blanket pass.
      if (WIDGET_SERIALIZATION_KEYS.has(key)) continue
      throw new ComposeRefusal('unknown-input',
        `card '${cardId}' wired '${ct}.${key}' (as '${id}') — the node declares no such input (${[...declared].sort().join(', ')}); the card's compose is stale against the engine build`)
    }
  }
}

/** The widget-serialization keys ComfyUI accepts on the wire but
 *  never lists in `/object_info` — each with the node that proves it
 *  (a landed run in data/runs/output carries the pair):
 *   - `upload` — LoadImage (image lanes: the upload walk stages the
 *     value; the server ignores the key)
 *   - `model_options` — CLIPLoader (audio lanes; restates the default)
 *   - `lora_ui` — LTX_lora_loader (the h3 refine arm; stripped on
 *     some arms and shipped on others)
 *  A name that is not here and not declared is still refused. */
const WIDGET_SERIALIZATION_KEYS: ReadonlySet<string> = new Set([
  'upload',
  'model_options',
  'lora_ui',
])
