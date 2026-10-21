// moss-sfx-pipeline-truth.spec.ts — THE PIPELINE-TRUTH WALL (audit
// dev_docs/audits/features/2026-11-10-moss-sfx2-quality-chain.md,
// suspects S1 + S2, fix shortlist 1 + 2; the residual-defaults cure,
// 2026-11-10).
//
// THE LESION: the historical 5.0/50 sampling point was cured on the
// card (2026-09-23) and wall-pinned there, but it SURVIVED on three
// residual surfaces — the vendored node's INPUT_TYPES defaults, the
// kit's AUDIACORE_TTS_AUTOFILL base, and a dead legacy recipe — and
// the card/DECL sold a 300 s duration the pipeline refuses at
// max_inference_seconds=30: any >30 s draft died MID-RUN at the
// engine (the ambience_bed recipe shipped as a dead button). No wall
// read any of those surfaces, so an edit re-arming the burn passed
// every suite green.
//
// THE LAW: the VENDORED UPSTREAM PIPELINE is the truth source. This
// gate parses its real source file — the __call__ defaults and the
// max_inference_seconds bound, whose two in-file spellings (the
// __init__ default and the from_pretrained fallback) must agree —
// and every downstream surface fires its OWN arm against the parsed
// values (the split-brain lesson: the card arm alone masked the
// others):
//
//   TRUTH  the vendored pipeline parses; its bound spellings agree
//   ARM 1  the node's INPUT_TYPES defaults (nodes.py, AudiocoreTTS)
//   ARM 2  the kit autofill pin (AUDIACORE_TTS_AUTOFILL)
//   ARM 3  the card schema's bare-press defaults (the schema gate)
//   ARM 4  the duration ceiling equals the engine truth — the card
//          schema ceiling, the DECL sfx action bound, and every
//          recipe stamp (reachable durations only; the bed AT the max)
//   ARM 5  a >max draft refuses LOUD at the bench-write door —
//          never mid-run at the engine
//
// Every parse anchor fails LOUD: the wall never green-lights on a
// frozen 4/100/30 literal, and a moved vendored file reds naming the
// anchor instead of silently skipping.
//
// Run: npx vitest run tests/walls/ts/suites/moss-sfx-pipeline-truth.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { AUDIACORE_TTS_AUTOFILL } from "@melite/comfyui-card-kit";
import { DECL } from "@melite/models-moss-sfx";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const PIPELINE_PATH = join(
  ROOT,
  "vendor", "comfyui_extensions", "melite-audio-nodes",
  "engines", "moss_sfx_impl", "moss_soundeffect_v2", "pipeline_moss_soundeffect.py",
);
const NODES_PATH = join(ROOT, "vendor", "comfyui_extensions", "melite-audio-nodes", "nodes.py");
const FACTS_PATH = join(ROOT, "packages", "engines", "comfyui-cordis", "data", "model-facts.json");

const anchorFail = (anchor: string, file: string): Error =>
  new Error(
    `pipeline-truth wall: the parse anchor ${JSON.stringify(anchor)} found nothing in ${file} — ` +
    "the vendored source moved or was reworded; re-anchor the parse against the real file. " +
    "The wall reads the pipeline's own values, never a re-typed literal.",
  );

/** A python method's signature block: the def line through its
 *  four-space `)` closer. Fails loud when either end is absent. */
function pySignature(src: string, defAnchor: string, file: string): string {
  const at = src.indexOf(defAnchor);
  if (at === -1) throw anchorFail(defAnchor, file);
  const close = src.indexOf("\n    )", at);
  if (close === -1) throw anchorFail("signature closer after " + JSON.stringify(defAnchor), file);
  return src.slice(at, close);
}

/** A python method's body: the def line through the next `@` or
 *  `def` at method indent. Fails loud when absent. */
function pyBody(src: string, defAnchor: string, file: string): string {
  const at = src.indexOf(defAnchor);
  if (at === -1) throw anchorFail(defAnchor, file);
  let end = src.indexOf("\n    @", at);
  const nextDef = src.indexOf("\n    def ", at);
  if (end === -1 || (nextDef !== -1 && nextDef < end)) end = nextDef;
  if (end === -1) end = src.length;
  return src.slice(at, end);
}

