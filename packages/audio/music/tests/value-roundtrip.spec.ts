// value-roundtrip.spec.ts — THE MUSIC PROMPT VALUE ARMS (purge plan
// P2 pre-registration, 2026-11-08).
//
// THE BURN (dev_docs/ERRORS.md, bottom): "WHEN I PUT A LONG ROCK AND
// ROLL PROMPT INTO MUSIC, IT IGNORES MY PROMPT" — the silent UI drop
// class: an operator-stated value crosses [4] the compose door and
// never lands at [5] the serialized graph's consumer input, and every
// suite stays green. THE SPEC is the purge plan's P2 (audit
// dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §7 P2, the
// round-trip VALUE law): every served knob is re-read FROM the
// composed graph AT THE CONSUMER's input — the prompt STRING at the
// text-encode node's text input — never presence/shape alone.
//
// THE HOPS each arm witnesses (journey law §2): [4] compose door →
// [5] serialized graph. The card-level arms ride the card def's REAL
// compose (loadCardDefs — the estate's own composition table — the
// exact `def.compose` the run door's composeOnce dispatches to:
// estate-queue/src/cardsCompose.ts:126 → ComfyUIService.compose →
// def.compose). The through-door arms ride phase1Card + phase2Card
// (estate-queue/src/cardsRegistry.ts:1663/:1754 — the same walk the
// runs {model:} door and the validate seat serve), hermetically
// booted (the tracked boot double carries the music classes —
// tests/walls/fixtures/object_info.boot.json, unlike the min fixture
// the walls' KEY JUDGE reads, which carries none: audit D5).
//
// PRE-REGISTERED REDS (the deliverable — CURED 2026-11-08 in 821475e43,
// which landed the mode+lyrics cures BEFORE this wall: the arms below
// went green first-run over the cured tree, and now witness the cure):
// B2-mode (was D1: `mode` a dead knob on music3), B2-lyrics (was D2:
// lyrics unwireable on the flow face, flowsRegistryRows.ts seats
// :336/:372-375/:386). Arms that hold green are
// marked `// ALREADY GREEN` with the audit verdict they carry — the
// missing piece there was the WALL (this file now is it), not the
// carriage. ARM 6 (2026-11-08, SD-6's numerics) is the same class:
// stated duration/steps/guidance/lm_cfg/seed rode correctly but NO
// pin witnessed them at the consumer — the wall IS the deliverable,
// and its 4d/4e corruption twins are its red-proof (they corrupt and
// require the arm's own matcher to fire). Each arm's comment names
// the hop it witnesses and the burn it kills. NO SOURCE FILE IS
// FIXED HERE — tests first; the cure lands against these reds.
//
// Run: npx vitest run packages/audio/music/tests/value-roundtrip.spec.ts

// THE HERMETIC ENGINE, FIRST IMPORT (the boot-models first-import
// law): the door arms prime a CardRegistryService, and prime()
// fetches /object_info — the mock registers before any estate barrel
// evaluates, so no path in this file can dial a live engine.
import "../../../../tests/helpers/hermetic-engine.ts";
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts";
// THE MODELS BOOT, SECOND (the per-file boot brick — the served
// families table the card defs and the facts rows resolve through).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
// THE CORRUPTION SEAM (arm 4): the card's own action bindings — the
// dispatch table compose reads at call time (card.ts:103), so a
// temporarily swapped row is the compose step itself, corrupted.
import { ACTION_BINDINGS } from "../src/card.ts";
import { DECL as music3Decl } from "@melite/models-music3";
import { DECL as yue2Decl } from "@melite/models-yue2";
// THE DOOR (arms 2c/4c/5) and the FLOW ROW (arm 3) — source-relative,
// the walls-suite import shape (cards-lane-law precedent). The
// `import type {}` rides for the Context.queue augmentation the
// registry source reads (the card-compose-liveness precedent).
import { CardRegistryService } from "../../../harness/estate-queue/src/cardsRegistry.ts";
import type {} from "../../../harness/estate-queue/src/service.ts";
import { FlowsSeatService } from "../../../harness/estate-queue/src/flowsData.ts";
import { MUSIC_NATIVE } from "../../../harness/estate-queue/src/flowsRegistryRows.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

// ── THE STATED VALUES (the operator's own words, long and
// distinctive, carrying sentinel tokens — a partial or mutated carry
// fails the verbatim equality; a dropped one fails the find). ──
const PROMPT =
  "LONG ROCK AND ROLL ANTHEM — screaming guitars over double-kick drums, a hoarse " +
  "frontman rasping the chorus, three key changes, a stadium-sized bridge, and an " +
  "outro that dies on one sustained power chord. Sentinel ZZQ-7391-ROCK, take 14, mixed hot.";
assert.ok(PROMPT.length >= 200, "the stated prompt is the LONG kind the operator burned");
const LYRICS =
  "[verse]\nThe center-field lights burn ZZQ-LYRIC-4417 tonight\n" +
  "[chorus]\nHold the line, hold the wire, the amps are catching fire\n" +
  "[bridge]\nOne chord, one breath, the whole stadium says yes";
const RUN_CARD = "value_arms_hop4"; // the card-level compose's run id
const RUN_DOOR = "value_arms_hop5"; // the door compose's run id

// ── THE CONSUMER CLASSES (the real text-encode nodes the DECLs'
// compose actions wire — the truth the walk judges against, cited
// from src): music3's MiniMaxMusic3TextEncode reads caption+lyrics
// (packages/models/music3/src/actions.ts:63-71); yue2's
// YuE2GenerateABC + YuE2GenerateMusic read style+lyrics+mode
// (packages/models/yue2/src/actions.ts:68-78). Never a loose
// "somewhere in the JSON" — the class IS the assertion. ──
const MUSIC3_TEXT_ENCODE = "MiniMaxMusic3TextEncode";
const YUE2_ABC = "YuE2GenerateABC";
const YUE2_MUSIC = "YuE2GenerateMusic";

/** The serialized graph's node rows, as every arm reads them. */
type Graph = Record<string, { class_type?: unknown; inputs?: Record<string, unknown> }>;

/** The graph nodes of one class, with their inputs (the consumer
 *  find — presence AND class in one predicate). */
function nodesOf(graph: Graph, cls: string): Array<{ id: string; inputs: Record<string, unknown> }> {
  const out: Array<{ id: string; inputs: Record<string, unknown> }> = [];
  for (const [id, node] of Object.entries(graph)) {
    if (node !== null && typeof node === "object" && node.class_type === cls && node.inputs !== undefined) {
      out.push({ id, inputs: node.inputs });
    }
  }
  return out;
}

