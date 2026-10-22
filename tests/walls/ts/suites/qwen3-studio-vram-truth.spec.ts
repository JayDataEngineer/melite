// qwen3-studio-vram-truth.spec.ts — THE STUDIO VRAM-TRUTH WALL
// (operator 2026-10-22, the live Triton burn: AudiocoreVoiceStudio
// died in ComfyUI with "ValueError: Pointer argument cannot be
// accessed from Triton (cpu tensor?)" at
// tts::AudiocoreVoiceStudio.0, then the process aborted on
// c10::AcceleratorError).
//
// THE LESION: every studio run constructed a FRESH torch engine that
// reloaded ~4.3 GB of HF weights and re-captured the CUDA graphs,
// while the loader ALSO held the same weights as a native C++
// session — two full copies, rewarm per run. After a heavy ComfyUI
// run (a ~20 GB staged model still resident on the 24 GB card), the
// repeat load + graph capture starved the allocator and the warmup's
// Triton matmul died. The standalone engine was innocent (the full
// export_lite path reproduces green in a fresh process); the NODE was
// incorrect — it never shared the seat and never yielded VRAM.
//
// THE LAW (ported from the upstream Faster-Qwen3TTS ComfyUI
// extension): the loader caches ONE warmed model per key and every
// consumer generates through the handle — warmup runs ONCE at load,
// never lazily mid-run under pressure; and the studio evicts
// ComfyUI-resident models BEFORE its torch allocation (the same
// yield every loader performs).
//
// This gate parses the pack's real source files — no frozen
// literals: every anchor fails LOUD naming the moved code, and the
// one-spelling arm counts the real from_pretrained call sites.
//
//   ARM 1  the warmed-handle cache seat exists (module dict, hit +
//          store spellings) and _ensure_variant rides it
//   ARM 2  ONE loading spelling: exactly one from_pretrained call
//          site in the engine (load() and _ensure_variant share it)
//   ARM 3  the graphs capture AT LOAD (warmup inside the loader
//          helper, not lazily mid-run)
//   ARM 4  the studio yields ComfyUI VRAM before touching the torch
//          engine (evict first, construct after — order asserted)
//   ARM 5  no dead seat: the run method carries no model_dir
//          computation pretending to use the wired model
//
// Run: npx vitest run tests/walls/ts/suites/qwen3-studio-vram-truth.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ENGINE_PATH = join(
  ROOT,
  "vendor", "comfyui_extensions", "melite-audio-nodes",
  "engines", "qwen3_tts.py",
);
const NODES_PATH = join(ROOT, "vendor", "comfyui_extensions", "melite-audio-nodes", "nodes.py");

const anchorFail = (anchor: string, file: string): Error =>
  new Error(
    `studio-vram-truth wall: the parse anchor ${JSON.stringify(anchor)} found nothing in ${file} — ` +
    "the vendored pack moved or was reworded; re-anchor the parse against the real file. " +
    "The wall reads the pack's own code, never a re-typed literal.",
  );

/** A top-level python def: the def line through the next col-0 def. */
function pyTopDef(src: string, defAnchor: string, file: string): string {
  const at = src.indexOf(defAnchor);
  if (at === -1) throw anchorFail(defAnchor, file);
  const rest = src.slice(at + defAnchor.length);
  const next = rest.search(/\ndef |\ndef async |\nclass /);
  return next === -1 ? src.slice(at) : src.slice(at, at + defAnchor.length + next);
}

/** A method body: the def line through the next same-indent def/decorator. */
function pyMethod(src: string, defAnchor: string, file: string): string {
  const at = src.indexOf(defAnchor);
  if (at === -1) throw anchorFail(defAnchor, file);
  const rest = src.slice(at + defAnchor.length);
  const next = rest.search(/\n    (?:def |@|class )/);
  return next === -1 ? src.slice(at) : src.slice(at, at + defAnchor.length + next);
}

function countHaystack(src: string, needle: string): number {
  return src.split(needle).length - 1;
}

