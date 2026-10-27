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
//   7. THE LIVE WALK (the seamless charter, 2026-11-12) — a
//      deterministic minimal agent walks the REAL doors per scenario
//      (discover → load → construct over the real defs, ranking, load
//      plane, and construct grammar) and the wall pins the MEASURED
//      cost (calls / refusals / doc-reads) as the ratchet's first
//      LIVE notch. The census above pins the transcript's history;
//      this arm pins what today's doors COST — the numbers are read
//      from the walk's own counters, so a door that regresses (a new
//      demanded pre-read, a refused first compose) reds here.
//
// Run: npx vitest run --project walls tests/walls/ts/suites/vibe-suite.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { getModel } from "../../../../packages/engines/comfyui-cordis/src/index.ts";
import { laneContractOf } from "../../../../packages/web-kit/contracts/src/laneRelations.ts";
import { searchCards, searchFlows, flowSummaryRows } from "../../../../packages/harness/estate-queue/src/discloseRegistry.ts";
import { fieldsOf } from "@melite/card-base/client";
import { loadCard } from "../../../../packages/harness/estate-queue/src/loadPlane.ts";
import { checkAnimaPromptTags } from "../../../../packages/models/anima/src/promptTags.ts";
import { meliteDiscover } from "../../../../packages/harness/melite-tools/src/tools/melite-discover.ts";
import { meliteLoad } from "../../../../packages/harness/melite-tools/src/tools/melite-load.ts";
import { meliteConstruct } from "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts";
import { skillRead } from "../../../../packages/harness/melite-tools/src/tools/skill-read.ts";
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
    // SLICE 1 RETIRED (audit 013 cure 2, the keyframes row death):
    // the any-frame pin lane is NOT a param — pins live on the
    // timeline's keyframes lane (the document plane), taught by the
    // load bundle's craft hint + digest, never a face row. The agent
    // composes pins by reading the lane, not a param.
    assert.ok(!h3Keys.includes("keyframes"), "the pin lane is OFF the agent face (row death: pins live on the timeline's keyframes lane)");
    // THE SETUP TRUTH (operator 2026-11-12: "NOTICE THE SETUP, THERE
    // IS NO FIRST FRAME NOR LAST FRAME, JUST ARBITRARY FRAMES
    // WHENEVER"): the hidden last_frame alias is OFF the face; the
    // opening pin is a frame-0 shorthand, never a first-frame physics.
    assert.ok(!("last_frame" in h3.signature.params_schema.properties), "the end-anchor alias is gone from the face (add-first retirement)");
    const img = h3.signature.params_schema.properties["image"] as { description?: string };
    assert.doesNotMatch(String(img?.description ?? ""), /First frame/i, "the opening pin is not taught as a first frame");
  });

  it("T1 DIGEST EMIT (audit 013 cure 3b): the load bundle's craft hint carries the hybrid-rails line and names every seat the rails law needs — the pins how-to lives in the digest, not a face row", async () => {
    // THE ROW DEATH'S OTHER HALF: with the keyframes row off the
    // agent face, the load bundle must still TEACH the setup — the
    // card's own craft hint rides the digest (the loadPlane craft
    // seat) with the combinability sentence naming every rail seat:
    // the anchor (image / the timeline's keyframes lane) and the
    // reference stack (ref_images). A hint that drops a seat name
    // strands the agent's second image again — name-sufficiency is
    // the law, not prose presence.
    const defs = await loadCardDefs();
    const cards = { defsSync: () => defs };
    const h3 = loadCard(ROOT, cards as never, null, "h3-timeline") as { craft?: { prompt_hint?: string }; digest?: string };
    const hint = String(h3.craft?.prompt_hint ?? "");
    assert.ok(hint.length > 0, "the h3 load bundle serves the card's craft hint (the digest tier)");
    assert.match(hint, /Two image rails, both live/, "the hybrid-rails combinability sentence rides the served hint");
    assert.match(hint, /keyframes lane/, "the hint names the pins home (the timeline's keyframes lane) — never a face row");
    assert.match(hint, /\bimage\b/, "the hint names the anchor seat");
    assert.match(hint, /ref_images/, "the hint names the reference stack seat — name-sufficiency, not prose");
    assert.ok(typeof h3.digest === "string" && h3.digest.length > 0, "the bundle carries its content digest");
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
          params_schema: { properties: { prompt: {}, seed: {}, ref_images: {} }, required: ["prompt"] },
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
    assert.ok(full.includes("params: prompt*, seed, ref_images (* required)"), "detail=true serves every name (the synthetic face's own rows — the retired pin lane is not one of them)")
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
  // RETIRED 2026-11-12 (the seamless charter's second register
  // shrink): tts:voice, tts:style_instruction, tts:design_prompt,
  // tts:ref_text — all four are LANE-CONDITIONAL rows, declared on
  // the qwen3-tts family's variant/cell rows (customvoice [voice],
  // its 1_7b cell [style_instruction], voicedesign [design_prompt],
  // base [ref_audio, ref_text]). The derivation now reads the
  // served lane contract (the form's own gate) — the rows are
  // UI-carried on their lanes, same declared truth.
  // RETIRED 2026-11-12 (the seamless charter's third register
  // shrink): music:mode — the YUE2 family's declared lane surface
  // carries mode (yue2 DECL params: prompt, lyrics, duration, mode,
  // …), so the lane-contract derivation folds it. Same declared
  // truth, gated per lane. (A visible_when card-row derivation was
  // tried and REVERTED: the form falls back to visible_when only
  // when the family declares NO surface — it over-folded rig's six
  // undeclared knobs.)
  // RETIRED 2026-10-27 (audit 013 cure 2, the ONE SEAT re-cut):
  // rig:mode, rig:preserve_texture, rig:decimate_ratio,
  // rig:file_format, rig:height_ratio, rig:max_influences,
  // rig:strip_body — all seven rows dissolved by the re-cut, the
  // register now EMPTY (zero-tolerance: any future divergence reds).
  // The old arm judged the agent face against DECL.params alone and
  // rig declares no params surface, so every agent-carried knob read
  // as a divergence. The re-cut judges against the RENDERED set
  // (fieldsOf over the served envelope — the generic form IS rig's
  // seat, stage_view null) union DECL.params: the client renders all
  // ten rows, the agent carries all ten — same truth, zero residue.
  // The divergence was the wall judging the wrong surface (the
  // audit's "not DECL.params alone"), never a face gap.
  // EXECUTION INTERNALS the agent should not need either — named here
  // so the drift is visible, retired by the lane-digest slice.
  // RETIRED 2026-11-12 (the seamless charter's first register
  // shrink): image-edit:use_stock_nodes — hidden on the card row
  // (params-emit's hidden law: off BOTH faces), the 2511 DECL
  // surface keeps declaring it (old drafts validate; E9's future-arm
  // witness). The register can only shrink; this row is gone.
]);

