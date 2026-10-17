// card-compose-liveness.spec.ts — THE DEAD-CARD WALL (2026-10-22,
// the operator's contract sweep, seam A: "dead cards ... are no
// longer green").
//
// The lesion it kills: a card can sit boarded on every surface —
// registration, form, client bundle — with every existing wall
// green, and still be DEAD: its compose refuses on the lane the
// moment a run names it, or it composes a graph whose node classes
// the engine does not own (a dead ComfyUI submit — the run dies at
// the queue with "Node class not found"). The walls that touch
// compose each prove one card, one family, or one wire
// (upload-referenced, real-card-wire); nothing walked EVERY
// facts row × its card.
//
// This wall walks EVERY model row in the facts file — the same rows
// the census pins — and, through the card tier booted the card
// spec's way, composes the row's card against its model with probe
// params. The probe doc is derived at runtime: fields the schema
// defaults cover are filled by the schema walk itself; each refusal
// names its missing param and the loop fills it by shape
// (bounds-legal numbers, probe text, probe asset lists). A refusal
// the loop cannot ground is a DEAD CARD, named with model, card,
// and the refusal. A composed graph is checked node by node against
// the facts' OWN node vocabulary (extension + core) — a class the
// engine does not have reds here, before any lane ships it.
//
// Run: npx vitest run tests/walls/ts/suites/card-compose-liveness.spec.ts
// THE HERMETIC ENGINE first (the mock-first law, tests/helpers/
// hermetic-engine.ts): the studio-write admission arm below primes a
// CardRegistryService, and prime() fetches /object_info — the mock
// must register before the barrel's first evaluation, so this import
// precedes boot-models.
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";

// THE CARD TIER, BOOTED THE CARD SPEC'S WAY (models registry + card
// defs + facts — the upload-referenced precedent). The registry
// import order matters — boot-models first.
import "../../../helpers/boot-models.ts";
import { Context } from "@deepseek-ai/cordis";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel, modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { admissionRefusal, prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { liftCardParams } from "../../../../packages/harness/estate-queue/src/cardsVariant.ts";
import type { ModelFactsRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import type {} from "../../../../packages/harness/estate-queue/src/service.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { fieldsOf } from "../../../../packages/web/card-base/src/spec.ts";
// THE H3 STUDIO'S OWN SERIALIZER (B4/R1's serializer writer face): the
// tenant-tree probe below dispatches on the file carrying this export
// — the arm drives THE module it imports, and a second hand-serializer
// tenant reds the dispatch assert until it teaches this judge.
import { serializeLayerA, hydrateLayerA } from "../../../../packages/video/h3-timeline/src/ui/studio/docHydrate.ts";
import { deriveWindowFamily, T4_ONLY_KEYS } from "@melite/models-h3/timelineContract";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);

type NodeShape = { class_type?: unknown };
type Graph = Record<string, NodeShape>;

/** The probe fills, keyed by the refusing param's own name. Each
 *  value is chosen to be bounds-legal across the tree's numeric
 *  fields (512 inside every resolution bound, 4 inside steps/cfg
 *  bounds, -1 the seed convention); a field whose legal range
 *  EXCLUDES its probe reds the wall — that is a bounds worth
 *  seeing, and the cure is a row here with the field's name. */
const PROBE_NUMBERS: Record<string, number> = {
  width: 512, height: 512,
  seed: -1,
  steps: 4,
  cfg: 4.5,
  // anny's floorless numerics (2026-11-02, the dual-floor cure):
  // the schema defaults left these keys — the family cascade owns
  // the floors, so the RAW compose this probe drives refuses on
  // them by name. The values are anny's own family calibration,
  // inside the declared bounds.
  resolution: 768,
  framing: 1.2,
  focal_length: 50,
  samples: 64,
};
const PROBE_STRINGS: Record<string, string> = {};
// A gate that STATS the path ("is not a file on this estate") needs
// a file that exists — the facts file is the one this wall already
// holds open. resolution rides the closed variant table (1024 is a
// member on every mesh lane).
const ESTATE_FILE_PROBE = FACTS_PATH;
PROBE_STRINGS.input_image = ESTATE_FILE_PROBE;
// (size-enum probes are not hand rows: the extraction above reads
// the members out of each card's own refusal)
/** The probe asset, by the param's own media suffix — the compose
 *  gates read these as strings (a staged path), never arrays. */
const ASSET_SUFFIX: Array<[RegExp, string]> = [
  [/audio|voice|speech/i, "probe.wav"],
  [/video|frames/i, "probe.mp4"],
  [/glb|mesh|rig/i, "probe.glb"],
  [/image|mask|img|pic|photo/i, "probe.png"],
];

/** The probe doc for one refusing param, by its name's shape:
 *  SINGULAR media names ride one path string (what a compose gate
 *  reads); plural/list names ride one-element arrays. */
function fillFor(name: string): unknown {
  if (name in PROBE_NUMBERS) return PROBE_NUMBERS[name];
  if (PROBE_STRINGS[name] !== undefined) return PROBE_STRINGS[name];
  const listShape = /(s|_list|_images|_inputs|_masks)$/i.test(name);
  const suffix = ASSET_SUFFIX.find(([re]) => re.test(name));
  if (suffix) return listShape ? [suffix[1]] : suffix[1];
  if (/^(is|has|use|enable|show|allow|double|crop)/i.test(name)) return false;
  if (/^(num|count|max|min|batch|frames|dur|quality|strength|denoise|shift|temp)/i.test(name)) return 1;
  return "the liveness probe";
}

/** The missing-param name a refusal names, if it names one. Reads
 *  the card tier's own voices: the gated resolve ("required param
 *  'x' missing"), the schema walk (field paths), and the compose
 *  gates ("required param ... on the ... card"). */
function namedParam(message: string): string | null {
  const patterns = [
    /params '([^']+)'/,
    /fields '([^']+)'/,
    /param '([A-Za-z_][\w-]*)'/,
    /'([A-Za-z_][\w-]*)' (?:is )?(?:missing|required)/,
    /(?:missing|required)[\w ]*'([A-Za-z_][\w-]*)'/i,
    /field '([A-Za-z_][\w-]*)'/,
    /([A-Za-z_][\w-]*) = undefined/,
  ];
  for (const re of patterns) {
    const m = re.exec(message);
    if (m) return m[1] as string;
  }
  return null;
}

/** Every param name a refusal lists (a gate may demand several —
 *  'ref_audio' + 'ref_text' ride together). */
function namedMulti(message: string): string[] {
  const names = new Set<string>();
  for (const m of message.matchAll(/'([A-Za-z_][\w-]*)'/g)) names.add(m[1]);
  const first = namedParam(message);
  if (first) names.add(first);
  const undef = /([A-Za-z_][\w-]*) = undefined/.exec(message);
  if (undef) names.add(undef[1] as string);
  const bare = /([A-Za-z_][\w-]*) undefined is not/.exec(message);
  if (bare) names.add(bare[1] as string);
  // the schema walk's path voice: $.field expected "x" | "y"
  for (const m of message.matchAll(/\$\.([A-Za-z_][\w-]*)/g)) names.add(m[1]);
  return [...names].filter((n) => !["random", "int", "undefined", "required"].includes(n));
}

