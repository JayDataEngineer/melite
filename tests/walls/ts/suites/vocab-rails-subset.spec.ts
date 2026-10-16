import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "../../../../packages/engines/comfyui-card-kit/src/vocab.ts";
import { TAGGER_CAPTION_TASKS, TAGGER_CAPTION_TYPES, TAGGER_CAPTION_LENGTHS, TAGGER_EXTRA_OPTIONS } from "../../../../packages/engines/comfyui-card-kit/src/lanes-image-tools.ts";
import { PRESET_SPEAKERS } from "../../../../packages/models/qwen3-tts/src/actions.ts";
import { SCALE_METHODS, SCALE_MODEL_OPTIONS } from "../../../../packages/models/input/src/actions.ts";
import { parseInputSpec } from "../../../../packages/engines/comfyui-cordis/src/wiringWall.ts";

// THE VOCAB-RAILS SUBSET WALL (schema-gate-inventory fix 3, 2026-10-12):
// the engine-subset wall judged ONLY the kit's sampler/scheduler
// pair; every hand-written `vocabulary([...])` literal and every
// DECL variant rail that stamps a checkpoint name passed every
// gate in the repository (schema-bottomup G4: wd14's 11 and
// florence2's 14 names "maintained by hand, tested by a second
// hand-copy"). This wall gives each the SAME comparison: a literal
// is either JOINED to an engine combo (literal ⊆ the tracked
// fixture's value list — dead names 400 at the engine) or DECLARED
// model-local in the registry below WITH its reason, and the
// census arm turns red the moment a NEW vocabulary( site or a NEW
// checkpoint-stamping DECL appears unmapped. The values are read
// from source at run time (imported consts where exported, the
// param-keyed line extracted from the card/schema file where
// inline) — the test itself carries NO second copy of any list.
const FIXTURE = new URL("../../fixtures/pinned-combos.min.json", import.meta.url);
const LIVE = join(process.cwd(), "data", "tmp", "object_info_prod.json");

const pkg = (...p: string) => join(process.cwd(), "packages", ...p);

/** One inline `param: vocabulary([...])` site — extracted from its
 *  source line at run time (the file is the SSOT, never this
 *  table). */
function inlineVocab(file: string, param: string): string[] {
  const text = readFileSync(pkg(...file.split("/")), "utf8");
  const m = new RegExp(param + "\\s*:\\s*vocabulary\\(\\[([^\\]]*)\\]").exec(text);
  if (!m) throw new Error("vocab-rails: no vocabulary site for " + param + " in " + file);
  return [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] ?? x[2]);
}

/** Every checkpoint name a DECL's variant rail stamps — scoped to
 *  the "variants": [ ... ] array (the top-level defaults block may
 *  lawfully repeat the family default; it is not the rail). */
function railStamps(decl: string): string[] {
  const text = readFileSync(pkg("models", decl, "src", "index.ts"), "utf8");
  const start = text.indexOf('"variants":');
  const end = text.indexOf('"variant_groups":', start);
  const rail = text.slice(start, end === -1 ? undefined : end);
  return [...rail.matchAll(/"checkpoint":\s*"([^"]+)"/g)].map((m) => m[1]);
}

// ── THE REGISTRY — every vocabulary( site in packages/ and every
// checkpoint-stamping DECL, each JOINED (engine combo bounds it)
// or LOCAL (the engine doc is silent; the reason states whose
// vocabulary it is). A new site fails the census below until it
// lands in one of these two tables. ──
type Joined = { site: string; join: string; values: readonly string[] };

