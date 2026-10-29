// pack-parity-audiocore.spec.ts — THE ONE-PACK AUDIOCORE WALL
// (rewritten 2026-11-10 from the three-pack parity wall, which
// codified the 2026-09-04 audio-core split: three packs each
// exporting a copy of the Audiocore* classes, held byte-identical.
// THE CONSOLIDATION (operator: "melite-audio-nodes +
// melite-sfx-nodes + melite-tts-nodes. Why not just one?" then
// "we can just code it inside the comfyui audio nodes repository
// we maintain"): the carves are RETIRED — melite-sfx-nodes and
// melite-tts-nodes are deleted from the vendor tree, the
// .gitmodules, the estate install, and the registry roster. Every
// Audiocore* class lives in melite-audio-nodes alone.
//
// What the old wall held together by byte-identity, this wall holds
// by EXCLUSIVITY: no class name may be defined by two vendored
// packs' nodes.py — the shadowing class (one pack's copy serving a
// node while another pack's copy holds the cure) cannot regrow,
// because a second definer reds here at the wall tier, before any
// engine resolves the collision. The served-face tie rides the
// facts extension fold: every class the facts declare for the pack
// must be defined by the pack's nodes.py.
//
// The dispatcher-reached files, the shared engine subtree, the
// model-walk law, the four cured behaviors, the no-shadowed-def
// arm, the deployed≡vendor arm, the gitlink arm, and the estate
// venv standard all carry over — single-pack now.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(__dirname, "..", "..", "..", "..");
const VENDOR = join(ROOT, "vendor", "comfyui_extensions");
const RUNTIME = join(ROOT, "data", "runtime", "comfyui", "custom_nodes");
/** The engine's own ComfyUI root (operator-local; absent on CI). */
const RUNTIME_ENGINE = "/home/user/tools/comfyui/custom_nodes";

const PACK = "melite-audio-nodes";
const FACTS = join(ROOT, "packages", "engines", "comfyui-cordis", "data", "model-facts.json");

/** Dispatcher-reached files the one pack carries: core.py
 *  dispatches through these, qvoice.py is imported by
 *  engines/qwen3_tts.py at inference time, requirements.txt is the
 *  fresh-machine convergence. */
const SHARED_FILES = [
  "core.py",
  "schemas.py",
  "native.py",
  "install.py",
  "env_assert.py",
  "qvoice.py",
  "engines/qwen3_tts.py",
  "engines/moss_sfx_v2.py",
  "engines/__init__.py",
  "requirements.txt",
] as const;

/** Engine subtrees dispatched by relative import. */
const SHARED_TREES = ["engines/moss_sfx_impl"] as const;