/**
 * THE NUMERIC LAW (P2's judge for numbers): the stated number rides
 * the composed graph VERBATIM at the named consumer input of the
 * named node class. Same voice as the string law above, numeric
 * equality.
 */
function assertNumAtConsumer(
  graph: Graph,
  cls: string,
  input: string,
  stated: number,
  what: string,
): string {
  const nodes = nodesOf(graph, cls);
  assert.ok(nodes.length > 0,
    `${what}: no node of class '${cls}' in the composed graph — the DECL-wired consumer never composed (hop [5])`);
  for (const node of nodes) {
    const saw = node.inputs[input];
    if (saw === stated) return node.id;
    assert.fail(
      `${what.toUpperCase()} VALUE ARM (hop [5], the consumer's input): node '${node.id}' (${cls}) input ` +
      `'${input}' did not carry the stated number verbatim — ` +
      (saw === undefined
        ? "the input is absent entirely"
        : typeof saw === "number"
          ? `expected ${stated}, saw ${saw}`
          : `expected a number, saw ${typeof saw}`) +
      ` — the stated number never reached the engine's consumer (THE SILENT UI DROP, ERRORS.md bottom)`,
    );
  }
  return ""; // unreachable — every loop arm above either returns or fails
}

/** THE VALUE LAW (P2's judge): the stated value rides the composed
 *  graph VERBATIM at the named consumer input of the named node
 *  class. A dropped, truncated, or mutated carry refuses here, with
 *  the hop and the node named. Returns the witness node id (arms
 *  chain further asserts off it).
 *  @param graph the serialized graph (the run door's hop-[5] bytes)
 *  @param cls the consumer node class the DECL's action wires
 *  @param input the consumer's text input the value lands in
 *  @param stated the value the operator stated, verbatim
 *  @param what the arm's name for the value (the failure's voice) */
function assertValueAtConsumer(
  graph: Graph,
  cls: string,
  input: string,
  stated: string,
  what: string,
): string {
  const nodes = nodesOf(graph, cls);
  assert.ok(nodes.length > 0,
    `${what}: no node of class '${cls}' in the composed graph — the DECL-wired consumer never composed (hop [5])`);
  for (const node of nodes) {
    const saw = node.inputs[input];
    if (saw === stated) return node.id;
    assert.fail(
      `${what.toUpperCase()} VALUE ARM (hop [5], the consumer's input): node '${node.id}' (${cls}) input ` +
      `'${input}' did not carry the stated value verbatim — ` +
      (saw === undefined
        ? "the input is absent entirely"
        : typeof saw === "string"
          ? `expected ${stated.length} chars, saw ${saw.length}: ${JSON.stringify(saw.slice(0, 80))}…`
          : `expected a string, saw ${typeof saw}`) +
      ` — the stated value never reached the engine's consumer (THE SILENT UI DROP, ERRORS.md bottom)`,
    );
  }
  return ""; // unreachable — every loop arm above either returns or fails
}

// ── the shared seats: the card def (arms 1–4) and the estate door
// (arms 2c/4c/5), booted once, hermetically. ──
let def: CardDefinition;
let music3: ModelFacts;
let yue2: ModelFacts;
let door: CardRegistryService;

/** Compose through the card def's REAL path (the schema walk then
 *  def.compose — the service's own order, service.ts:943-1031) and
 *  return the serialized graph. */
function composeCard(doc: Record<string, unknown>, model: ModelFacts, runId: string): Graph {
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

beforeAll(async () => {
  def = (await loadCardDefs()).get("music")!;
  assert.ok(def, "the composition root serves the music card");
  music3 = facts.models.music3!;
  yue2 = facts.models.yue2!;
  assert.ok(music3 !== undefined && yue2 !== undefined, "both boarded music families serve facts rows");
  // THE DOOR BOOT (the hermetic seat, cards-lane-law's proven shape):
  // the queue stub pins a temp tree (the J12 manifest), the registry
  // primes through the mocked liveObjectInfo, and the lane store
  // overlay materializes the DECLared music weights so the lane
  // presence gate judges the DECLared store, never this machine's.
  const ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "music-value-arms-")),
    stateRoots: [] as string[],
  };
  door = new CardRegistryService(ctx);
  await door.prime();
  assertHermeticRode();
  const storeRoot = installLaneStoreOverlay();
  // THE FP16 SEAT (audit 014 C5): the atom's body is the template's
  // own fp16 DiT — provisioned (DECL provisions row) but not yet
  // downloaded on this machine, so the mirrored store lacks it and
  // the door's presence gate would refuse before any compose runs.
  // The overlay's own technique (its header: only existence is
  // faked; no run ever loads these bytes in a compose spec)
  // materializes the provisioned row inside the hermetic temp root
  // — the value arms judge values, never presence, and the presence
  // judgment itself stays owned by cards-lanes.spec's fixture
  // world. A removed provision row reds the DECL pin, not this
  // seat; a present file rides through untouched (existsSync).
  const fp16Seat = join(storeRoot, "data", "runtime", "comfyui", "models", "diffusion_models", "minimax_music3_dit_fp16.safetensors");
  if (!existsSync(fp16Seat)) {
    mkdirSync(dirname(fp16Seat), { recursive: true });
    writeFileSync(fp16Seat, "");
  }
}, 120_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