const JOINED: Joined[] = [
  // THE NODE THE LANE COMPOSES (video drift audit, 2026-10-13): h3
  // wires KSamplerSelect + BasicSampler's scheduler through
  // SamplerCustomAdvanced — the KSampler.* proxy rows below judged
  // the same BACKEND enums but never the nodes the lane actually
  // loads; the join now names those nodes directly.
  { site: "h3:sampler_name", join: "KSamplerSelect.sampler_name", values: SAMPLER_OPTIONS },
  { site: "h3:sched_name", join: "BasicScheduler.scheduler", values: SCHEDULER_OPTIONS },
  { site: "tagger:caption_task", join: "Florence2Run.task", values: TAGGER_CAPTION_TASKS },
  { site: "tagger:caption_type", join: "JJC_JoyCaption.caption_type", values: TAGGER_CAPTION_TYPES },
  { site: "tagger:caption_length", join: "JJC_JoyCaption.caption_length", values: TAGGER_CAPTION_LENGTHS },
  { site: "motion:cfg_type", join: "KimodoTextToPose.cfg_type", values: inlineVocab("motion/motion/src/card.ts", "cfg_type") },
  // RE-JOINED (walls-truths audit, 2026-10-13): both sites sat LOCAL
  // with the reason "provisioned files, not engine combos" — false
  // since the packs landed; the live engine declares BOTH combos
  // (FrameInterpolationModelLoader.model_name,
  // SeedVR2LoadDiTModel.model) and the card ⊆ engine diff was
  // empty. These are the operator's only video door's two weight
  // pickers; judged by nobody while LOCAL (a LOCAL row is only
  // checked for non-emptiness). The modern-combo parse in
  // wiringWall (batch 2026-10-13) is what made the join expressible.
  { site: "h3:interp_model", join: "FrameInterpolationModelLoader.model_name", values: inlineVocab("models/h3/src/schema.ts", "interp_model") },
  { site: "h3:sr_model", join: "SeedVR2LoadDiTModel.model", values: inlineVocab("models/h3/src/schema.ts", "sr_model") },
  // THE INPUT-PREP SCALE CONTRACT (volley a+g, 2026-10-24): the
  // card's scale_method dropdown serves the input family's
  // SCALE_METHODS export (one truth — the card's vocabulary and the
  // prep action's enum options both cite it), grounded in ComfyUI
  // core ImageScale's own upscale_method combo
  // (data/tmp/object_info_prod.json: nearest-exact, bilinear, area,
  // bicubic, lanczos). Imported, never a second copy (the wall's
  // header: imported consts where exported) — a card-side widening
  // and a fixture-side narrowing both red the subset arm below.
  { site: "input-prep:scale_method", join: "ImageScale.upscale_method", values: SCALE_METHODS },
];

// Inverted join — the engine combo (the dropdown the node's UI
// offers) must stay a subset of the card's fuller literal (the
// API accepts more than the combo lists; the card's leading ""
// sentinel and full instruction list are deliberate). The
// tagger:extra_option site left this rail on 2026-10-16: the
// engine's own combo carries an upstream vulgar-caption
// instruction row, and the card's roster deliberately drops that
// one row (release hygiene — the tree keeps no profanity); the
// site is declared model-local below with that reason.
const JOINED_INVERTED: Joined[] = [];

// Only DECLs whose VARIANTS array stamps a checkpoint ride here
// (yue2 and joycaption carry theirs in lane_inputs / the mods
// manifest — a different mechanism, lawfully outside this rail).
// `exact` rails serve the engine's WHOLE roster — set-equality
// both ways, the family's "one variant per live name" contract
// (the engine-truth home; the family's own decl.spec pins only
// derivable plugin shape).
const JOINED_RAILS: { decl: string; join: string; exact?: boolean }[] = [
  { decl: "wd14", join: "WD14Tagger|pysssss.model", exact: true },
  { decl: "florence2", join: "DownloadAndLoadFlorence2Model.model", exact: true },
];