const engine = readFileSync(ENGINE_PATH, "utf8");
const nodes = readFileSync(NODES_PATH, "utf8");

describe("qwen3 studio vram truth (the live Triton burn)", () => {
  it("ARM 1 — the warmed-handle cache seat exists and _ensure_variant rides it", () => {
    if (!engine.includes("_WARMED_HANDLES: dict["))
      throw anchorFail("_WARMED_HANDLES: dict[", ENGINE_PATH);
    if (!engine.includes("_WARMED_HANDLES.get(key)"))
      throw anchorFail("_WARMED_HANDLES.get(key)", ENGINE_PATH);
    if (!engine.includes("_WARMED_HANDLES[key] = handle"))
      throw anchorFail("_WARMED_HANDLES[key] = handle", ENGINE_PATH);
    const ensure = pyTopDef(engine, "def _ensure_variant", ENGINE_PATH);
    assert.ok(
      ensure.includes("_load_warmed_handle(hf_dir, variant)"),
      "studio-vram-truth ARM 1: _ensure_variant must adopt the cached handle " +
      "via _load_warmed_handle(hf_dir, variant) — a fresh from_pretrained per run " +
      "is the burn's own shape (double load + rewarm under pressure).",
    );
    const load = pyTopDef(engine, "def load(self, path: str", ENGINE_PATH);
    assert.ok(
      load.includes("_load_warmed_handle(hf_dir, self._variant)"),
      "studio-vram-truth ARM 1: load() must share the same loading seat — " +
      "two spellings re-split the cache the wall pins.",
    );
  });

  it("ARM 2 — ONE loading spelling: exactly one from_pretrained call site", () => {
    const sites = countHaystack(engine, "FasterQwen3TTS.from_pretrained(");
    assert.equal(
      sites, 1,
      `studio-vram-truth ARM 2: the engine must load HF weights at exactly one ` +
      `call site (the shared helper) — found ${sites}. A second spelling means ` +
      `a path that bypasses the warmed cache.`,
    );
  });

  it("ARM 3 — the graphs capture AT LOAD, never lazily mid-run", () => {
    const helper = pyTopDef(engine, "def _load_warmed_handle", ENGINE_PATH);
    assert.ok(
      helper.includes(".warmup("),
      "studio-vram-truth ARM 3: _load_warmed_handle must call warmup() on the " +
      "fresh handle before caching — upstream's warmup=True loader default. " +
      "A cold handle relies on faster's lazy mid-run capture, the allocation " +
      "that died racing a full card.",
    );
  });

  it("ARM 4 — the studio yields ComfyUI VRAM before touching the torch engine", () => {
    const run = pyMethod(nodes, "def run(self, model: ManagedModel, mode: str", NODES_PATH);
    const evictAt = run.indexOf("unload_all_models()");
    assert.ok(
      evictAt !== -1,
      "studio-vram-truth ARM 4: the studio run must evict ComfyUI-resident " +
      "models (unload_all_models) before its torch allocation — the burn's " +
      "card held a ~20 GB staged model when the capture starved.",
    );
    const constructAt = run.indexOf("_Qwen3TtsEngine()");
    if (constructAt === -1) throw anchorFail("_Qwen3TtsEngine()", NODES_PATH);
    assert.ok(
      evictAt < constructAt,
      "studio-vram-truth ARM 4: the eviction must come BEFORE the engine " +
      "construction — a yield after the allocation guards nothing.",
    );
  });

  it("ARM 5 — no dead seat: the run carries no model_dir computation", () => {
    const run = pyMethod(nodes, "def run(self, model: ManagedModel, mode: str", NODES_PATH);
    assert.ok(
      !run.includes("model_dir"),
      "studio-vram-truth ARM 5: the run must not compute model_dir — the " +
      "removed spelling derived a path from the wired model and never " +
      "passed it anywhere (the studio resolves the HF tree itself; the " +
      "wired ManagedModel is the native session, a different runtime). " +
      "Dead seats lie about which door the run rides.",
    );
  });
});
