// Pure, portable builder helpers — port of backend/media/comfyui/builders/_shared.py
// (the parts that don't require a live ComfyUI / ComfyScript runtime).
//
// These are the last-line-of-defense validators + seed normalization + the
// loader node factory the builders use. They are PURE — no network, no GPU.

/** A params dictionary on the wire (one modifier / one entry). */
export type Spec = Record<string, unknown>;

import { AsyncLocalStorage } from "node:async_hooks";
import type { ComfyUI, NodeOutput } from "../graph/comfyui_graph.ts";

/** Typed alias for the mutable params bag the builders read/mutate. */
export type ParamsBag = Record<string, unknown>;

/** The last-resolved-seed holder (port of _shared.py's ``_seed_sink``).
 *
 * Python parks a thread-local pointing at the runner's ``_seed_state``
 * dict; the runner reads it at each brick's "done" boundary to stamp the
 * ACTUAL seed back onto the brick's params (reproducible workflows:
 * seed=-1 → the concrete positive int the RNG drew). The async-context
 * equivalent — the runner opens a scope per brick, so concurrent runs
 * never bleed into each other (the reason PY uses a thread-local). */
export interface SeedStampState {
  seed: number | null;
}

const _seedSink = new AsyncLocalStorage<SeedStampState>();

/** Open the seed-stamp scope for one brick execution (executor-only). */
export function seedStampScope<T>(state: SeedStampState, fn: () => Promise<T>): Promise<T> {
  return _seedSink.run(state, fn);
}

/** Normalize a seed: -1 / 0 / null → random positive int (port of _resolve_seed). */
export function resolveSeed(seed: unknown): number {
  let s = 0;
  if (typeof seed === "number" && Number.isFinite(seed)) s = seed;
  else if (typeof seed === "string") { const n = parseInt(seed, 10); if (!Number.isNaN(n)) s = n; }
  if (s <= 0) s = Math.floor(Math.random() * (2 ** 31 - 1)) + 1;
  // Stamp the resolved seed so the runner can report it back verbatim —
  // the concrete seed that produced this output (reproducible runs).
  const sink = _seedSink.getStore();
  if (sink) sink.seed = s;
  return s;
}

/**
 * Hard-fail when the prompt is missing or empty (port of _require_prompt).
 * The compile/gateway path SHOULD have caught this already; this is the LAST
 * line of defense against silently running the sampler with empty conditioning.
 */
export function requirePrompt(params: ParamsBag, builderName: string): void {
  const raw = params.prompt;
  if (raw === null || raw === undefined || (typeof raw === "string" && !raw.trim()) || typeof raw !== "string") {
    throw pyError("ValueError", 
      `${builderName}: 'prompt' is required and must be non-empty. Got: ${pyRepr(raw)}`
    );
  }
}