function pyParam(sig: string, pattern: RegExp, what: string, file: string): number {
  const m = sig.match(pattern);
  if (!m) throw anchorFail(pattern.source, file);
  const v = Number(m[1]);
  assert.ok(Number.isFinite(v), `pipeline-truth wall: the ${what} parse landed on a non-number (${String(m[1])})`);
  return v;
}

// ── THE TRUTH SOURCE ─────────────────────────────────────────────
const pipelineSrc = readFileSync(PIPELINE_PATH, "utf8");
const callSig = pySignature(pipelineSrc, "def __call__(", PIPELINE_PATH);
const PIPELINE_CFG = pyParam(callSig, /cfg_scale: float = ([0-9.]+)/, "__call__ cfg_scale default", PIPELINE_PATH);
const PIPELINE_STEPS = pyParam(callSig, /num_inference_steps: int = (\d+)/, "__call__ num_inference_steps default", PIPELINE_PATH);
const PIPELINE_SECONDS = pyParam(callSig, /seconds: float = ([0-9.]+)/, "__call__ seconds default", PIPELINE_PATH);
const initSig = pySignature(pipelineSrc, "def __init__(", PIPELINE_PATH);
const PIPELINE_MAX_SECONDS = pyParam(initSig, /max_inference_seconds: int = (\d+)/, "__init__ max_inference_seconds default", PIPELINE_PATH);
const pretrainedBody = pyBody(pipelineSrc, "def from_pretrained(", PIPELINE_PATH);
const PRETRAINED_FALLBACK = pyParam(pretrainedBody, /max_inference_seconds = (\d+)/, "from_pretrained max_inference_seconds fallback", PIPELINE_PATH);

