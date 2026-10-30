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
//
// THE COMPLETENESS GRAMMAR (B7, 2026-10-17 — the h3 inject-keys
// burn's §CURES-OWED 5): the loop above judged only what IS wired;
// the wall now walks the DECLARED side back too. One line: no
// composed node ships a declared-required input without an edge, and
// every optional-XOR pair in the either-or table is satisfied. The
// reverse arm mirrors the engine's own prompt validation
// (required_input_missing — probed live at v0.40.0: a declared
// default never fills a missing key at the engine); the either-or
// table mirrors WIDGET_SERIALIZATION_KEYS' hand discipline for the
// pairs /object_info cannot declare (the RefModExtract av_encoder
// XOR vae, the pack's execute law at nodes.py:1768 — the burn whose
// extract shipped with neither edge and passed every judge that
// existed).

import { Service, type Context, type Plugin } from '@deepseek-ai/cordis'
import { UPLOAD_EXTS } from './comfyui-upload.ts'
import { ComposeRefusal } from '@melite/comfyui-card-kit/errors'

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
  /** The engine's own entry floor for a COMFY_AUTOGROW_V3 input
   *  (`template.min`): 0 means a fully ABSENT input is legal at the
   *  engine (the zero-entry autogrow — TextEncodeQwenImage21.images
   *  on the 2026-11-09 build); 1+ keeps absence a refusal. */
  readonly autogrowMin?: number
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
 *  declaration actually says.
 *
 *  Exported for the wall tier: the vocab-rails drift contract reads
 *  the live cache through THIS parse (both combo spellings, one
 *  derivation) instead of assuming `spec[0]` is the enum array —
 *  the assumption a modern-shaped combo silently breaks.
 *  @param spec the raw input tuple from /object_info
 *  @param required whether the tuple sat in the required group
 *  @returns the parsed value facts (enum present only when the
 *           tuple carries one in either spelling) */
export function parseInputSpec(spec: unknown, required: boolean): WiringInputSpec {
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
      // THE AUTOGROW FLOOR (the 2026-11-09 qwen-img-21 burn): the
      // engine's variable-entry inputs declare their own minimum
      // entry count in template.min — the wall reads the engine's
      // floor, never a stricter one of its own invention. The key
      // rides only when the declaration states it (a spec that says
      // nothing carries nothing).
      const template = head === 'COMFY_AUTOGROW_V3'
        && typeof detail?.template === 'object' && detail.template !== null
        ? detail.template as Record<string, unknown>
        : undefined
      const autogrowMin = typeof template?.min === 'number' ? template.min : undefined
      return autogrowMin === undefined
        ? { required, type: head, min: bound('min'), max: bound('max') }
        : { required, type: head, min: bound('min'), max: bound('max'), autogrowMin }
    }
  }
  return { required }
}

/** One dynamic-combo input's child input names, off its raw
 *  declaration.
 *  THE NESTED WIRE KEYS (the F23 burn, 2026-10-30): a DynamicCombo's
 *  children are CONDITIONAL seats of the node — `/object_info`
 *  declares them nested under `mode`, so a derivation that reads only
 *  the top level refuses exactly the keys the composer emits. They
 *  ride this map as OPTIONAL seats (the node gate must know them; the
 *  completeness grammar must not owe them), and the composer
 *  addresses one with its DOTTED path (`mode.scale`).
 *  THE OTHER HALF OF THE LAW (round-6 audit): a class whose `mode` is
 *  a PLAIN combo declares its child flat and required on the node
 *  itself (MinimaxH3LatentUpscaler3DRefineHandoff's `scale: FLOAT`);
 *  the two spellings are not interchangeable, and each composer
 *  follows its own class's declaration.
 *  @param spec the raw input tuple from /object_info
 *  @returns the child inputs of every option ([name, raw tuple]), or
 *           undefined for a non-dynamic input */
export function dynamicComboChildren(spec: unknown): ReadonlyArray<readonly [string, unknown]> | undefined {
  if (!Array.isArray(spec) || spec.length < 2) return undefined
  if (spec[0] !== 'COMFY_DYNAMICCOMBO_V3') return undefined
  const detail = spec[1]
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) return undefined
  const options = (detail as Record<string, unknown>).options
  if (!Array.isArray(options)) return undefined
  const out: Array<readonly [string, unknown]> = []
  for (const raw of options) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue
    const groups = ((raw as Record<string, unknown>).inputs ?? {}) as Record<string, unknown>
    for (const group of ['required', 'optional'] as const) {
      const children = groups[group]
      if (typeof children !== 'object' || children === null || Array.isArray(children)) continue
      for (const [child, childRaw] of Object.entries(children as Record<string, unknown>)) {
        out.push([child, childRaw])
      }
    }
  }
  return out.length > 0 ? out : undefined
}