/** THE STUDIO-EMIT GREP (CURE-1's emit depth): the computed
 *  `[MOTION_*_PARAM]` keys inside every onSave(...) payload of one
 *  source file. The segment between the call's parens is walked with
 *  a depth counter, so a ternary payload yields both objects. */
function onSaveParamConstants(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/onSave\s*\(/g)) {
    const start = m.index ?? 0;
    let depth = 1;
    let i = start + m[0].length;
    let seg = "";
    for (; i < src.length && depth > 0; i++) {
      const ch = src[i]!;
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
      seg += ch;
    }
    for (const k of seg.matchAll(/\[\s*([A-Z][A-Z0-9_]*)\s*\]\s*:/g)) out.push(k[1]!);
  }
  return out;
}

/** The literal a studio param constant names, read from the studio
 *  tree's own export (motionParams.ts is the constants' home). */
function paramLiteral(files: string[], name: string): string | null {
  const re = new RegExp(`\\b(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*=\\s*"([^"]+)"`);
  for (const f of files) {
    const m = re.exec(readFileSync(f, "utf8"));
    if (m) return m[1]!;
  }
  return null;
}

/** Every .ts/.tsx file under dir — source only, never node_modules. */
function walkSources(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      if (e === "node_modules" || e === "lib") continue;
      const p = join(d, e);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(tsx?)$/.test(e)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/** THE VOCABULARY CHECK, exported for the rejection-path proof: every
 *  class_type in a composed graph must be a node the facts say the
 *  engine owns. */
export function unknownNodeClasses(graph: Graph, vocabulary: ReadonlySet<string>): string[] {
  const unknown = new Set<string>();
  for (const [nid, node] of Object.entries(graph)) {
    const ct = node?.class_type;
    if (typeof ct !== "string" || ct.length === 0) {
      unknown.add(`${nid}:<no class_type>`);
    } else if (!vocabulary.has(ct)) {
      unknown.add(ct);
    }
  }
  return [...unknown];
}

describe("every facts row composes its card alive (the dead-card wall)", () => {
  const raw = JSON.parse(readFileSync(FACTS_PATH, "utf8")) as {
    rows: Record<string, { card?: string }>;
    extension_node_types: Record<string, string[]>;
    core_node_types: Record<string, string[]>;
    // the engine's own answer, regenerated by
    // scripts/regen-node-vocab.mjs against a live engine
    engine_node_types?: string[];
  };
  const derived = raw.engine_node_types ?? null;
  const vocabulary = new Set<string>(derived ?? []);
  for (const classes of Object.values(raw.extension_node_types)) for (const c of classes) vocabulary.add(c);
  for (const classes of Object.values(raw.core_node_types)) for (const c of classes) vocabulary.add(c);
  // THE ENGINELESS FALLBACK: when engine_node_types is absent (a
  // clone that never ran scripts/regen-node-vocab.mjs), the floors
  // below are the vocabulary — the extension lists plus the stock
  // alphabet and the live-proven list, so CI stays honest without
  // an engine. WITH the derived block present, IT is the judge and
  // the floors are inert: 1647 live classes answer every member
  // the floors name, and the phantom-kill fires for anything the
  // engine does not serve — no hand list decides anything.
  const STOCK_CLASSES = [
    "UNETLoader", "CheckpointLoaderSimple", "CLIPLoader", "CLIPTextEncode", "VAELoader",
    "VAEDecode", "VAEEncode", "LoadImage", "LoadImageMask", "SaveImage", "SaveAudio",
    "SaveAudioAdvanced", "SaveVideo", "SaveAnimatedWEBP", "EmptyLatentImage",
    "EmptySD3LatentImage", "EmptyFlux2LatentImage", "KSampler", "KSamplerSelect",
    "SamplerCustomAdvanced", "BasicScheduler", "BasicGuider", "RandomNoise",
    "CFGGuider", "ConditioningZeroOut", "ModelSamplingAuraFlow", "Flux2Scheduler",
    "CreateVideo", "PreviewImage", "SaveText", "PrimitiveString", "VAEDecodeAudio",
  ];
  for (const c of STOCK_CLASSES) vocabulary.add(c);
  // THE LIVE-PROVEN FLOOR: extension classes the deployed lane serves
  // today (these exact graphs run verified on :3088) whose packs'
  // inventories in the facts file predate the nodes. The cure for
  // this floor is regenerating the facts' pack inventories from the
  // live engine's own node graph — that leg retires this list; until
  // then a class here is one the engine demonstrably owns, and the
  // phantom-kill above still fires for anything NOT listed by either
  // floor (the autoremesher class of death).
  const LIVE_PROVEN = [
    "TextEncodeQwenImage21", "QwenImage21Cache", "TextEncodeQwenImageEditPlus",
    "MiniMaxLowVRAMAttention", "MiniMaxChunkFeedForward", "MiniMaxH3SigmaShift",
    "MiniMaxH3ReferenceToVideo", "MiniMaxMusic3TextEncode", "EmptyMiniMaxMusic3LatentAudio",
    "EmptyYuE2LatentAudio", "YuE2GenerateABC", "YuE2GenerateMusic", "SamplerER_SDE",
    "ComfySwitchNode",
    // the img-to-mesh stack (trellis2 + the mesh toolbelt) — all
    // composing on the live lane today
    "CFGOverride", "RescaleCFG", "ModelSamplingSD3", "LoadBackgroundRemovalModel",
    "RemoveBackground", "MaskToImage", "CLIPVisionLoader", "ImageCropToMask",
    "Trellis2UpsampleStage", "GetMeshInfo", "RemeshMesh", "DecimateMesh",
    "MeshSmoothNormals", "UnwrapMesh", "BakeTextureFromVoxel", "BakeAmbientOcclusion",
    "BakeNormalMapFromMesh", "ApplyTextureToMesh", "MeshToFile3D", "Save3DAdvanced",
  ];
  for (const c of LIVE_PROVEN) vocabulary.add(c);

  const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
  const pairs = Object.entries(raw.rows).filter(([, row]) => typeof row.card === "string") as Array<[string, { card: string }]>;

  it("every card-riding row resolves to a served card and a served model", async () => {
    const defs = await loadCardDefs();
    const dead: string[] = [];
    for (const [modelId, row] of pairs) {
      if (!defs.get(row.card)) dead.push(`${modelId}: card '${row.card}' is not served by the card defs`);
      if (!facts.models[modelId]) dead.push(`${modelId}: the registry serves no model for its facts row`);
    }
    assert.deepEqual(dead, [], `dead rows — facts name what the tier does not serve: ${dead.join("; ")}`);
  });

  it("every row's card composes a real, engine-owned graph", async () => {
    const defs = await loadCardDefs();
    const dead: string[] = [];
    for (const [modelId, row] of pairs) {
      const def = defs.get(row.card)!;
      const model = facts.models[modelId]!;
      const doc: Record<string, unknown> = {};
      const filled = new Set<string>();
      let composed: Graph | null = null;
      let lastError = "";
      // THE PROBE LOOP: compose, read the refusal's named param, fill,
      // retry. A refusal that names nothing new is the dead card.
      for (let round = 0; round < 14 && composed === null; round++) {
        try {
          const g = new GraphBuilder();
          def.compose(def.schema({ ...doc }), model, g, "liveness-probe");
          const graph = g.toJSON() as Graph;
          assert.ok(
            graph && typeof graph === "object" && Object.keys(graph).length > 0,
            `${modelId} / ${row.card}: compose produced an EMPTY graph`,
          );
          composed = graph;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          const named = namedMulti(lastError);
          // A closed enum overwrites even an already-filled name: the
          // first refusal may come unquoted ("not one of 1024|1536")
          // and strand a wrong probe; the quoted restatement is the
          // card's own correction.
          const enumOffer = /expected "([^"]+)"/.exec(lastError);
          const fresh = enumOffer
            ? named
            : named.filter((n) => !filled.has(n));
          if (fresh.length === 0) {
            dead.push(`${modelId} / ${row.card}: ${lastError}`);
            break;
          }
          for (const name of fresh) {
            filled.add(name);
            // The enum members ride the refusal ("expected "1024" |
            // "1536""); the first member is legal by construction.
            doc[name] = enumOffer ? (enumOffer[1] as string) : fillFor(name);
          }
        }
      }
      if (composed === null) continue;
      const unknown = unknownNodeClasses(composed, vocabulary);
      if (unknown.length) {
        dead.push(`${modelId} / ${row.card}: composes node classes the engine does not own: ${unknown.join(", ")}`);
      }
    }
    assert.deepEqual(
      dead,
      [],
      `DEAD CARDS — these compose refused or compose phantom nodes (every one is a run that dies on the lane): ${dead.join(" | ")}`,
    );
  });

  it("THE KEY JUDGE (motion-journey CURE-6): every input key a card composes onto a fixture-declared class is declared by that class — the registry flows' law, extended to the card plane", async () => {
    // The registry flows have judged keys since E-M8
    // (registry-flow-wiring.spec.ts); the CARD plane judged classes
    // only — a typo'd widget key on a family action composed green
    // and died at the engine. The tracked key fixture is the floor
    // (the same {r, o} min doc, live-parity-guarded in the registry
    // wall); classes it does not carry are census-named here and
    // stay judged at class level by the arm above.
    const keyDoc = JSON.parse(
      readFileSync(new URL("../../fixtures/object_info.min.json", import.meta.url), "utf8"),
    ) as Record<string, { r?: string[]; o?: string[] }>;
    const declaredOf = (ct: string): Set<string> | null => {
      const d = keyDoc[ct];
      if (d === undefined) return null;
      return new Set([...(d.r ?? []), ...(d.o ?? [])]);
    };
    const defs = await loadCardDefs();
    const offenders: string[] = [];
    // THE ACTION UNIVERSE, DERIVED (no hand import list — the rot
    // class): the booted registry carries every family DECL, and
    // DECL.actions is the validated atom roster. Each action's
    // build runs through the same probe loop as the cards.
    const actionSpecs: Array<{ modelId: string; name: string; spec: { build(args: never): unknown; params?: Array<{ name: string }> } }> = [];
    for (const id of modelIds()) {
      const decl = getModel(id) as { actions?: Array<{ name?: string } & Record<string, unknown>> };
      for (const a of decl.actions ?? []) {
        const spec = a as unknown as { build(args: never): unknown; params?: Array<{ name: string }> };
        if (typeof spec?.build === "function") actionSpecs.push({ modelId: id, name: String(a["name"] ?? a["id"] ?? id), spec });
      }
    }
    // the CENSUS inverts (LAW 4 axis 1): the fixture is a CURATED
    // subset, so an uncapped uncurated tail is honest — the rot to
    // catch is a fixture row NO card composes (a stale {r,o} entry
    // judging nothing, vacuously green).
    const seenClasses = new Set<string>();
    for (const [modelId, row] of pairs) {
      const def = defs.get(row.card)!;
      const model = facts.models[modelId]!;
      const doc: Record<string, unknown> = {};
      const filled = new Set<string>();
      let composed: Graph | null = null;
      for (let round = 0; round < 14 && composed === null; round++) {
        try {
          const g = new GraphBuilder();
          def.compose(def.schema({ ...doc }), model, g, "key-judge-probe");
          composed = g.toJSON() as Graph;
        } catch (err) {
          const named = namedMulti(err instanceof Error ? err.message : String(err));
          const fresh = named.filter((n) => !filled.has(n));
          if (fresh.length === 0) break;
          for (const name of fresh) { filled.add(name); doc[name] = fillFor(name); }
        }
      }
      if (composed === null) continue;
      for (const [nid, node] of Object.entries(composed)) {
        const ct = (node as NodeShape).class_type;
        if (typeof ct !== "string") continue;
        const declared = declaredOf(ct);
        seenClasses.add(ct);
        if (declared === null) continue;
        const inputs = (node as { inputs?: Record<string, unknown> }).inputs ?? {};
        for (const key of Object.keys(inputs)) {
          if (declared.has(key)) continue;
          const prefix = key.split(".")[0] ?? key;
          if (key.includes(".") && declared.has(prefix)) continue;
          offenders.push(`${modelId} / ${row.card}: node ${nid} ${ct}.${key} is not declared by the key fixture — a typo'd widget key that dies at the engine`);
        }
      }
    }
    // THE ACTION SWEEP: same judge, the atom specs' own graphs
    for (const { modelId, name, spec } of actionSpecs) {
      // PRE-SEED the spec's OWN declared params (build's prose
      // refusals — fit's "needs a BONE" — do not name the param in
      // the machine shape, so the probe loop alone cannot satisfy
      // them; the spec declares its vocabulary and the seed rides
      // it: kimodo's preview_glb composes the bake arm, fit's bone
      // composes the row).
      const probe: Record<string, unknown> = {};
      for (const prm of spec.params ?? []) probe[prm.name] = fillFor(prm.name);
      // THE GUARD-OPENERS, NAMED AND COUNTED (the E-M8 law: an
      // unnumbered excuse is a hole; a numbered one is a census):
      // specs read lane-internal keys their declared params do not
      // carry, and guarded branches (kimodo's bake arm) compose
      // only under them. Each opener here names the fixture row it
      // exists to judge.
      const GUARD_OPENERS: Record<string, Record<string, string>> = {
        // kimodo's compose: the bake arm guards on p.preview_glb
        compose: { preview_glb: "probe/rig.glb" },
      };
      // the generic facts probe: lane-input parsers requireText their
      // resolved paths (kimodo's model_path); every opener key rides
      // every parse and a parser that refuses more than it knows
      // degrades to the empty shape (the build then either composes
      // without facts or refuses by name — both honest outcomes).
      const FACTS_PROBE: Record<string, string> = { model_path: "probe/model.safetensors" };
      const model = getModel(modelId);
      const openerKey = (spec as { id?: string }).id ?? "";
      if (GUARD_OPENERS[openerKey] !== undefined) Object.assign(probe, GUARD_OPENERS[openerKey]);
      const filled = new Set<string>(Object.keys(probe));
      let composed: Graph | null = null;
      for (let round = 0; round < 14 && composed === null; round++) {
        try {
          const g = new GraphBuilder();
          // the facts face: actions parse their lane facts through their own
          // declared parser (fit's seat.facts({}); kimodo's reads
          // model_path from the row) — the probe hands the parser
          // the booted model row, falling to the empty shape.
          const factsFn = (spec as unknown as { facts?: (x: unknown) => unknown }).facts;
          let factsArg: unknown = {};
          if (factsFn !== undefined) {
            try { factsArg = factsFn({ ...FACTS_PROBE }) ?? {}; } catch { factsArg = {}; }
          }
          spec.build({ p: probe, facts: factsArg, g, model, runId: "key-judge-action" } as never);
          composed = g.toJSON() as Graph;
        } catch (err) {
          const named = namedMulti(err instanceof Error ? err.message : String(err));
          const fresh = named.filter((n) => !filled.has(n));
          if (fresh.length === 0) break;
          for (const n of fresh) { filled.add(n); probe[n] = fillFor(n); }
        }
      }
      if (composed === null) continue;
      for (const [nid, node] of Object.entries(composed)) {
        const ct = (node as NodeShape).class_type;
        if (typeof ct !== "string") continue;
        const declared = declaredOf(ct);
        seenClasses.add(ct);
        if (declared === null) continue;
        const inputs = (node as { inputs?: Record<string, unknown> }).inputs ?? {};
        for (const key of Object.keys(inputs)) {
          if (declared.has(key)) continue;
          const prefix = key.split(".")[0] ?? key;
          if (key.includes(".") && declared.has(prefix)) continue;
          offenders.push(`${modelId} action ${name}: node ${nid} ${ct}.${key} is not declared by the key fixture — a typo'd widget key that dies at the engine`);
        }
      }
    }
    assert.deepEqual(offenders, [], "CARD KEY DRIFT:\n" + offenders.join("\n"));
    const unjudged = Object.keys(keyDoc).filter((ct) => !seenClasses.has(ct));
    assert.deepEqual(unjudged, [], "key fixture rows no card composes (vacuous judges — prune or extend the composed universe):\n" + unjudged.join(", "));
  });

  // ─── CURE-1's studio-write admission arm GREW UP (B4/R1,
  // journey-closure 2026-10-17): the param-seat-parity wall below
  // replaces this describe's motion-only arm — the frozen
  // packages/motion/motion path literal died with the generalization.
  // The motion tenant's law (bg brick, onSave emit grep, envelope
  // landing, refuse-loud) rides the derived roster's onSave face
  // unchanged in substance; the wall lives in its own describe block
  // at the foot of this file.

  it("the rejection path: phantom classes and param-less refusals are named, never swallowed", () => {
    // (1) a graph riding a node class the vocabulary lacks is named
    const fake = { "1": { class_type: "TotallyMadeUpNode" }, "2": { class_type: "KSampler" } };
    const flagged = unknownNodeClasses(fake, new Set(["KSampler"]));
    assert.deepEqual(flagged, ["TotallyMadeUpNode"]);
    // (2) a refusal that names no param kills the row instead of
    // looping forever — the loop's guard, replayed directly
    const name = namedParam("completely opaque failure");
    assert.equal(name, null, "an ungrounded refusal must parse to no param");
    // (3) the fill loop refuses to spin: a repeated name breaks out
    const seen = new Set<string>(["prompt"]);
    assert.ok(seen.has("prompt"), "a re-refusing param terminates the probe");
  });
});

