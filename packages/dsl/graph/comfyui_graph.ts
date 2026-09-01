// ComfyUI graph-composition DSL — the TypeScript port of ComfyScript's
// NodeOutput + api_format() reference-chaining model.
//
// ComfyUI's wire API is plain JSON: `POST /prompt` with a body of
//
//   { "prompt": { "<node_id>": { "class_type": "...", "inputs": {...} } } }
//
// This module lets a builder compose that flat dict *declaratively*:
//
//  1. Discover callable node factories from a GET /object_info payload
//     (passed in as a plain JS object — we do NO HTTP / file I/O here).
//  2. Call a factory with named inputs (or positional in required→optional
//     order, like ComfyScript) to obtain one or more NodeOutput objects.
//  3. Thread those NodeOutputs into downstream inputs as *references*.
//  4. Call api_format() on a root output to emit the flat dict with
//     auto-assigned sequential integer node ids (1..N in discovery order),
//     reusing shared intermediate outputs exactly once.
//
// Pure composition — the graph is just data. The caller retains the
// object_info and owns the HTTP submission.
//
// Typical usage (maps 1:1 onto the ComfyScript flow):
//
//   const nodes = createComfyUI(objectInfo);            // discovery
//   const [model, clip, vae] = nodes.CheckpointLoaderSimple({ ckpt_name });
//   const [model, clip] = applyLoras(nodes, model, clip, loras);
//   const positive = nodes.CLIPTextEncode({ text, clip });
//   const negative = nodes.CLIPTextEncode({ text, clip });
//   const latent = nodes.EmptyLatentImage({ width, height, batch_size });
//   const sampled = nodes.KSampler({ model, positive, negative, latent_image: latent, ... });
//   const decoded = nodes.VAEDecode({ samples: sampled, vae });
//   const output = nodes.SaveImage({ images: decoded, filename_prefix });
//   const flat = output.api_format();          // the POST /prompt body
//

// ────────────────────────────────────────────────────────────────────────────
// /object_info shapes (the portion the DSL consumes)
// ────────────────────────────────────────────────────────────────────────────

export interface ObjectInfoInputGroups {
  required?: Record<string, unknown>;
  optional?: Record<string, unknown>;
}

export interface ObjectInfoEntry {
  name: string;
  input?: ObjectInfoInputGroups;
  output?: unknown[];
  output_node?: boolean;
  [k: string]: unknown;
}

export type ObjectInfo = Record<string, ObjectInfoEntry>;

// A literal that can sit in an input slot (numbers/strings/booleans/arrays
// and plain nested JSON-like values serialize as-is; null/undefined are
// dropped at call time like ComfyScript does).
export type ComfyLiteral =
  | string
  | number
  | boolean
  | null
  | ComfyLiteral[]
  | { [k: string]: ComfyLiteral };

// A concrete, reusable node instance inside the composed graph.
interface NodeRecord {
  /** /object_info `name` → the `class_type` on the wire. */
  readonly classType: string;
  readonly inputs: Record<string, InputValue>;
  /** Raw output-type names from /object_info `output`. */
  readonly outputTypes: readonly string[];
}

// A value that may be placed in a node's input slot: a literal, or a
// reference to another node's output.
export type InputValue = NodeOutput | ComfyLiteral;

// A named-input bundle handed to a node factory.
export type NodeInputMap = Record<string, InputValue>;

// Serialized wire form of a node's input after api_format().
export type SerializedInput =
  | string
  | number
  | boolean
  | null
  | SerializedInput[]
  | { [k: string]: SerializedInput }
  | [string, number]; // [node_id, output_index] — ComfyScript ClassName.N id

// The flat ComfyUI POST /prompt `prompt` body. Keys are integer node ids
// (object keys are strings on the wire, but the numeric id is meaningful).
export interface ComfyNodeDef {
  class_type: string;
  inputs: Record<string, SerializedInput>;
}
export type ComfyApiFormat = Record<string, ComfyNodeDef>;

// ────────────────────────────────────────────────────────────────────────────
// NodeOutput — a reference to a node's output (optionally carrying a value)
// ────────────────────────────────────────────────────────────────────────────

/**
 * A single output of a composed node (or, when `value` is set, a literal
 * output wrapper). Pass a NodeOutput into a downstream input to chain a
 * *reference*; api_format() walks the graph from the root outputs and turns
 * each reference into `[<node_id>, <output_index>]`.
 *
 * Mirrors ComfyScript's `NodeOutput` (`runtime/data/__init__.py`).
 */
export class NodeOutput {
  /** The node's output type name (from /object_info `output[index]`). */
  readonly type: string;
  /** Source node + output index. `null` when this wraps a raw value. */
  readonly ref: { node: NodeRecord; index: number } | null;
  /** Literal value carried by this output (undefined for plain refs). */
  readonly value: ComfyLiteral | undefined;

