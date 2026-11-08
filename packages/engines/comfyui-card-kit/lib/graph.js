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
    nodeId;
    slotIndex;
    constructor(nodeId, slotIndex) {
        this.nodeId = nodeId;
        this.slotIndex = slotIndex;
    }
}
export function stripAutofill(graph, table) {
    for (const node of Object.values(graph)) {
        for (const k of table[node.class_type] ?? [])
            delete node.inputs[k];
    }
    return graph;
}
export function stripEmptyAutofill(graph, table) {
    for (const node of Object.values(graph)) {
        for (const k of table[node.class_type] ?? []) {
            if (node.inputs[k] === '')
                delete node.inputs[k];
        }
    }
    return graph;
}
/** Derive the pin autofill map from a live object_info
 *  snapshot: {class: {input: default}} for entries that carry a
 *  default (required + optional both consulted). A null spec row
 *  emits no row (the spec?.input arm — real censuses carry Ghost
 *  rows; pinned by the lanes' missing-and-input-less arm). */
export function deriveDefaults(objectInfo) {
    const out = {};
    for (const [cls, spec] of Object.entries(objectInfo)) {
        const input = spec?.input ?? {};
        const row = {};
        for (const section of [input.required, input.optional]) {
            if (!section)
                continue;
            for (const [name, s] of Object.entries(section)) {
                // spec tail objects carry the default; [type, {default:...}]
                for (const part of Array.isArray(s) ? s.slice(1) : []) {
                    if (part && typeof part === 'object' && !Array.isArray(part) && 'default' in part) {
                        const v = part.default;
                        row[name] = v;
                    }
                }
            }
        }
        if (Object.keys(row).length)
            out[cls] = row;
    }
    return out;
}
export class GraphBuilder {
    /** Per-class instance counters — the /prompt key scheme is
     *  `<ClassName>.<index>`. */
    counters = new Map();
    nodes = {};
    /** The active id prefix (empty at top level; scoped() sets it). */
    prefix = '';
    /** THE FILM SCOPE (2026-09-17, the merged-graph builder): N windows of
     *  one film ride ONE prompt, each under a `window${k}_` namespace,
     *  so seam edges between windows are REAL wires (the executor
     *  orders windows off the graph, never a filesystem convention).
     *  Counters stay global per class — ids never collide across
     *  scopes; the prefix only namespaces. */
    scoped(prefix, fn) {
        const prev = this.prefix;
        this.prefix = prev + prefix;
        try {
            return fn(this);
        }
        finally {
            this.prefix = prev;
        }
    }
    /** Pin defaults (class → input → default value) from the live
     *  live node set. When present, unspecified inputs autofill
     *  from the pin defaults — cards whose renderer strips
     *  autofill ALSO strip in TS (the strip set is
     *  ported per card), so both planes converge byte-equal. */
    defaults;
    constructor(defaults = {}) {
        this.defaults = defaults;
    }
    /** Add a ComfyUI node; returns its output-slot accessor. */
    node(classType, inputs = {}) {
        const n = this.counters.get(classType) ?? 0;
        this.counters.set(classType, n + 1);
        const id = `${this.prefix}${classType}.${n}`;
        const filled = { ...this.autofill(classType), ...inputs };
        this.nodes[id] = { class_type: classType, inputs: filled };
        return { id, out: (slot = 0) => new OutputHandle(id, slot) };
    }
    autofill(classType) {
        const d = this.defaults[classType];
        if (!d)
            return {};
        const out = {};
        for (const [k, v] of Object.entries(d))
            out[k] = v;
        return out;
    }
    /** Serialize to the exact shape ComfyUI's /prompt expects. */
    toJSON() {
        const out = {};
        for (const [id, def] of Object.entries(this.nodes)) {
            const inputs = {};
            for (const [key, val] of Object.entries(def.inputs)) {
                inputs[key] = val instanceof OutputHandle ? [val.nodeId, val.slotIndex] : val;
            }
            out[id] = { class_type: def.class_type, inputs };
        }
        return out;
    }
}
//# sourceMappingURL=graph.js.map
