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
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(__dirname, "..", "..", "..", "..");
const VENDOR = join(ROOT, "vendor", "comfyui_extensions");
const RUNTIME = join(ROOT, "data", "runtime", "comfyui", "custom_nodes");
/** The engine's own ComfyUI root (operator-local; absent on CI). */
const RUNTIME_ENGINE = "/home/user/tools/comfyui/custom_nodes";

const PACKS = ["melite-audio-nodes", "melite-tts-nodes", "melite-sfx-nodes"] as const;

/** Files byte-identical in EVERY pack: the engine seam core.py
 *  dispatches through, plus qvoice.py (round 4 R6: engines/qwen3_tts.py
 *  imports it by `from .. import qvoice` — VoiceStudio reaches it at
 *  inference time, so it is dispatcher-reached, not carrier-owned; a
 *  pack missing it serves a VoiceStudio that cannot import; a fresh
 *  machine installs the seam through requirements.txt — round-3 N2's
 *  dep half). The carrier-file tier is GONE — its roster is empty
 *  and an empty-roster arm asserts nothing (fail-open, the round-4
 *  audit's class). */
const SHARED_FILES = [
  "core.py",
  "schemas.py",
  "native.py",
  "qvoice.py",
  "engines/qwen3_tts.py",
  "engines/moss_sfx_v2.py",
  "engines/__init__.py",
  "requirements.txt",
] as const;

/** Engine subtrees that must exist byte-identical in EVERY pack:
 *  core.py dispatches into these by relative import regardless of
 *  which pack won the custom_nodes race, so a pack missing one
 *  serves an enum member whose family cannot load (the round-3
 *  N2/N3 class: tts shipped no moss_sfx_v2 while its sfx family
 *  rode the enum). */
const SHARED_TREES = ["engines/moss_sfx_impl"] as const;