  constructor(
    type: string,
    ref: { node: NodeRecord; index: number } | null,
    value?: ComfyLiteral,
  ) {
    this.type = type;
    this.ref = ref;
    this.value = value;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Node factory + the graph client
// ────────────────────────────────────────────────────────────────────────────

/**
 * A callable node factory. Accepts either positional inputs followed by an
 * optional trailing named-input object, or just a single named-input object:
 *
 *   nodes.EmptyLatentImage(1024, 1024, 1)        // positional
 *   nodes.EmptyLatentImage({ width: 1024, height: 1024, batch_size: 1 })
 *
 * Positional args map to the required→optional input order declared in
 * /object_info (ComfyScript `_positional_args_to_keyword`). Returns a single
 * NodeOutput for single-output nodes, or an array (index-aligned) for
 * multi-output nodes — matching ComfyScript tuple unpacking.
 */
export interface NodeFactory {
  (...args: unknown[]): NodeOutput | NodeOutput[];
}

/**
 * The composed-graph client — mirrors ComfyScript's `nodes` module, built
 * from a GET /object_info payload. Every discovered node class is exposed as
 * a callable factory under its /object_info name.
 */
export type ComfyUI = Record<string, NodeFactory>;

/**
 * ComfyScript's Python-attribute name for a raw /object_info class name:
 * `X_y` → `XY` (each `_` joins with the next segment capitalized), e.g.
 * `TextEncodeQwenImageEditPlusAdvance_lrzjason` →
 * `TextEncodeQwenImageEditPlusAdvanceLrzjason`. Python builders address
 * nodes by this sanitized name; the wire `class_type` stays the RAW name.
 */
export function comfyScriptKey(raw: string): string {
  // astutil.str_to_raw_id: non-[A-Za-z_0-9] → '_', collapse runs, strip
  // trailing, then id_to_camel: first char upper + _X → X.
  const id = raw
    .replace(/[^A-Za-z_0-9]/g, "_")
    .replace(/__+/g, "_")
    .replace(/_+$/, "");
  const camel = id.slice(0, 1).toUpperCase() + id.slice(1);
  return camel.replace(/_([a-zA-Z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Look up a node factory by its ComfyScript (sanitized) name — the access
 * pattern Python builders use (`nodes.TextEncodeQwenImageEditPlusAdvanceLrzjason`).
 * Returns undefined when no raw object_info key maps to that name (Python's
 * `hasattr(nodes, ...)` check).
 */
export function nodeByName(
  nodes: ComfyUI,
  comfyScriptName: string,
): NodeFactory | undefined {
  if (nodes[comfyScriptName]) return nodes[comfyScriptName];
  for (const [raw, factory] of Object.entries(nodes)) {
    if (comfyScriptKey(raw) === comfyScriptName) return factory;
  }
  return undefined;
}

// ── Bool-enum unification (port of comfy_script/runtime/factory.py) ───────
// Custom-node combos like ["enable", "disable"] / ["on", "off"] /
// ["true", "false"] / ["yes", "no"] (and literal [false, true]) are
// treated as BOOLEAN inputs: callers pass true/false and the factory
// converts to the enum string. "To unify the chaos situation of bool
// enums used by different custom nodes" (ComfyScript factory.py).

const BOOL_ENUM_SETS = [
  new Set(["enable", "disable"]),
  new Set(["on", "off"]),
  new Set(["true", "false"]),
  new Set(["yes", "no"]),
];

/** True when `options` is a 2-element bool enum (either shape). */
export function isBoolEnum(options: unknown[]): boolean {
  if (options.length !== 2) return false;
  if (typeof options[0] === "boolean") return typeof options[1] === "boolean" && options[0] !== options[1];
  if (typeof options[0] === "string" && typeof options[1] === "string") {
    const lower = new Set(options.map((s) => (s as string).toLowerCase()));
    return BOOL_ENUM_SETS.some((set) => lower.size === set.size && [...lower].every((s) => set.has(s)));
  }
  return false;
}

/** The boolean enum[0] means (its truthiness). */
export function boolEnumDefault(options: unknown[]): boolean {
  const first = options[0];
  if (typeof first === "boolean") return first;
  const lower = String(first).toLowerCase();
  if (["enable", "on", "true", "yes"].includes(lower)) return true;
  if (["disable", "off", "false", "no"].includes(lower)) return false;
  throw new Error(`Invalid bool enum: ${JSON.stringify(options)}`);
}

/** Map a caller boolean onto the enum's own strings. */
export function toBoolEnum(options: unknown[], b: boolean): string | boolean {
  const first = options[0] as string | boolean;
  const second = options[1] as string | boolean;
  return boolEnumDefault(options) === b ? first : second;
}

// ────────────────────────────────────────────────────────────────────────────
// api_format() internals
// ────────────────────────────────────────────────────────────────────────────

/** Depth-first walker that assigns ids and emits the flat dict. */
class PromptBuilder {
  private readonly prompt: Record<string, ComfyNodeDef> = {};
  private readonly ids = new Map<NodeRecord, string>();
  private readonly classInstance = new Map<string, number>();

  /** Serialize a NodeOutput (or a list of them) into the flat dict. */
  build(outputs: NodeOutput | NodeOutput[]): ComfyApiFormat {
    const list = Array.isArray(outputs) ? outputs : [outputs];
    for (const out of list) {
      if (out.ref !== null) this.visit(out.ref.node);
    }
    return this.prompt;
  }

  /**
   * Returns the assigned `ClassName.N` id for `node`, composing dependencies
   * first. Mirrors ComfyScript's api_format() node-id scheme: each node is
   * keyed `${classType}.${instanceIndex}` where instanceIndex is the 0-based
   * count of prior nodes of the SAME class (NOT a global integer). This is the
   * exact wire form this ComfyUI fork accepts — flat integer ids fail its
   * validation with a KeyError (prompt[int_id] vs string keys).
   */
  private visit(node: NodeRecord): string {
    const existing = this.ids.get(node);
    if (existing !== undefined) return existing; // shared intermediate → reuse id

    // Recurse into references first (post-order). Leaves get numbered first,
    // matching ComfyScript's `_update_prompt` — id order == discovery order.
    const serializedInputs: Record<string, SerializedInput> = {};
    for (const [k, v] of Object.entries(node.inputs)) {
      if (v instanceof NodeOutput) {
        if (v.ref !== null) {
          const depId = this.visit(v.ref.node);
          serializedInputs[k] = [depId, v.ref.index];
        } else if (v.value !== undefined) {
          serializedInputs[k] = v.value; // value-carrying output
        } else {
          serializedInputs[k] = null;
        }
      } else {
        serializedInputs[k] = v as SerializedInput;
      }
    }

    const instance = this.classInstance.get(node.classType) ?? 0;
    this.classInstance.set(node.classType, instance + 1);
    const id = `${node.classType}.${instance}`;
    this.ids.set(node, id);
    this.prompt[id] = {
      class_type: node.classType,
      inputs: serializedInputs,
    };
    return id;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Public entrypoints
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compose a flat ComfyUI POST /prompt dict from one (or several) root
 * NodeOutput(s). Walks the graph from the given roots, assigns ComfyScript
 * `ClassName.N` node ids (per-class instance counter, in discovery/post-order
 * order), and emits `{ "<ClassName.N>": { class_type, inputs } }` with each
 * reference serialized as `["ClassName.N", output_index]` and shared
 * intermediates de-duplicated. This matches the wire form this ComfyUI fork
 * accepts (flat integer ids fail its validation with a KeyError).
 */
/**
 * Python json.dumps default formatting (", " / ": " separators) — the
 * LoadAudiocoreModel `extras` input is a JSON STRING on the wire and
 * Python builds it with json.dumps; byte-identical parity requires the
 * same separators.
 */
export function pythonJsonStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(pythonJsonStringify).join(", ") + "]";
  return "{" + Object.entries(v as Record<string, unknown>)
    .map(([k, val]) => `${JSON.stringify(k)}: ${pythonJsonStringify(val)}`)
    .join(', ') + "}";
}

export function apiFormat(output: NodeOutput | NodeOutput[]): ComfyApiFormat {
  return new PromptBuilder().build(output);
}

/**
 * Build the ComfyUI graph client from a GET /object_info payload. The
 * payload must be a plain JS object of `{ "NodeName": { input, output, ... } }`
 * (the caller owns fetching it — we never touch the network).
 */
export function createComfyUI(objectInfo: ObjectInfo): ComfyUI {
  const client: Record<string, NodeFactory> = {};

  // Extract declared per-input defaults (`[/object_info default: X]`), keyed
  // by input name — mirrors ComfyScript's `input_defaults` collection so a
  // builder may omit an input and let the declared default fill it in.
  const extractDefaults = (inputGroups: ObjectInfoInputGroups | undefined): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const group of ["required", "optional"] as const) {
      const groupDict = inputGroups?.[group] ?? {};
      for (const [inputName, config] of Object.entries(groupDict)) {
        // config is either a bare type string, or a [type, options] pair
        // where the options object may carry a `default`.
        const options =
          Array.isArray(config) && config.length >= 2 && typeof config[1] === "object" && config[1] !== null
            ? (config[1] as Record<string, unknown>)
            : null;
        if (options && "default" in options && options.default !== null && options.default !== undefined) {
          out[inputName] = options.default;
        } else if (
          // Combos with no declared default fill options[0] — the ComfyUI
          // widget-default convention ComfyScript bakes into its generated
          // node signatures (verified live against the Python gateway:
          // CLIPLoader `device: "default"` — an OPTIONAL combo — and
          // LanPaint_KSamplerAdvanced `add_noise: "enable"` /
          // `return_with_leftover_noise: "disable"` — REQUIRED combos —
          // all emit options[0]). Combos arrive in TWO wire shapes, both
          // verified live:
          //   inline:      upscale_method: [["a", "b"], {...}]        (config[0] IS the list)
          //   stringly:    upscale_method: ["COMBO", {"options": [...]}] (list in config[1].options)
          // The stringly shape is what /object_info serves for
          // ImageScaleToMaxDimension.upscale_method — Python emits
          // "area" (options[0]) for it when the builder omits it.
          // This is the ONE place node defaults are interpreted, so
          // builders stay param-plumbing-only: redefining a default at a
          // call site would drift against the node's own declaration.
          Array.isArray(config) &&
          ((Array.isArray(config[0]) &&
            config[0]!.length > 0 &&
            (typeof config[0]![0] === "string" ||
              typeof config[0]![0] === "number" ||
              typeof config[0]![0] === "boolean")) ||
            (config[0] === "COMBO" &&
              Array.isArray(options?.options) &&
              (options!.options as unknown[]).length > 0 &&
              (typeof (options!.options as unknown[])[0] === "string" ||
                typeof (options!.options as unknown[])[0] === "number" ||
                typeof (options!.options as unknown[])[0] === "boolean")))
        ) {
          out[inputName] = Array.isArray(config[0])
            ? (config[0] as unknown[])[0]
            : (options!.options as unknown[])[0];
        }
      }
    }
    return out;
  };

  for (const [name, info] of Object.entries(objectInfo)) {
    if (!info || typeof info !== "object") continue;

    const order: string[] = [
      ...Object.keys(info.input?.required ?? {}),
      ...Object.keys(info.input?.optional ?? {}),
    ];
    const defaults = extractDefaults(info.input);
    // Bool-enum inputs (["enable","disable"] etc.) accept JS booleans at
    // call time and convert to the enum's own strings (factory.py's
    // _map_input). Collect each input's option list for that conversion.
    const boolEnums: Record<string, unknown[]> = {};
    for (const group of ["required", "optional"] as const) {
      const groupDict = info.input?.[group] ?? {};
      for (const [inputName, config] of Object.entries(groupDict)) {
        if (!Array.isArray(config)) continue;
        const opts = Array.isArray(config[0])
          ? (config[0] as unknown[])
          : config[0] === "COMBO" && config[1] && typeof config[1] === "object"
            ? ((config[1] as Record<string, unknown>).options as unknown[] | undefined ?? [])
            : [];
        if (Array.isArray(opts) && isBoolEnum(opts)) boolEnums[inputName] = opts;
      }
    }
    const outputTypes = Array.isArray(info.output) ? info.output.map(String) : [];
    const outCount = outputTypes.length;

    const factory: NodeFactory = (...args: unknown[]) => {
      // Separate positional args (leading JSON-like values) from the
      // trailing named-input map.
      const positional: unknown[] = [];
      let named: NodeInputMap = {};
      for (const a of args) {
        if (a !== null && typeof a === "object" && !Array.isArray(a) && !(a instanceof NodeOutput)) {
          named = { ...named, ...(a as NodeInputMap) };
        } else if (a !== undefined) {
          positional.push(a);
        }
      }

      // Map positional args into the declared required→optional order, then
      // merge call-time named inputs over declared defaults (mirroring
      // ComfyScript's `inputs = self.defaults | inputs`).
      const inputs: NodeInputMap = { ...(defaults as NodeInputMap) };
      for (let i = 0; i < positional.length && i < order.length; i++) {
        if (positional[i] !== null && positional[i] !== undefined) inputs[order[i]!] = positional[i] as InputValue;
      }
      for (const [k, v] of Object.entries(named)) {
        if (v === null || v === undefined) continue;
        if ((v === true || v === false) && boolEnums[k]) {
          inputs[k] = toBoolEnum(boolEnums[k]!, v);
          continue;
        }
        inputs[k] = v;
      }

      const node: NodeRecord = {
        classType: name,
        inputs,
        outputTypes,
      };

      if (outCount <= 0) {
        // Utility node with no declared outputs → a bare NodeOutput.
        return new NodeOutput(name, { node, index: 0 });
      }

      const outputs: NodeOutput[] = [];
      for (let i = 0; i < outCount; i++) {
        outputs.push(new NodeOutput(outputTypes[i]!, { node, index: i }));
      }

      return outCount === 1 ? outputs[0]! : outputs;
    };

    client[name] = factory;
  }

  return client;
}