describe("THE LIVE WALK — the measured door cost of the ideal path (the ratchet's first LIVE notch)", () => {
  // THE SEAMLESS CHARTER (operator 2026-11-12: "it should be as
  // intuitive for the ai to gen as coding or using tools"): the
  // census pins the TRANSCRIPT's historical burn; nothing measured
  // the composed path LIVE. This arm walks the REAL doors with a
  // deterministic minimal agent — the eval encodes WHAT it wants
  // (the target card and its params, all of them taught by the
  // doors' own served surfaces); the doors decide what that COSTS.
  // REAL: the card defs, the ranking (searchCards/searchFlows), the
  // load plane (loadCard), and the construct grammar (the schema
  // gate, unknown-lane refusal, deriveParams — all judge the walk's
  // first compose for real). STUBBED GREEN: the gateway's CAS bench
  // write and the server-side compile verdict (their friction class
  // is the server's; a minimal green bench write exercises the
  // client grammar every real write rides).
  // THE POLICY OBEYS THE VOICE: when the load voice DEMANDS a
  // pre-compose skill read (the prompting law), the walk pays it —
  // the cost is the DOOR's, never baked away in the policy. The
  // notch below is the ceiling the charter names: three calls, zero
  // refusals, zero doc-reads on every one of the four scenarios.
  const WALK_TARGET = 3; // Ct<=3 — discover, load, construct: one call each

  interface WalkCost { calls: number; refusals: number; docReads: number; landing: string; voice: string[] }

  /** One scenario's walk. @param defs the real card defs (one boot for the whole suite). */
  async function walkScenario(
    defs: Awaited<ReturnType<typeof loadCardDefs>>,
    row: { id: string; sentence: string; card: string; params: Record<string, unknown>; tags?: string },
  ): Promise<WalkCost> {
    const cost: WalkCost = { calls: 0, refusals: 0, docReads: 0, landing: "", voice: [] };
    // THE REAL SEAT LANES: discover and loadCard serve the real
    // planes; the bench lanes carry a minimal CAS bench (rev++
    // per write, the stage appended); runsValidate serves the green
    // verdict the real registry would give a correct compose.
    let benchRev = 0;
    const benchStages: Array<Record<string, unknown>> = [];
    const { estate } = fakeEstate({
      discover: (lookup: string, q: string, tags: string) => ({
        flows: lookup === "cards" ? [] : searchFlows(flowSummaryRows(ROOT), q),
        cards: lookup === "flows" ? [] : searchCards(defs, q, tags),
      }),
      loadCard: (_t: string, name: string) => ({ bundle: loadCard(ROOT, { defsSync: () => defs } as never, null, name) }),
      benchGet: () => ({ rev: benchRev, stages: benchStages }),
      benchEnsure: () => ({ ok: true }),
      benchVerb: (_s: string, verb: string, doc: Record<string, unknown>) => {
        if (verb !== "add_stage") throw new Error(`live walk: bench verb ${verb} is not stubbed (the walk composes once)`);
        benchStages.push({ id: `s_${benchStages.length}`, card: doc["card"], params: doc["params"] ?? {} });
        benchRev += 1;
        return { rev: benchRev, stage: `s_${benchStages.length - 1}` };
      },
      runsValidate: () => ({ ok: true }),
      skillRead: (id: string) => ({ id, text: "# the style law (served body)" }),
    });
    const discover = meliteDiscover(estate, () => {});
    const load = meliteLoad(estate, {});
    const construct = meliteConstruct(estate);
    const skill = skillRead(estate);
    const exec = fakeExec(AbortSignal.timeout(5000));
    const render = (tool: typeof load, args: unknown, value: unknown): string =>
      (tool.output.render(args, value) as Array<{ text?: string }>).map((p) => p?.text ?? "").join("\n");

    // 1. DISCOVER — the user's own sentence is the query (one call;
    // a miss falls back to the modality tag, the door's own taught
    // remedy, and a second miss fails the walk: the door lost the
    // agent).
    cost.calls += 1;
    let dv = await discover.execute({ q: row.sentence }, exec) as { cards?: Array<{ id?: string }> };
    let rows = Array.isArray(dv.cards) ? dv.cards.map((c) => String(c?.id ?? "")) : [];
    if (!rows.includes(row.card)) {
      cost.calls += 1;
      dv = await discover.execute({ q: "", tags: row.tags ?? "video,image,audio" }, exec) as typeof dv;
      rows = Array.isArray(dv.cards) ? dv.cards.map((c) => String(c?.id ?? "")) : [];
    }
    assert.ok(rows.includes(row.card), `${row.id}: discover serves the target card ${row.card} (got: ${rows.slice(0, 5).join(", ")})`);

    // 2. LOAD — the digest first; the walk obeys the voice verbatim.
    cost.calls += 1;
    const lv = await load.execute({ name: row.card, inference_type: "card" }, exec) as { bundle?: unknown; error?: string };
    assert.ok(!lv.error, `${row.id}: the load must not refuse the discovered card (${lv.error})`);
    const digest = render(load, { name: row.card, inference_type: "card" }, lv);
    cost.voice.push(digest);
    const required = /params: \d+ \(required: ([^)]*)\)/.exec(digest)?.[1] ?? "";
    const requiredNames = required === "" || required === "none" ? [] : required.split(", ").map((s) => s.trim());

    // 2a. THE PROMPTING LAW — when the voice DEMANDS a pre-compose
    // skill read, the honest agent pays it (this is the door's cost,
    // not the policy's choice; the craft line that already rode is
    // the door's own cure to make).
    if (/prompting: read the per-model prompt rules/.test(digest)) {
      const demanded = /melite_skill_read: .*/.exec(digest)?.[0] ?? "";
      const id = (/(model:[\w.-]*:prompt-enhance)/.exec(demanded) ?? /.*/.exec(demanded))?.[1] ?? "";
      assert.ok(id !== "", `${row.id}: the demanding voice names a skill id the agent can read`);
      cost.calls += 1;
      cost.docReads += 1;
      await skill.execute({ id }, exec);
    }

    // 2b. NAME SUFFICIENCY — every param the walk composes must be
    // taught by the served surface (the digest's required names, the
    // always-riding agents md, or the craft line); an untaught name
    // costs the detail re-read (a doc-read class cost).
    const untaught = Object.keys(row.params).filter((k) => !requiredNames.includes(k) && !digest.includes(k));
    if (untaught.length > 0) {
      cost.calls += 1;
      cost.docReads += 1;
      const full = await load.execute({ name: row.card, inference_type: "card", detail: true }, exec) as typeof lv;
      const fullVoice = render(load, { name: row.card, inference_type: "card", detail: true }, full);
      cost.voice.push(fullVoice);
      for (const k of untaught) {
        assert.ok(fullVoice.includes(k), `${row.id}: param ${k} is served by the full surface (a name no face teaches is a wall gap)`);
      }
    }

    // 3. CONSTRUCT — the first compose must land (a refusal here is
    // door friction the walk exposes, never retried away).
    // 3a. TAUGHT SEQUENCING (the first real transcript, session
    // 4a849511, 2026-11-12: the agent QUOTED the description —
    // "read … 'the state — always start here' … a good idea before
    // add_stage" — and paid a bench read the bench did not need).
    // The policy obeys the tool's own taught sequencing: when the
    // construct description demands an unconditional pre-read, the
    // walk pays it. The copy cure (start-here scoped to the
    // stage-addressing verbs; add_stage needs no prior read) is
    // proven HERE — the walk's notch is 3, and an inducing copy reds
    // it at 4.
    const constructDesc = String((construct.parameters as { description?: unknown } | undefined)?.description ?? "")
      + String(((construct.parameters as { properties?: Record<string, { description?: string }> } | undefined)?.properties ?? {}).verb?.description ?? "");
    if (/always start here/.test(constructDesc)) {
      cost.calls += 1;
      await construct.execute({ verb: "read" }, exec);
    }
    cost.calls += 1;
    let landing = "";
    try {
      const cv = await construct.execute({ verb: "add_stage", card: row.card, params: row.params }, exec) as Record<string, unknown>;
      if (cv["ok"] === false || typeof cv["error"] === "string" || typeof cv["error_kind"] === "string") {
        cost.refusals += 1;
        assert.fail(`${row.id}: the first compose refused: ${JSON.stringify(cv)}`);
      }
      landing = typeof cv["landing"] === "string" ? cv["landing"] : "(no landing state)";
      assert.equal(benchStages.length, 1, `${row.id}: exactly one stage minted on the shared bench`);
      assert.deepEqual(benchStages[0]?.["card"], row.card, `${row.id}: the minted stage carries the walked card`);
    } catch (e) {
      cost.refusals += 1;
      throw e;
    }
    cost.landing = landing;
    return cost;
  }

  it("all four scenarios walk the real doors at the charter's ceiling: three calls, zero refusals, zero doc-reads", async () => {
    const defs = await loadCardDefs();
    const scenarios = [
      {
        id: "girl", sentence: "Make an image of an anime girl.", card: "image-gen", tags: "image",
        params: { prompt: "1girl, silver hair, school uniform, cherry blossums, soft light" },
      },
      {
        id: "clips", sentence: "Turn this image into the video. I want it to be two short clips combined.", card: "h3-timeline", tags: "video",
        params: { image: "$image1", keyframes: [{ frame: 0, image: "$image1" }, { frame: 48, image: "$image2" }] },
      },
      {
        id: "talk", sentence: "Make this character talk with a cinematic voice.", card: "tts", tags: "audio",
        params: { text: "We were never meant to survive this night.", style_instruction: "cinematic, low, close-mic" },
      },
      {
        id: "upscale", sentence: "Upscale this video to 4K resolution.", card: "upscale-tools", tags: "image",
        params: { input_image: "$image1", resolution: 2160 },
      },
    ];
    for (const row of scenarios) {
      const cost = await walkScenario(defs, row);
      assert.equal(cost.calls, WALK_TARGET, `${row.id}: Ct=${cost.calls} — discover, load, construct, one call each (ceiling Ct<=3)`);
      assert.equal(cost.refusals, 0, `${row.id}: Cr=${cost.refusals} — the first compose lands (Cr=0)`);
      assert.equal(cost.docReads, 0, `${row.id}: Cd=${cost.docReads} — the served surface suffices (Cd=0)`);
      assert.equal(cost.landing, "landed_and_compiling", `${row.id}: the landing names its state`);
    }
  });
});

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
      // THE RENDERED SET (audit 013 cure 2, the ONE SEAT re-cut): the
      // UI face is the card's own envelope projection — fieldsOf over
      // the served doc, the same walk the client panel runs — UNION
      // the served params list (the DECL's names, for the switch
      // verbs). Judging the params list alone starved the wall on
      // schema-declared cards (rig's ten rendered knobs read as
      // divergences; h3's extras ran the register).
      const ui = new Set<string>([...(spec.params ?? []).map(String), ...fieldsOf(spec).map((f) => f.name)]);
      const agent = Object.keys(bundle.signature.params_schema.properties);
      const mods = new Set(Object.keys(spec.mod_schemas ?? {}));
      const inputs = new Set((spec.inputs ?? []).map((i) => String(i?.name)));
      // THE DOCUMENT PLANE: the UI face's params ARE the DECL's params
      // list; a studio.write (calls, keyframes) rides the UI's
      // studio_writes channel — the document plane, not a param row.
      const studioWrites = new Set(((spec as { studio_writes?: readonly string[] }).studio_writes ?? []).map(String));
      // THE LANE-CONDITIONAL ROWS: the family declares some fields not
      // at the top level but on VARIANT and CELL rows (qwen3-tts:
      // customvoice carries [voice], its 1_7b cell adds
      // [style_instruction], voicedesign carries [design_prompt], base
      // carries [ref_audio, ref_text]; yue2's surface carries mode).
      // The UI renders per the RESOLVED family's contract, so a card
      // param named on ANY boarded family's contract renders on that
      // family's lanes — same declared truth, gated per lane. Derived
      // through the SAME shared laneContractOf the form spec serves,
      // over every boarded family (never a second truth).
      const laneParams = new Set<string>();
      for (const fam of (def.boarded ?? [])) {
        let fdecl: unknown = null;
        try { fdecl = getModel(fam); } catch { fdecl = null; }
        if (!fdecl || ((fdecl as { params?: readonly string[] }).params?.length ?? 0) === 0) continue;
        const contract = laneContractOf(fdecl as never) as { base?: readonly string[]; variants?: Record<string, { params?: readonly string[]; cells?: Record<string, { params?: readonly string[] }> }> };
        for (const p of [...(contract.base ?? []), ...Object.values(contract.variants ?? {}).flatMap((v) => [...(v.params ?? []), ...Object.values(v.cells ?? {}).flatMap((c) => [...(c.params ?? [])])])]) laneParams.add(String(p));
      }
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
        const derived = k === "model" || mods.has(k) || inputs.has(k) || studioWrites.has(k) || laneParams.has(k);
        if (!derived) live.push(`${id}:${k}`);
      }
    }
    assert.ok(judged >= 10, `the census judges the live cards (saw ${judged} — a vacuous pass over zero cards is the hole this wall closes)`);
    const named = [...ONE_SEAT_REGISTER.keys()].sort();
    assert.deepEqual(live.sort(), named,
      "the residue must EQUAL the register exactly — an unnamed difference is the agent and the user being taught different surfaces; a stale register row is a folded alias. Zero rows today (the audit 013 cure 2 re-cut): ANY entry here is a live face divergence — name it with its reason and fix the face, never grow the register to admit it.");
    for (const [k, why] of ONE_SEAT_REGISTER) assert.ok(why.length > 20, `${k}: the register states a REASON, never a bare exemption`);
  });
});

