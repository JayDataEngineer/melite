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
//
// THE VALUE GATE (the strictness audit's T2, 2026-10-12): the doc
// carries VALUES, not names alone — a declared input's combo enum
// and numeric bounds are judged at every seat, in the declaring
// door's voice, naming the allowed set. Three carve-outs keep the
// wall honest: connection references (an array value is another
// node's output), staged-artifact strings (the upload walk
// rewrites them to server names after every seat — see
// isStagedArtifactRef), and $-prefixed merge-seam spells (the run
// seat walks pre-splice rows; rewriteSpells resolves them before
// the engine). A malformed graph, node row, or inputs row refuses
// here; the wall never stands down on the one shape it exists to
// judge.

import { Service, type Context, type Plugin } from '@deepseek-ai/cordis'
import { UPLOAD_EXTS } from './comfyui-upload.ts'
import { ComposeRefusal } from './errors.ts'

/** One input's declared facts off `/object_info` — the doc carries
 *  VALUES, not names alone (the strictness audit's T2): the
 *  required flag, the declared type name (`INT`, `FLOAT`,
 *  `STRING`, `BOOLEAN`, or a connection type), the combo enum when
 *  the input is a combo, and the numeric bounds when the
 *  declaration states them. A names-only consumer reads nothing
 *  but the key. */
export interface WiringInputSpec {
  readonly required: boolean
  readonly type?: string
  readonly enum?: ReadonlyArray<string | number | boolean>
  readonly min?: number
  readonly max?: number
}

/** The engine's declared-node census, derived from /object_info:
 *  node names and, per node, its DECLARED inputs (required ∪
 *  optional — the doc's own truth, value facts attached). */
export interface WiringDoc {
  readonly nodes: ReadonlySet<string>
  readonly inputs: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>> | undefined
}

function isPrimitive(v: unknown): v is string | number | boolean {
  const t = typeof v
  return t === 'string' || t === 'number' || t === 'boolean'
}

/** One `/object_info` input tuple → its value facts. The tuple's
 *  first element is the combo enum (an array) or the type name (a
 *  string); an object second element carries `min`/`max` for
 *  numerics. ComfyUI ≥ 0.38 also spells combos as a string head
 *  with the enum in the detail object — `["COMBO", {options}]` and
 *  `["COMFY_DYNAMICCOMBO_V3", {options: [{key}, …]}]` — which the
 *  video sweep (2026-10-13, F1) proved the string-head arm alone
 *  stood down on: a shape the declaration does not say contributes
 *  the required flag alone — the wall judges only what the
 *  declaration actually says. */
function parseInputSpec(spec: unknown, required: boolean): WiringInputSpec {
  if (Array.isArray(spec) && spec.length > 0) {
    const head: unknown = spec[0]
    if (Array.isArray(head)) {
      return { required, enum: head.filter(isPrimitive) }
    }
    if (typeof head === 'string') {
      const detail = spec.length > 1 && typeof spec[1] === 'object' && spec[1] !== null && !Array.isArray(spec[1])
        ? (spec[1] as Record<string, unknown>)
        : undefined
      if ((head === 'COMBO' || head === 'COMFY_DYNAMICCOMBO_V3') && Array.isArray(detail?.options)) {
        const enumFromOptions = detail.options
          .map((o: unknown): string | number | boolean | undefined =>
            isPrimitive(o)
              ? o
              : o !== null && typeof o === 'object' && isPrimitive((o as Record<string, unknown>).key)
                ? (o as Record<string, unknown>).key as string | number | boolean
                : undefined)
          .filter((o): o is string | number | boolean => o !== undefined)
        if (enumFromOptions.length > 0) {
          return { required, enum: enumFromOptions }
        }
      }
      const bound = (k: string): number | undefined =>
        typeof detail?.[k] === 'number' ? (detail[k] as number) : undefined
      return { required, type: head, min: bound('min'), max: bound('max') }
    }
  }
  return { required }
}

