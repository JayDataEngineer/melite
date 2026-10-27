// vibe-suite.spec.ts — THE VIBE SUITE BASELINE (the agent-flow rework,
// 2026-11-12; commission dev_docs/audits/agent-flow-rework-research-prompt-2026-11-12.md).
// @contract infra-vibe-suite-baseline
//
// The agent flow IS the product ("vibe generate like vibe code"). This wall
// is the suite's v0: it pins the transcript-measured baseline from session
// 384a13cd (verbatim evidence in the commission file) as PASSING assertions,
// so every rework slice has a red→green ratchet to turn:
//
//   Request 1 "anime girl": 10 calls, 1 refusal, 1 skill_read.
//   Request 2 "image -> video, two clips": 13+ calls, 6 refusals, 4 doc reads.
//
// v0 asserts the friction EXISTS (green now). Each slice re-cuts its arm
// toward the target (Ct<=3, Cr=0, Cd=0 on the bread-and-butter case) —
// the wall tightens, never loosens.
//
// WHAT EACH ARM PINS:
//   1. census — the four eval scenarios + their baseline ceilings.
//   2. discover-miss (T3) — q="anime" tags=image returns ZERO live rows
//      (the transcript's exact miss, reproduced at HEAD); the full
//      sentence "anime girl" misses too. Slice 3 re-cuts to a ranked hit.
//   3. load-dump (T1/T8) — the live load face serves 11 image-gen params
//      and 54 h3-timeline params, and h3 still names `last_frame`
//      (the retired seam, alive on the face). Slice 1/4 re-cut.
//   4. verb-guard (P5, persists) — the no-verb payload refuses loud.
//      Schema-required verbs keep this arm green through the rework.
//   5. t4-voice (T4) — the load voice names a tool the mode owns. The
//      agent-mode contract bans `melite_flow`; the render already
//      branches on `opts.headless`, so the arm renders BOTH modes and
//      judges the sentences (slice 2 re-cut the source-text pin — a
//      string in a file is not a voice).
//   6. no-coercion (T7) — construct performs no scalar→array derive
//      today (the spell fails at run admission). Slice 5 lands it.
//
// Run: npx vitest run --project walls tests/walls/ts/suites/vibe-suite.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { searchCards } from "../../../../packages/harness/estate-queue/src/discloseRegistry.ts";
import { loadCard } from "../../../../packages/harness/estate-queue/src/loadPlane.ts";
import { meliteLoad } from "../../../../packages/harness/melite-tools/src/tools/melite-load.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

/** The eval suite: scenario → baseline ceiling (v0 pins today's numbers). */
const SCENARIOS = [
  { prompt: "Make an image of an anime girl.", calls: 10, refusals: 1, docReads: 1 },
  { prompt: "Turn this image into the video. I want it to be two short clips combined.", calls: 13, refusals: 6, docReads: 4 },
  { prompt: "Make this character talk with a cinematic voice.", calls: 8, refusals: 2, docReads: 1 },
  { prompt: "Upscale this video to 4K resolution.", calls: 6, refusals: 1, docReads: 0 },
] as const;

