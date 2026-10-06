// pack-parity-audiocore.spec.ts — THE THREE-PACK PARITY WALL
// (2026-10-13, the audio re-audit's shadowing class, closed as a
// CLASS): the audiocore surface is served by three of our own packs
// (melite-audio-nodes, melite-tts-nodes, melite-sfx-nodes), each
// exporting a copy of the Audiocore* node classes. The 2026-09-04
// audio-core split made those copies lawful — the packs install
// independently — but nothing held them TOGETHER, so a cure that
// landed in one pack's copy went live-dead the day another pack
// served the same node: the engine resolves a class to exactly one
// pack, and the re-audit found all three cures (the voice "none"
// normalization, the VoiceStudio real design sample, the load
// progress arm) sitting cure-side in audio while the packs that
// ACTUALLY served the tts lanes shipped the pre-cure bodies.
//
// This wall pins the class law the split owes: a class defined by
// more than one pack carries the SAME body in every pack that
// defines it, the shared non-node files are byte-identical, the
// three cured behaviors are present in every serving copy, and the
// deployed checkouts the engine loads equal the vendor tree — so
// neither a drifted copy nor an undeployed cure can pass.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..");
const VENDOR = join(ROOT, "vendor", "comfyui_extensions");
const RUNTIME = join(ROOT, "data", "runtime", "comfyui", "custom_nodes");
/** The engine's own ComfyUI root (operator-local; absent on CI). */
const RUNTIME_ENGINE = "/home/user/tools/comfyui/custom_nodes";

const PACKS = ["melite-audio-nodes", "melite-tts-nodes", "melite-sfx-nodes"] as const;

/** The files every pack that HAS them must serve byte-identical:
 *  the engine seam (core), the schemas, the native binding, the
 *  qvoice codec, and the qwen3 engine. nodes.py is excluded at
 *  whole-file level — its class roster is pack-owned — and pinned
 *  class-by-class below instead. */
const SHARED_FILES = [
  "core.py",
  "schemas.py",
  "native.py",
  "qvoice.py",
  "engines/qwen3_tts.py",
] as const;

/** Every class defined by more than one pack — the split's lawful
 *  duplication, held identical by this wall. A NEW class reaching a
 *  second pack fails the census until it is registered here (and
 *  its bodies made identical). */
const DUPLICATED_CLASSES = [
  "LoadAudiocoreModel",
  "UnloadAudiocoreModel",
  "AudiocoreFamilyInfo",
  "AudiocoreTTS",
  "AudiocoreVoiceEmbedding",
  "AudiocoreVoiceStudio",
] as const;