/** Derive the census from a raw /object_info body — ONE derivation
 *  shared by every doc-owner (the card-plane service and the
 *  estate registry's prime) so no seat judges a differently-shaped
 *  doc. A names-only snapshot keeps the node gate and skips the
 *  input gate — never a guessed refusal. */
export function deriveWiringDoc(
  objectInfo: Record<string, unknown>,
): { nodes: Set<string>; inputs: Map<string, Map<string, WiringInputSpec>> } {
  const inputs = new Map<string, Map<string, WiringInputSpec>>()
  for (const [name, def] of Object.entries(objectInfo)) {
    const decl = (def as { input?: { required?: unknown; optional?: unknown } } | null)?.input
    const perNode = new Map<string, WiringInputSpec>()
    for (const group of [['required', true], ['optional', false]] as const) {
      const rows = decl?.[group[0]]
      if (typeof rows !== 'object' || rows === null) continue
      for (const key of Object.keys(rows)) {
        perNode.set(key, parseInputSpec((rows as Record<string, unknown>)[key], group[1]))
      }
    }
    inputs.set(name, perNode)
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
  arm(
    nodes: ReadonlySet<string>,
    inputs?: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>> | null,
  ): void {
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

const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/i

/** Whether a string value is a STAGED-ARTIFACT REFERENCE — a URL
 *  scheme (data:, http:, https:, the asset routes' references) or
 *  a path ending in one of the upload walk's stageable
 *  extensions. The upload walk rewrites exactly these values to
 *  server-side names AFTER every walk seat (uploadReferenced runs
 *  inside execute), and a rewritten value is always a FILENAME
 *  STRING — so the carve-out in judgeValue applies only where a
 *  filename can legally land: an enum carrying string members
 *  (the dynamic upload combos) or an input with no enum at all.
 *  On a numeric-or-boolean-only enum the artifact shape still
 *  judges (T2's residual, 2026-10-12: a stale compose that wired
 *  a filename into a mode picker used to escape). The extension
 *  table mirrors comfyui-upload's (ONE owner of the list). */
function isStagedArtifactRef(v: string): boolean {
  if (SCHEME_PREFIX.test(v)) return true
  const lower = v.toLowerCase()
  return UPLOAD_EXTS.some((e) => lower.endsWith(e))
}

/** Whether a rewritten staged artifact could legally land in this
 *  input: no enum (nothing to judge), or string members present
 *  (the dynamic upload combos accept new filenames by design). */
function canReceiveStagedArtifact(spec: WiringInputSpec): boolean {
  return spec.enum === undefined || spec.enum.some((m) => typeof m === 'string')
}

/** Render an enum for a refusal — every value named, capped at
 *  twenty with the remainder counted (a model list can run to
 *  hundreds; the refusal still says how many). */
function fmtEnum(values: ReadonlyArray<string | number | boolean>): string {
  const shown = values.slice(0, 20).map((v) => JSON.stringify(v)).join(', ')
  const head = `${values.length} values (${shown}`
  return values.length > 20 ? `${head} … +${values.length - 20} more)` : `${head})`
}

/** THE VALUE GATE (the strictness audit's T2: a names-only wall
 *  judged nothing a graph actually SAID). A declared input's
 *  primitive value is judged against the facts its own declaration
 *  carries: a combo enum by membership, a numeric by its declared
 *  bounds. Three values never reach judgment: connection
 *  references (an array — the value is another node's output,
 *  judged by the link seam), staged-artifact strings where a
 *  rewritten filename could legally land (the upload walk's
 *  carve-out above), and $-prefixed merge-seam spells (the
 *  run seat walks pre-splice rows; rewriteSpells turns every
 *  spell into a link tuple or a request initial before the engine
 *  — a spell is never an enum member by construction). */
/** Mixed-type combo membership (the video sweep's F1, 2026-10-13):
 *  modern option lists mix strings and numbers — CreateVideo's
 *  bit_depth is `["auto", 8, 10]` — while the compose layer
 *  serializes widget values as strings, and the engine accepts the
 *  string spelling of a numeric member. Membership therefore
 *  matches a numeric member by its string form; a string member is
 *  never matched by a number (the engine does not coerce that
 *  direction, and the wall is never looser than the engine it
 *  guards). */
function enumHas(values: ReadonlyArray<string | number | boolean>, value: string | number | boolean): boolean {
  return values.some((m) =>
    m === value
    || (typeof m === 'number' && typeof value === 'string' && String(m) === value))
}

function judgeValue(
  cardId: string,
  id: string,
  ct: string,
  key: string,
  value: unknown,
  spec: WiringInputSpec,
): void {
  if (!isPrimitive(value)) return
  if (typeof value === 'string' && (value.startsWith('$') || (isStagedArtifactRef(value) && canReceiveStagedArtifact(spec)))) return
  if (spec.enum !== undefined && !enumHas(spec.enum, value)) {
    throw new ComposeRefusal('bad-value',
      `card '${cardId}' wired '${ct}.${key}' = ${JSON.stringify(value)} (as '${id}') — the input allows ${fmtEnum(spec.enum)}; the card's compose is stale against the engine build`)
  }
  if (typeof value === 'number') {
    const bound = spec.min !== undefined && value < spec.min
      ? `below its declared min ${spec.min}`
      : spec.max !== undefined && value > spec.max
        ? `above its declared max ${spec.max}`
        : ''
    if (bound !== '') {
      throw new ComposeRefusal('bad-value',
        `card '${cardId}' wired '${ct}.${key}' = ${value} (as '${id}') — the input is ${spec.type ?? 'a number'} and the value is ${bound}; the card's compose is stale against the engine build`)
    }
  }
}

export function assertWiringAgainst(
  nodes: ReadonlySet<string> | null,
  declaredInputs: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>> | null | undefined,
  cardId: string,
  graph: unknown,
): void {
  if (nodes === null) return
  // A malformed graph REFUSES (the strictness audit's T2 fail-open:
  // standing the wall down on the one shape it exists to judge).
  // The engine's graph is an object keyed by node id — never an
  // array, never a bare value.
  if (graph === null || typeof graph !== 'object' || Array.isArray(graph)) {
    throw new ComposeRefusal('malformed-graph',
      `card '${cardId}' built no addressable graph — a graph is an object keyed by node id (refused at the wiring wall, never at the engine)`)
  }
  for (const [id, node] of Object.entries(graph as Record<string, unknown>)) {
    // A null/bare node row refuses named (the third T2 fail-open,
    // closed with the audit's two): a node is an object carrying
    // class_type — never a bare value riding under an id.
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      throw new ComposeRefusal('malformed-graph',
        `card '${cardId}' built node '${id}' as a bare ${Array.isArray(node) ? 'array' : String(node)} — a node is an object carrying class_type (refused at the wiring wall, never at the engine)`)
    }
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
    if (inputs === undefined) continue // nothing wired: nothing to judge
    // A present-but-malformed inputs row REFUSES (the audit's
    // second fail-open): a node's inputs are a key→value object.
    if (inputs === null || typeof inputs !== 'object' || Array.isArray(inputs)) {
      throw new ComposeRefusal('malformed-graph',
        `card '${cardId}' wired node '${id}' (${ct}) with a non-object inputs row — a node's inputs are a key-to-value object (refused at the wiring wall, never at the engine)`)
    }
    for (const [key, value] of Object.entries(inputs as Record<string, unknown>)) {
      const spec = declared.get(key)
      if (spec !== undefined) {
        judgeValue(cardId, id, ct, key, value, spec)
        continue
      }
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
      // (split on a string always yields a first segment, so the
      // base segment needs no fallback)
      if (declared.has(key.split('.')[0])) continue
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