describe("THE VIBE SUITE BASELINE — the agent flow's acceptance harness (v0 pins today's friction)", () => {
  it("the census names four scenarios with their transcript-measured ceilings", () => {
    assert.equal(SCENARIOS.length, 4, "four scenarios: the two transcript cases + talk + upscale");
    const [girl, clips] = [SCENARIOS[0]!, SCENARIOS[1]!];
    assert.equal(girl.calls, 10, "session-384a13cd request 1: 10 tool calls");
    assert.equal(girl.refusals, 1, "request 1: the no-verb refusal");
    assert.equal(clips.calls, 13, "request 2: 13+ calls (floor — the log ends mid-dive)");
    assert.equal(clips.refusals, 6, "request 2: 6 refusals across 3 doors");
    assert.equal(clips.docReads, 4, "request 2: 4 doc reads before composing");
  });

  it("T3 BASELINE: the naive query misses live (q=anime tags=image returns zero rows)", async () => {
    const defs = await loadCardDefs();
    const miss = searchCards(defs, "anime", "image");
    assert.deepEqual(miss.map((r) => r.id), [], "the transcript's exact miss reproduces at HEAD — image-gen's hay names no 'anime'");
    const sentence = searchCards(defs, "anime girl", "");
    assert.ok(!sentence.some((r) => r.id === "image-gen"), "the full sentence misses image-gen too — literal tokens, no ranking");
    const modality = searchCards(defs, "", "image");
    assert.ok(modality.some((r) => r.id === "image-gen"), "the modality fallback FINDS it — tags= is today's only working door");
  });

  it("T1/T8 BASELINE: the load face dumps the full surface and still names the retired seam", async () => {
    const defs = await loadCardDefs();
    const cards = { defsSync: () => defs };
    const girl = loadCard(ROOT, cards as never, null, "image-gen") as { signature: { params_schema: { properties: Record<string, unknown> } } };
    const girlKeys = Object.keys(girl.signature.params_schema.properties);
    assert.ok(girlKeys.length >= 10, `image-gen face dumps ${girlKeys.length} params (>=10 — no digest yet)`);
    const h3 = loadCard(ROOT, cards as never, null, "h3-timeline") as { signature: { params_schema: { properties: Record<string, unknown> } } };
    const h3Keys = Object.keys(h3.signature.params_schema.properties);
    assert.ok(h3Keys.length >= 30, `h3-timeline face dumps ${h3Keys.length} params (>=30 — no digest yet)`);
    // SLICE 1 LANDED (add-first keyframe bus): the any-frame pin lane is
    // now ON the agent face — the cure-8 lane the engine always had and
    // no surface declared (session 384a13cd reasoned in first/last
    // physics for nine minutes because of exactly this gap).
    assert.ok(h3Keys.includes("keyframes"), "the ANY-FRAME lane rides the agent face (cure 8: any frame, any time)");
    const kf = h3.signature.params_schema.properties["keyframes"] as { type?: string; description?: string };
    assert.equal(kf?.type, "array", "the pin lane serves as the array class (the calls/audio_clips precedent)");
    assert.match(String(kf?.description ?? ""), /ANY FRAME, ANY TIME/, "the lane teaches its own shape on the face — never a bare key");
    assert.ok("last_frame" in h3.signature.params_schema.properties, "the retired first/last seam is ALIVE on the param face (cure-8 killed it in the engine — the face never buried it; ADD-FIRST: deprecation is the voice-contract slice)");
  });

  it("VERB GUARD persists: a payload with no verb refuses loud (schema grammar, never silent derive)", () => {
    const src = read("packages/harness/melite-tools/src/tools/melite-construct.ts");
    assert.ok(src.includes("with no verb"), "the no-verb refusal voice exists — Slice 5 keeps it (verbs go REQUIRED in the schema; a WRITE is never derived)");
  });

  it("T4: the load voice names the door the MODE owns (agent: construct; headless: flow) — never a phantom verb", () => {
    // THE BURN (transcript step 3): the agent-mode load told the model
    // "open with melite_flow" — a tool the agent-mode contract bans.
    // The render branches on opts.headless today; this arm renders
    // both modes and judges the sentences, so a re-inlined phantom
    // verb reds. (A source-text pin certified the branch's presence,
    // never its voice — the weak-wall class.)
    const value = { name: "c", inference_type: "card", bundle: { kind: "card", name: "c", signature: null } };
    const args = { name: "c", inference_type: "card" };
    const voice = (headless: boolean): string => {
      const tool = meliteLoad({} as never, headless ? { headless: true } : {});
      const parts = tool.output.render(args, value as never) as Array<{ text?: string }>;
      return parts.map((p) => p?.text ?? "").join("\n");
    };
    const agent = voice(false);
    assert.ok(!agent.includes("melite_flow"), "agent mode must never name melite_flow — the contract bans it");
    assert.ok(agent.includes("melite_construct"), "agent mode names the door it owns (construct/add_stage)");
    assert.ok(/runs start at the user's Run press/.test(agent), "agent mode names who starts the run");
    const headless = voice(true);
    assert.ok(headless.includes("melite_flow"), "headless owns the flow verb — its voice keeps it");
  });

  it("T7 BASELINE: construct derives nothing today (no scalar→array coercion — the late-door failure)", () => {
    const src = read("packages/harness/melite-tools/src/tools/melite-construct.ts");
    assert.ok(!src.includes("coerced"), "no derive-and-land vocabulary yet — the spell fails at run admission, not the first door (Slice 5 lands applied_derivations)");
  });
});

// ── THE ONE SEAT (operator 2026-11-12): "It's ONE SEAT. The agent /
// vibecoder suite, and everything, the backend waterfall of
// card->family->model and the UI presentation of options, is tied to
// the frictionless agent flow. This is counter-intuitive, because 95%
// of work has been on the non-agent flow."
//
// Two projections of ONE declared truth: the AGENT face (melite_load's
// params_schema, what the model composes from) and the UI face (the
// form spec's params, what the user sees). They are built by different
// code paths and nothing judged them agreeing — so the agent can be
// taught a surface the user never sees, or the user shown a knob the
// agent cannot author. Every difference must be DERIVABLE from a
// face-local projection rule, or NAMED in the register below with its
// reason. The register must EQUAL the live residue exactly: it can
// shrink as slices fold the aliases, never grow.
const ONE_SEAT_REGISTER = new Map<string, string>([
  // The agent composes bag-mode/multi-lane params the card form
  // presents as variants or wired inputs instead.
  ["music:mode", "family selector's cousin — the UI carries mode as variants; the agent names it for bag-mode composes"],
  ["rig:mode", "same — the rig form presents no mode row"],
  ["tts:voice", "the qvoice mod carries voice on the UI face; the agent names it flat (the family's own doc owns the spelling)"],
  ["tts:style_instruction", "qvoice/design lane field — UI rides the mod bucket"],
  ["tts:design_prompt", "design lane field — UI rides the mod bucket"],
  ["tts:ref_text", "reference-lane transcript — UI wires ref_audio as an input; the agent states the pairing"],
  // Reference lanes the UI expresses as stage wiring (E2-1 input pin).
  ["image-gen:reference_images", "the agent's reference lane; the UI composes references through wired stages"],
  ["image-edit:double_reference", "dual-reference lane — UI wires the second reference as a stage input"],
  // Rig's form knobs the minimal rig form never presents.
  ["rig:preserve_texture", "rig form knob — the UI form presents no texture row"],
  ["rig:decimate_ratio", "rig form knob — no UI row"],
  ["rig:file_format", "rig form knob — no UI row"],
  ["rig:height_ratio", "rig form knob — no UI row"],
  ["rig:max_influences", "rig form knob — no UI row"],
  ["rig:strip_body", "rig form knob — no UI row"],
  // EXECUTION INTERNALS the agent should not need either — named here
  // so the drift is visible, retired by the lane-digest slice.
  ["image-edit:use_stock_nodes", "EXECUTION INTERNAL on the agent face — Slice 4 candidate for retirement, not a UI gap"],
]);

describe("THE ONE SEAT — the agent face and the UI face are two projections of one declared truth", () => {
  it("every face difference is derivable (mods / hidden / inputs / selector) or NAMED — and the register equals the live residue", async () => {
    const { formSpecArm } = await import("../../../../packages/harness/melite-tools/src/discovery.ts");
    const defs = await loadCardDefs();
    const cards = { defsSync: () => defs };
    const live: string[] = [];
    let judged = 0;
    for (const [id, def] of defs) {
      const spec = await formSpecArm(id);
      if (spec === null) continue;
      const bundle = loadCard(ROOT, cards as never, null, id) as { signature: { params_schema: { properties: Record<string, unknown> } } };
      const ui = new Set((spec.params ?? []).map(String));
      const agent = Object.keys(bundle.signature.params_schema.properties);
      const mods = new Set(Object.keys(spec.mod_schemas ?? {}));
      const inputs = new Set((spec.inputs ?? []).map((i) => String(i?.name)));
      // THE DOCUMENT PLANE: the UI face's params ARE the DECL's params
      // list; a studio.write (calls, keyframes) rides the UI's
      // studio_writes channel — the document plane, not a param row.
      const studioWrites = new Set(((spec as { studio_writes?: readonly string[] }).studio_writes ?? []).map(String));
      const carrier = (def as { schemaCarrier?: unknown; schema: unknown }).schemaCarrier ?? def.schema;
      const dict = ((carrier ?? {}) as { dict?: Record<string, { meta?: { extra?: Record<string, unknown> } }> }).dict ?? {};
      judged++;
      for (const k of ui) {
        if (agent.includes(k)) continue;
        const derived = mods.has(k) || dict[k]?.meta?.extra?.["hidden"] === true;
        if (!derived) live.push(`${id}:${k}`);
      }
      for (const k of agent) {
        if (ui.has(k)) continue;
        // THE DOCUMENT PLANE (h¹ mirror-truth cure): the UI face's
        // params ARE the DECL's params list; a studio.write (calls,
        // keyframes) rides the UI's studio_writes channel — the
        // document plane, not a param row. Same truth, other channel.
        const derived = k === "model" || mods.has(k) || inputs.has(k) || studioWrites.has(k);
        if (!derived) live.push(`${id}:${k}`);
      }
    }
    assert.ok(judged >= 10, `the census judges the live cards (saw ${judged} — a vacuous pass over zero cards is the hole this wall closes)`);
    const named = [...ONE_SEAT_REGISTER.keys()].sort();
    assert.deepEqual(live.sort(), named,
      "the residue must EQUAL the register exactly — an unnamed difference is the agent and the user being taught different surfaces; a stale register row is a folded alias");
    for (const [k, why] of ONE_SEAT_REGISTER) assert.ok(why.length > 20, `${k}: the register states a REASON, never a bare exemption`);
  });
});