/** Derive the census from a raw /object_info body — ONE derivation
 *  shared by every doc-owner (the card-plane service and the
 *  estate registry's prime) so no seat judges a differently-shaped
 *  doc. A names-only snapshot keeps the node gate and skips the
 *  input gate — never a guessed refusal.
 *
 *  A dynamic combo's option children ride the same map as OPTIONAL
 *  seats: the engine expands them at submit, so their ABSENCE is
 *  never the flat arm's finding. */
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
      for (const [key, raw] of Object.entries(rows as Record<string, unknown>)) {
        perNode.set(key, parseInputSpec(raw, group[1]))
        // THE NESTED WIRE KEYS: a dynamic combo's option children
        // are OPTIONAL seats of the same node — the engine expands
        // the selected option's children into top-level wire keys,
        // so the doc must declare them or every legal child refuses
        // unknown-input. A real input is never shadowed; the
        // child keeps the value facts its option declares, and
        // conditional presence (required under the SELECTED option)
        // is the engine's own expansion — this flat arm never owes
        // it.
        for (const [child, childRaw] of dynamicComboChildren(raw) ?? []) {
          if (perNode.has(child)) continue
          perNode.set(child, { ...parseInputSpec(childRaw, false), required: false })
        }
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
    // THE FOLDER-VALUE HINT (friction-report #3, 2026-10-28): a
    // value shaped like a PATH that is not a stageable file is
    // almost always a folder (a run-tree mask-frames dir wired to
    // a single-image seat) — and folders never stage (the upload
    // walk stages files, never directories). The bare "stale
    // compose" suffix sent the agent re-reading the engine build;
    // name the seat-shape miss instead. Fires only for path-like
    // values — bare words keep the old text (pinned verbatim).
    const folderHint = typeof value === 'string' && value.includes('/')
      ? ' — a folder path never stages (the upload walk stages files, never directories); bind one staged file, never the folder'
      : ''
    throw new ComposeRefusal('bad-value',
      `card '${cardId}' wired '${ct}.${key}' = ${JSON.stringify(value)} (as '${id}') — the input allows ${fmtEnum(spec.enum)}${folderHint}; the card's compose is stale against the engine build`)
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
    if (inputs === undefined) {
      // THE REVERSE ARM sees the absent row too (B7): a node whose
      // class declares required inputs cannot ship no inputs row at
      // all — that is every required input missing at once. A class
      // declaring none (optionals only) still stands down here.
      assertRequiredEdges(cardId, id, ct, declared, EMPTY_WIRED)
      continue
    }
    // A present-but-malformed inputs row REFUSES (the audit's
    // second fail-open): a node's inputs are a key→value object.
    if (inputs === null || typeof inputs !== 'object' || Array.isArray(inputs)) {
      throw new ComposeRefusal('malformed-graph',
        `card '${cardId}' wired node '${id}' (${ct}) with a non-object inputs row — a node's inputs are a key-to-value object (refused at the wiring wall, never at the engine)`)
    }
    const wired = inputs as Record<string, unknown>
    for (const [key, value] of Object.entries(wired)) {
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
    // THE REVERSE ARM and THE EITHER-OR ARM run after the forward
    // pass — the wired keys judge first, so an undeclared key still
    // refuses unknown-input before the completeness grammar
    // speaks (the h3 door's bare-ref_image_1 red-proof order).
    assertRequiredEdges(cardId, id, ct, declared, wired)
    assertEitherOrRows(cardId, id, ct, wired)
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
 *  A name that is not here and not declared is still refused.
 *  Exported so the key judge (the liveness wall's card/action sweep)
 *  honors the SAME receipt — one allowlist, every key-depth judge. */
export const WIDGET_SERIALIZATION_KEYS: ReadonlySet<string> = new Set([
  'upload',
  'model_options',
  'lora_ui',
])

/** The wired-keys view of a node with no inputs row at all (the
 *  reverse arm's absent-row seat — nothing wired, everything owed). */
const EMPTY_WIRED: Record<string, unknown> = {}

/**
 * THE EITHER-OR TABLE (B7 — the receipt-named either-or, the h3
 * inject-keys burn's §CURES-OWED 5).
 *
 * THE COMPLETE CONTRACT: the wall one-liner it serves is "no composed
 * node ships a declared-required input without an edge, and every
 * optional-XOR pair in the table is satisfied." The reverse arm owns
 * the first half; this table owns the second — inputs a node's
 * EXECUTE law ties together but `/object_info` declares each
 * optional-alone (the doc grammar has no XOR group, so no derivation
 * can carry these rows; the pack's own execute law is the truth and
 * this hand table is its mirror).
 *
 * WHY HAND, LIKE WIDGET_SERIALIZATION_KEYS: an allowlist with a
 * reason and a voice per entry, never a blanket pass — a node not in
 * the table is judged by nothing here.
 *
 * WHERE THE LAW LIVES, per entry (the node that proves it):
 *  - `MiniMaxH3RefModExtract` — `av_encoder` XOR `vae`, the pack's
 *    execute law at vendor/comfyui_extensions/ComfyUI-MiniMaxH3Mod/
 *    nodes.py:1768:
 *    `if av_encoder is None and vae is None: raise ValueError(
 *    "MiniMaxH3RefModExtract: connect an av_encoder (MiniMax-H3
 *    VAE loader) or a standard VAE.")` — at least ONE of the pair
 *    must carry an edge (both connected is legal; `_resolve_visual_vae`
 *    prefers the standard vae). The 2026-11-06 live burn: the visual
 *    refmod extract shipped with NEITHER, passed every required-and-
 *    unknown judge (both inputs are schema-optional), and died in the
 *    node's execute at run time. The engine's sentence is carried
 *    verbatim as the row's `voice` — the refusal at compose reads the
 *    engine's own words.
 */
interface EitherOrRow {
  /** The pair: at least one of the two must be wired. */
  readonly pair: readonly [string, string]
  /** The law's own sentence, carried verbatim into the refusal. */
  readonly voice: string
}

const EITHER_OR_ROWS: ReadonlyMap<string, ReadonlyArray<EitherOrRow>> = new Map([
  ['MiniMaxH3RefModExtract', [
    {
      pair: ['av_encoder', 'vae'],
      voice: 'MiniMaxH3RefModExtract: connect an av_encoder (MiniMax-H3 VAE loader) or a standard VAE.',
    },
  ]],
])

/** THE REVERSE ARM (the completeness grammar, B7): every built node's
 *  /object_info-declared REQUIRED inputs must carry an edge — appear
 *  in the node's inputs row. The forward loop above judges what IS
 *  wired; this arm judges what is OWED. The engine's own prompt
 *  validation is the law's depth: `required_input_missing` refuses a
 *  prompt whose node omits ANY declared-required input, defaulted or
 *  not (probed live against v0.40.0 — a declared default never fills
 *  a missing key at the engine), so the wall refuses exactly what the
 *  engine would refuse, HERE, naming the node and the input. The
 *  estate's compose builder carries its half: GraphBuilder autofills
 *  the declared defaults from the same doc (the card-plane service's
 *  pinDefaults), so a lawful compose row always carries them; a row
 *  that ships short is a stale compose. Runs before the either-or
 *  pass (completeness first, then the pair table). */
function assertRequiredEdges(
  cardId: string,
  id: string,
  ct: string,
  declared: ReadonlyMap<string, WiringInputSpec>,
  wired: Record<string, unknown>,
): void {
  // a dotted sub-widget key ('values.a') carries its declared base
  // input's edge — the same base-segment law the forward pass reads
  const bases = new Set(Object.keys(wired).map((key) => key.split('.')[0]))
  for (const [key, spec] of declared) {
    if (!spec.required) continue
    // A ZERO-ENTRY AUTOGROW IS LEGAL (the engine's own template
    // floor, 2026-11-09): an input declared COMFY_AUTOGROW_V3 with
    // template.min 0 — TextEncodeQwenImage21.images on the live
    // build — is satisfied by absence; the engine accepts the prompt
    // and this wall never states a law the engine does not.
    if (spec.autogrowMin === 0) continue
    if (Object.hasOwn(wired, key) || bases.has(key)) continue
    throw new ComposeRefusal('missing-required',
      `card '${cardId}' built node '${id}' (${ct}) without its declared-required input '${key}' — /object_info declares it required and the engine refuses the prompt without it (required input is missing); the card's compose is stale against the engine build`)
  }
}

/** THE EITHER-OR ARM (B7): every row in EITHER_OR_ROWS must find at
 *  least one of its pair wired on the node. A node the table does not
 *  name is judged by nothing here. */
function assertEitherOrRows(
  cardId: string,
  id: string,
  ct: string,
  wired: Record<string, unknown>,
): void {
  const rows = EITHER_OR_ROWS.get(ct)
  if (rows === undefined) return
  for (const { pair, voice } of rows) {
    const [a, b] = pair
    if (Object.hasOwn(wired, a) || Object.hasOwn(wired, b)) continue
    throw new ComposeRefusal('missing-required',
      `card '${cardId}' built node '${id}' (${ct}) with neither '${a}' nor '${b}' — the engine refuses the prompt: ${voice}`)
  }
}