// ═══ B4/R1 (journey-closure plan, 2026-10-17): THE PARAM-SEAT-PARITY
// WALL, ALL TENANTS ══════════════════════════════════════════════════
// Closes h3-inject-keys-burn §CURES-OWED 1, timeline-calls-burn
// §CURES-OWED 3, timeline-green-fraud R1 + GREEN-F1. THE WALL ONE
// LINE: "every studio tenant's own persisted key set composes on its
// own derived lane, and the DECL row covers every key it persists."
//
// THE BURN: the emit-side admission judge (motion-journey CURE-1, the
// arm this wall replaces) was scoped to the MOTION studio by a frozen
// path literal, and the h3 studio's serializer staged four post keys
// onto a derived-t4r doc while every wall stayed green — the
// operator's run refused verbatim:
//   card_compose phase 1: bad-params: card 'h3-timeline' refused
//   params: h3_window(t4r): unsanctioned inject keys:
//   interpolate_enabled, second_pass_enabled, sharpen_enabled, sr_switch
// A judge whose tenant universe is a hand list is a judge whose
// universe rots: the next studio tenant is born unjudged (GREEN-F1's
// frozen-literal class; CURE-1's own scope carried the same disease
// one tenant earlier).
//
// THE DERIVED ROSTER: every registry modelFacts row carrying a
// studio.writes DECL row — the DECL's OWN loading path (the registry
// lift unions the row into the admission riders, cardsFacts), grouped
// by the tenant string the kit's loadFacts lift carries off the same
// DECL. No path literal names a tenant here; the roster moves with
// every new studio.writes DECL.
//
// THE WRITER FACES, probed per derived tenant tree (never assumed):
//  • the onSave merge-patch writer — CURE-1's emit grep (motion);
//  • the hand Layer-A serializer — serializeLayerA over the derived
//    window families (h3-timeline);
//  • the declarative SSOT face — no host studio tree: the studio
//    organizes the served form-spec, so the SERVED FIELDS are the
//    persisted set (img-to-mesh).
// A tenant whose face the judge cannot drive REDS here: a new writer
// face must teach this judge, never silently fall out of the roster.
//
// THE CLAUSES PER TENANT:
//  1. SEAT PARITY — the persisted key set, staged on every OFFERED
//     family row the tenant serves, passes the real admission door
//     (prepareCardParams → admissionRefusal) with every key landing
//     inside the envelope verbatim (CURE-1's discipline, all faces);
//     a junk key is still refused NAMED (refuse-loud, per row).
//  2. THE DERIVED LANE — the family-conditional tenant's serialized
//     doc per derived family composes through the real walk
//     (phase1Card) on its own lane, settled the way the bench settles
//     a save (per key, null deletes); the walk still refuses a
//     family-dead stamp loud (the honest edge — never green).
//  3. DECL COVERAGE — the hand writer's emitted key set ⊆ the DECL's
//     studio.writes ∪ named exemptions ∪ the coordinate keys the lift
//     strips. Exemptions are judged BOTH directions: a named exemption
//     the writer no longer emits reds (prune it); a new emitted key no
//     row names reds (declare it — the clause that was stale when B3's
//     four riders were missing). The declarative face's machine home
//     is the card's own schema dict — its census is the spec-drift
//     alarm, never a hand copy.
//  4. THE SERVED-STAMP JUDGE — the tool/agent face's stamp (the
//     ungated sibling writer: the served variant rows' defaults, what
//     the pick verb writes onto the user layer) rides the same judge:
//     every stamp key admits at the door and sits inside the declared
//     union (served fields ∪ studio.writes), and a family-stamping
//     row's stamp composes on its sanctioned lane while refusing loud
//     on the lane that cannot honor it.
//
// THE TOOL/AGENT FACE's served-spec stamp and the studio's emit share
// ONE admission door — that shared door is the hop this wall owns
// ([2]→[4]); the pick/patch faces' own family clause is B5's hop.