// ── ARM 1 — THE PROMPT VERBATIM ARM ────────────────────────────────
// Hop [4]→[5]. Kills: the operator's B2 prompt burn, at the consumer.
// The LONG prompt the operator typed must be the exact string the
// engine's text-encode reads — never a truncated, defaulted, or
// presence-only carry.
describe("ARM 1 — the stated prompt rides VERBATIM to the text-encode consumer (hop [4]→[5])", () => {
  it("music3: MiniMaxMusic3TextEncode.caption carries the LONG rock-and-roll prompt byte-for-byte", () => {
    // THE REAL COMPOSE PATH: the card def the run door dispatches to
    // (cardsCompose.ts:126 → ComfyUIService.compose → def.compose →
    // ACTION_BINDINGS[music3] → instantiateAction → the DECL's
    // action build, music3/src/actions.ts:58-88). The consumer input
    // is `caption` (actions.ts:65) — the string the engine encodes.
    const graph = composeCard({ prompt: PROMPT, lyrics: LYRICS, seed: 4242 }, music3, RUN_CARD);
    const encodeId = assertValueAtConsumer(graph, MUSIC3_TEXT_ENCODE, "caption", PROMPT, "prompt (music3)");
    // THE NODE CLASS TOO (never a loose JSON hit): the witness is the
    // DECL-wired text-encode, and the sampler's positive wire lands
    // on ITS output — the conditioning the engine actually samples.
    assert.equal(graph[encodeId]!.class_type, MUSIC3_TEXT_ENCODE);
    const ks = nodesOf(graph, "KSampler");
    assert.ok(ks.length === 1 && Array.isArray(ks[0]!.inputs["positive"]),
      "the KSampler positive input wires the encode (the consumer chain)");
    assert.equal((ks[0]!.inputs["positive"] as unknown[])[0], encodeId,
      "the sampled conditioning IS the caption's node — the prompt drives the sample");
  });

  it("yue2: BOTH style consumers (YuE2GenerateABC + YuE2GenerateMusic) carry the same stated prompt", () => {
    // The yue2 DECL wires the prompt to `style` on both consumers
    // (yue2/src/actions.ts:69,75 — the ABC plan AND the conditioner).
    const graph = composeCard({ prompt: PROMPT, lyrics: LYRICS, seed: 4242 }, yue2, RUN_CARD);
    assertValueAtConsumer(graph, YUE2_ABC, "style", PROMPT, "prompt (yue2/ABC)");
    assertValueAtConsumer(graph, YUE2_MUSIC, "style", PROMPT, "prompt (yue2/music)");
  });

  // ALREADY GREEN (the audit's §2.2 verdict holds at the card seam):
  // "no live silent-drop for the prompt on [3]→[5] — promptless
  // states refuse LOUD" (card.ts:92-94 + the DECL's relations.required,
  // music3/index.ts:134-141, walled by cards-lane-law GAP-7). The
  // caption ride was pinned by card.spec.ts:66 — with SHORT strings.
  // These arms now pin the LONG kind the operator actually burns, and
  // arm 4a below proves they red on corruption (value arms, not
  // presence arms). The live drop the audit could not find at this
  // hop is not re-found here: the reds this file pre-registers live
  // on the OTHER seats (arms 2/3).
});

// ── ARM 2 — THE MODE KNOB ARM (B2-mode; the audit's D1, CURED 821475e43) ─
// Hop [4]→[5] (+ hop [3]→[4] through the door in the door twin). The
// DECL truth WAS: BOTH music DECLs declared `mode` a served param;
// the yue2 action READ it (yue2 actions.ts planner node + mode
// inputs) while the music3 action's params row OMITTED it and its
// build never read it. The card schema admitted mode on every model
// (visible_when is a UI render hint), so a draft stating mode at
// music3 — e.g. authored on yue2, then the model switched (the SD-1
// scalar-switch wedge) — was ADMITTED, HIDDEN, and UNREAD. The class
// law a stated knob owes: fire at a consumer, or refuse LOUD naming
// the knob (the B4 voice). Silence was the burn.
// THE CURE (821475e43, both layers): the music3 DECL dropped mode
// from params (index.ts:145-152 — the door refuses a stated mode in
// the field's voice, layer 1) and the compose action refuses a legacy
// draft still carrying non-'full' mode loud naming the knob
// (actions.ts:59-78, layer 2).
describe("ARM 2 — the stated mode answers at its consumer or refuses loud (B2-mode, D1)", () => {
  it("yue2: mode melody states the mode at BOTH consumers; mode off composes no planner", () => {
    // ALREADY GREEN (the audit's yue2 build wall holds — §2.2: mode is
    // CONFIRMED working on yue2, actions.ts:62-89; card.spec.ts:112-127
    // pins the same truth). Kept armed so the music3 twin below cannot
    // be cured by yue2 regressing.
    const melody = composeCard({ prompt: PROMPT, lyrics: LYRICS, mode: "melody", seed: 7 }, yue2, RUN_CARD);
    assertValueAtConsumer(melody, YUE2_ABC, "mode", "melody", "mode (yue2/ABC)");
    assertValueAtConsumer(melody, YUE2_MUSIC, "mode", "melody", "mode (yue2/music)");
    const off = composeCard({ prompt: PROMPT, lyrics: LYRICS, mode: "off", seed: 7 }, yue2, RUN_CARD);
    assert.ok(nodesOf(off, YUE2_ABC).length === 0, "mode off composes NO planner node (the DECL's own gate)");
    const musicRows = nodesOf(off, YUE2_MUSIC);
    assert.ok(musicRows.length === 1, "the conditioner still composes");
    assert.equal(musicRows[0]!.inputs["abc"], "", "mode off rides the empty abc (the engine's off mode)");
  });

  it("CONTROL: stating mode's default 'full' on music3 composes the unstated graph (the harness is sane)", () => {
    const unstated = composeCard({ prompt: PROMPT, lyrics: LYRICS, seed: 9 }, music3, RUN_CARD);
    const statedDefault = composeCard({ prompt: PROMPT, lyrics: LYRICS, mode: "full", seed: 9 }, music3, RUN_CARD);
    assert.deepEqual(statedDefault, unstated, "the default stated === the default unstated (no diff noise)");
  });

  it("music3: a stated NON-default mode FIRES (the graph answers) or REFUSES LOUD naming 'mode' — never silence (CURED 2026-11-08 in 821475e43: was D1)", () => {
    const unstated = composeCard({ prompt: PROMPT, lyrics: LYRICS, seed: 11 }, music3, RUN_CARD);
    let refused: Error | null = null;
    let stated: Graph | null = null;
    try {
      stated = composeCard({ prompt: PROMPT, lyrics: LYRICS, mode: "off", seed: 11 }, music3, RUN_CARD);
    } catch (e) {
      refused = e instanceof Error ? e : new Error(String(e));
    }
    if (refused !== null) {
      // THE LAWFUL CURE SHAPE ONE: the lane refuses the knob it will
      // not fire, in the knob's own voice (the B4 admission voice —
      // "fires nothing on this lane — drop it or switch lane").
      assert.match(refused.message, /mode/,
        `music3 refused the stated mode but did not NAME it (the cure must speak the knob's voice): ${refused.message}`);
      return;
    }
    // THE LAWFUL CURE SHAPE TWO: the stated knob changes the composed
    // graph — the value FIRED somewhere at [5].
    assert.notDeepEqual(
      stated, unstated,
      "MODE VALUE ARM (hop [5]): mode 'off' stated ≠ default 'full' composed a graph IDENTICAL to the " +
      "unstated compose — the knob WAS admitted, hidden, and UNREAD on music3 " +
      "(the audit's D1, CURED 821475e43: actions.ts:59-78 refuses non-'full' loud naming " +
      "mode, and the DECL dropped it from params, index.ts:145-152 — a stated knob silently " +
      "no-op'd, THE BURN CLASS). The cure: refuse loud naming 'mode', or wire it — never silence.",
    );
  });

  it("music3 THROUGH THE DOOR: phase1Card+phase2Card REFUSE a mode-stated draft loud, naming 'mode' (cured 2026-11-08; RE-REGISTERED — the original body was mechanically mis-registered, see the audit)", async () => {
    // The SD-1 wedge at the run door: the bench state carries mode
    // (the DSH tool face serves it — emitParamsSpec over the card
    // schema — and the switch wedge re-plants it), the door admits it
    // (admission gates the schema dict; the model-less laneVerdict
    // judges only relations/bounds), and the compose must answer.
    // RE-REGISTRATION (parent ruling 2026-11-08): the original body
    // asserted notDeepEqual(ranB.graph, ranA.graph) — a body its own
    // message contradicts: the engine node declares NO mode input
    // (MiniMaxMusic3TextEncode), so no honest graph effect exists,
    // and the door's final composeOnce has no refusal-as-value path
    // (every seat throws) — BOTH endorsed cure shapes reject the
    // awaited ride and red a diff assertion. The LAW is unchanged (a
    // stated mode on music3 refuses loud, naming mode); the body is
    // recut to the shape the message endorses. The refusal is the
    // compose judge's own (actions.ts build) — it fires on the
    // door's real path, not a test-only branch.
    const base = { prompt: PROMPT, lyrics: LYRICS, duration: 150, seed: 13 };
    const doorRun = `${RUN_DOOR}_mode`;
    await assert.rejects(
      async () => {
        const p1 = await door.phase1Card({ ...base, mode: "off" }, "music3");
        return door.phase2Card(p1, doorRun);
      },
      /mode/,
      "MODE VALUE ARM THROUGH THE DOOR (hops [3]→[5]): the run door admitted mode 'off' on music3 — " +
        "the stated knob crossed the gates and composed instead of refusing. The cure must fire at " +
        "the door (phase-1 refusal naming mode) or in compose — never silence.",
    );
    // THE MODE-LESS CONTROL AT THE SAME HOP: the door still rides the
    // unstated draft end to end — the refusal is the knob's own, not
    // the lane's.
    const p1 = await door.phase1Card({ ...base }, "music3");
    const ran = await door.phase2Card(p1, doorRun);
    const enc = Object.values(ran.graph as Record<string, { class_type: string }>).filter(
      (n) => n.class_type === "MiniMaxMusic3TextEncode",
    );
    assert.equal(enc.length, 1, "the mode-less door ride still composes (the refusal is mode-specific, never the lane's)");
  });
});