const read = (pack: string, rel: string): string | null => {
  const p = join(VENDOR, pack, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

/** One `class X:` definition, verbatim — the same extraction the
 *  re-audit ran by hand (class keyword to the next top-level class
 *  or section rule). */
function classBody(src: string, name: string): string {
  const m = new RegExp(`^class ${name}\\b[\\s\\S]*?(?=^class |^# ── |\\Z)`, "m").exec(src);
  if (!m) throw new Error(`pack-parity: class ${name} not found`);
  return m[0];
}

function definedClasses(src: string): string[] {
  return [...src.matchAll(/^class (\w+)/gm)].map((m) => m[1]);
}

/** Every pack that defines the class, with its body. */
const copies = (name: string): { pack: string; body: string }[] =>
  PACKS.map((pack) => {
    const src = read(pack, "nodes.py");
    return src && definedClasses(src).includes(name) ? { pack, body: classBody(src, name) } : null;
  }).filter((x): x is { pack: string; body: string } => x !== null);

describe("the three-pack audiocore parity wall", () => {
  it("the duplicated-class roster is exactly the registered one (a class reaching a second pack must be registered, not forked)", () => {
    const dupes = new Set<string>();
    for (const pack of PACKS) {
      const src = read(pack, "nodes.py");
      expect(src, `${pack}/nodes.py exists`).not.toBeNull();
      for (const cls of definedClasses(src as string)) {
        if (PACKS.some((other) => other !== pack && read(other, "nodes.py") && definedClasses(read(other, "nodes.py") as string).includes(cls))) {
          dupes.add(cls);
        }
      }
    }
    expect([...dupes].sort()).toEqual([...DUPLICATED_CLASSES].sort());
  });

  it("every duplicated class carries the SAME body in every pack that defines it (a cure in one copy is a fork, not a cure)", () => {
    for (const cls of DUPLICATED_CLASSES) {
      const cs = copies(cls);
      expect(cs.length, `${cls} is defined by at least two packs (or remove it from the roster)`).toBeGreaterThan(1);
      const [first, ...rest] = cs;
      for (const other of rest) {
        expect(other.body, `${other.pack}/nodes.py ${cls} drifts from ${first.pack}'s — the split's copies must move together`).toBe(first.body);
      }
    }
  });

  it("every shared file is byte-identical across the packs that carry it", () => {
    for (const rel of SHARED_FILES) {
      const held = PACKS.map((pack) => ({ pack, src: read(pack, rel) })).filter((x) => x.src !== null);
      expect(held.length, `${rel} is carried by at least one pack`).toBeGreaterThan(0);
      const [first, ...rest] = held as { pack: string; src: string }[];
      for (const other of rest as { pack: string; src: string }[]) {
        expect(other.src, `${other.pack}/${rel} drifts from ${first.pack}'s — the engine seam is one body, not three`).toBe(first.src);
      }
    }
  });

  // ── THE THREE CURED BEHAVIORS — pinned in every serving copy ──

  it("AudiocoreTTS normalizes voice=\"none\" to the empty speaker (the .qvoice owns the timbre; never a preset fallback)", () => {
    for (const { pack, body } of copies("AudiocoreTTS")) {
      expect(body, `${pack}: the voice "none" normalization arm is missing`).toMatch(
        /if call_kwargs\.get\("voice"\) == "none":\s*\n\s*call_kwargs\["voice"\] = ""/,
      );
    }
  });

  it("AudiocoreVoiceStudio returns the REAL design sample (the 1-sample silence stub is gone)", () => {
    for (const { pack, body } of copies("AudiocoreVoiceStudio")) {
      expect(body, `${pack}: the export must unpack the rendered sample`).toContain("sample_pcm, sample_sr = _run_with_progress");
      expect(body, `${pack}: the sample rides the returned waveform`).toMatch(/if sample_pcm:/);
      expect(body, `${pack}: the stub silence variable must not return`).not.toContain("silence = torch.zeros");
      expect(body, `${pack}: the returned rate is the sample's own`).toContain('"sample_rate": sample_sr');
    }
  });

  it("LoadAudiocoreModel reports load progress through the native on_progress callback", () => {
    for (const { pack, body } of copies("LoadAudiocoreModel")) {
      expect(body, `${pack}: the load must ride the progress bridge`).toContain(
        "_run_with_load_progress(lambda report: m.load(on_progress=report))",
      );
      const src = read(pack, "nodes.py") as string;
      expect(src, `${pack}: the progress bridge helper must be defined beside its user`).toMatch(
        /def _run_with_load_progress\(fn\):/,
      );
    }
  });

  it("LoadAudiocoreModel derives the default family and model_path as ONE coherent pair (never family=TTS with an SFX tree)", () => {
    for (const { pack, body } of copies("LoadAudiocoreModel")) {
      // The re-audit's F4: the pinned moss_tts_nano default + the
      // models[0] belt served a MOSS-SFX tree under a MOSS-TTS
      // family on machines whose enum lacks moss-tts. The cure
      // derives the pair together — the derivation lines are pinned
      // verbatim so a copy cannot regress to the silent fallback.
      expect(body, `${pack}: the default family must be derived from the served enum`).toContain(
        "default_family = next(\n            (f for f in FAMILY_NAMES if _DEFAULT_MODEL_DIR.get(f) in models),",
      );
      expect(body, `${pack}: the default model follows the derived family`).toMatch(
        /default_model = _DEFAULT_MODEL_DIR\.get\(default_family, ""\)/,
      );
      expect(body, `${pack}: no hardwired family default may return`).not.toMatch(
        /default_family = "moss_tts_nano"/,
      );
    }
  });

  // ── THE DEPLOYED TRUTH — vendor equals the tree the engine serves ──

  it("the deployed tree equals the vendor tree for every shared file and nodes.py (an undeployed cure is not landed; owner-local — CI boxes deploy nothing)", () => {
    // The engine runs from its own ComfyUI root, whose custom_nodes
    // holds git checkouts of these packs at the pinned refs; the
    // repo's data/runtime tree is the staging checkout. Either is
    // the deployed truth when present; a bare CI checkout has
    // neither and the arm stands down (the same owner-local law as
    // test:expected).
    const deployed = [join(RUNTIME_ENGINE, "custom_nodes"), RUNTIME].filter((d) => existsSync(join(d, PACKS[0])));
    if (deployed.length === 0) return;
    for (const root of deployed) {
      for (const pack of PACKS) {
        for (const rel of [...SHARED_FILES, "nodes.py", "__init__.py"]) {
          const v = read(pack, rel);
          const dp = join(root, pack, rel);
          expect(existsSync(dp), `${pack}/${rel} missing under ${root}`).toBe(v !== null);
          if (v !== null) {
            expect(readFileSync(dp, "utf8"), `${pack}/${rel}: the deployed copy under ${root} drifts from the vendor tree`).toBe(v);
          }
        }
      }
    }
  });
});