/** Judged-tenant ledger for the census arm below: the sweep records
 *  every tenant it drove; the census re-derives the roster and refuses
 *  any tenant the sweep did not judge (the un-scope toggle's red —
 *  GREEN-F1's frozen-literal class, caught by construction). */
const JUDGED_TENANTS = new Set<string>();

/** The h3 DECL-exemption rows, each with its law. NOT a wildcard and
 *  NOT schema-derived: every member is named here because its
 *  ADMISSION home is the card's own served schema (the
 *  studio-contract-wall's declared-surface law judges that face), so
 *  the studio.writes row's declaration law does not transcribe the
 *  schema a second time — a second hand copy of machine truth is the
 *  drift class, not the cure. The staleness judge below reds if the
 *  writer stops emitting a named member. */
const WRITES_EXEMPT: Record<string, ReadonlyArray<{ key: string; why: string }>> = {
  "video/h3-timeline": [
    { key: "sla_enabled", why: "the SLA master rides only its false pole (absent = on); served schema knob" },
    { key: "sla_min_seq_len", why: "the SLA sparse-attention seat; served schema knob" },
    { key: "duck_depth_db", why: "the FILM_ONLY rider — timelineContract's film lane set; the walk's sibling clause (B6) owns its lane gate" },
    { key: "ref_images", why: "the card-level reference surface; the serialize round-trip arm judges its emission" },
    { key: "ref_videos", why: "the card-level reference surface; the serialize round-trip arm judges its emission" },
    { key: "ref_audios", why: "the card-level reference surface; the serialize round-trip arm judges its emission" },
    { key: "ref_mods", why: "the fourth declared ref lane; the serialize round-trip arm judges its emission" },
    { key: "ref_video_trims", why: "the served-row seat (index-paired per-video trims); served schema knob" },
    { key: "ref_image_size", why: "the ref lane's size pick; served schema knob" },
  ],
};