const LOCAL: { site: string; values: () => readonly string[]; reason: string }[] = [
  { site: "tts:voice", values: () => PRESET_SPEAKERS, reason: "the model's own built-in CustomVoice roster (the engine node declares no speaker combo)" },
  { site: "music:mode", values: () => inlineVocab("audio/music/src/card.ts", "mode"), reason: "the MMAudio lane's prompt-side mode toggle (no engine combo declares it)" },
  { site: "anny:transparent", values: () => inlineVocab("3d/anny/src/card.ts", "transparent"), reason: "wire-string toggle under the loose anny law (str(x) != 'false' — the vendor step-doc, not an engine combo)" },
  { site: "tagger:extra_option", values: () => TAGGER_EXTRA_OPTIONS, reason: "the JoyCaption instruction list minus the engine's own vulgar-caption row — the card deliberately drops that one upstream combo entry (release hygiene, 2026-10-16: the tracked tree keeps no profanity); the engine node keeps its full dropdown" },
  { site: "input-prep:media_type", values: () => inlineVocab("image/input-prep/src/card.ts", "media_type"), reason: "card-local media-kind toggle" },
  { site: "rig:file_format", values: () => inlineVocab("3d/rig/src/card.ts", "file_format"), reason: "card-local export-format toggle — glb for the web estate, fbx for the DSH-profile Unity door (the M5 ruling: the node converts through headless Blender; no engine combo declares formats)" },
  { site: "h3:attention_backend", values: () => inlineVocab("models/h3/src/schema.ts", "attention_backend"), reason: "the h3 family's own model vocabulary (its kitchen's attention modes)" },
  { site: "h3:sla_block_size", values: () => inlineVocab("models/h3/src/schema.ts", "sla_block_size"), reason: "the h3 family's own SLA block sizes" },
  { site: "h3:sla_dense_backend", values: () => inlineVocab("models/h3/src/schema.ts", "sla_dense_backend"), reason: "the h3 family's own dense backend picker" },
  { site: "h3:sla_reference_protection", values: () => inlineVocab("models/h3/src/schema.ts", "sla_reference_protection"), reason: "the h3 family's own protection levels" },
  { site: "h3:sharpen_method", values: () => inlineVocab("models/h3/src/schema.ts", "sharpen_method"), reason: "the h3 family's own sharpener kernels" },
  // THE MODEL CHOICE (operator directive, 2026-11-08): the standard
  // ComfyUI upscale-model roster (led by the "" unstated sentinel)
  // — declared LOCAL because the LIVE engine's
  // UpscaleModelLoader.model_name COMBO is EMPTY today (object_info
  // serves options: [] — no model files installed in
  // models/upscale_models): there is no live roster to join, and a
  // join to the empty combo would condemn every name. When a user
  // installs files the combo grows; the honest face is this
  // declared set + the engine's own loud refusal on an absent file.
  { site: "input-prep:scale_model", values: () => SCALE_MODEL_OPTIONS, reason: "the standard models/upscale_models install roster — the live UpscaleModelLoader combo is EMPTY (no model files installed), so there is no engine roster to join; the engine refuses loud on a picked-but-absent file" },
];

const LOCAL_RAILS: string[] = [];

const deadNames = (served: readonly string[], engine: readonly string[]) =>
  served.filter((n) => !engine.includes(n));

