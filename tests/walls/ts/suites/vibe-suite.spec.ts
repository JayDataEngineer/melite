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
//   3. load-face (T1/T8) — the live load face serves 11 image-gen params
//      and 50+ h3-timeline params; the any-frame lane rides it and the
//      hidden `last_frame` alias is off it (slices 1/4 + the 2026-11-12
//      setup truth: "NO FIRST FRAME NOR LAST FRAME, ARBITRARY FRAMES
//      WHENEVER"). The digest re-cut the dump arm.
//   4. verb-guard (P5, persists) — a call with no verb refuses at the
//      SCHEMA gate (slice 5: the verb is required; a payload never
//      derives a verb and a bare call is not exempt).
//   5. t4-voice (T4) — the load voice names a tool the mode owns. The
//      agent-mode contract bans `melite_flow`; the render already
//      branches on `opts.headless`, so the arm renders BOTH modes and
//      judges the sentences (slice 2 re-cut the source-text pin — a
//      string in a file is not a voice).
//   6. first-door grammar + landing states (T7/T6, slice 5) — the
//      construct restores a declared ARRAY lane AT THE WRITE and echoes
//      the derivation, refuses an undeclared input lane by name, and
//      names its landing state (landed_and_compiling |
//      landed_not_compiling + structured remedy | ambiguous_no_write).
//
// Run: npx vitest run --project walls tests/walls/ts/suites/vibe-suite.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { searchCards } from "../../../../packages/harness/estate-queue/src/discloseRegistry.ts";
import { loadCard } from "../../../../packages/harness/estate-queue/src/loadPlane.ts";
import { checkAnimaPromptTags } from "../../../../packages/models/anima/src/promptTags.ts";
import { meliteLoad } from "../../../../packages/harness/melite-tools/src/tools/melite-load.ts";
import { meliteConstruct } from "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts";
import { fakeEstate, fakeEstateRecorded } from "../../../../packages/harness/melite-tools/test/fake-estate.ts";
import { fakeExec } from "../../../../packages/harness/melite-tools/test/fake-exec.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

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

  it("T3 CURED (slice 3): the transcript's query finds the card AND says why — ranked facets, never a literal AND", async () => {
    const defs = await loadCardDefs();
    // THE BURN (transcript step 1): discover("anime", tags=image) → 0
    // rows; the agent then dumped 12 params on a bench trial. The tag
    // facet is a HARD filter and the row now rides with its WHY.
    const tagged = searchCards(defs, "anime", "image");
    const gen = tagged.find((r) => r.id === "image-gen");
    assert.ok(gen, "tags=image keeps the image cards even when no q token matches");
    assert.match(gen.matched_by, /tags=image/, "the WHY names the facet that kept the row");
    // the user's own sentence is the query — stopwords drop, the
    // modality word scores, and image-gen ranks with its reason
    const sentence = searchCards(defs, "Make an image of an anime girl.", "");
    const hit = sentence.find((r) => r.id === "image-gen");
    assert.ok(hit, "the full user sentence finds image-gen (the transcript's 10-call burn)");
    assert.match(hit.matched_by, /tag:image|modality:image/, "the WHY names the matched facet, never a bare row");
    assert.equal(sentence[0]?.id, "image-gen", "the modality ask ranks image-gen first");
    // a genuinely unrelated ask still answers zero — ranking is not noise
    assert.deepEqual(searchCards(defs, "zzz-no-such-thing", "").map((r) => r.id), []);
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
    // THE SETUP TRUTH (operator 2026-11-12: "NOTICE THE SETUP, THERE
    // IS NO FIRST FRAME NOR LAST FRAME, JUST ARBITRARY FRAMES
    // WHENEVER"): the hidden last_frame alias is OFF the face; the
    // opening pin is a frame-0 shorthand, never a first-frame physics.
    assert.ok(!("last_frame" in h3.signature.params_schema.properties), "the end-anchor alias is gone from the face (add-first retirement)");
    const img = h3.signature.params_schema.properties["image"] as { description?: string };
    assert.doesNotMatch(String(img?.description ?? ""), /First frame/i, "the opening pin is not taught as a first frame");
  });

  it("T1/T8 DIGEST (slice 4): the load face serves counts by default and the FULL surface only on request", () => {
    // THE BURN (transcript): image-gen's load dumped 12 params + a
    // ~200-word bench grammar; h3's dumped 49 params. The digest
    // serves the routing facts (counts, required, kinds, skills,
    // digest); detail=true keeps the old surface for the moment
    // composition needs exact names.
    const value = {
      name: "h3-timeline", inference_type: "card",
      bundle: {
        kind: "card", name: "h3-timeline", digest: "d1",
        signature: {
          params_schema: { properties: { prompt: {}, seed: {}, keyframes: {} }, required: ["prompt"] },
          lanes: { h3: { base: ["prompt"] } },
          modifiers: [{ kind: "loras", category: "ordered", fields: ["name", "strength"] }],
        },
      },
    }
    const voice = (detail: boolean): string => {
      const parts = meliteLoad({} as never, {}).output.render(
        { name: "h3-timeline", inference_type: "card", ...(detail ? { detail: true } : {}) },
        value as never,
      ) as Array<{ text?: string }>
      return parts.map((p) => p?.text ?? "").join("\n")
    }
    const digest = voice(false)
    assert.match(digest, /params: 3 \(required: prompt\) — detail=true for every name/, "the digest states the count + required, not 3 names")
    assert.ok(!digest.includes("params: prompt*, seed, keyframes"), "the default never dumps every name")
    assert.ok(!digest.includes("THE BENCH GRAMMAR"), "the 200-word bench grammar is deferred")
    assert.match(digest, /lanes: 1 declared \(h3\)/, "the lane digest names the declared families")
    assert.match(digest, /mods: 1 declared \(loras\[\]\)/, "the mods digest names the kinds")
    assert.match(digest, /digest: d1 \(quote it to skip a reload\)/)
    const full = voice(true)
    assert.ok(full.includes("params: prompt*, seed, keyframes (* required)"), "detail=true serves every name (the keyframes lane included)")
    assert.ok(full.includes("THE BENCH GRAMMAR"), "detail=true serves the bench grammar")
    assert.ok(full.includes("lane h3:"), "detail=true serves the lane field law")
  });

  it("VERB GUARD (slice 5): the verb is REQUIRED in the schema — a call without it refuses at the gate, never reads", async () => {
    const { estate, seen } = fakeEstate({});
    const tool = meliteConstruct(estate);
    assert.deepEqual(
      (tool.parameters as { required?: string[] }).required,
      ["verb"],
      "the schema marks verb required (grammar in the schema beats silent semantics)",
    );
    await assert.rejects(
      tool.execute({} as never, fakeExec(AbortSignal.timeout(2000))),
      /missing required property "verb"/,
      "a bare call refuses before execute — the silent read default is dead",
    );
    assert.equal(seen.length, 0, "nothing was read");
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

  it("T7 CURED (slice 5): a declared ARRAY lane is restored AT THE WRITE — the spell never reaches run admission as a string", async () => {
    // THE BURN (transcript step 7): `ref_images: "$ref_images"` passed
    // compose and compile (the lattice coerces IN MEMORY) and refused
    // only at RUN admission — "ref_images must be an ARRAY". The bench
    // is the durable truth, so the door must store the array.
    const seen: Array<{ lane: string; args: unknown[] }> = [];
    const { estate } = fakeEstateRecorded(seen, (lane, args) => {
      if (lane === "benchVerb" && args[1] === "add_stage") return { rev: 8, stage: "s_0" };
      if (lane === "benchGet") {
        return { session: "main", rev: 8, intent: "", log: [], stages: [{ id: "s_0", card: "h3-timeline", params: { ref_images: ["$ref_images"] } }] };
      }
      if (lane === "runsValidate") return { ok: true };
      throw new Error("unmocked lane " + lane);
    });
    const out = await meliteConstruct(estate).execute({
      verb: "add_stage", card: "h3-timeline",
      params: { model: "minimax-h3", prompt: "a cat", ref_images: "$ref_images" },
      inputs: { ref_images: { initial: "ref_images" } },
      expect_rev: 7,
    } as never, fakeExec(AbortSignal.timeout(5000))) as Record<string, unknown>;
    const write = seen.find((r) => r.lane === "benchVerb" && r.args[1] === "add_stage");
    assert.ok(write, "the stage was written");
    const params = (write.args[2] as Record<string, unknown>)["params"] as Record<string, unknown>;
    assert.deepEqual(params["ref_images"], ["$ref_images"], "the bench stores the ARRAY the run admits (H7 cured at the first door)");
    const derived = out["applied_derivations"] as Array<Record<string, unknown>>;
    assert.equal(derived?.[0]?.["param"], "ref_images");
    assert.equal(derived?.[0]?.["rule"], "spell-to-array", "the derivation names the law that fired");
    assert.equal(out["landing"], "landed_and_compiling");
  });

  it("T6 CURED (slice 5): an undeclared input lane REFUSES by name, naming the card's declared lanes", async () => {
    // THE BURN (H6): the estate's refusals spoke internal vocabulary.
    // A lane the card never declares is fed by nothing the run's kind
    // pass knows — silent text-only render. The door names the lanes
    // it DOES accept, in the same words the card's own face uses.
    const seen: Array<{ lane: string; args: unknown[] }> = [];
    const { estate } = fakeEstateRecorded(seen, (lane) => {
      throw new Error("unmocked lane " + lane);
    });
    const out = await meliteConstruct(estate).execute({
      verb: "add_stage", card: "h3-timeline",
      params: { model: "minimax-h3", prompt: "x" },
      inputs: { reference_images: { initial: "reference_images" } },
    } as never, fakeExec(AbortSignal.timeout(5000))) as Record<string, unknown>;
    assert.equal(out["ok"], false);
    assert.equal(out["error_kind"], "unknown-lane");
    assert.match(String(out["error"]), /"reference_images" is not a port of card "h3-timeline"/);
    assert.match(String(out["error"]), /ref_images/, "the refusal names the declared lanes");
    assert.deepEqual(out["allowed_lanes"], ["image", "last_frame", "ref_images", "ref_videos", "ref_audios"]);
    assert.equal(seen.length, 0, "a refused lane never reaches the bench");
  });

  it("T7 CURED (slice 5): the three landing states are distinct — compiling, landed-but-refused (+ remedy), unproven", async () => {
    // The transcript's most confusing state: the write LANDED and the
    // compile refused, but the answer said only "rev N". The door now
    // names all three states, and a card-schema violation rides a
    // structured remedy the agent can act on without decoding prose.
    const refusedSeen: Array<{ lane: string; args: unknown[] }> = [];
    const refused = fakeEstateRecorded(refusedSeen, (lane) => {
      if (lane === "benchVerb") return { rev: 8, stage: "s_0" };
      if (lane === "benchGet") {
        return { session: "main", rev: 8, intent: "", log: [], stages: [{ id: "s_0", card: "h3-timeline", params: { model: "minimax-h3", prompt: "x", steps: 35 } }] };
      }
      if (lane === "runsValidate") return { ok: false, error: 'flow "bench" stage "s_0": card "h3-timeline" schema refused body — $.steps expected number between 4 and 30' };
      throw new Error("unmocked lane " + lane);
    });
    const landed = await meliteConstruct(refused.estate).execute({
      verb: "add_stage", card: "h3-timeline",
      params: { model: "minimax-h3", prompt: "x", steps: 35 }, expect_rev: 7,
    } as never, fakeExec(AbortSignal.timeout(5000))) as Record<string, unknown>;
    assert.equal(landed["landing"], "landed_not_compiling", "the stage is ON the bench — the refusal is a closable value");
    assert.deepEqual(landed["remedy"], { public_param: "steps", current_value: 35, allowed_values: [4, 30] }, "the cure is data, not prose");
    // the unproven state: the seat failed after the call left
    const broken = fakeEstateRecorded([], (lane) => {
      throw new Error("socket closed after send");
    });
    const unproven = await meliteConstruct(broken.estate).execute({
      verb: "patch", stage: "s1", params: { p: 2 }, expect_rev: 6,
    } as never, fakeExec(AbortSignal.timeout(5000))) as Record<string, unknown>;
    assert.equal(unproven["landing"], "ambiguous_no_write", "a transport failure never implies a clean no-op");
  });
});