/** Files that are PACK-OWNED by design (round 4 R8 — the divergence
 *  is lawful and this wall records WHERE it lives):
 *  - nodes.py — the class roster is shared (DUPLICATED_CLASSES pins
 *    the bodies byte-identical) but each pack's __main__-adjacent
 *    constants (NODE_CLASS_MAPPINGS export list, header docstring)
 *    differ per pack by name.
 *  - __init__.py — each pack exports its own mappings under its own
 *    package name; engine-GC hygiene lives in core.py (shared), not
 *    in any pack's __init__ side effects (the R8 cure).
 *  - pyproject.toml — the pack's own identity.
 *  Divergence anywhere else in these files beyond what sibling arms
 *  pin is a fork, not a cure. */

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

  it("every dispatcher-reached file is carried by EVERY pack and byte-identical (core.py imports these by relative path from whichever pack won the custom_nodes race)", () => {
    for (const rel of SHARED_FILES) {
      for (const pack of PACKS) {
        const src = read(pack, rel);
        expect(src, `${pack}/${rel} must be carried — a pack missing it serves enum members whose families cannot load`).not.toBeNull();
      }
      const [first, ...rest] = PACKS.map((pack) => ({ pack, src: read(pack, rel) as string }));
      for (const other of rest) {
        expect(other.src, `${other.pack}/${rel} drifts from ${first.pack}'s — the engine seam is one body, not three`).toBe(first.src);
      }
    }
  });

  it("every shared engine subtree is carried by EVERY pack, byte-identical (moss_sfx_impl is dispatched by relative import; __pycache__ excluded)", () => {
    const listTree = (pack: string, rel: string): string[] => {
      const base = join(VENDOR, pack, rel);
      if (!existsSync(base)) return [];
      return readdirSync(base, { recursive: true })
        .filter((f) => typeof f === "string" && !(f as string).split(sep).includes("__pycache__") && statSync(join(base, f as string)).isFile())
        .map((f) => (f as string).split(sep).join("/"))
        .sort();
    };
    for (const rel of SHARED_TREES) {
      const trees = PACKS.map((pack) => ({ pack, files: listTree(pack, rel) }));
      const [first, ...rest] = trees;
      expect(first.files.length, `${rel} must hold files in ${first.pack}`).toBeGreaterThan(0);
      for (const other of rest) {
        expect(other.files, `${other.pack}/${rel} file set drifts from ${first.pack}'s`).toEqual(first.files);
        for (const f of first.files) {
          expect(readFileSync(join(VENDOR, other.pack, rel, f), "utf8"), `${other.pack}/${rel}/${f} drifts from ${first.pack}'s`).toBe(
            readFileSync(join(VENDOR, first.pack, rel, f), "utf8"),
          );
        }
      }
    }
  });

  it("the effective model-walk law carries the root confinement and the alias law (round 4: opening stays inside the root, one open per real dir)", () => {
    // The confinement and alias truths are pinned VERBATIM in every
    // pack's walk: a link outside the root rides as an address but
    // never opens (never grafts the foreign tree), and a real
    // container opens once however many spellings reach it. The
    // byte-identity arm beside this one holds the three bodies
    // together; this arm holds the LAW's presence so a future
    // rewrite cannot drop the guards and stay "identical" in a
    // weaker law.
    for (const pack of PACKS) {
      const src = read(pack, "nodes.py") as string;
      const m = /^def _list_audiocore_models\(\)[^\n]*\n[\s\S]*?(?=^def |^class |\Z)/m.exec(src);
      expect(m, `${pack}/nodes.py: the walk law must exist`).toBeTruthy();
      const law = m![0];
      expect(law, `${pack}: the seen-set guard must hold the real root`).toMatch(/seen: set\[str\] = \{real_root\}/);
      expect(law, `${pack}: opening must be confined to the root's real tree`).toMatch(/real_child\.startswith\(real_root \+ os\.sep\)/);
      expect(law, `${pack}: a real dir may open only once (the alias law)`).toMatch(/if confined and real_child not in seen:/);
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

  it("no module-level law is defined twice in one pack file (a shadowed def is dead code wearing a live name)", () => {
    // The re-audit round 3 class: tts and sfx each carried TWO
    // module-level _list_audiocore_models definitions — the first
    // (an older walk law) permanently shadowed by the second. A
    // future editor patching the dead copy would cure nothing,
    // silently. The effective law is now byte-identical across
    // all three packs; this arm keeps any module-level def in
    // nodes.py from ever being defined twice in one file.
    // Round 3 extended the class: the same shadowing disease held
    // FAMILY_NAMES, _DEFAULT_MODEL_DIR, _WEIGHT_FILE_NAMES,
    // _WEIGHT_FILE_SUFFIXES, and _MAX_WALK_DEPTH as doubled
    // module-level ASSIGNMENTS (byte-identical pairs, but a future
    // edit to the first binding would cure nothing) — the arm pins
    // top-level assignments to one binding per name as well.
    for (const pack of PACKS) {
      const src = read(pack, "nodes.py") as string;
      const defs = [...src.matchAll(/^def (\w+)/gm)].map((m) => m[1]);
      const dupes = defs.filter((n, i) => defs.indexOf(n) !== i);
      expect(dupes, `${pack}/nodes.py: module-level functions defined twice (the first is dead shadowed code)`).toEqual([]);
      const assigns = [...src.matchAll(/^([A-Za-z_]\w*) = /gm)].map((m) => m[1]);
      const dupeAssigns = assigns.filter((n, i) => assigns.indexOf(n) !== i);
      expect(dupeAssigns, `${pack}/nodes.py: module-level constants bound twice (the first binding is dead shadowed code)`).toEqual([]);
    }
  });

  it("the effective model-walk law is byte-identical across the three packs (one enum, not three)", () => {
    const bodies = PACKS.map((pack) => {
      const src = read(pack, "nodes.py") as string;
      const m = /^def _list_audiocore_models\(\)[^\n]*\n[\s\S]*?(?=^def |^class |\Z)/m.exec(src);
      expect(m, `${pack}/nodes.py: the walk law must exist`).toBeTruthy();
      return m![0];
    });
    expect(bodies[1], "sfx walk law drifts from tts").toBe(bodies[0]);
    expect(bodies[2], "audio walk law drifts from tts").toBe(bodies[0]);
  });

  it("the deployed tree equals the vendor tree for every shared file, shared subtree, and nodes.py (an undeployed cure is not landed; owner-local — CI boxes deploy nothing)", () => {
    // The engine runs from its own ComfyUI root, whose custom_nodes
    // holds git checkouts of these packs at the pinned refs; the
    // repo's data/runtime tree is the staging checkout. Either is
    // the deployed truth when present; a bare CI checkout has
    // neither and the arm stands down (the same owner-local law as
    // test:expected).
    // RUNTIME_ENGINE already ends in custom_nodes — joining it
    // AGAIN was the round-3 fail-open bug (the doubled path never
    // exists, the filter dropped it silently, and the arm compared
    // staging only). The engine root, when it exists at all, MUST
    // be among the compared roots — fail-closed, never filtered.
    // Round 4 R3: the comparison covers SHARED_TREES too — a
    // moss_sfx_impl file cured in vendor but never deployed is the
    // same non-cure as a stale core.py.
    const listTree = (base: string): string[] =>
      readdirSync(base, { recursive: true })
        .filter((f) => typeof f === "string" && !(f as string).split(sep).includes("__pycache__") && statSync(join(base, f as string)).isFile())
        .map((f) => (f as string).split(sep).join("/"))
        .sort();
    const deployed = [RUNTIME_ENGINE, RUNTIME].filter((d) => existsSync(join(d, PACKS[0])));
    if (existsSync(RUNTIME_ENGINE)) {
      expect(deployed, "the engine root exists — it must be among the compared roots, never silently filtered").toContain(RUNTIME_ENGINE);
    }
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
        for (const rel of SHARED_TREES) {
          const vFiles = listTree(join(VENDOR, pack, rel));
          expect(vFiles.length, `${pack}/${rel} must hold files in vendor`).toBeGreaterThan(0);
          const dBase = join(root, pack, rel);
          expect(existsSync(dBase), `${pack}/${rel} missing under ${root}`).toBe(true);
          expect(listTree(dBase), `${pack}/${rel}: the deployed file set under ${root} drifts from the vendor tree`).toEqual(vFiles);
          for (const f of vFiles) {
            expect(readFileSync(join(dBase, f), "utf8"), `${pack}/${rel}/${f}: the deployed copy under ${root} drifts from the vendor tree`).toBe(
              readFileSync(join(VENDOR, pack, rel, f), "utf8"),
            );
          }
        }
      }
    }
  });

  it("each pack worktree is clean and pinned to the gitlink the parent records (round 4 R4: a deployed cure that never became a commit is not landed; owner-local — needs the pack gitlinks)", () => {
    // The packs are gitlinks: the parent repo records the ref, the
    // pack worktree holds the content. Two drifts hide cures: a
    // DIRTY worktree (edits served by the engine that no pack
    // commit carries — the deployed arm compares files, so vendor
    // and deployment can be mutually consistent yet BOTH
    // uncommitted) and a worktree HEAD the parent does not record
    // (a pack pushed to its own main while the parent still pins
    // the old ref — the round-4 estate audit's "pins must ride
    // in-commit" law). Stands down where the pack is a plain
    // checkout with no git dir (CI without submodules).
    for (const pack of PACKS) {
      const dir = join(VENDOR, pack);
      if (!existsSync(join(dir, ".git"))) continue;
      // Git reads fail LOUD with git's own stderr — a wall that
      // swallows the reason bounces commits nobody can diagnose.
      // --no-optional-locks: these are READs — without it git
      // refreshes the pack's index opportunistically and dies on
      // another session's index.lock (the pack repos are shared
      // working trees).
      const git = (args: string[]): string => {
        try {
          return execFileSync("git", ["--no-optional-locks", ...args], {
            cwd: dir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            // git sets GIT_INDEX_FILE (and kin) for commit-flow hooks;
            // inherited here it points at the PARENT's index while cwd
            // is the pack repo (whose .git is a gitlink file) — every
            // read dies. The wall judges the pack's OWN git state.
            env: { ...process.env, GIT_INDEX_FILE: undefined, GIT_DIR: undefined, GIT_WORK_TREE: undefined },
          }).trim();
        } catch (err) {
          const stderr = err instanceof Error && "stderr" in err ? String(err.stderr) : "";
          throw new Error(`git ${args.join(" ")} in ${pack} failed: ${stderr}`);
        }
      };
      const status = git(["status", "--porcelain"]);
      expect(status, `${pack}: the worktree is dirty — the engine may serve edits no pack commit carries`).toBe("");
      const head = git(["rev-parse", "HEAD"]);
      // the parent's INDEX (not HEAD: the gitlink update rides the
      // very commit this wall gates) must name the pack's HEAD
      const index = execFileSync("git", ["ls-files", "-s", "--", `vendor/comfyui_extensions/${pack}`], {
        cwd: resolve(VENDOR, "..", ".."),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const m = /^160000 ([0-9a-f]{40}) \d+\s+\S+/m.exec(index);
      expect(m, `${pack}: the parent index must record the gitlink`).toBeTruthy();
      expect(m![1], `${pack}: the worktree HEAD is not the ref the parent records — commit the pack and stage the gitlink together`).toBe(head);
    }
  });
});
