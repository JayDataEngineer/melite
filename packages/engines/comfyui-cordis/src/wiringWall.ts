// wiringWall.ts — THE WIRING WALL, ONE OWNER (2026-10-10; reseated
// twice by the operator's law: ON SUBMIT IS A HACK, then A WALL
// THAT IS DEAD IN PRODUCTION IS NOT A WALL).
//
// Every graph that reaches the engine is walked against the doc the
// estate holds: an unknown class_type or an input the node does not
// declare is refused HERE, in the declaring door's voice, naming the
// doc — instead of dying at the engine, in the engine's voice, far
// from the declaration that authored it.
//
// THE THREE WALK SEATS (the schema system, not a submit-time opt):
//   1. the card-compose seat walks at COMPOSE (service.assertWiring
//      — a bad card graph never reaches a run);
//   2. the RUN seat walks the BUILT ROWS in its pre-flight
//      (runsExecute's wiring fence, every path: start, restore,
//      queue replay — no seat-branch gate);
//   3. the ENGINES ADAPTER walks the POST-SPLICE graph (the seat
//      the production estate actually submits through) before the
//      host's executeFlow — the walk that judges the final graph,
//      splice and all.
// The first shape threaded an opt through ONE engine submit call;
// its default crashed a live run as `ReferenceError:
// assertWiringAtSubmit is not defined`, and the operator named the
// shape for what it was: a wall someone remembered to build at one
// door is not the schema system. The judge stayed; the opt is gone.
//
// THE ARMING LAW (the second reseat, same day — the audit's
// finding): the doc handle was module state armed by the card-plane
// service — a service the estate bundle never mounts — so on the
// live lane the wall was UNARMED on every path and DEAD on the seat
// path twice over. Engine state that two seats must share is not
// module state: it is a CONTEXT SERVICE under its own name
// (comfyuiWiring), provided by this package's entry, armed by
// whoever lands /object_info (the card-plane service; the estate
// registry's per-compose prime), read at walk time by every seat.
// Both `comfyui` classes reach it by name — the very reason the
// module global existed ("the two classes share the seat name, so
// one cannot look the other up") is the thing the service name
// dissolves. A composition that does not mount the provider reads
// undefined and the wall stands down — the standing law, now
// Cordis's own `undefined when not (yet) provided` semantics
// instead of a hand-rolled null.

import { Service, type Context, type Plugin } from '@deepseek-ai/cordis'
import { ComposeRefusal } from './errors.ts'

/** The engine's declared-node census, derived from /object_info:
 *  node names and, per node, its DECLARED input names (required ∪
 *  optional — the doc's own truth). */
export interface WiringDoc {
  readonly nodes: ReadonlySet<string>
  readonly inputs: ReadonlyMap<string, ReadonlySet<string>> | undefined
}

/** Derive the census from a raw /object_info body — ONE derivation
 *  shared by every doc-owner (the card-plane service and the
 *  estate registry's prime) so no seat judges a differently-shaped
 *  doc. A names-only snapshot keeps the node gate and skips the
 *  input gate — never a guessed refusal. */
export function deriveWiringDoc(
  objectInfo: Record<string, unknown>,
): { nodes: Set<string>; inputs: Map<string, Set<string>> } {
  const inputs = new Map<string, Set<string>>()
  for (const [name, def] of Object.entries(objectInfo)) {
    inputs.set(
      name,
      new Set([
        ...Object.keys((def as any)?.input?.required ?? {}),
        ...Object.keys((def as any)?.input?.optional ?? {}),
      ]),
    )
  }
  return { nodes: new Set(Object.keys(objectInfo)), inputs }
}

/**
 * THE WIRING DOC SERVICE (seat name `comfyuiWiring`).
 *
 * The context-scoped home of the census: armed by whoever lands
 * /object_info, read at walk time by the three seats. Provided by
 * `comfyuiWiringProvider`; absent in a composition, `ctx.get`
 * answers undefined and every wall stands down (documented,
 * loud in the provider's absence, never a guessed refusal).
 */
export class ComfyUIWiringService extends Service {
  private doc: WiringDoc | null = null

  constructor(ctx: Context) {
    super(ctx, 'comfyuiWiring')
  }

  /** Arm the wall (a doc-owner, when /object_info lands). */
  arm(nodes: ReadonlySet<string>, inputs?: ReadonlyMap<string, ReadonlySet<string>> | null): void {
    this.doc = { nodes, inputs: inputs ?? undefined }
  }

  /** Disarm (a doc-owner whose fetch failed — unarmed, the wall
   *  stands down; the null doc never judges). */
  disarm(): void {
    this.doc = null
  }

  /** Whether a doc is armed (census/tests — never a gate). */
  armed(): boolean {
    return this.doc !== null
  }

  /** Walk a graph against the armed doc — THE SEATS' FENCE CALL.
   *  Unarmed, no doc, the wall stands down: the standing law. */
  assert(cardId: string, graph: unknown): void {
    if (this.doc === null) return
    assertWiringAgainst(this.doc.nodes, this.doc.inputs, cardId, graph)
  }
}

/** The provider: mounts the wiring service. Mount BEFORE the host
 *  and the engines adapter (the estate bundle's row order) so both
 *  `comfyui` classes and the run seat read it from first submit. */
export const comfyuiWiringProvider: Plugin = {
  name: 'comfyui-wiring',
  apply(ctx: Context): void {
    new ComfyUIWiringService(ctx)
  },
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