// ── ARM 3 — THE LYRICS ARM (B2-lyrics; the audit's D2, CURED 821475e43) ─
// The flow face: the audit's SD-4 — lyrics WERE absent from the
// MUSIC_NATIVE row's stage inputs+params, from the compose_music tool
// properties, and from the overlays, while the card ITSELF declares
// lyrics a flow input
// (card.ts:77 flowKinds.inputs = {prompt: 'text', lyrics: 'text'})
// and the DECLs list lyrics a served param. A caller that stated
// lyrics on the flow face had NO seat: the value was unwireable, and
// the composed graph rode lyrics "" — INSTRUMENTAL — with no error
// anywhere. THE BURN'S OWN SHAPE: stated in, silently different out.
// THE CURE (821475e43): the lyrics seat rides flowsRegistryRows.ts —
// the stage params literal (:336), the compose_music tool property
// (:372-375), and the overlay stamp (:386).
describe("ARM 3 — stated lyrics reach the graph on the flow face (B2-lyrics, D2)", () => {
  // The truth roster, derived (never hand-listed): the keys the card
  // itself declares flow-carryable (def.flowKinds.inputs) must each
  // be STATABLE on the estate's flow row for this card — present in
  // the stage's params map (a literal or a $initial), or offered by
  // the row's tool properties, or stamped by an overlay. Any declared
  // flow input missing from all three seats is UNWIREABLE: no caller
  // shape can carry it to the compose.
  it("every flow input the card declares is statable on the music-native flow row (CURED 821475e43: was RED — lyrics)", () => {
    const row = MUSIC_NATIVE.stages.find((s) => s.id === "music")!;
    assert.ok(row !== undefined && row.card === "music", "the registry serves the music card stage");
    const declared = Object.keys(def.flowKinds.inputs);
    assert.ok(declared.includes("prompt") && declared.includes("lyrics"),
      "the card declares prompt+lyrics its flow inputs (card.ts:77) — the roster drifted if not");
    const statable = new Set<string>([
      ...Object.keys(row.params), // the stage's own param seats
      ...Object.keys(MUSIC_NATIVE.tool?.properties ?? {}), // the tool's offered properties
      ...(MUSIC_NATIVE.tool?.overlays ?? []).map((o) => o.param), // the overlays' stamped params
    ]);
    const unwireable = declared.filter((k) => !statable.has(k));
    assert.deepEqual(
      unwireable, [],
      "FLOW-SURFACE VALUE ARM (hop [1]/[3] — SD-4, CURED 821475e43): the card declares these flow inputs, and the " +
      "music-native row used to give them NO seat — not in stage params, not in tool properties, not in the " +
      "overlays (was flowsRegistryRows.ts:322-367; now params :336, tool property :372-375, overlay :386): " + JSON.stringify(unwireable) +
      ". A caller stating them WAS silently unwired — lyrics rode \"\" (instrumental) with no error. " +
      "The cure wired the row (params/inputs + tool property + overlay).",
    );
  });

  it("the stated lyrics, sent the way the doors carry them, land at the text-encode's lyrics input (CURED 821475e43: was RED TODAY)", () => {
    // THE DOOR'S OWN DERIVATION, from the real row: the stage params
    // map is what the compose receives — $initials substituted (the
    // spell law, runsStart's ghost sweep / rewriteSpells seat) and
    // the tool overlays stamped from the call body (loadPlane's
    // signature projection → the flow params overlay's stamps). The
    // caller states prompt + lyrics + duration; the row answers how
    // many of those survive into compose.
    const row = MUSIC_NATIVE.stages.find((s) => s.id === "music")!;
    const body: Record<string, unknown> = { prompt: PROMPT, lyrics: LYRICS, duration: 150 };
    const initials: Record<string, unknown> = { prompt: PROMPT, lyrics: LYRICS };
    const params: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row.params)) {
      params[k] = typeof v === "string" && v.startsWith("$")
        ? (initials[v.slice(1)] ?? v)
        : v;
    }
    for (const ov of MUSIC_NATIVE.tool?.overlays ?? []) {
      if (ov.stage === row.id && body[ov.param] !== undefined) {
        params[ov.path[0]!] = body[ov.param];
      }
    }
    // The stage names its model (row params: model "music3") — the
    // same facts row the {model:} door would resolve.
    const fam = String(params["model"] ?? "");
    assert.equal(fam, "music3", "the row composes the music3 family (the audit's own seat)");
    const graph = composeCard(params, facts.models[fam]!, RUN_CARD);
    // THE CONSUMER: the MiniMax encode's `lyrics` input — what the
    // engine will sing. Stated lyrics in, instrumental out is the burn.
    assertValueAtConsumer(graph, MUSIC3_TEXT_ENCODE, "lyrics", LYRICS,
      "lyrics (stated through the flow face)");
  });

  it("CONTROL — the card face carries lyrics today (the drop is the FLOW face, not the card)", () => {
    // ALREADY GREEN (the audit's §2.2 lyrics row: [1]–[4] verbatim,
    // walled — card.spec.ts:67 pins the encode's lyrics input). This
    // control keeps the flow-face reds honest: the card seam is not
    // the accused, the row is.
    const graph = composeCard({ prompt: PROMPT, lyrics: LYRICS, seed: 17 }, music3, RUN_CARD);
    assertValueAtConsumer(graph, MUSIC3_TEXT_ENCODE, "lyrics", LYRICS, "lyrics (card face control)");
  });
});

