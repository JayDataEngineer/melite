// Tier 1 — the handle-based graph builder (Law 0 amendment,
// 2026-09-07). The estate's compose plane speaks ComfyUI's /prompt
// API graph: { "<id>": { class_type, inputs: { ... } } } where a
// wired input is ["<source-id>", slot]. No integer tracking —
// creation order IS the id, wires are OutputHandles.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, no namespaces. Row-shaped code wants neither.

/** A wire endpoint: the output slot of an already-added node. */
export class OutputHandle {
  readonly nodeId: string
  readonly slotIndex: number
  constructor(nodeId: string, slotIndex: number) {
    this.nodeId = nodeId
    this.slotIndex = slotIndex
  }
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }
export type NodeInputs = Record<string, JsonValue | OutputHandle>
/** The node() sink: the /prompt wire is untyped JSON (validation
 *  lives in the admission gate + object_info autofill, never in TS
 *  assignability — the serializer already coerces per value). */
export type NodeInputsLoose = Record<string, unknown>

/** The serialized /prompt graph — plain JSON, nothing more. */
export type PromptGraph = Record<string, { class_type: string; inputs: Record<string, JsonValue> }>

/** Accessor returned by node(): call .out(slot) for a wire handle. */
export interface NodeRef {
  readonly id: string
  out(slot?: number): OutputHandle
}

export type StripTable = Record<string, readonly string[]>

export function stripAutofill(graph: PromptGraph, table: StripTable): PromptGraph {
  for (const node of Object.values(graph)) {
    for (const k of table[node.class_type] ?? []) delete node.inputs[k]
  }
  return graph
}

export function stripEmptyAutofill(graph: PromptGraph, table: StripTable): PromptGraph {
  for (const node of Object.values(graph)) {
    for (const k of table[node.class_type] ?? []) {
      if (node.inputs[k] === '') delete node.inputs[k]
    }
  }
  return graph
}

/** Derive comfy-script's autofill map from a live object_info
 *  snapshot: {class: {input: default}} for entries that carry a
 *  default (required + optional both consulted). */
export function deriveDefaults(objectInfo: Record<string, any>): Record<string, Record<string, JsonValue>> {
  const out: Record<string, Record<string, JsonValue>> = {}
  for (const [cls, spec] of Object.entries(objectInfo)) {
    const input = (spec as any)?.input ?? {}
    const row: Record<string, JsonValue> = {}
    for (const section of [input.required, input.optional]) {
      if (!section) continue
      for (const [name, s] of Object.entries(section as Record<string, any>)) {
        // spec tail objects carry the default; [type, {default:...}]
        for (const part of Array.isArray(s) ? s.slice(1) : []) {
          if (part && typeof part === 'object' && 'default' in part) {
            const v = (part as any).default
            row[name] = typeof v === 'object' && v !== null ? (v as JsonValue) : v
          }
        }
      }
    }
    if (Object.keys(row).length) out[cls] = row
  }
  return out
}

export class GraphBuilder {
  /** Per-class instance counters — the /prompt key scheme is
   *  `<ClassName>.<index>`. */
  private readonly counters = new Map<string, number>()
  private readonly nodes: Record<string, { class_type: string; inputs: NodeInputs }> = {}
  /** The active id prefix (empty at top level; scoped() sets it). */
  private prefix = ''
  /** THE FILM SCOPE (2026-09-17, the merged-graph builder): N windows of
   *  one film ride ONE prompt, each under a `window${k}_` namespace,
   *  so seam edges between windows are REAL wires (the executor
   *  orders windows off the graph, never a filesystem convention).
   *  Counters stay global per class — ids never collide across
   *  scopes; the prefix only namespaces. */
  scoped<T>(prefix: string, fn: (b: GraphBuilder) => T): T {
    const prev = this.prefix
    this.prefix = prev + prefix
    try {
      return fn(this)
    } finally {
      this.prefix = prev
    }
  }

  /** Pin defaults (class → input → default value) from the live
   *  live node set. When present, unspecified inputs autofill
   *  exactly like comfy-script does — cards whose renderer strips
   *  autofill ALSO strip in TS (the strip set is
   *  ported per card), so both planes converge byte-equal. */
  readonly defaults: Record<string, Record<string, JsonValue>>

  constructor(defaults: Record<string, Record<string, JsonValue>> = {}) {
    this.defaults = defaults
  }

  /** Add a ComfyUI node; returns its output-slot accessor. */
  node(classType: string, inputs: NodeInputsLoose = {}): NodeRef {
    const n = this.counters.get(classType) ?? 0
    this.counters.set(classType, n + 1)
    const id = `${this.prefix}${classType}.${n}`
    const filled: NodeInputs = { ...this.autofill(classType), ...(inputs as NodeInputs) }
    this.nodes[id] = { class_type: classType, inputs: filled }
    return { id, out: (slot = 0) => new OutputHandle(id, slot) }
  }

  private autofill(classType: string): NodeInputs {
    const d = this.defaults[classType]
    if (!d) return {}
    const out: NodeInputs = {}
    for (const [k, v] of Object.entries(d)) out[k] = v
    return out
  }

  /** Serialize to the exact shape ComfyUI's /prompt expects. */
  toJSON(): PromptGraph {
    const out: PromptGraph = {}
    for (const [id, def] of Object.entries(this.nodes)) {
      const inputs: Record<string, JsonValue> = {}
      for (const [key, val] of Object.entries(def.inputs)) {
        inputs[key] = val instanceof OutputHandle ? [val.nodeId, val.slotIndex] : (val as JsonValue)
      }
      out[id] = { class_type: def.class_type, inputs }
    }
    return out
  }
}