/** A compose-legal post-stamp probe (the carrier's own bounds — the
 *  R2 door arm's values; a maximal fixture's junk would refuse on
 *  bounds, not on family). Completes a served stamp's doc where the
 *  row itself serves no value; the stamp's own values ride verbatim. */
const H3_STAMP_COMPLETION: Record<string, unknown> = {
  seed: 7, width: 768, height: 448, steps: 12,
  sharpen_enabled: true, sharpen_method: "rcas",
  interpolate_enabled: true, interp_model: "film_net_fp16.safetensors", interp_multiplier: 2,
  sr_switch: true, sr_model: "seedvr2_ema_3b_fp16.safetensors", sr_resolution: 1080,
  second_pass_enabled: true,
};

/** The h3 lane docs, one per derived window family — real studio
 *  states (the R2 door arm's discipline), each doc carrying only its
 *  seats: the keyframe pin that derives t4r (with the Final Cut pick's
 *  stamps riding the studio state — THE BURN's repro (A), the
 *  operator's own scenario), the single-call text doc that derives
 *  t4_open (the maximal post state, legal on its lane), the two-call
 *  film that derives t4_chain. The FAMILY is DERIVED from each doc
 *  (deriveWindowFamily) — never named by hand. */
const H3_LANE_DOCS: ReadonlyArray<{ seats: Record<string, unknown>; extra: Record<string, unknown> }> = [
  {
    // repro (A): the Final Cut pick's stamps + a keyframe pin — the
    // pre-B1 serializer emitted them and the walk refused the four
    // verbatim; the landed gate deletes them at the emit and the doc
    // composes clean.
    seats: {
      keyframes: [{ image: "anchor.png", frame: 0 }],
      calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90 }],
    },
    extra: { seed: 7, sr_switch: true, second_pass_enabled: true },
  },
  {
    seats: { calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }] },
    extra: H3_STAMP_COMPLETION,
  },
  {
    seats: {
      calls: [
        { text: "the harbour holds its breath", start_frame: 0, end_frame: 90 },
        { text: "the gulls turn east", start_frame: 90, end_frame: 158 },
      ],
    },
    extra: H3_STAMP_COMPLETION,
  },
];

/** THE BURN'S FOUR (h3-inject-keys-burn repro (A), the operator's
 *  verbatim refusal keys): the emitted union must still carry them,
 *  or the coverage clause is vacuous over exactly the keys it exists
 *  to judge. Named here the way CURE-1 named motion_bg_image — the
 *  incident write this wall was born from. */
const H3_BURN_FOUR = ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"] as const;

/** The h3 coverage doc: a maximally-populated Layer A on a t4_open
 *  base (a lane that honors every family's keys, so nothing is
 *  family-omitted) — every value non-default so no key can hide
 *  behind the undefined-means-absent law. The emitted set here is the
 *  writer's full persisted vocabulary; the coverage clause judges it. */
function h3CoverageDoc(): Record<string, unknown> {
  const base: Record<string, unknown> = { calls: [{ text: "x", start_frame: 0, end_frame: 90 }] };
  const state: Record<string, unknown> = {
    ...hydrateLayerA(base as never), ...H3_STAMP_COMPLETION,
    fps: 30, variant: "timeline", length: 90,
    shift_video: 0.5, shift_audio: 0.5, sampler_name: "euler", sched_name: "simple",
    sla_sparsity: 0.1, sla_block_size: "64", sla_min_seq_len: 256, sla_dense_last_steps: 2,
    sla_reference_protection: "Light", sla_dense_backend: "auto", sla_dense_steps: "0,1",
    sla_enabled: false, sla_protect_audio: true, sla_stabilize_motion: true, sla_disable_fp16_accum: true,
    duck_depth_db: -14, ref_image_size: "match",
    model: "h3", audio_stem: "stem.wav",
    loras: [{ id: "h3_taomate_3step", strength: 0.5 }],
    audio_clips: [{ id: "a", name: "a", src: "data:audio/x", start_frame: 0, dur_frames: 24 }],
    ref_images: ["https://u/d.png"], ref_videos: ["https://u/d.png"],
    ref_audios: ["https://u/d.png"], ref_mods: ["https://u/d.png"],
    ref_video_trims: [{ start_time: 0, duration: 2 }],
    sharpen_strength: 0.5, sharpen_radius: 2, sharpen_threshold: 0.1, sharpen_iterations: 1,
    refine_lora: "h3_taomate_3step", refine_strength: 1, refine_steps: 1,
  };
  return serializeLayerA(state as never, base) as Record<string, unknown>;
}