describe("THE VOCAB-RAILS SUBSET WALL — every closed vocabulary is engine-joined or declared local", () => {
  it("every joined vocabulary and rail names only what the tracked engine fixture runs, unconditionally", () => {
    const fx = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, string[]>;
    for (const { site, join, values } of JOINED) {
      const combo = fx[join];
      expect(combo, `the fixture carries ${join} (${site}'s pinned combo)`).toBeDefined();
      const dead = deadNames(values, combo ?? []);
      expect(dead, `${site} serves names ${join} does not (${dead.join(", ")}) — a dead name in every menu, a 400 at the engine on every pick`).toEqual([]);
    }
    for (const { site, join, values } of JOINED_INVERTED) {
      const combo = fx[join];
      expect(combo, `the fixture carries ${join}`).toBeDefined();
      const dead = deadNames(combo ?? [], values);
      expect(dead, `the engine's ${join} combo offers names the card's ${site} literal no longer carries (${dead.join(", ")}) — the dropdown drifted past the card`).toEqual([]);
    }
    for (const { decl, join, exact } of JOINED_RAILS) {
      const combo = fx[join];
      expect(combo, `the fixture carries ${join}`).toBeDefined();
      const stamps = railStamps(decl);
      expect(stamps.length, `${decl}'s rail stamps at least one checkpoint`).toBeGreaterThan(0);
      const dead = deadNames(stamps, combo ?? []);
      expect(dead, `${decl}'s rail stamps checkpoints the engine does not run (${dead.join(", ")}) — a variant the engine 400s at selection time (schema-bottomup G4)`).toEqual([]);
      if (exact) {
        const unserved = deadNames(combo ?? [], stamps);
        expect(unserved, `${decl} is an exact rail but leaves the engine's names unserved (${unserved.join(", ")}) — one variant per live name, no more, no less`).toEqual([]);
      }
    }
  });

  it("the live cache, wherever it exists, agrees with the tracked fixture (drift contract)", (ctx) => {
    // A SELF-SKIP IS NOT A PASS (AGENTS.md): the skip is REPORTED
    // (ctx.skip); the floor above already judged the fixture
    // (card literals vs fixture, tracked-vs-tracked, CI-green).
    // THE ENGINE JUDGMENT (fixture vs live 0.38.x) lives at REGEN
    // TIME, not in CI: the tracked door
    //   pnpm --filter @melite/comfyui-cordis exec node
    //     --experimental-strip-types scripts/regen-object-info-min.ts
    // is byte-stable over an unchanged engine — drift is a git diff
    // the operator cannot merge past (R4-06's contract).
    if (!existsSync(LIVE)) {
      ctx.skip(true, "no live object_info cache on this box — the tracked fixture was judged above and the engine judgment rides the regen door (see comment); nothing to compare against");
      return;
    }
    const doc = JSON.parse(readFileSync(LIVE, "utf8")) as Record<string, { input?: { required?: Record<string, unknown>; optional?: Record<string, unknown> } }>;
    const fx = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, string[]>;
    for (const key of Object.keys(fx)) {
      const [cls, inp] = [key.slice(0, key.lastIndexOf(".")), key.slice(key.lastIndexOf(".") + 1)];
      const def = doc[cls]?.input;
      const raw = def?.required?.[inp] ?? def?.optional?.[inp];
      // BOTH SPELLINGS, ONE PARSE (walls-truths audit, 2026-10-13):
      // `spec[0]` is the enum only for the legacy array-head combo;
      // ComfyUI ≥ 0.38 spells ["COMBO", {options}] whose [0] is the
      // string "COMBO" — spreading that chars the head into a roster
      // and reds the drift on a healthy engine. The wall tier reads
      // the engine package's own parse (never a second copy).
      const live = parseInputSpec(raw, true).enum;
      expect(live, `the cache's ${key} combo is present`).toBeDefined();
      expect([...(live ?? [])].sort(), `the fixture's ${key} roster drifted from the live cache (re-project pinned-combos.min.json)`).toEqual([...fx[key]].sort());
    }
  });

  it("the live engine, wherever one serves, agrees with the tracked fixture (the cache-drift contract — the R6 class: a cache nothing refreshes is a second truth)", async (ctx) => {
    // The drift arm above judges fixture ↔ the CACHED snapshot
    // (data/tmp/object_info_prod.json); nothing in the tree owned
    // cache ↔ the serving engine. A cache pinned days ago passes
    // that arm while the engine has since served new members —
    // the stale-cache class (CreateVideo.bit_depth absent from
    // the cache, present live). This arm closes the loop where an
    // engine answers on :8188: every fixture key's LIVE roster
    // must equal the fixture's, else the cache (and fixture) are
    // stale and must be re-projected. A SELF-SKIP IS NOT A PASS
    // (AGENTS.md): the skip is REPORTED; CI boxes serve nothing.
    let doc: Record<string, { input?: { required?: Record<string, unknown>; optional?: Record<string, unknown> } }>;
    try {
      const res = await fetch("http://127.0.0.1:8188/object_info", { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) { ctx.skip(true, `engine answered ${res.status}`); return; }
      doc = await res.json();
    } catch {
      ctx.skip(true, "no engine on :8188");
      return;
    }
    const fx = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, string[]>;
    for (const key of Object.keys(fx)) {
      const [cls, inp] = [key.slice(0, key.lastIndexOf(".")), key.slice(key.lastIndexOf(".") + 1)];
      const def = doc[cls]?.input;
      const raw = def?.required?.[inp] ?? def?.optional?.[inp];
      const live = parseInputSpec(raw, true).enum;
      expect(live, `the engine's ${key} combo is present`).toBeDefined();
      expect([...(live ?? [])].sort(), `the fixture's ${key} roster drifted from the SERVING engine — run \`node tools/reproject-combos.mjs\` (the projection is a mechanism the repo owns; a hand edit of pinned values is banned)`).toEqual([...fx[key]].sort());
    }
  });

  it("the census: every vocabulary( site and checkpoint-stamping DECL is registered — a new one turns this red", () => {
    const sites: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(e.name) || p.includes(join("packages", "engines", "comfyui-cordis", "tests"))) continue;
        if (/\/test[ss]?\//.test(p)) continue;
        const text = readFileSync(p, "utf8");
        const hits = text.match(/vocabulary\(\[/g);
        if (hits) for (let i = 0; i < hits.length; i++) sites.push(p);
      }
    };
    walk(join(process.cwd(), "packages"));
    const registered = JOINED.length + JOINED_INVERTED.length + LOCAL.length;
    expect(sites.length, `the registry carries ${registered} sites but packages/ declares ${sites.length} vocabulary( calls (${sites.map((s) => s.replace(join(process.cwd(), "packages") + "/", "")).join(", ")}) — map the new site: join it to an engine combo or declare it local with its reason`).toBe(registered);
    // File grain, not just count: a registry entry re-pointed at a
    // different file's site keeps the count but moves the hit.
    const byFile: Record<string, number> = {};
    for (const s of sites) byFile[s.replace(join(process.cwd(), "packages") + "/", "")] = (byFile[s.replace(join(process.cwd(), "packages") + "/", "")] ?? 0) + 1;
    expect(byFile, "the per-file site census drifted — re-point the registry's sites (a count-only match can hide a swapped file)").toEqual({
      "models/h3/src/schema.ts": 9,
      "image/tagger/src/card.ts": 4,
      "3d/anny/src/card.ts": 1,
      "3d/rig/src/card.ts": 1,
      "audio/music/src/card.ts": 1,
      "audio/tts/src/card.ts": 1,
      // 2 -> 3 (2026-11-08, the model choice): scale_model joined —
      // the standard upscale-model roster, LOCAL for the empty live combo.
      "image/input-prep/src/card.ts": 3,
      "motion/motion/src/card.ts": 1,
    });

    const stamping: string[] = [];
    for (const d of readdirSync(join(process.cwd(), "packages", "models"), { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === "node_modules") continue;
      if (railStamps(d.name).length > 0) stamping.push(d.name);
    }
    expect([...stamping].sort(), "the checkpoint-stamping DECL roster changed — register the new rail (join it to an engine combo or declare it provision-side)").toEqual([...JOINED_RAILS.map((r) => r.decl), ...LOCAL_RAILS].sort());
  });

  it("every registry entry is non-empty and duplicate-free (a broken edit cannot serve a hollow menu)", () => {
    for (const { site, values } of [...JOINED, ...JOINED_INVERTED, ...LOCAL.map((l) => ({ site: l.site, values: l.values() }))]) {
      expect(values.length, `${site} is empty`).toBeGreaterThan(0);
      expect(new Set(values).size, `${site} carries duplicates`).toBe(values.length);
    }
    for (const decl of [...JOINED_RAILS.map((r) => r.decl), ...LOCAL_RAILS]) {
      const stamps = railStamps(decl);
      expect(new Set(stamps).size, `${decl}'s rail stamps a checkpoint twice`).toBe(stamps.length);
    }
  });
});