// ── ARM 4 — THE CORRUPTION ARM (the arms' own red-proof) ───────────
// P2's toggle law: an arm that cannot FAIL on a corrupted value is a
// presence arm, not a value arm. The seam is the compose step itself:
// ACTION_BINDINGS is read at dispatch time (card.ts:103), so a
// temporarily swapped row corrupts the stated value mid-compose —
// exactly the shape a silent drop takes — and the arms above MUST
// red on the corrupted graph. No source file is touched; the swap is
// restored in finally.
describe("ARM 4 — corruption through the compose step reds the value arms (the toggle proof)", () => {
  /** Corrupt the stated value inside the compose dispatch (the
   *  dropped/truncated class), run `ride`, restore, and require the
   *  arm's own matcher to fire. */
  function corrupting(
    family: string,
    corrupt: (p: Record<string, unknown>) => Record<string, unknown>,
    ride: () => void,
    armMatcher: RegExp,
  ): void {
    const original = ACTION_BINDINGS[family]!;
    ACTION_BINDINGS[family] = (p, model, g, runId) => original(corrupt({ ...p }), model, g, runId);
    try {
      assert.throws(ride, armMatcher,
        "the arm PASSED on a corrupted compose — it is a presence arm, not a value arm; fix the arm, not the code");
    } finally {
      ACTION_BINDINGS[family] = original;
    }
  }

  it("4a: truncating the prompt inside compose reds ARM 1 (music3 caption is judged, not glanced)", () => {
    corrupting(
      music3Decl.id,
      (p) => ({ ...p, prompt: String(p.prompt).slice(0, 12) }), // THE DROP CLASS: the head only
      () => {
        const graph = composeCard({ prompt: PROMPT, lyrics: LYRICS, seed: 4242 }, music3, RUN_CARD);
        assertValueAtConsumer(graph, MUSIC3_TEXT_ENCODE, "caption", PROMPT, "prompt (music3)");
      },
      /VALUE ARM|did not carry the stated value/,
    );
  });

  it("4b: emptying the lyrics inside compose reds ARM 3's card control (the instrumental drop class)", () => {
    corrupting(
      music3Decl.id,
      (p) => ({ ...p, lyrics: "" }), // THE DROP CLASS: stated → ""
      () => {
        const graph = composeCard({ prompt: PROMPT, lyrics: LYRICS, seed: 17 }, music3, RUN_CARD);
        assertValueAtConsumer(graph, MUSIC3_TEXT_ENCODE, "lyrics", LYRICS, "lyrics (card face control)");
      },
      /VALUE ARM|did not carry the stated value/,
    );
  });

  it("4c: the same corruption THROUGH THE DOOR reds ARM 5's witness (the hop-[5] pin is a value pin)", async () => {
    const base = { prompt: PROMPT, lyrics: LYRICS, duration: 150, seed: 4242 };
    const original = ACTION_BINDINGS[music3Decl.id]!;
    ACTION_BINDINGS[music3Decl.id] =
      (p, model, g, runId) => original({ ...p, prompt: String(p.prompt).slice(0, 12) }, model, g, runId);
    try {
      await assert.rejects(
        (async () => {
          const p1 = await door.phase1Card({ ...base }, "music3");
          const ran = await door.phase2Card(p1, `${RUN_DOOR}_corrupt`);
          assertValueAtConsumer(ran.graph as Graph, MUSIC3_TEXT_ENCODE, "caption", PROMPT, "prompt (door)");
        }),
        /VALUE ARM|did not carry the stated value/,
        "the door witness passed on a corrupted compose — it is a presence arm, not a value arm",
      );
    } finally {
      ACTION_BINDINGS[music3Decl.id] = original;
    }
  });
});

