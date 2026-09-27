// wiringWall.ts — THE WIRING WALL, ONE OWNER (2026-10-10, the
// bypass audit's HIGH-3).
//
// Every graph that reaches the engine is walked against the doc the
// estate holds: an unknown class_type or an input the node does not
// declare is refused HERE, in the compose door's voice, naming the
// doc — instead of dying at submit in the engine's voice, far from the
// declaration that authored it. The wall used to run only where a CARD
// composed, so a flow merge (which rewrites node ids, namespaces
// wires and resolves $spell AFTER any earlier judgment), a spliced
// workflow, or a hand-authored registry graph reached the engine
// unwalked. The service and the host both call this one function; the
// graph each door produces is the graph each door walks.

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

/** THE WIRING WALL, ONE OWNER (2026-10-10, the bypass audit's
 *  HIGH-3: it was private, so the only graphs it judged were the ones
 *  THIS module composes — a flow merge, a spliced workflow, or a
 *  hand-authored registry graph reached the engine with a renamed
 *  pack's class_type and died there, in the engine's voice, far from
 *  the doc that could have named it. Every graph leaves through a
 *  door, and every door walks this. */
/** Walk a graph against the armed doc (the submit seams' call). */
export function assertWiringAtSubmit(cardId: string, graph: unknown): void {
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