/** Normalize a model name to the LoRA directory slug. */
export function modelSlug(modelName: string): string {
  if (!modelName) return "";
  const s = modelName.trim().replace(/[/\\_]+/g, "-");
  return s.replace(/-+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

/** Extract model filename from a HuggingFace source URL (port of
 * extract_model_filename). Also accepts the STRUCTURED source block
 * (scail2-style {url, provision: {local_filename}}) — for those the
 * provisioned local filename IS the loaded filename. */
export function extractModelFilename(
  sourceUrl: string | { url?: string; provision?: { local_filename?: string } } | null | undefined,
): string {
  if (!sourceUrl) return "model.safetensors";
  if (typeof sourceUrl === "object") {
    const lf = sourceUrl.provision?.local_filename;
    if (lf) return String(lf);
    const u = sourceUrl.url;
    if (typeof u === "string" && u) return u.split("/").slice(-1)[0] || "model.safetensors";
    return "model.safetensors";
  }
  const trimmed = sourceUrl.trim();
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || "model.safetensors";
}

/** LoRA metadata: the model-level `lora_catalog` dict, or the family sibling's. */
export function resolveLoraCatalog(
  modelDef: Record<string, unknown>,
  catalog: Record<string, unknown>,
): Record<string, unknown> {
  let loras = modelDef.lora_catalog;
  if (loras && typeof loras === "object") return loras as Record<string, unknown>;

  const family = modelDef.family as string | undefined;
  if (!family) return {};
  const models = catalog.models as Record<string, Record<string, unknown>> | undefined;
  if (!models) return {};
  for (const sibling of Object.values(models)) {
    if (sibling.family === family && sibling.lora_catalog && typeof sibling.lora_catalog === "object") {
      return sibling.lora_catalog as Record<string, unknown>;
    }
  }
  return {};
}

const CKPT_EXTENSIONS = [".safetensors", ".pt", ".bin", ".ckpt"];

/** Resolve the ComfyUI-legal LoRA filename (port of resolve_lora_filename). */
export function resolveLoraFilename(
  spec: Record<string, unknown>,
  meta: Record<string, unknown>,
  name: string,
  loraSubdir = "",
): string {
  let filename =
    (spec.filename as string | undefined) ??
    (meta.filename as string | undefined) ??
    name;
  const basename = filename.split("/").pop()!.toLowerCase();
  if (!CKPT_EXTENSIONS.some((ext) => basename.endsWith(ext))) {
    filename += ".safetensors";
  }
  if (loraSubdir && !filename.includes("/")) {
    if (!filename.startsWith(loraSubdir + "/")) {
      return `${loraSubdir}/${filename}`;
    }
  }
  return filename;
}

/** The D2 source-decl filename (ONE derivation, upstream of both the
 *  builders and the server catalog): declared filename > url basename;
 *  "" when neither (repo-only decls have no file — callers fail loud,
 *  never fabricate). The decl shape is validated at catalog load
 *  (server-js source_decl.ts); a bare string here is the retired
 *  pre-D2 shape and derives "" (loud), not a silent filename. */
export function sourceDeclFilename(source: unknown): string {
  if (typeof source !== "object" || source === null) return "";
  const s = source as { url?: unknown; filename?: unknown };
  if (typeof s.filename === "string" && s.filename !== "") return s.filename;
  if (typeof s.url === "string" && s.url !== "") {
    return s.url.split("/").slice(-1)[0] ?? "";
  }
  return "";
}

/** The family/model-level loader node — port of _make_loader.
 *  Returns [model, clip, vae] as NodeOutput objects. */
export function makeLoader(
  nodes: ComfyUI,
  modelDef: Record<string, unknown>,
  families: Record<string, Record<string, unknown>>,
): [NodeOutput, NodeOutput | undefined, NodeOutput] {
  const filename = sourceDeclFilename(modelDef.source);
  const family = String(modelDef.family ?? "");
  const famDef = families[family] ?? {};

  const clipType = String(modelDef.clip_type ?? famDef.clip_type ?? "wan");

  // GGUF loading was removed 2026-08-21 (ComfyUI-approved safetensors only).
  // Checkpoint (.safetensors): one node outputs MODEL(0), CLIP(1), VAE(2).
  const loaderType = String(modelDef.loader ?? famDef.loader ?? "checkpoint");
  const teFile = String(modelDef.text_encoder ?? famDef.text_encoder ?? "");
  const vaeFile = String(modelDef.vae ?? famDef.vae ?? "");

  let model: NodeOutput;
  let clip: NodeOutput | undefined;
  let vae: NodeOutput;
  if (loaderType === "unet") {
    model = nodes.UNETLoader!({ unet_name: filename, weight_dtype: "default" }) as NodeOutput;
    vae = nodes.VAELoader!({ vae_name: vaeFile || "qwen_image_vae.safetensors" }) as NodeOutput;
  } else {
    const outputs = nodes.CheckpointLoaderSimple!({ ckpt_name: filename }) as NodeOutput[];
    model = outputs[0]!;
    clip = outputs[1];
    vae = outputs[2]!;
  }

  if (teFile) clip = loadClip(nodes, clipType, teFile, modelDef, famDef);
  if (vaeFile) vae = nodes.VAELoader!({ vae_name: vaeFile }) as NodeOutput;

  return [model, clip, vae];
}

/** CLIP loader node — dual-encoder aware (port of _load_clip). */
function loadClip(
  nodes: ComfyUI,
  clipType: string,
  teFile: string,
  modelDef: Record<string, unknown>,
  famDef: Record<string, unknown>,
): NodeOutput {
  const te2 =
    ((modelDef.routing as Record<string, unknown> | undefined)?.text_encoder_2 as string | undefined) ??
    ((famDef.routing as Record<string, unknown> | undefined)?.text_encoder_2 as string | undefined);
  if (clipType === "flux" && te2) {
    return nodes.DualCLIPLoader!({ clip_name1: teFile, clip_name2: te2, type: "flux" }) as NodeOutput;
  }
  const loader = nodes.CLIPLoader;
  if (!loader) {
    throw pyError("RuntimeError", "No CLIP loader node available (looked for CLIPLoader)");
  }
  return loader({ clip_name: teFile, type: clipType }) as NodeOutput;
}

/**
 * Raise with the Python exception-class name. Python compose() formats caught
 * errors as `f"{type(e).__name__}: {e}"` and the JS compose() mirrors it with
 * `e.name` — so parity of the /v1/compose error surface requires the ported
 * raise sites to carry the same class names (ValueError / RuntimeError /
 * AttributeError) as their Python twins.
 */
export function pyError(
  cls: "ValueError" | "RuntimeError" | "AttributeError" | "TypeError" | "KeyError" | "FileNotFoundError" | "JSONDecodeError",
  msg: string,
): Error {
  const e = new Error(msg);
  e.name = cls;
  return e;
}

/**
 * Python repr() for strings — single quotes, switching to double quotes when
 * the string contains a single quote (CPython repr semantics). Error-text
 * parity with Python f-string `{x!r}` formatting.
 */
/** Python type(x).__name__ for JSON-shaped values (error-text parity:
 *  "step #0 must be a mapping, got list."). */
export function pyTypeName(v: unknown): string {
  if (v === null || v === undefined) return "NoneType";
  if (Array.isArray(v)) return "list";
  if (typeof v === "object") return "dict";
  if (typeof v === "string") return "str";
  if (typeof v === "boolean") return "bool";
  return Number.isInteger(v) ? "int" : "float";
}

/** Python str() rendering for f-string parity: True/False/None (JS
 *  would render true/false/null into the LLM-facing text). */
export function pyStr(v: unknown): string {
  if (typeof v === "boolean") return v ? "True" : "False";
  if (v === null || v === undefined) return "None";
  return String(v);
}

export function pyRepr(v: unknown): string {
  if (typeof v === "string") {
    if (v.includes("'")) return `"${v.replace(/"/g, '\\"')}"`;
    return `'${v.replace(/\\/g, "\\\\")}'`;
  }
  if (v === null) return "None";
  if (v === undefined) return "None";
  return JSON.stringify(v) ?? String(v);
}

import { pythonJsonStringify } from "../graph/comfyui_graph.ts";
export { pythonJsonStringify };

/** Python list repr: "['a', 'b']" (error-text parity for f-string lists). */
export function pyList(items: readonly unknown[]): string {
  return "[" + items.map(pyRepr).join(", ") + "]";
}

/** Python tuple repr: "('a', 'b')" (error-text parity for f-string tuples). */
export function pyTuple(items: readonly unknown[]): string {
  if (items.length === 1) return `(${pyRepr(items[0])},)`;
  return "(" + items.map(pyRepr).join(", ") + ")";
}

/**
 * Pop `preset` from the params bag and layer its recipe in place (port of
 * _shared.apply_preset_layer). The ONE catalog-driven preset layer for every
 * builder whose card ships a Workflow Preset select (music3, step1x_texture,
 * mesh_refine, video_upscale, inpaint). ONE precedence everywhere: explicit
 * params WIN; preset values fill only ABSENT (missing/None) keys.
 *
 * The preset comes from the model's `presets` block — the loader's
 * attachment of the presets/<id>.yaml folder (the file stem IS the id). An
 * unknown id is a HARD ERROR, never a silent fallback. Mutates `params` in
 * place (the bag is the builder's local view).
 */
export function applyPresetLayer(
  params: ParamsBag,
  modelDef: Record<string, unknown>,
  builder: string,
): void {
  const presetId = params.preset;
  delete params.preset;
  if (presetId === null || presetId === undefined || presetId === "") return;
  const presets = (modelDef.presets ?? null) as Record<string, unknown> | null;
  const pdata = presets ? (presets[String(presetId)] ?? null) : null;
  if (pdata === null || typeof pdata !== "object" || Array.isArray(pdata)) {
    throw pyError("ValueError",
      `${builder}: unknown preset ${pyRepr(presetId)} — not declared in ` +
      `the model's presets/ folder (the file stem IS the preset id).`
    );
  }
  const recipe = (pdata as Record<string, unknown>).params;
  if (recipe && typeof recipe === "object" && !Array.isArray(recipe)) {
    for (const [k, v] of Object.entries(recipe as Record<string, unknown>)) {
      if (params[k] === null || params[k] === undefined) params[k] = v;
    }
  }
}

// ── THE builder args envelope ────────────────────────────────────────────
// Moved here from builders/image.ts when that file split into per-plugin
// builder files (§6 code lane): every builder — core or plugin — takes
// this one shape. Plugin builder files import it from THIS module (the
// import-lint allowlist).
export interface BuildTxt2ImgArgs {
  /** The form/template key buildForm dispatched on (compose sets it). */
  formKey?: string;
  params: Record<string, unknown>;
  modelDef: Record<string, unknown>;
  families: Record<string, Record<string, unknown>>;
  catalog: Record<string, unknown>;
  loras?: Spec[] | null;
  controlnets?: Spec[] | null;
  ipAdapters?: Spec[] | null;
  /**
   * ControlNet weight files available on the ComfyUI side (from
   * GET /models/controlnet) — the build_img2img_edit inpaint preflight's
   * disk-presence check. Null/undefined → treated as unavailable (the
   * builder falls back to full-image edit, mirroring Python's
   * list_controlnets() failure path).
   */
  controlnetFiles?: Set<string> | null;
  /**
   * The live /object_info snapshot (compose threads it via getNodesWithInfo).
   * Plugin shapes (template OR code) REQUIRE it — the §9 mount gates and the
   * static node-class scan validate against the instance that will actually
   * run the graph. Core code shapes ignore it (their factories already
   * carry it).
   */
  objectInfo?: import("../graph/comfyui_graph.ts").ObjectInfo;
}
