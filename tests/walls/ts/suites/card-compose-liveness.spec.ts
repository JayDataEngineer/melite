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
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

// THE CARD TIER, BOOTED THE CARD SPEC'S WAY (models registry + card
// defs + facts — the upload-referenced precedent). The registry
// import order matters — boot-models first.
import "../../../helpers/boot-models.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel, modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

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