// ── ARM 5 — THE THROUGH-THE-DOOR ARM (the hop-5 witness) ───────────
// The estate run door itself: phase1Card (the validate/submit walk —
// prepare → board check → admission → laneVerdict → lane presence →
// composeOnce) then phase2Card (the run-id compose — the graph the
// engine actually receives). Hermetic boot: the tracked double
// carries the music classes the walls' min-fixture KEY JUDGE lacks
// (audit D5), so this ride exercises the real wiring gate too.
//
// ALREADY GREEN as CARRIAGE (the audit's §2.2 verdict: the prompt
// ride holds at [4]→[5]; what was missing was the VALUE PIN at hop
// [5] through the door — SD-6 "through-door value pins … do not
// exist"). This arm IS the pin now; arm 4c proves it is a value pin
// (corruption reds it), and arm 2c uses the same door to pre-register
// the mode red the carriage could not see.
describe("ARM 5 — the estate run door composes the stated prompt into the served graph (hop-5 witness)", () => {
  it("music3 through phase1Card+phase2Card: the served graph carries the LONG prompt verbatim at the consumer", async () => {
    const body = { model: "music3", prompt: PROMPT, lyrics: LYRICS, duration: 150, seed: 4242 };
    const p1 = await door.phase1Card(body, "music3"); // the door's own phase-1 ride (validate === submit)
    const ran = await door.phase2Card(p1, RUN_DOOR); // the run id compose — the engine's bytes
    const graph = ran.graph as Graph;
    const encodeId = assertValueAtConsumer(graph, MUSIC3_TEXT_ENCODE, "caption", PROMPT,
      "prompt (through the door)");
    assert.equal(graph[encodeId]!.class_type, MUSIC3_TEXT_ENCODE);
    // THE RUN ID IS AN INPUT (runsStart's one-producer law): the graph
    // the engine receives is stamped with THIS run's id.
    const save = nodesOf(graph, "SaveAudioAdvanced")[0]!;
    assert.ok(save !== undefined, "the served graph saves the song");
    assert.equal(save.inputs["filename_prefix"], `${RUN_DOOR}/music`,
      "the door composed under the run id it registered — the served graph is THIS run's");
  });

  it("yue2 through the same door: both style consumers carry the stated prompt", async () => {
    const body = { model: "yue2", prompt: PROMPT, lyrics: LYRICS, duration: 150, seed: 4242 };
    const p1 = await door.phase1Card(body, "yue2");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_yue2`);
    const graph = ran.graph as Graph;
    assertValueAtConsumer(graph, YUE2_ABC, "style", PROMPT, "prompt (door, yue2/ABC)");
    assertValueAtConsumer(graph, YUE2_MUSIC, "style", PROMPT, "prompt (door, yue2/music)");
  });
});

// ── ARM 6 — THE STATED-NUMERICS ARM (SD-6's through-door pin) ───────
// P2's round-trip law for numbers: the audit's SD-6 names duration /
// steps / guidance / lm_cfg the UNWITNESSED knobs — "through-door
// value pins for stated duration/steps/guidance/lm_cfg/mode do not
// exist" (mode since pinned by arm 2c's refusal). A stated steps=64
// silently composing as the default 30 greens every suite today —
// the operator's "NO PARAMETER IS CONFIRMED TO WORK" verbatim. These
// arms state NON-DEFAULT numerics (duration 77 ≠ 30, guidance 2.5 ≠
// 1.7, steps 64 ≠ 30, lm_cfg 3.5 ≠ 1.7, seed 4242) and re-read them
// at the DECL-wired consumer inputs, card path AND door path. Hop
// [4]→[5] card-level, hops [3]→[5] through the door.
describe("ARM 6 — the stated numerics ride VERBATIM to their consumers (duration/steps/guidance/lm_cfg/seed)", () => {
  // The music3 DECL's wiring (packages/models/music3/src/actions.ts):
  // max_duration + cfg_scale on MiniMaxMusic3TextEncode, seconds on
  // EmptyMiniMaxMusic3LatentAudio, steps + cfg + seed on KSampler.
  it("music3 card path: duration/steps/guidance/lm_cfg/seed land at their named inputs", () => {
    const graph = composeCard({
      prompt: PROMPT, lyrics: LYRICS, mode: "full",
      duration: 77, guidance_scale: 2.5, n_diffusion_steps: 64, lm_cfg_scale: 3.5, seed: 4242,
    }, music3, RUN_CARD);
    assertNumAtConsumer(graph, MUSIC3_TEXT_ENCODE, "max_duration", 77, "duration (music3 encode)");
    assertNumAtConsumer(graph, MUSIC3_TEXT_ENCODE, "cfg_scale", 3.5, "lm_cfg (music3 encode)");
    // audit 014 D1: the latent's seconds is the AR's realized-length LINK —
    // never a second literal copy of the duration (divergence = zero-padded
    // conditioning = the garbage tail). Duration owns exactly ONE seat.
    assert.deepEqual(nodesOf(graph, "EmptyMiniMaxMusic3LatentAudio")[0]!.inputs["seconds"],
      [`${MUSIC3_TEXT_ENCODE}.0`, 1], "duration's second seat stays the AR link (music3 latent)");
    assertNumAtConsumer(graph, "KSampler", "steps", 64, "steps (music3 sampler)");
    assertNumAtConsumer(graph, "KSampler", "cfg", 2.5, "guidance (music3 sampler)");
    assertNumAtConsumer(graph, "KSampler", "seed", 4242, "seed (music3 sampler)");
    assertNumAtConsumer(graph, MUSIC3_TEXT_ENCODE, "seed", 4242, "seed (music3 encode)");
  });

  // The yue2 DECL's wiring (packages/models/yue2/src/actions.ts):
  // max_duration on YuE2GenerateMusic, steps + seed on KSampler
  // (guidance lives AR-side — KSampler cfg is the DECL's fixed 1).
  it("yue2 card path: duration/steps/seed land at their named inputs", () => {
    const graph = composeCard({
      prompt: PROMPT, lyrics: LYRICS, mode: "melody",
      duration: 77, n_diffusion_steps: 64, seed: 4242,
    }, yue2, RUN_CARD);
    assertNumAtConsumer(graph, YUE2_MUSIC, "max_duration", 77, "duration (yue2 music)");
    assertNumAtConsumer(graph, "KSampler", "steps", 64, "steps (yue2 sampler)");
    assertNumAtConsumer(graph, "KSampler", "seed", 4242, "seed (yue2 sampler)");
    assertNumAtConsumer(graph, YUE2_ABC, "seed", 4242, "seed (yue2 ABC)");
    assertNumAtConsumer(graph, YUE2_MUSIC, "seed", 4242, "seed (yue2 music)");
  });

  it("music3 THROUGH THE DOOR: the served graph carries the stated numerics at the consumers (the SD-6 pin)", async () => {
    const body = {
      model: "music3", prompt: PROMPT, lyrics: LYRICS,
      duration: 77, guidance_scale: 2.5, n_diffusion_steps: 64, lm_cfg_scale: 3.5, seed: 4242,
    };
    const p1 = await door.phase1Card(body, "music3");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_numerics`);
    const graph = ran.graph as Graph;
    assertNumAtConsumer(graph, MUSIC3_TEXT_ENCODE, "max_duration", 77, "duration (door)");
    assertNumAtConsumer(graph, MUSIC3_TEXT_ENCODE, "cfg_scale", 3.5, "lm_cfg (door)");
    assertNumAtConsumer(graph, "KSampler", "steps", 64, "steps (door)");
    assertNumAtConsumer(graph, "KSampler", "cfg", 2.5, "guidance (door)");
    assertNumAtConsumer(graph, "KSampler", "seed", 4242, "seed (door)");
  });

  it("F-2 (auditor finding on the music-numerics verdict): the music3 door ALSO pins encode-seed + latent-seconds (the SD-6 pin's two missing seats)", async () => {
    const body = {
      model: "music3", prompt: PROMPT, lyrics: LYRICS,
      duration: 77, guidance_scale: 2.5, n_diffusion_steps: 64, lm_cfg_scale: 3.5, seed: 4242,
    };
    const p1 = await door.phase1Card(body, "music3");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_f2_encode_latent`);
    const graph = ran.graph as Graph;
    assertNumAtConsumer(graph, MUSIC3_TEXT_ENCODE, "seed", 4242, "seed (door encode)");
    // audit 014 D1: the door-served latent-seconds is the AR LINK, not the
    // duration literal — this arm once pinned the literal (the drift the
    // golden froze); the pin now guards the derivation itself.
    assert.deepEqual(nodesOf(graph, "EmptyMiniMaxMusic3LatentAudio")[0].inputs.seconds,
      [`${MUSIC3_TEXT_ENCODE}.0`, 1], "duration (door latent — the AR link rides through the door)");
    assertNumAtConsumer(graph, MUSIC3_TEXT_ENCODE, "max_duration", 77, "duration (door encode — the one literal seat)");
  });

  it("F-5 (seed mint at the door, auditor finding on the music-numerics verdict): omitting seed mints ONE shared non-negative integer at both music3 consumers (GATE S — mintSeed once, every node sharing the seed reads the same mint)", async () => {
    // THE AUDIT'S PROBE, NOW A WALL ARM (the verdict §F-5: the
    // door-seat mint was witnessed by the auditor's scratch probe
    // only — this arm moves the witness into the wall). No seed
    // stated: the -1 sentinel mints at render, and BOTH consumers
    // (encode + sampler) must read THE SAME mint — two dice would
    // voice the lyrics in one world and sample another.
    const body = {
      model: "music3", prompt: PROMPT, lyrics: LYRICS,
      duration: 77, guidance_scale: 2.5, n_diffusion_steps: 64, lm_cfg_scale: 3.5,
    };
    const p1 = await door.phase1Card(body, "music3");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_f5_seed_mint`);
    const graph = ran.graph as Graph;
    const enc = nodesOf(graph, MUSIC3_TEXT_ENCODE);
    assert.equal(enc.length, 1, "the omitted-seed draft composes its encode consumer");
    const sam = nodesOf(graph, "KSampler");
    assert.equal(sam.length, 1, "the omitted-seed draft composes its sampler consumer");
    const eSeed = enc[0]!.inputs["seed"];
    const sSeed = sam[0]!.inputs["seed"];
    assert.ok(Number.isInteger(eSeed) && (eSeed as number) >= 0,
      `the minted encode seed is a non-negative integer (saw ${JSON.stringify(eSeed)}) — the sentinel must mint, never pass -1 through`);
    assert.equal(sSeed, eSeed,
      `ONE shared mint: sampler seed (${JSON.stringify(sSeed)}) must equal encode seed (${JSON.stringify(eSeed)}) — two dice voice different worlds`);
  });

  it("yue2 THROUGH THE DOOR: the served graph carries the stated numerics at the consumers (auditor F-1 on the dead-knobs verdict — the surviving knobs ride the door after the D1/D2 cure)", async () => {
    // THE POST-CURE DOOR: guidance/lm_cfg no longer ride yue2
    // (they refuse loud — the dead-knobs wall's D3/D4), so the
    // door-stated draft carries ONLY the surviving knobs
    // (duration/steps/seed) — and the served graph must carry them
    // at the same consumers the card path pins above.
    const body = {
      model: "yue2", prompt: PROMPT, lyrics: LYRICS, mode: "melody",
      duration: 77, n_diffusion_steps: 64, seed: 4242,
    };
    const p1 = await door.phase1Card(body, "yue2");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_numerics_yue2`);
    const graph = ran.graph as Graph;
    assertNumAtConsumer(graph, YUE2_MUSIC, "max_duration", 77, "duration (yue2 door)");
    assertNumAtConsumer(graph, "KSampler", "steps", 64, "steps (yue2 door)");
    assertNumAtConsumer(graph, "KSampler", "seed", 4242, "seed (yue2 door)");
    assertNumAtConsumer(graph, YUE2_ABC, "seed", 4242, "seed (yue2 ABC door)");
    assertNumAtConsumer(graph, YUE2_MUSIC, "seed", 4242, "seed (yue2 music door)");
  });

  // THE CORRUPTION TWINS (ARM 4's law extended to numbers): a stated
  // numeric corrupted mid-compose MUST red the arms above — else the
  // numerics are presence pins, not value pins.
  it("4d: halving the steps inside compose reds the music3 numerics arm", () => {
    corruptingForNumerics(
      (p) => ({ ...p, n_diffusion_steps: 32 }), // THE DROP CLASS: stated 64 → composed 32
      () => {
        const graph = composeCard({
          prompt: PROMPT, lyrics: LYRICS, mode: "full",
          duration: 77, guidance_scale: 2.5, n_diffusion_steps: 64, lm_cfg_scale: 3.5, seed: 4242,
        }, music3, RUN_CARD);
        assertNumAtConsumer(graph, "KSampler", "steps", 64, "steps (music3 sampler)");
      },
    );
  });

  it("4e: the same corruption THROUGH THE DOOR reds the SD-6 pin", async () => {
    const original = ACTION_BINDINGS[music3Decl.id]!;
    ACTION_BINDINGS[music3Decl.id] =
      (p, model, g, runId) => original({ ...p, n_diffusion_steps: 32 }, model, g, runId);
    try {
      await assert.rejects(
        (async () => {
          const p1 = await door.phase1Card({
            model: "music3", prompt: PROMPT, lyrics: LYRICS,
            duration: 77, guidance_scale: 2.5, n_diffusion_steps: 64, lm_cfg_scale: 3.5, seed: 4242,
          }, "music3");
          const ran = await door.phase2Card(p1, `${RUN_DOOR}_numerics_corrupt`);
          assertNumAtConsumer(ran.graph as Graph, "KSampler", "steps", 64, "steps (door)");
        }),
        /VALUE ARM|did not carry the stated number/,
        "the door numerics pin passed on a corrupted compose — it is a presence pin, not a value pin",
      );
    } finally {
      ACTION_BINDINGS[music3Decl.id] = original;
    }
  });

  it("4f: the same corruption THROUGH THE YUE2 DOOR reds the F-1 pin (the yue2 door pin is a value pin, not a presence pin)", async () => {
    const original = ACTION_BINDINGS[yue2Decl.id]!;
    ACTION_BINDINGS[yue2Decl.id] =
      (p, model, g, runId) => original({ ...p, n_diffusion_steps: 32 }, model, g, runId);
    try {
      await assert.rejects(
        (async () => {
          const p1 = await door.phase1Card({
            model: "yue2", prompt: PROMPT, lyrics: LYRICS, mode: "melody",
            duration: 77, n_diffusion_steps: 64, seed: 4242,
          }, "yue2");
          const ran = await door.phase2Card(p1, `${RUN_DOOR}_numerics_yue2_corrupt`);
          assertNumAtConsumer(ran.graph as Graph, "KSampler", "steps", 64, "steps (yue2 door)");
        }),
        /VALUE ARM|did not carry the stated number/,
        "the yue2 door numerics pin passed on a corrupted compose — it is a presence pin, not a value pin",
      );
    } finally {
      ACTION_BINDINGS[yue2Decl.id] = original;
    }
  });
});

// ── ARM 7 — THE TIER DOOR ARMS (audit 014 C3/C4) ───────────────────
// The step↔checkpoint pairing and the VRAM-aware decode ride through
// the same estate door — stated through phase1Card+phase2Card, never
// glanced. The decode seat is a CLASS pin (which decoder the served
// graph carries); the matcher voice stays VALUE ARM so the
// corruption twins below ride ARM 4's law (a pin that cannot fail on
// a corrupted compose is a presence pin).
describe("ARM 7 — the tier seats ride VERBATIM through the door (decode tier C3, step tier C4)", () => {
  it("C3: a stated tiled_decode=true serves the tiled decoder with the template's seats", async () => {
    const p1 = await door.phase1Card({
      model: "music3", prompt: PROMPT, lyrics: LYRICS,
      duration: 77, n_diffusion_steps: 64, seed: 4242, tiled_decode: true,
    }, "music3");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_decode_stated`);
    const graph = ran.graph as Graph;
    const tiled = nodesOf(graph, "VAEDecodeAudioTiled");
    assert.equal(tiled.length, 1,
      "VALUE ARM (decode seat): the stated tiled_decode=true serves exactly one VAEDecodeAudioTiled — the knob never reached the engine's consumer");
    assert.deepEqual(
      { tile_size: tiled[0]!.inputs["tile_size"], overlap: tiled[0]!.inputs["overlap"] },
      { tile_size: 1536, overlap: 64 },
      "VALUE ARM (decode seats): the served tiled node carries the template's 1536/64");
    assert.equal(nodesOf(graph, "VAEDecodeAudio").length, 0,
      "VALUE ARM (decode seat): the stated knob replaces the plain decoder, never doubles it");
  });

  it("C3: an unstated short track serves the plain decoder (the derivation owns the absent seat)", async () => {
    const p1 = await door.phase1Card({
      model: "music3", prompt: PROMPT, lyrics: LYRICS,
      duration: 77, n_diffusion_steps: 64, seed: 4242,
    }, "music3");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_decode_derived_plain`);
    const graph = ran.graph as Graph;
    assert.equal(nodesOf(graph, "VAEDecodeAudio").length, 1,
      "VALUE ARM (decode seat): the unstated 77 s draft decodes plain through the door");
    assert.equal(nodesOf(graph, "VAEDecodeAudioTiled").length, 0,
      "VALUE ARM (decode seat): no tiled node rides the roomy derivation");
  });

  it("C3: an unstated full-length track serves the tiled decoder (the duration cap is the size signal)", async () => {
    const p1 = await door.phase1Card({
      model: "music3", prompt: PROMPT, lyrics: LYRICS,
      duration: 360, n_diffusion_steps: 64, seed: 4242,
    }, "music3");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_decode_derived_tiled`);
    assert.equal(nodesOf(ran.graph as Graph, "VAEDecodeAudioTiled").length, 1,
      "VALUE ARM (decode seat): the unstated 360 s draft tiles through the door");
  });

  it("C4: the served steps honor the checkpoint tier (default 30; stated 200 rides; 20 refuses loud)", async () => {
    const p1 = await door.phase1Card({
      model: "music3", prompt: PROMPT, lyrics: LYRICS, duration: 77, seed: 4242,
    }, "music3");
    const ran = await door.phase2Card(p1, `${RUN_DOOR}_steps_default`);
    assertNumAtConsumer(ran.graph as Graph, "KSampler", "steps", 30,
      "steps (door default — the full tier's own default, never a second literal)");
    const q1 = await door.phase1Card({
      model: "music3", prompt: PROMPT, lyrics: LYRICS, duration: 77, n_diffusion_steps: 200, seed: 4242,
    }, "music3");
    const qran = await door.phase2Card(q1, `${RUN_DOOR}_steps_ceiling`);
    assertNumAtConsumer(qran.graph as Graph, "KSampler", "steps", 200, "steps (door ceiling)");
    await assert.rejects(
      door.phase1Card({
        model: "music3", prompt: PROMPT, lyrics: LYRICS, duration: 77, n_diffusion_steps: 20, seed: 4242,
      }, "music3"),
      /n_diffusion_steps 20 is outside the full tier's \[30, 200\] window/,
      "a distilled stamp on the full-schedule body refuses at the door — the divergent pairing never composes",
    );
  });

  it("4g: dropping the stated tiled_decode mid-compose reds the C3 arm (the decode pin is a value pin)", async () => {
    const original = ACTION_BINDINGS[music3Decl.id]!;
    ACTION_BINDINGS[music3Decl.id] =
      (p, model, g, runId) => {
        const { tiled_decode: _dropped, ...rest } = p;
        return original(rest, model, g, runId);
      };
    try {
      await assert.rejects(
        (async () => {
          const p1 = await door.phase1Card({
            model: "music3", prompt: PROMPT, lyrics: LYRICS,
            duration: 77, n_diffusion_steps: 64, seed: 4242, tiled_decode: true,
          }, "music3");
          const ran = await door.phase2Card(p1, `${RUN_DOOR}_decode_corrupt`);
          const graph = ran.graph as Graph;
          const tiled = nodesOf(graph, "VAEDecodeAudioTiled");
          assert.equal(tiled.length, 1,
            "VALUE ARM (decode seat): the stated tiled_decode=true serves exactly one VAEDecodeAudioTiled — the knob never reached the engine's consumer");
        }),
        /VALUE ARM/,
        "the door decode pin passed on a corrupted compose — it is a presence pin, not a value pin",
      );
    } finally {
      ACTION_BINDINGS[music3Decl.id] = original;
    }
  });
});

/** ARM 4's corrupting seat for numbers (the music3 family): corrupt
 *  the stated numerics inside the compose dispatch and require the
 *  numeric arm's own matcher to fire. Restored in finally — no
 *  source file is touched. */
function corruptingForNumerics(
  corrupt: (p: Record<string, unknown>) => Record<string, unknown>,
  ride: () => void,
): void {
  const original = ACTION_BINDINGS[music3Decl.id]!;
  ACTION_BINDINGS[music3Decl.id] = (p, model, g, runId) => original(corrupt({ ...p }), model, g, runId);
  try {
    assert.throws(ride, /VALUE ARM|did not carry the stated number/,
      "the arm PASSED on a corrupted compose — it is a presence arm, not a value arm; fix the arm, not the code");
  } finally {
    ACTION_BINDINGS[music3Decl.id] = original;
  }
}