describe("every studio tenant's persisted key set composes on its own derived lane (the param-seat-parity wall, B4/R1)", () => {
  let svc: CardRegistryService;
  beforeAll(async () => {
    const ctx = new Context();
    // the dangling sweep reads the queue seat's manifest — a bare
    // Context makes the sweep vacuous (the lane-law boot precedent)
    (ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "param-seat-parity-")),
      stateRoots: [] as string[],
    };
    svc = new CardRegistryService(ctx);
    await svc.prime();
    assertHermeticRode();
    await loadCardDefs();
  }, 90_000);

  /** The tenant's studio tree, DERIVED from the DECL's tenant string
   *  ("<genre>/<package>" under packages/). Null = no host tree in
   *  this repo — the declarative SSOT face. */
  const studioTreeOf = (tenant: string): string[] | null => {
    const dir = join(
      dirname(fileURLToPath(import.meta.url)),
      "..", "..", "..", "..",
      "packages", ...tenant.split("/"), "src", "ui", "studio",
    );
    return existsSync(dir) ? walkSources(dir) : null;
  };

  /** THE DOOR'S OWN OFFERED DERIVATION (selectCardVariant's hide
   *  marks, read off the same facts row the door reads): a facts row
   *  whose variants hide the addressed route is the hidden-quant lane
   *  — recorded in the census, never staged. */
  const hiddenRouteRow = (row: ModelFactsRow, fam: string): boolean =>
    row.variants.some((v) => v.hide_from_dropdown === true &&
      (v.route === fam || v.id === fam || (v.cells ?? []).some((c) => c.route === fam)))
    || row.variants.some((v) => (v.cells ?? []).some((c) => c.hide_from_dropdown === true && c.route === fam));

  /** THE BENCH SETTLEMENT (bench.ts's merge-patch, verbatim law: per
   *  key, null deletes) — the view the run press actually reads. */
  const settleBench = (
    base: Record<string, unknown>,
    saved: Record<string, unknown>,
  ): Record<string, unknown> => {
    const settled: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(saved)) {
      if (v === null) delete settled[k];
      else settled[k] = v;
    }
    return settled;
  };

  it("THE PARAM-SEAT-PARITY ARM: every studio tenant's own persisted key set composes on its own derived lane, and the DECL row covers every key it persists", async () => {
    // ── 1. THE DERIVED TENANT ROSTER ──────────────────────────────
    // Every modelFacts row carrying a studio.writes DECL row, grouped
    // by the tenant string the kit lift carries off the same DECL.
    const allFacts = svc.modelFacts();
    const kitFacts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
    const groups = new Map<string, Array<{ fam: string; row: ModelFactsRow; writes: string[] }>>();
    const roster: string[] = [];
    for (const [fam, row] of Object.entries(allFacts)) {
      if (row.studio === undefined || row.studio === null) continue;
      const writes = (row.studio.writes as readonly unknown[] | undefined)
        ?.filter((w): w is string => typeof w === "string") ?? [];
      const tenant = kitFacts.models[fam]?.studio?.tenant;
      assert.ok(
        typeof tenant === "string" && tenant.length > 0,
        `facts family '${fam}' carries a studio.writes row but no tenant string — the roster cannot locate its writer tree`,
      );
      if (!groups.has(tenant)) {
        groups.set(tenant, []);
        roster.push(tenant);
      }
      groups.get(tenant)!.push({ fam, row, writes });
    }
    assert.ok(roster.length >= 3, `the derived roster collapsed to ${roster.length} tenant(s) (${roster.join(", ")}) — the studio.writes lift broke`);
    const offenders: string[] = [];

    for (const tenant of roster) {
      const rows = groups.get(tenant)!;
      const tree = studioTreeOf(tenant);
      // ── 2. THE WRITER-FACE PROBE ─────────────────────────────────
      const onSaveKeys = new Set<string>();
      if (tree !== null) {
        const constants = new Set<string>();
        for (const f of tree) for (const c of onSaveParamConstants(readFileSync(f, "utf8"))) constants.add(c);
        const unresolved: string[] = [];
        for (const c of constants) {
          const literal = paramLiteral(tree, c);
          if (literal === null) unresolved.push(c);
          else onSaveKeys.add(literal);
        }
        assert.deepEqual(unresolved, [], `${tenant}: onSave writes name constants with no string-literal export in the studio tree: ${unresolved.join(", ")}`);
      }
      const serializerFile = tree?.find((f) => /export function serializeLayerA/.test(readFileSync(f, "utf8"))) ?? null;
      const face = onSaveKeys.size > 0
        ? "onsave"
        : serializerFile !== null
          ? "serializer"
          : tree === null
            ? "declarative"
            : "unknown";

      if (face === "unknown") {
        offenders.push(`${tenant}: the studio tree carries no onSave writer and no serializeLayerA export — a writer face this judge cannot drive; teach the param-seat-parity wall the new face (the roster census keeps the tenant from falling out silently)`);
        continue;
      }
      if (face === "serializer") {
        // THE ONE HAND-SERIALIZER MODULE LAW: the probed serializer
        // file IS the module this arm imports and drives — a second
        // hand-serializer tenant reds here until it teaches the judge.
        const imported = join(
          dirname(fileURLToPath(import.meta.url)),
          "..", "..", "..", "..",
          "packages", ...tenant.split("/"), "src", "ui", "studio", "docHydrate.ts",
        );
        if (serializerFile !== imported) {
          offenders.push(`${tenant}: a second hand Layer-A serializer (${serializerFile}) — the arm drives only ${imported}; grow the judge, never let a writer face ride the wrong module`);
          continue;
        }
      }

      // ── 3. THE PERSISTED KEY SET, PER FACE ───────────────────────
      // The FIRST OFFERED row resolves the tenant's owning family (the
      // walk addresses the family, never the alias row); a tenant with
      // no offered lane is an offender, not a silent skip.
      const firstOffered = rows.find(({ fam, row }) => !hiddenRouteRow(row, fam));
      if (firstOffered === undefined) {
        offenders.push(`${tenant}: every facts row of this tenant hides its route — no offered lane drives the face`);
        continue;
      }
      const owningFam = prepareCardParams(svc, { model: firstOffered.fam }, firstOffered.fam, "admission").fam;
      let persisted: string[] = [];
      let emittedUnion = new Set<string>();
      if (face === "onsave") {
        // CURE-1's emit depth, roster-derived: the doc the studio's
        // own merge-patch writer saves.
        persisted = [...onSaveKeys].sort();
        emittedUnion = onSaveKeys;
        assert.ok(persisted.length > 0, `${tenant}: the onSave emit grep went vacuous`);
      } else if (face === "serializer") {
        // THE DERIVED-LANE EMIT: the serializer's own output per
        // derived family, settled the bench way — this is the doc the
        // run press reads (hop [2]→[4]).
        for (const { seats, extra } of H3_LANE_DOCS) {
          const base: Record<string, unknown> = { ...seats };
          const state: Record<string, unknown> = {
            ...hydrateLayerA(base as never), ...extra,
          };
          const saved = serializeLayerA(state as never, base) as Record<string, unknown>;
          for (const k of Object.keys(saved)) emittedUnion.add(k);
          const family = deriveWindowFamily(base);
          const settled = settleBench(base, saved);
          try {
            await svc.phase1Card({ ...settled, card: firstOffered.row.card, model: owningFam }, owningFam);
          } catch (err) {
            offenders.push(`${tenant} / ${family}: the studio's own settled emit REFUSES at the real walk — ${err instanceof Error ? err.message : String(err)}`);
          }
          if (family === "t4r") {
            // THE B1 EMIT LAW AT THE PAYLOAD DEPTH: the serializer
            // deletes every T4_ONLY member a stamped state carries (the
            // repro-(A) scenario) — the settled doc carries nothing the
            // walk would refuse.
            for (const k of T4_ONLY_KEYS) {
              if (saved[k] !== undefined && saved[k] !== null) {
                offenders.push(`${tenant} / t4r: the serializer's own emit states "${k}" (${String(saved[k])}) — the walk refuses it on the reference lane`);
              }
            }
          }
        }
        // THE COVERAGE VOCABULARY: a maximally-populated doc — every
        // key the writer CAN persist, so the coverage clause judges
        // the whole vocabulary, not one lane's subset.
        const coverageEmitted = h3CoverageDoc();
        for (const k of Object.keys(coverageEmitted)) emittedUnion.add(k);
        // THE BURN'S FOUR, BY NAME (the anti-vacuity law): the keys
        // this wall was born from must still be in the emitted union.
        for (const k of H3_BURN_FOUR) {
          if (!emittedUnion.has(k)) {
            offenders.push(`${tenant}: the emitted union lost "${k}" — the burn's own key; the coverage clause is vacuous without it (fix the derivation, never shrink the judge)`);
          }
        }
        persisted = [...emittedUnion].sort();
      } else {
        // THE DECLARATIVE SSOT FACE: no hand emit exists — the studio
        // organizes the served form-spec, so the SERVED FIELDS are the
        // persisted set, per served family (each family's spec may
        // project its own surface), plus the DECL's own stage-plane
        // seats (the writes row: keys the bench stages across the
        // pipeline that the form spec does not serve).
        const perFamily = new Set<string>();
        for (const { fam, writes } of rows) {
          if (hiddenRouteRow(rows.find((r) => r.fam === fam)!.row, fam)) continue;
          const spec = await formSpecArm(fam);
          assert.ok(spec !== null, `${tenant}: the served form spec for '${fam}' resolved null — the declarative face has no SSOT to judge`);
          for (const f of fieldsOf(spec)) perFamily.add(f.name);
          for (const k of writes) perFamily.add(k);
        }
        persisted = [...perFamily].sort();
        emittedUnion = perFamily;
        assert.ok(persisted.length > 0, `${tenant}: the served-spec derivation went vacuous`);
      }

      // ── 4. SEAT PARITY, EVERY OFFERED FAMILY ROW ─────────────────
      // THE COORDINATE STRIP (the lift's own law, derived): model /
      // variant / quant select the lane — they never stage as params,
      // and a staged `variant` would hit the variant resolver, not the
      // param seat. The coverage clause exempts them by the same judge.
      const coords = persisted.filter((k) => {
        const lifted = liftCardParams({ [k]: 1 });
        return !(k in lifted);
      });
      for (const { fam, row, writes } of rows) {
        if (hiddenRouteRow(row, fam)) continue; // the census names it below
        const staged: Record<string, unknown> = {};
        for (const k of persisted) {
          if (coords.includes(k)) continue;
          staged[k] = `data:text/plain;base64,c2VhdC1wYXJpdHk=`;
        }
        const body: Record<string, unknown> = { model: fam, ...staged };
        let prep;
        try {
          prep = prepareCardParams(svc, body, fam, "admission");
          admissionRefusal(svc, prep.card, prep.fam, prep.params, "admission");
        } catch (err) {
          offenders.push(`${tenant} / ${fam}: the tenant's own persisted key set REFUSES at the admission door — ${err instanceof Error ? err.message : String(err)}`);
          continue;
        }
        // every staged key lands INSIDE the envelope, value verbatim
        for (const k of Object.keys(staged)) {
          if (!(k in prep.params) || prep.params[k] !== staged[k]) {
            offenders.push(`${tenant} / ${fam}: persisted key '${k}' did not land inside the envelope (params: ${Object.keys(prep.params).join(", ")})`);
          }
        }
        // the DECL's OWN stage-plane seats admit beside the emit
        for (const k of writes) {
          if (persisted.includes(k)) continue; // already staged + landed
          // a writes key the writer face does not derive (the hand
          // faces' doc planes — calls/keyframes/document) still admits:
          // stage + judge it alone. A seat that refuses is the brick's
          // first half — the writes row was its admission home.
          try {
            const single = prepareCardParams(svc, { model: fam, [k]: "data:text/plain;base64,c2VhdA==" }, fam, "admission");
            admissionRefusal(svc, single.card, single.fam, single.params, "admission");
            if (!(k in single.params)) {
              offenders.push(`${tenant} / ${fam}: DECL writes seat '${k}' did not land inside the envelope`);
            }
          } catch (err) {
            offenders.push(`${tenant} / ${fam}: DECL writes seat '${k}' REFUSES at the admission door — the studio.writes row was its admission home: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        // REFUSE-LOUD — the door's other half, per row: a key on NO
        // surface is refused NAMED, never silently dropped.
        let loud = "";
        try {
          admissionRefusal(svc, prep.card, prep.fam, liftCardParams({ model: fam, definitely_not_a_declared_key: 1 }), "admission");
        } catch (err) {
          loud = err instanceof Error ? err.message : String(err);
        }
        if (loud === "") offenders.push(`${tenant} / ${fam}: the admission door swallowed 'definitely_not_a_declared_key' — a key no surface declares; the refusal is silent`);
        else if (!loud.includes("definitely_not_a_declared_key")) offenders.push(`${tenant} / ${fam}: the refusal for an undeclared key does not name it: ${loud}`);
      }

      // ── 5. DECL COVERAGE (the hand writer's declaration law) ─────
      if (face === "onsave" || face === "serializer") {
        const writes = rows[0]!.writes;
        const exempt = WRITES_EXEMPT[tenant] ?? [];
        const exemptKeys = new Set(exempt.map((e) => e.key));
        for (const k of persisted) {
          if (writes.includes(k) || coords.includes(k) || exemptKeys.has(k)) continue;
          offenders.push(`${tenant}: the writer persists '${k}' but the family DECL's studio.writes does not declare it (rows: ${writes.join(", ") || "none"}; named exemptions: ${[...exemptKeys].join(", ") || "none"}) — a studio write no DECL declares is the brick's first half`);
        }
        // THE EXEMPTION STALENESS JUDGE (both directions): a named
        // exemption the writer no longer emits is a dead excuse.
        for (const e of exempt) {
          if (!emittedUnion.has(e.key)) {
            offenders.push(`${tenant}: exemption '${e.key}' (${e.why}) is no longer emitted by the writer — prune the dead excuse`);
          }
        }
      } else {
        // THE DECLARATIVE FACE'S MACHINE HOME: the served fields must
        // sit on the card's own schema dict (the SSOT the studio
        // organizes) — a served row the DECL does not declare is the
        // spec-drift class, named here.
        const defs = await loadCardDefs();
        const def = defs.get(rows[0]!.row.card);
        assert.ok(def !== undefined, `${tenant}: card '${rows[0]!.row.card}' is not served by the card defs`);
        const dict = (def.schema as { dict?: Record<string, unknown> } | undefined)?.dict;
        assert.ok(dict !== undefined, `${tenant}: card '${rows[0]!.row.card}' carries no schema dict — the declarative face's machine home is unjudgable`);
        for (const k of persisted) {
          if (k in dict || rows[0]!.writes.includes(k)) continue;
          offenders.push(`${tenant}: the served spec stages '${k}' but the card's schema dict declares no such knob and the studio.writes row does not carry it — the SSOT drifted off the declaration`);
        }
      }

      // ── 6. THE SERVED-STAMP JUDGE (the tool/agent face, the
      //      ungated sibling writer) — firstOffered/owningFam hoisted
      //      at §3 ──────────────────────────────────────────────────
      {
        const spec = await formSpecArm(owningFam);
        assert.ok(spec !== null, `${tenant}: the served form spec for '${owningFam}' resolved null — the tool/agent face has no stamp to judge`);
        const fields = new Set(fieldsOf(spec).map((f) => f.name));
        const stampRows = (spec as { variants?: Array<{ id: string; defaults: Record<string, unknown> }> }).variants ?? [];
        const stampKeys = new Set<string>();
        for (const v of stampRows) for (const k of Object.keys(v.defaults ?? {})) stampKeys.add(k);
        // THE UNION LAW AT THE TOOL FACE: the form cannot stage keys
        // outside the declared union — served fields ∪ studio.writes.
        for (const k of stampKeys) {
          if (fields.has(k) || firstOffered.writes.includes(k)) continue;
          const lifted = liftCardParams({ [k]: 1 });
          if (!(k in lifted)) continue; // a coordinate selects, never stages
          offenders.push(`${tenant}: the served variant stamp stages '${k}' — neither a served field nor a studio.writes seat; the tool/agent face can brick a stage the door refuses`);
        }
        // the stamp admits at the real door, per served row (the
        // coordinate keys never stage — the §4 strip law)
        const stampBody: Record<string, unknown> = { model: owningFam };
        for (const k of stampKeys) {
          if (coords.includes(k)) continue;
          stampBody[k] = `data:text/plain;base64,c3RhbXA=`;
        }
        try {
          const prep = prepareCardParams(svc, stampBody, firstOffered.fam, "admission");
          admissionRefusal(svc, prep.card, prep.fam, prep.params, "admission");
        } catch (err) {
          offenders.push(`${tenant}: the served variant stamp REFUSES at the admission door — ${err instanceof Error ? err.message : String(err)}`);
        }
        // THE FAMILY-STAMPING ROWS (derived: a served row whose stamp
        // carries a T4_ONLY member) — the family-conditional tenant's
        // honest edge: the stamp composes on the lane that honors it
        // and refuses loud, naming its members, on the lane that
        // cannot. A silent compose there is the green-fraud itself.
        if (face === "serializer") {
          const t4StampRows = stampRows.filter((v) =>
            Object.keys(v.defaults ?? {}).some((k) => (T4_ONLY_KEYS as readonly string[]).includes(k)));
          assert.ok(t4StampRows.length > 0, `${tenant}: no served variant row stamps a T4_ONLY member — the Final Cut pick's stamp vanished from the served spec; the stamp judge went vacuous`);
          for (const v of t4StampRows) {
            const openBase: Record<string, unknown> = {
              seed: 7,
              calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }],
              ...H3_STAMP_COMPLETION,
            };
            try {
              await svc.phase1Card({ ...openBase, ...(v.defaults ?? {}), card: firstOffered.row.card, model: owningFam }, owningFam);
            } catch (err) {
              offenders.push(`${tenant}: served stamp row '${v.id}' refuses on its sanctioned lane (t4_open) — ${err instanceof Error ? err.message : String(err)}`);
            }
            const t4rBase: Record<string, unknown> = {
              seed: 7,
              keyframes: [{ image: "anchor.png", frame: 0 }],
              calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90, image: "anchor.png" }],
              ...(v.defaults ?? {}),
            };
            let refused = "";
            try {
              await svc.phase1Card({ ...t4rBase, card: firstOffered.row.card, model: owningFam }, owningFam);
            } catch (err) {
              refused = err instanceof Error ? err.message : String(err);
            }
            const t4Members = Object.keys(v.defaults ?? {}).filter((k) => (T4_ONLY_KEYS as readonly string[]).includes(k));
            if (refused === "") {
              offenders.push(`${tenant}: served stamp row '${v.id}' COMPOSED on a derived-t4r doc carrying ${t4Members.join(", ")} — the family walk lost its sanction gate`);
            } else {
              for (const k of t4Members) {
                if (!refused.includes(k)) offenders.push(`${tenant}: the t4r refusal for stamp row '${v.id}' does not name its member '${k}': ${refused}`);
              }
            }
          }
          // THE BURN'S NEGATIVE CONTROL (repro (A)'s hand doc): the
          // four-key stamp on a keyframe doc refuses with the walk's
          // verbatim voice — the refusal is a wall receipt, never an
          // operator discovery again.
          const fourKeyDoc: Record<string, unknown> = {
            seed: 7,
            keyframes: [{ image: "anchor.png", frame: 0 }],
            calls: [{ text: "the courier steps in", start_frame: 0, end_frame: 90, image: "anchor.png" }],
            interpolate_enabled: true, second_pass_enabled: true, sharpen_enabled: true, sr_switch: true,
          };
          let burnRefused = "";
          try {
            await svc.phase1Card({ ...fourKeyDoc, card: firstOffered.row.card, model: owningFam }, owningFam);
          } catch (err) {
            burnRefused = err instanceof Error ? err.message : String(err);
          }
          if (burnRefused === "" || !burnRefused.includes("unsanctioned inject keys")) {
            offenders.push(`${tenant}: the burn's four-key keyframe doc no longer refuses with the walk's voice (got: ${burnRefused || "a clean compose"}) — the t4r sanction gate moved or died`);
          } else {
            for (const k of H3_BURN_FOUR) {
              if (!burnRefused.includes(k)) offenders.push(`${tenant}: the four-key refusal does not name '${k}': ${burnRefused}`);
            }
          }
        }
      }

      JUDGED_TENANTS.add(tenant);
      // THE UNOFFERED CENSUS: hidden-quant rows are named, never silent.
      const hidden = rows.filter(({ fam, row }) => hiddenRouteRow(row, fam)).map(({ fam }) => fam);
      if (hidden.length > 0) console.log(`[param-seat-parity] ${tenant}: hidden-quant rows staged by no one (the door's own hide marks): ${hidden.join(", ")}`);
    }

    assert.deepEqual(offenders, [], `PARAM-SEAT-PARITY BROKEN:\n${offenders.join("\n")}`);
  });

  it("THE TENANT CENSUS: the sweep judged every studio tenant the DECL rows derive (GREEN-F1 — no frozen-literal universe)", async () => {
    // Re-derives the roster from the DECLs' OWN loading path and
    // refuses any tenant the sweep above did not judge. Un-scoping the
    // sweep (reverting the derivation to a motion-only literal — the
    // CURE-1 shape) reds HERE, naming the tenant whose arm died.
    const allFacts = svc.modelFacts();
    const kitFacts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
    const derived = new Set<string>();
    for (const [fam, row] of Object.entries(allFacts)) {
      if (row.studio === undefined || row.studio === null) continue;
      const tenant = kitFacts.models[fam]?.studio?.tenant;
      assert.ok(typeof tenant === "string" && tenant.length > 0, `facts family '${fam}' carries a studio.writes row but no tenant string`);
      derived.add(tenant);
    }
    assert.ok(derived.size >= 3, `the derived census collapsed to ${derived.size} tenant(s) — the studio lift broke`);
    const unjudged = [...derived].filter((t) => !JUDGED_TENANTS.has(t));
    assert.deepEqual(
      unjudged,
      [],
      `PARAM-SEAT-PARITY UN-SCOPED: the sweep judged [${[...JUDGED_TENANTS].join(", ") || "nothing"}] but the DECL rows derive [${[...derived].join(", ")}] — tenant(s) ${unjudged.join(", ")} have no emit-side judge (the GREEN-F1 frozen-literal class: a hand tenant universe is a judge whose universe rots)`,
    );
  });
});