// ── THE NODE SURFACE (parsed, not frozen) ────────────────────────
const nodesSrc = readFileSync(NODES_PATH, "utf8");
const nodeClsAt = nodesSrc.indexOf("class AudiocoreTTS");
if (nodeClsAt === -1) throw anchorFail("class AudiocoreTTS", NODES_PATH);
const nodeClsEnd = nodesSrc.indexOf("\nclass ", nodeClsAt + 1);
const nodeCls = nodesSrc.slice(nodeClsAt, nodeClsEnd === -1 ? nodesSrc.length : nodeClsEnd);
const NODE_CFG = pyParam(nodeCls, /"guidance_scale": \("FLOAT",\s*\{"default": ([0-9.]+),/, "AudiocoreTTS guidance_scale default", NODES_PATH);
const NODE_STEPS = pyParam(nodeCls, /"num_inference_steps": \("INT",\s*\{"default": (\d+),/, "AudiocoreTTS num_inference_steps default", NODES_PATH);
const NODE_SECONDS = pyParam(nodeCls, /"duration_seconds": \("FLOAT",\s*\{"default": ([0-9.]+),/, "AudiocoreTTS duration_seconds default", NODES_PATH);

// ── THE CARD DOOR (the real compose root, the card spec's way) ───
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let moss: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("sfx")!;
  assert.ok(def, "the composition root serves the sfx card");
  moss = facts.models["moss-sfx"]!;
  assert.ok(moss, "the moss-sfx facts row serves");
});

const graphJSON = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("THE PIPELINE-TRUTH WALL — every moss-sfx stated surface equals the vendored pipeline's own values", () => {
  it("TRUTH — the vendored pipeline's defaults parse and its bound spellings agree", () => {
    // The class default and the from_pretrained fallback are two
    // spellings of ONE bound; the load path may also override from
    // model_index.json. A disagreement reds here — the wall pins
    // surfaces to a bound it can name, not to whichever spelling the
    // parse met first.
    assert.equal(
      PRETRAINED_FALLBACK, PIPELINE_MAX_SECONDS,
      `the pipeline's bound spellings disagree (__init__ default ${PIPELINE_MAX_SECONDS}, from_pretrained fallback ${PRETRAINED_FALLBACK}) — one bound, stated once per spelling and equal`,
    );
    assert.ok(PIPELINE_STEPS > 0 && PIPELINE_CFG >= 0 && PIPELINE_SECONDS > 0 && PIPELINE_MAX_SECONDS > 0,
      `the parsed truth is degenerate (cfg ${PIPELINE_CFG}, steps ${PIPELINE_STEPS}, seconds ${PIPELINE_SECONDS}, max ${PIPELINE_MAX_SECONDS}) — the parse anchors met the wrong lines`);
  });

  it("ARM 1 — the node's INPUT_TYPES defaults are the pipeline's point", () => {
    assert.equal(
      NODE_CFG, PIPELINE_CFG,
      `the AudiocoreTTS node's guidance_scale default (${NODE_CFG}) drifted from the vendored pipeline's cfg_scale (${PIPELINE_CFG}) — pin nodes.py to the pipeline's own point; the 5.0 floor re-arms the 2026-09-23 quality catch on every knob-less composition`,
    );
    assert.equal(
      NODE_STEPS, PIPELINE_STEPS,
      `the AudiocoreTTS node's num_inference_steps default (${NODE_STEPS}) drifted from the vendored pipeline's default (${PIPELINE_STEPS}) — pin nodes.py to the pipeline's own point; half the step budget was the burn's confirmed cause`,
    );
    assert.equal(
      NODE_SECONDS, PIPELINE_SECONDS,
      `the AudiocoreTTS node's duration_seconds default (${NODE_SECONDS}) drifted from the vendored pipeline's seconds default (${PIPELINE_SECONDS}) — pin nodes.py to the pipeline's own point`,
    );
  });

  it("ARM 2 — the kit autofill pin is the pipeline's point", () => {
    assert.equal(
      AUDIACORE_TTS_AUTOFILL.guidance_scale, PIPELINE_CFG,
      `AUDIACORE_TTS_AUTOFILL.guidance_scale (${String(AUDIACORE_TTS_AUTOFILL.guidance_scale)}) drifted from the vendored pipeline's cfg_scale (${PIPELINE_CFG}) — the autofill is the object_info pin's mirror; a consumer that omits the knobs lands on it, so pin it to the pipeline's own point`,
    );
    assert.equal(
      AUDIACORE_TTS_AUTOFILL.num_inference_steps, PIPELINE_STEPS,
      `AUDIACORE_TTS_AUTOFILL.num_inference_steps (${String(AUDIACORE_TTS_AUTOFILL.num_inference_steps)}) drifted from the vendored pipeline's default (${PIPELINE_STEPS}) — pin the autofill to the pipeline's own point`,
    );
    assert.equal(
      AUDIACORE_TTS_AUTOFILL.duration_seconds, PIPELINE_SECONDS,
      `AUDIACORE_TTS_AUTOFILL.duration_seconds (${String(AUDIACORE_TTS_AUTOFILL.duration_seconds)}) drifted from the vendored pipeline's seconds default (${PIPELINE_SECONDS}) — pin the autofill to the pipeline's own point`,
    );
  });

  it("ARM 3 — the card schema's bare-press defaults are the pipeline's point", () => {
    // The schema gate's own stated defaults — what a bare Run press
    // serves before any graph exists (card.spec.ts's composed-graph
    // arm is the downstream twin of this arm, not its substitute).
    const doc = def.schema({ prompt: "probe" }) as Record<string, unknown>;
    assert.equal(
      doc.guidance_scale, PIPELINE_CFG,
      `the sfx card schema's guidance_scale default (${String(doc.guidance_scale)}) drifted from the vendored pipeline's cfg_scale (${PIPELINE_CFG}) — the bare press must serve the pipeline's own point`,
    );
    assert.equal(
      doc.n_diffusion_steps, PIPELINE_STEPS,
      `the sfx card schema's n_diffusion_steps default (${String(doc.n_diffusion_steps)}) drifted from the vendored pipeline's default (${PIPELINE_STEPS}) — the bare press must serve the pipeline's own point`,
    );
    assert.equal(
      doc.duration, PIPELINE_SECONDS,
      `the sfx card schema's duration default (${String(doc.duration)}) drifted from the vendored pipeline's seconds default (${PIPELINE_SECONDS}) — the bare press must serve the pipeline's own point`,
    );
  });

  it("ARM 4 — the duration ceiling equals the engine truth (card, DECL action, recipes)", () => {
    // (a) the card schema ceiling, judged BEHAVIORALLY at the gate:
    // the pipeline's own max composes, half a second past it refuses.
    const atMax = def.schema({ prompt: "probe", duration: PIPELINE_MAX_SECONDS }) as Record<string, unknown>;
    assert.equal(
      atMax.duration, PIPELINE_MAX_SECONDS,
      `the card schema refused the pipeline's own max (${PIPELINE_MAX_SECONDS}s) — the ceiling is the engine truth, not tighter`,
    );
    assert.throws(
      () => def.schema({ prompt: "probe", duration: PIPELINE_MAX_SECONDS + 0.5 }),
      /duration|between|range/i,
      `the card schema accepted duration ${PIPELINE_MAX_SECONDS + 0.5} — a draft the engine refuses mid-run; the schema ceiling must equal the pipeline's max_inference_seconds`,
    );
    // (b) the DECL's declared bound — the family door judges variant
    // presets against this row, so a looser ceiling admits dead runs.
    const sfxAction = DECL.actions.find((a) => a.id === "sfx");
    assert.ok(sfxAction, "the DECL declares the sfx action");
    const durationRow = sfxAction.params.find((row) => row.name === "duration");
    assert.ok(durationRow?.bounds, "the DECL sfx action states duration bounds");
    assert.equal(
      durationRow.bounds[1], PIPELINE_MAX_SECONDS,
      `the DECL sfx action's duration ceiling (${String(durationRow.bounds[1])}) drifted from the pipeline's max_inference_seconds (${PIPELINE_MAX_SECONDS}) — the family door judges presets against this bound; a looser ceiling admits a run that dies at the engine`,
    );
    // (c) every recipe stamp is reachable: a preset beyond the max
    // composes a dead run — the ambience_bed lesson.
    const stamped = DECL.variants.filter((v) =>
      v.group === "Recipe" && v.wire_defaults != null && typeof v.wire_defaults.duration === "number",
    );
    assert.ok(
      stamped.length >= 2,
      "the family carries its duration recipes (one-shot, ambience-bed) — the wall's own footing",
    );
    for (const v of stamped) {
      const d = v.wire_defaults!.duration as number;
      assert.ok(
        d <= PIPELINE_MAX_SECONDS,
        `recipe '${v.id}' stamps duration ${d}s — beyond the pipeline's max_inference_seconds (${PIPELINE_MAX_SECONDS}s) the preset composes a run that dies mid-engine; stamp only reachable durations`,
      );
    }
    // (d) the re-spec'd bed sits AT the ceiling: the longest legal
    // single-run bed (the recipe's intent, kept reachable).
    const bed = DECL.variants.find((v) => v.id === "ambience-bed");
    assert.ok(bed, "the ambience-bed recipe serves");
    assert.ok(bed.wire_defaults != null && typeof bed.wire_defaults.duration === "number",
      "the ambience-bed recipe states a duration stamp");
    assert.equal(
      bed.wire_defaults!.duration, PIPELINE_MAX_SECONDS,
      `the ambience-bed recipe stamps ${String(bed.wire_defaults!.duration)}s — the re-spec pins the long bed AT the pipeline's max (${PIPELINE_MAX_SECONDS}s): the intent survives at the engine's own ceiling, never past it`,
    );
  });

  it("ARM 5 — a >max draft refuses LOUD at the bench-write door, never mid-run at the engine", () => {
    // 300 is the historical dead-button value the card used to sell.
    assert.throws(
      () => def.compose(def.schema({ prompt: "long rain bed", duration: 300 }), moss, new GraphBuilder(), "r_dead300"),
      /duration|between|range/i,
      "a 300 s draft COMPOSED — the historical dead button rides to the engine and dies mid-run (ValueError at max_inference_seconds); the bench-write door must refuse it loud",
    );
    assert.throws(
      () => def.compose(def.schema({ prompt: "long rain bed", duration: PIPELINE_MAX_SECONDS + 0.5 }), moss, new GraphBuilder(), "r_dead_half"),
      /duration|between|range/i,
      `a ${PIPELINE_MAX_SECONDS + 0.5} s draft COMPOSED — anything past the pipeline's max refuses at the door, before any dispatch`,
    );
    // The boundary holds: the max itself composes and rides verbatim.
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "rain bed", duration: PIPELINE_MAX_SECONDS }), moss, g, "r_max_edge");
    const synth = graphJSON(g)["AudiocoreTTS.0"];
    assert.ok(synth, "the max-duration compose reaches the synth");
    assert.equal(
      synth.inputs.duration_seconds, PIPELINE_MAX_SECONDS,
      "the boundary duration rides verbatim — the ceiling refuses past it, never at it",
    );
  });
});