const read = (pack: string, rel: string): string | null => {
  const p = join(VENDOR, pack, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

function definedClasses(src: string): string[] {
  return [...src.matchAll(/^class (\w+)/gm)].map((m) => m[1]);
}

/** Every .py file in a pack, repo-relative (__pycache__ excluded):
 *  the pack's class definitions live across nodes.py AND its own
 *  module files (film_mix.py, loudness.py, qvoice_copy.py, …).
 *  _vendor/ is EXCLUDED: a pack's private stdlib copy
 *  (melite_model_base ships inside kimodo AND poser) is reachable
 *  only under that pack's own package path — it never collides at
 *  the engine's class-resolution layer, which is the collision this
 *  census judges. */
const pyFiles = (pack: string): string[] => {
  const base = join(VENDOR, pack);
  return readdirSync(base, { recursive: true })
    .filter((f) => typeof f === "string" && (f as string).endsWith(".py") && !(f as string).split(sep).includes("__pycache__") && !(f as string).split(sep).includes("_vendor") && statSync(join(base, f as string)).isFile())
    .map((f) => (f as string).split(sep).join("/"))
    .sort();
};

/** class -> defining (pack, file), over the whole pack tree. */
const classDefs = (pack: string): Map<string, string> => {
  const out = new Map<string, string>();
  for (const f of pyFiles(pack)) {
    for (const cls of definedClasses(readFileSync(join(VENDOR, pack, f), "utf8"))) {
      out.set(cls, f);
    }
  }
  return out;
};

/** The vendored fleet: every directory carrying a nodes.py. */
const vendoredPacks = (): string[] =>
  readdirSync(VENDOR).filter((d) => existsSync(join(VENDOR, d, "nodes.py"))).sort();

describe("the one-pack audiocore wall", () => {
  it("no class is defined by two vendored packs (the carve's shadowing class cannot regrow — a second definer of any class reds here, before the engine resolves the collision)", () => {
    // The three-pack era needed byte-identity because duplication
    // was LAWFUL. The consolidation retired the duplication; this
    // census is the law that keeps it retired. Any class name
    // defined in two packs (any of either pack's .py files) is the
    // old disease back — fix the pack, never the census.
    const owners = new Map<string, string>();
    const collisions: string[] = [];
    for (const pack of vendoredPacks()) {
      for (const [cls, file] of classDefs(pack)) {
        const first = owners.get(cls);
        if (first !== undefined) collisions.push(`${cls}: ${first} + ${pack}/${file}`);
        else owners.set(cls, `${pack}/${file}`);
      }
    }
    expect(collisions, "a class is defined by more than one vendored pack — the carve is regrowing").toEqual([]);
  });

  it("every class the facts extension fold declares for the pack is defined by the pack's tree (the served face ties to the real definer)", () => {
    const facts = JSON.parse(readFileSync(FACTS, "utf8")) as {
      extension_node_types?: Record<string, string[]>;
    };
    const served = facts.extension_node_types?.[PACK] ?? [];
    expect(served.length, "the facts fold declares the pack's served classes — an empty fold is a facts break, not a pass").toBeGreaterThan(0);
    const defs = classDefs(PACK);
    for (const cls of served) {
      expect(defs.has(cls), `${PACK} does not define '${cls}' but the facts fold serves it — a dead served face`).toBe(true);
    }
  });

  it("every dispatcher-reached file is carried by the pack (core.py imports these by relative path)", () => {
    for (const rel of SHARED_FILES) {
      expect(read(PACK, rel), `${PACK}/${rel} must be carried — its absence serves enum members whose families cannot load`).not.toBeNull();
    }
  });

  it("every shared engine subtree is carried by the pack, holding files (moss_sfx_impl is dispatched by relative import; __pycache__ excluded)", () => {
    const listTree = (base: string): string[] => {
      if (!existsSync(base)) return [];
      return readdirSync(base, { recursive: true })
        .filter((f) => typeof f === "string" && !(f as string).split(sep).includes("__pycache__") && statSync(join(base, f as string)).isFile())
        .map((f) => (f as string).split(sep).join("/"))
        .sort();
    };
    for (const rel of SHARED_TREES) {
      expect(listTree(join(VENDOR, PACK, rel)).length, `${PACK}/${rel} must hold files`).toBeGreaterThan(0);
    }
  });

  it("the effective model-walk law carries the root confinement and the alias law (opening stays inside the root, one open per real dir)", () => {
    const src = read(PACK, "nodes.py") as string;
    const m = /^def _list_audiocore_models\(\)[^\n]*\n[\s\S]*?(?=^def |^class |\Z)/m.exec(src);
    expect(m, `${PACK}/nodes.py: the walk law must exist`).toBeTruthy();
    const law = m![0];
    expect(law, "the seen-set guard must hold the real root").toMatch(/seen: set\[str\] = \{real_root\}/);
    expect(law, "opening must be confined to the root's real tree").toMatch(/real_child\.startswith\(real_root \+ os\.sep\)/);
    expect(law, "a real dir may open only once (the alias law)").toMatch(/if confined and real_child not in seen:/);
  });

  // ── THE CURED BEHAVIORS — pinned in the one serving copy ──

  it("AudiocoreTTS normalizes voice=\"none\" to the empty speaker (the .qvoice owns the timbre; never a preset fallback)", () => {
    const src = read(PACK, "nodes.py") as string;
    const m = new RegExp(`^class AudiocoreTTS\\b[\\s\\S]*?(?=^class |^# ── |\\Z)`, "m").exec(src);
    expect(m, "AudiocoreTTS exists").toBeTruthy();
    expect(m![0], "the voice \"none\" normalization arm is missing").toMatch(
      /if call_kwargs\.get\("voice"\) == "none":\s*\n\s*call_kwargs\["voice"\] = ""/,
    );
  });

  it("AudiocoreVoiceStudio returns the REAL design sample (the 1-sample silence stub is gone)", () => {
    const src = read(PACK, "nodes.py") as string;
    const m = new RegExp(`^class AudiocoreVoiceStudio\\b[\\s\\S]*?(?=^class |^# ── |\\Z)`, "m").exec(src);
    expect(m, "AudiocoreVoiceStudio exists").toBeTruthy();
    const body = m![0];
    expect(body, "the export must unpack the rendered sample").toContain("sample_pcm, sample_sr = _run_with_progress");
    expect(body, "the sample rides the returned waveform").toMatch(/if sample_pcm:/);
    expect(body, "the stub silence variable must not return").not.toContain("silence = torch.zeros");
    expect(body, "the returned rate is the sample's own").toContain('"sample_rate": sample_sr');
  });

  it("LoadAudiocoreModel reports load progress through the native on_progress callback", () => {
    const src = read(PACK, "nodes.py") as string;
    const m = new RegExp(`^class LoadAudiocoreModel\\b[\\s\\S]*?(?=^class |^# ── |\\Z)`, "m").exec(src);
    expect(m, "LoadAudiocoreModel exists").toBeTruthy();
    expect(m![0], "the load must ride the progress bridge").toContain(
      "_run_with_load_progress(lambda report: m.load(on_progress=report))",
    );
    expect(src, "the progress bridge helper must be defined beside its user").toMatch(
      /def _run_with_load_progress\(fn\):/,
    );
  });

  it("LoadAudiocoreModel derives the default family and model_path as ONE coherent pair (never family=TTS with an SFX tree)", () => {
    const src = read(PACK, "nodes.py") as string;
    const m = new RegExp(`^class LoadAudiocoreModel\\b[\\s\\S]*?(?=^class |^# ── |\\Z)`, "m").exec(src);
    expect(m, "LoadAudiocoreModel exists").toBeTruthy();
    const body = m![0];
    // The re-audit's F4: the pinned moss_tts_nano default + the
    // models[0] belt served a MOSS-SFX tree under a MOSS-TTS
    // family on machines whose enum lacks moss-tts. The cure
    // derives the pair together — the derivation lines are pinned
    // verbatim so a rewrite cannot regress to the silent fallback.
    expect(body, "the default family must be derived from the served enum").toContain(
      "default_family = next(\n            (f for f in FAMILY_NAMES if _DEFAULT_MODEL_DIR.get(f) in models),",
    );
    expect(body, "the default model follows the derived family").toMatch(
      /default_model = _DEFAULT_MODEL_DIR\.get\(default_family, ""\)/,
    );
    expect(body, "no hardwired family default may return").not.toMatch(
      /default_family = "moss_tts_nano"/,
    );
  });

  // ── THE DEPLOYED TRUTH — vendor equals the tree the engine serves ──

  it("no module-level law is defined twice in the pack file (a shadowed def is dead code wearing a live name)", () => {
    // The re-audit round 3 class: the pack carried TWO module-level
    // _list_audiocore_models definitions — the first permanently
    // shadowed. The same disease held FAMILY_NAMES,
    // _DEFAULT_MODEL_DIR, _WEIGHT_FILE_NAMES, _WEIGHT_FILE_SUFFIXES,
    // and _MAX_WALK_DEPTH as doubled module-level ASSIGNMENTS. The
    // arm pins one def and one binding per name.
    const src = read(PACK, "nodes.py") as string;
    const defs = [...src.matchAll(/^def (\w+)/gm)].map((m) => m[1]);
    const dupes = defs.filter((n, i) => defs.indexOf(n) !== i);
    expect(dupes, `${PACK}/nodes.py: module-level functions defined twice (the first is dead shadowed code)`).toEqual([]);
    const assigns = [...src.matchAll(/^([A-Za-z_]\w*) = /gm)].map((m) => m[1]);
    const dupeAssigns = assigns.filter((n, i) => assigns.indexOf(n) !== i);
    expect(dupeAssigns, `${PACK}/nodes.py: module-level constants bound twice (the first binding is dead shadowed code)`).toEqual([]);
  });

  it("the deployed tree equals the vendor tree for every shared file, shared subtree, and nodes.py (an undeployed cure is not landed; owner-local — CI boxes deploy nothing)", () => {
    // The engine runs from its own ComfyUI root, whose custom_nodes
    // holds the checkout of the pack; the repo's data/runtime tree
    // is the staging checkout. Either is the deployed truth when
    // present; a bare CI checkout has neither and the arm stands
    // down (the same owner-local law as test:expected).
    // RUNTIME_ENGINE already ends in custom_nodes — joining it
    // AGAIN was the round-3 fail-open bug (the doubled path never
    // exists, the filter dropped it silently, and the arm compared
    // staging only). The engine root, when it exists at all, MUST
    // be among the compared roots — fail-closed, never filtered.
    const listTree = (base: string): string[] =>
      readdirSync(base, { recursive: true })
        .filter((f) => typeof f === "string" && !(f as string).split(sep).includes("__pycache__") && statSync(join(base, f as string)).isFile())
        .map((f) => (f as string).split(sep).join("/"))
        .sort();
    const deployed = [RUNTIME_ENGINE, RUNTIME].filter((d) => existsSync(join(d, PACK)));
    if (existsSync(RUNTIME_ENGINE)) {
      expect(deployed, "the engine root exists — it must be among the compared roots, never silently filtered").toContain(RUNTIME_ENGINE);
    }
    if (deployed.length === 0) return;
    for (const root of deployed) {
      for (const rel of [...SHARED_FILES, "nodes.py", "__init__.py"]) {
        const v = read(PACK, rel);
        const dp = join(root, PACK, rel);
        expect(existsSync(dp), `${PACK}/${rel} missing under ${root}`).toBe(v !== null);
        if (v !== null) {
          expect(readFileSync(dp, "utf8"), `${PACK}/${rel}: the deployed copy under ${root} drifts from the vendor tree`).toBe(v);
        }
      }
      for (const rel of SHARED_TREES) {
        const vFiles = listTree(join(VENDOR, PACK, rel));
        expect(vFiles.length, `${PACK}/${rel} must hold files in vendor`).toBeGreaterThan(0);
        const dBase = join(root, PACK, rel);
        expect(existsSync(dBase), `${PACK}/${rel} missing under ${root}`).toBe(true);
        expect(listTree(dBase), `${PACK}/${rel}: the deployed file set under ${root} drifts from the vendor tree`).toEqual(vFiles);
        for (const f of vFiles) {
          expect(readFileSync(join(dBase, f), "utf8"), `${PACK}/${rel}/${f}: the deployed copy under ${root} drifts from the vendor tree`).toBe(
            readFileSync(join(VENDOR, PACK, rel, f), "utf8"),
          );
        }
      }
    }
  });

  it("the pack worktree is clean and pinned to the gitlink the parent records (a deployed cure that never became a commit is not landed; owner-local — needs the pack gitlink)", () => {
    // The pack is a gitlink: the parent repo records the ref, the
    // pack worktree holds the content. Two drifts hide cures: a
    // DIRTY worktree (edits served by the engine that no pack
    // commit carries — the deployed arm compares files, so vendor
    // and deployment can be mutually consistent yet BOTH
    // uncommitted) and a worktree HEAD the parent does not record
    // (a pack pushed to its own main while the parent still pins
    // the old ref). Stands down where the pack is a plain checkout
    // with no git dir (CI without submodules).
    const dir = join(VENDOR, PACK);
    if (!existsSync(join(dir, ".git"))) return;
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
        throw new Error(`git ${args.join(" ")} in ${PACK} failed: ${stderr}`);
      }
    };
    const status = git(["status", "--porcelain"]);
    expect(status, `${PACK}: the worktree is dirty — the engine may serve edits no pack commit carries`).toBe("");
    const head = git(["rev-parse", "HEAD"]);
    // the parent's INDEX (not HEAD: the gitlink update rides the
    // very commit this wall gates) must name the pack's HEAD
    const index = execFileSync("git", ["ls-files", "-s", "--", `vendor/comfyui_extensions/${PACK}`], {
      cwd: resolve(VENDOR, "..", ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const m = /^160000 ([0-9a-f]{40}) \d+\s+\S+/m.exec(index);
    expect(m, `${PACK}: the parent index must record the gitlink`).toBeTruthy();
    expect(m![1], `${PACK}: the worktree HEAD is not the ref the parent records — commit the pack and stage the gitlink together`).toBe(head);
  });

  it("the torch seats register in ComfyUI's model management (tts NEW-1: /free reaches them through the eviction loop, no bespoke route)", () => {
    // THE /free SEAT (the 2026-11-12 warm-card burn: native /free
    // freed ~6 GB while ~15 GB of torch seats stayed resident —
    // neither torch loader registered, so the eviction loop never
    // saw them). Both torch loaders register exactly like the
    // native cold path does.
    const core = readFileSync(join(VENDOR, PACK, "core.py"), "utf8");
    const torchBody = core.slice(core.indexOf("def _load_torch("), core.indexOf("def _load_qwen3_torch("));
    const qwenBody = core.slice(core.indexOf("def _load_qwen3_torch("), core.indexOf("def _register_in_model_management("));
    expect(torchBody, "moss _load_torch must register the seat").toContain("_register_in_model_management()");
    expect(qwenBody, "qwen3 _load_qwen3_torch must register the seat").toContain("_register_in_model_management()");
  });

  it("is_dead counts the torch seat (tts NEW-1: a torch seat with no native session is LIVE — free_memory skips dead seats)", () => {
    // The old `_session is None` spelling read every torch seat as
    // dead: free_memory's `not is_dead()` gate skipped exactly the
    // seats it needed to evict, and the gc pass logged them as
    // leaks. Registration without this read is decoration.
    const core = readFileSync(join(VENDOR, PACK, "core.py"), "utf8");
    const body = core.slice(core.indexOf("def is_dead(self) -> bool:"), core.indexOf("def real_model("));
    expect(body, "is_dead must consult the torch engine too").toContain("_torch_engine");
  });

  it("eviction releases the warmed torch copy (tts NEW-1: the process-wide handle map is the seat native /free could never see)", () => {
    // _WARMED_HANDLES survives every ManagedModel teardown — the
    // Unload node's explicit gesture was its only owner. The
    // eviction path owns it now: model_unload during ComfyUI's
    // free_memory iteration drops it, mirroring the node.
    const core = readFileSync(join(VENDOR, PACK, "core.py"), "utf8");
    const body = core.slice(core.indexOf("def _free_session(self)"), core.indexOf("def _cleanup(self)"));
    expect(body, "_free_session must release the warmed torch copy").toContain("release_warmed_handles");
  });
});

describe("the estate venv standard (the transformers/hf-hub pin law)", () => {
  // THE 2026-10-16 REINSTALL (roadmap: requirements bare-floats
  // transformers): Manager resolved the float to 4.57.3 and floated
  // huggingface-hub to 1.33.0, whose 1.x guard broke the ENGINE
  // BOOT (core transformers wants hf-hub >=0.34,<1.0 — the
  // traceback died in `import execution` before any pack loaded).
  // THE 2026-11-10 RE-PIN, twice in one day: the morning pin moved
  // the py3.14 engine venv to transformers 5.1.0; the
  // faster-qwen3-tts replacement (the operator's one-or-the-other
  // ruling) then pulled qwen-tts-hf 0.1.1.post1, which requires
  // transformers >=5.20 — the live venv now runs 5.20.2 with hub
  // 1.33.0, both engine chains boot clean (moss_sfx_v2 +
  // qwen3_tts, 0 import failures on the 1673-class boot). The
  // STANDARD is the live proven set. This wall holds the pin so
  // every fresh install converges on the standard, never the
  // lottery. The clean-venv boot gate rides the next provision.
  const STANDARD = { transformers: "5.20.2", huggingface_hub: "==1.33.0" } as const;
  // THE ONE-OR-THE-OTHER LAW (operator, 2026-11-10): "qwen-tts 0.1.
  // this REPLACES qwen-tts dude. We do ONE or THE OTHER, not
  // faster-qwen AND normal qwen." The pack rides faster-qwen3-tts
  // (which pulls qwen-tts-hf as its transformers-5 provider); the
  // bare qwen-tts distribution must never appear beside it.
  const TTS_ENGINE = { wrapper: "faster-qwen3-tts==0.5.4", provider: "qwen-tts-hf==0.1.1.post1" } as const;

  it("the audio pack carries the estate venv standard pins in requirements.txt", () => {
    const req = read(PACK, "requirements.txt");
    expect(req, `${PACK}/requirements.txt exists`).not.toBeNull();
    const body = (req as string).split("\n").map((l) => l.trim()).filter((l) => l !== "" && !l.startsWith("#"));
    expect(body, "transformers pinned to the estate standard").toContain(`transformers==${STANDARD.transformers}`);
    expect(body, "huggingface_hub pinned to the 1.x line the 5.x transformers requires").toContain(`huggingface_hub${STANDARD.huggingface_hub}`);
    expect(body, "the tts wrapper is the faster-qwen3-tts distribution at its pin").toContain(TTS_ENGINE.wrapper);
    expect(body, "the transformers-5 qwen_tts provider rides the wrapper's own dependency pin").toContain(TTS_ENGINE.provider);
    expect(body.some((l) => l.split(/[=<>!~\[]/)[0]!.toLowerCase() === "qwen-tts"),
      "the bare qwen-tts distribution must not appear beside faster-qwen3-tts (one or the other, never both)").toBe(false);
  });

  it("no vendored pack floats transformers or huggingface_hub (the lottery has one ticket left: none)", () => {
    for (const name of readdirSync(VENDOR)) {
      const req = join(VENDOR, name, "requirements.txt");
      if (!existsSync(req) || !statSync(req).isFile()) continue;
      for (const line of readFileSync(req, "utf8").split("\n").map((l) => l.trim())) {
        if (line === "" || line.startsWith("#")) continue;
        const dep = line.split(/[=<>!~\[]/)[0]!.toLowerCase();
        if (dep !== "transformers" && dep !== "huggingface_hub" && dep !== "huggingface-hub") continue;
        expect(line.startsWith("transformers==") || line.startsWith("huggingface_hub==") || line.startsWith("huggingface-hub==") || line.startsWith("huggingface_hub<") || line.startsWith("huggingface-hub<"),
          `${name}: '${line}' floats a boot-critical dep — pin it to the estate venv standard`).toBe(true);
      }
    }
  });

  // THE BOOT ENV ASSERT (audit 016, 2026-11-12): declare-only is not
  // a contract for a PUBLISHED pack. Manager re-runs requirements only
  // on this pack's install/update; the venv is shared and last
  // installer wins — on 2026-10-23 an outside pin landed transformers
  // 5.1.0 under qwen-tts-hf 0.1.1.post1 (floor >=5.15.1,<6) and every
  // qwen3_tts load died MID-RUN with a raw AttributeError
  // ('Qwen3TTSTalkerCodePredictorConfig' object has no attribute
  // 'validate_layer_type') on all six DECL addresses. Two arms: the
  // wiring (the assert fires at pack import, before nodes load) and
  // the judge (the burn's exact version reds, the standard passes).
  it("the pack asserts the python env AT IMPORT — assert_transformers_floor fires before nodes load (the boot-time refusal)", () => {
    const init = read(PACK, "__init__.py");
    expect(init, `${PACK}/__init__.py exists`).not.toBeNull();
    const body = init as string;
    const assertIdx = body.indexOf("assert_transformers_floor()");
    const importIdx = body.indexOf("from .nodes import");
    expect(assertIdx, "__init__.py calls assert_transformers_floor()").toBeGreaterThan(-1);
    expect(importIdx, "__init__.py imports the nodes").toBeGreaterThan(-1);
    expect(assertIdx, "the assert fires BEFORE the nodes import — a failed assert refuses the whole pack at boot").toBeLessThan(importIdx);
    const env = read(PACK, "env_assert.py");
    expect(env, `${PACK}/env_assert.py exists`).not.toBeNull();
    expect((env as string).includes("validate_layer_type"), "the refusal names the burn's own AttributeError").toBe(true);
  });

  it("the floor judge reds the burn's version and passes the standard (the 2026-10-23 drift, judged)", () => {
    // Runs the pack's OWN judge in python (the same venv grammar the
    // engine runs); reds if the judge ever stops refusing 5.1.0 or
    // stops passing 5.20.2 — the estate standard.
    const probe = [
      "import sys; sys.path.insert(0, sys.argv[1])",
      "from env_assert import _version_tuple, TRANSFORMERS_FLOOR, TRANSFORMERS_CEILING",
      "assert not (_version_tuple('5.1.0') >= _version_tuple(TRANSFORMERS_FLOOR) and _version_tuple('5.1.0') < _version_tuple(TRANSFORMERS_CEILING)), 'the burn version 5.1.0 passes the floor — the judge is dead'",
      "assert _version_tuple('5.20.2') >= _version_tuple(TRANSFORMERS_FLOOR) and _version_tuple('5.20.2') < _version_tuple(TRANSFORMERS_CEILING), 'the estate standard 5.20.2 fails the floor'",
      "print('judge-live')",
    ].join("; ");
    let out: string;
    try {
      out = execFileSync("/home/user/tools/comfyui/.venv/bin/python", ["-c", probe, join(VENDOR, PACK)], { encoding: "utf8" }).trim();
    } catch {
      // engine venv absent (CI box): stand down like the deployed arm
      return;
    }
    expect(out).toBe("judge-live");
  });

  // THE CUDA LANE REFUSAL (the 2026-10-29 roar burn's "it ran on CPU"
  // half, audit dev_docs/audits/moss-sfx-regression-2026-11-12.md
  // §4 C3): the moss pipeline falls back to CPU SILENTLY at generate
  // time (pipeline_moss_soundeffect.py) — a CUDA-less env serves a
  // multi-minute crawl instead of a named refusal. Two arms: the
  // wiring (assert_cuda_lane at pack import) and the judge (a forced
  // CUDA-less torch reds with the remedy, the real env passes).
  it("the pack refuses a CUDA-less env AT IMPORT — assert_cuda_lane fires before nodes load", () => {
    const init = read(PACK, "__init__.py");
    expect(init, `${PACK}/__init__.py exists`).not.toBeNull();
    const body = init as string;
    // Judge the ACTIVE call (a whole-line statement), never a
    // commented-out spell — the 2026-11-12 toggle-proof caught
    // indexOf matching its own commented toggle.
    const activeCall = /^\s*assert_cuda_lane\(\)\s*$/m.exec(body);
    expect(activeCall, "__init__.py CALLS assert_cuda_lane() (an active statement, not a comment)").not.toBeNull();
    const callLine = body.indexOf(activeCall![0]);
    const importIdx = body.indexOf("from .nodes import");
    expect(importIdx, "__init__.py imports the nodes").toBeGreaterThan(-1);
    expect(callLine, "the cuda assert fires BEFORE the nodes import").toBeLessThan(importIdx);
    const env = read(PACK, "env_assert.py");
    expect(env, `${PACK}/env_assert.py exists`).not.toBeNull();
    expect((env as string).includes("is_available"), "the refusal judges torch.cuda.is_available").toBe(true);
    expect((env as string).includes("CPU"), "the refusal names the CPU fallback it refuses").toBe(true);
  });

  it("the cuda judge reds a forced CUDA-less torch and passes this CUDA box", () => {
    // Runs the pack's OWN judge in the engine venv: with
    // is_available forced False it must raise the named remedy; as-is
    // on this box it must pass silently.
    const probe = [
      "import sys; sys.path.insert(0, sys.argv[1])",
      "import torch",
      "torch.cuda.is_available = lambda: False",
      "from env_assert import assert_cuda_lane",
      "try:",
      "    assert_cuda_lane()",
      "    raise SystemExit('cuda-less env passed the judge — the refusal is dead')",
      "except RuntimeError as e:",
      "    assert 'no CUDA device' in str(e), 'the refusal names the missing device'",
      "torch.cuda.is_available = lambda: True",
      "assert_cuda_lane()",
      "print('cuda-judge-live')",
    ].join("\n");
    let out: string;
    try {
      out = execFileSync("/home/user/tools/comfyui/.venv/bin/python", ["-c", probe, join(VENDOR, PACK)], { encoding: "utf8" }).trim();
    } catch (e) {
      const msg = String(e);
      if (msg.includes("cuda-less env passed")) throw new Error(msg);
      // engine venv absent (CI box): stand down like the deployed arm
      return;
    }
    expect(out).toBe("cuda-judge-live");
  });

  // THE KEYED ENGINE RESIDENCY (the 2026-11-12 eviction cure, audit
  // dev_docs/audits/moss-sfx-regression-2026-11-12.md §2 B6 + §4 C4):
  // the single-slot _active_model handoff made qwen3_tts and
  // moss_sfx_v2 evict each other on EVERY alternation — a measured
  // 55 s reload per flip. The cure is a keyed (family, path,
  // variant) residency dict with a cap and a free-VRAM guard; the
  // cross-family eviction seam ("unloading X before loading Y") is
  // GONE from every load path. Live receipt: the interleave log run
  // of 2026-11-12 shows "loaded qwen3_tts" with NO moss eviction,
  // then "reusing cached moss_sfx_v2 torch engine" (0 s flip).
  it("the pack keeps audio engines resident per key — no cross-family eviction seam in any load path", () => {
    const core = read(PACK, "core.py");
    expect(core, `${PACK}/core.py exists`).not.toBeNull();
    const src = core as string;
    expect(src.includes("_engines:"), "the keyed residency dict is declared").toBe(true);
    expect(src.includes("def _seat_resident"), "the seat helper exists").toBe(true);
    expect(src.includes("_ENGINE_RESIDENCY_CAP"), "the residency cap constant exists").toBe(true);
    expect(
      src.includes("_RESIDENCY_HEADROOM_BYTES"),
      "the free-VRAM guard constant exists (two engines must leave headroom)",
    ).toBe(true);
    expect(
      src.includes("_active_model"),
      "the retired single-slot seam is fully gone (no reference remains)",
    ).toBe(false);
    const evictions = src.match(/unloading %s before loading/g);
    expect(
      evictions === null,
      "no load path evicts the previous family — the keyed cache owns eviction via cap + VRAM guard",
    ).toBe(true);
  });
});