describe("THE SKILL BODY LAW — body copy induces calls; the landing's compile verdict is the law", () => {
  // Real-transcript evidence (session bf398803, two-clips): the agent
  // ran a redundant validate BECAUSE the skill's compose loop said
  // "Run melite_construct validate" as an unconditional numbered step —
  // its own trace quotes the add_stage verdict ("compiles ✓ (no
  // validate call needed)") right before obeying the skill anyway.
  // Bodies are served verbatim by skillRead, so the source file IS the
  // served surface here; this sweep is the honest depth for body copy.
  const skillFiles: string[] = [];
  const walk = (dir: string) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === "lib" || ent.name === "dist") continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name === "SKILL.md") skillFiles.push(p);
    }
  };
  walk(join(ROOT, "packages"));

  it("no skill body instructs an unconditional validate — a line teaching validate must defer to the landing's verdict", () => {
    assert.ok(skillFiles.length >= 3, `the sweep sees the estate's skill bodies (saw ${skillFiles.length} — a vacuous pass over zero files is the hole this closes)`);
    const unconditional: string[] = [];
    for (const f of skillFiles) {
      const body = readFileSync(f, "utf8");
      for (const line of body.split("\n")) {
        if (!/validate/.test(line) || !/melite_construct/.test(line)) continue;
        const conditional = /only|needs no second opinion|did not just write/.test(line);
        if (!conditional) unconditional.push(`${f}: ${line.trim()}`);
      }
    }
    assert.deepEqual(unconditional, [],
      "a body line teaching `validate` without a deferral condition induces redundant calls — the write's own verdict already carries the compile state");
  });

  it("the cured bodies carry the deferral (the receipt's toggle anchor)", () => {
    const video = skillFiles.find((f) => f.includes("video-timeline"));
    const directing = skillFiles.find((f) => f.includes("directing"));
    assert.ok(video && directing, "the two bodies the two-clips trace cited exist");
    assert.match(readFileSync(video, "utf8"), /needs no second opinion/,
      "video-timeline: the compose loop defers to the landing's verdict");
    assert.match(readFileSync(directing, "utf8"), /needs no second opinion/,
      "directing: the validate-and-repair loop defers to the landing's verdict");
  });

  it("no served surface DEMANDS a skill pre-read — the door's craft-defer law is the one teacher (real-transcript evidence: the girl session's Cd=1)", () => {
    // The craft-defer cure fixed the DOOR line, but the real girl
    // session (4a849511) paid its skill read because TWO more homes
    // still demanded it: the prompt-enhance tier-1 line ("read before
    // writing an anima prompt") and the family AGENT.md's "Read
    // before writing a prompt" section. A conflict between the door's
    // law and a taught demand IS the friction — every home must defer.
    const agentMdFiles: string[] = [];
    const walkMd = (dir: string) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === "node_modules" || ent.name === "lib" || ent.name === "dist") continue;
        const p = join(dir, ent.name);
        if (ent.isDirectory()) walkMd(p);
        else if (ent.name === "AGENT.md") agentMdFiles.push(p);
      }
    };
    walkMd(join(ROOT, "packages"));
    assert.ok(agentMdFiles.length >= 6, `the sweep sees the estate's agent docs (saw ${agentMdFiles.length})`);
    const demands: string[] = [];
    for (const f of [...skillFiles, ...agentMdFiles]) {
      for (const line of readFileSync(f, "utf8").split("\n")) {
        if (!/(read|reading)\s+before\s+(writing|composing)|before\s+you\s+(write|compose)/i.test(line)) continue;
        demands.push(`${f}: ${line.trim()}`);
      }
    }
    assert.deepEqual(demands, [],
      "a taught 'read before writing' demand induces the very pre-read the door's craft-defer law retired — the craft line is the law, skills deepen it when the ask is unusual");
  });
});