// ── SLICE 6 — THE CARD OWNS ITS CRAFT (H5's adjudicated split): the
// formatting law is card-owned PREPROCESSING applied at the write door,
// and the content style is ONE line the load digest serves. A
// preprocessor fixes spacing; it cannot invent the tags.
describe("THE CARD-OWNED CRAFT (slice 6) — the write door restores the look's declared spelling and the digest serves the style line", () => {
  it("T5 CURED (slice 6): the anima look's tag grammar is restored AT THE WRITE and the digest serves the card's one-line style law", async () => {
    // THE BURN (H5, transcript + the 2026-10-02 break): the agent read
    // the anima manual per request — and once skipped it, writing prose
    // to a tag-trained model. The card now owns both halves.
    const defs = await loadCardDefs();
    const cards = { defsSync: () => defs };
    const bundle = loadCard(ROOT, cards as never, null, "image-gen") as {
      craft?: { prompt_hint?: string };
      signature: { params_schema: { properties: { model?: { enum?: string[] } } } };
    };
    const animaValue = (bundle.signature.params_schema.properties.model?.enum ?? [])
      .find((v) => v.startsWith("anima:"));
    assert.ok(animaValue, "the served model face offers an anima look");
    // (1) THE CONTENT LINE — the digest serves the card's declaration.
    const parts = meliteLoad({} as never, {}).output.render(
      { name: "image-gen", inference_type: "card" },
      { name: "image-gen", inference_type: "card", bundle } as never,
    ) as Array<{ text?: string }>;
    const digest = parts.map((p) => p?.text ?? "").join("\n");
    assert.equal(typeof bundle.craft?.prompt_hint, "string", "the bundle carries the card's own declaration (never a frozen copy)");
    assert.match(digest, /prompt style: .*danbooru tags/, "the digest states the look's content style in ONE line (no craft doc read)");
    // (2) THE FORMATTING LAW — the write stores the declared spelling.
    const seen: Array<{ lane: string; args: unknown[] }> = [];
    const { estate } = fakeEstateRecorded(seen, (lane, args) => {
      if (lane === "benchVerb" && args[1] === "add_stage") return { rev: 3, stage: "s_0" };
      if (lane === "benchGet") {
        return { session: "main", rev: 3, intent: "", log: [], stages: [{ id: "s_0", card: "image-gen", params: { model: animaValue, prompt: "1girl, long hair, smile" } }] };
      }
      if (lane === "runsValidate") return { ok: true };
      throw new Error("unmocked lane " + lane);
    });
    const out = await meliteConstruct(estate).execute({
      verb: "add_stage", card: "image-gen",
      params: { model: animaValue, prompt: "1girl,long_hair,,smile" },
      expect_rev: 2,
    } as never, fakeExec(AbortSignal.timeout(5000))) as Record<string, unknown>;
    const write = seen.find((r) => r.lane === "benchVerb" && r.args[1] === "add_stage");
    assert.ok(write, "the stage was written");
    const stored = (write.args[2] as Record<string, unknown>)["params"] as Record<string, unknown>;
    assert.equal(stored["prompt"], "1girl, long hair, smile", "the bench stores the look's declared spelling (H5 cured at the write door)");
    const rules = ((out["applied_derivations"] as Array<Record<string, unknown>> | undefined) ?? []).map((d) => d["rule"]);
    assert.ok(rules.includes("craft:tag-separator"), "the echo names the separator rule that fired");
    assert.ok(rules.includes("craft:tag-underscore-space"), "the echo names the underscore rule that fired");
    // the restored prompt is what the family's own refusal door accepts —
    // the preprocessor and the judge agree on the grammar.
    assert.doesNotThrow(() => checkAnimaPromptTags("prompt", String(stored["prompt"])), "the restored spelling passes the family's own grammar door");
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

