// flows-wiring.spec.ts — THE FLOW-REGISTRY WIRING WALL (the
// round-trip stroke 2026-09-20): every registry flow must pass the
// SAME construction the live /v1/flows/validate door runs for a
// named flow — expandRegistryFlow → composeFamilyStages →
// registryFlowToInline → inlineArm against the primed card
// registry.
//
// The hole this closes: audio-native-tts shipped with a wired
// `prompt` input and NO expected Kind (kindsOk's own law: "every
// input needs an expected Kind"), and NO wall ever ran the
// registry's flows through the door's validators — only the live
// HTTP path tripped it, months after the row landed. A registry
// that no wall compiles is a registry that can rot.
//
// Run: npx vitest run tests/walls/ts/suites/flows-wiring.spec.ts

import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import { existsSync, readFileSync } from "node:fs";
import "../../../helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { composeFamilyStages, liveFamilySeat } from "../../../../packages/harness/estate-queue/src/flowsFamilyCompose.ts";
import {
  expandRegistryFlow,
  seedFlowsSeat,
  registryFlowToInline,
} from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { inlineArm } from "../../../../packages/harness/estate-queue/src/runsValidateServe.ts";
import type { CardRegistryLike } from "../../../../packages/harness/estate-queue/src/runsValidateShared.ts";

// THE SEED SEAT (J4): the registry reads ride the read-only boot face
const SEED = seedFlowsSeat();

let cards: CardRegistryLike;

beforeAll(async (): Promise<void> => {
  const ctx = new Context();
  const svc = new CardRegistryService(ctx);
  await svc.prime();
  cards = svc as unknown as CardRegistryLike;
});

describe("THE LEAF<->ROW INTERLOCK (flows wave-2: object-forge taught a dead remesh stage for a month under all-green suites)", () => {
  // The row deleted its remesh stage 2026-10-13; the row tool's
  // overlay, the leaf tool.json, AGENTS.md, and the SKILL kept
  // teaching the three-stage chain + target_quads + card:quad-remesh
  // + a dead repo path — and NO wall compared any of it. This
  // interlock derives both faces and judges them against each
  // other: the leaf describes exactly the row that runs.
  const REPO: string = new URL("../../../../", import.meta.url).pathname;

  it("every flow with a leaf: tool.json names <id_snake>_flow, models the registry id, carries only the row's own params, and names only the row's stage ids in overlays", () => {
    const failures: string[] = [];
    for (const name of SEED.names()) {
      const row = SEED.get(name);
      if (row === undefined) continue;
      const stageIds = new Set(row.stages.map((st) => st.id));
      // the row's OWN face first: overlays must target real stages
      for (const ov of row.tool?.overlays ?? []) {
        if (!stageIds.has(ov.stage)) {
          failures.push(`${name}: registry tool overlays ${ov.param} -> stage '${ov.stage}' but the row carries no such stage (dead overlay teaching a deleted stage)`);
        }
      }
      const leafDir = `${REPO}flows/${name}`;
      const leafPath = `${leafDir}/tool.json`;
      if (!existsSync(leafPath)) continue;
      const leaf: {
        name?: string; model?: string;
        params_schema?: { properties?: Record<string, unknown>; required?: string[] };
        description?: string;
      } = JSON.parse(readFileSync(leafPath, "utf8"));
      const snake = name.replace(/-/g, "_");
      if (leaf.name !== `${snake}_flow`) failures.push(`${name}: leaf tool.json name '${leaf.name}' != '${snake}_flow'`);
      if (leaf.model !== name) failures.push(`${name}: leaf tool.json model '${leaf.model}' != registry id`);
      // THE PARAMS LAW, BY ROW FACE: a row WITH a tool judges the
      // leaf's params against tool.properties; a tool:null row with
      // declared initials judges against initialValidators (the
      // leaf documents the flow's initial params — character-
      // factory's photo/prompt); a tool:null row with NO initials
      // (craft-loop) documents a NON-flow tool face the row's own
      // description points at — the interlock asserts the pointer,
      // never param equality it cannot derive.
      if (row.tool !== null && row.tool !== undefined) {
        const rowProps = new Set(Object.keys(row.tool.properties ?? {}));
        for (const key of Object.keys(leaf.params_schema?.properties ?? {})) {
          if (!rowProps.has(key)) failures.push(`${name}: leaf teaches param '${key}' the registry row does not carry (row deleted it)`);
        }
        const rowRequired = new Set(row.tool.required ?? []);
        for (const key of leaf.params_schema?.required ?? []) {
          if (!rowRequired.has(key)) failures.push(`${name}: leaf marks '${key}' required; the row does not`);
        }
      } else {
        const initials = new Set([...Object.keys(row.initialValidators ?? {}), ...(row.requiredInitials ?? [])]);
        if (initials.size > 0) {
          for (const key of Object.keys(leaf.params_schema?.properties ?? {})) {
            if (!initials.has(key)) failures.push(`${name}: leaf teaches param '${key}' the row's initials do not carry`);
          }
          for (const key of leaf.params_schema?.required ?? []) {
            if (!initials.has(key)) failures.push(`${name}: leaf marks '${key}' required; the row's initials do not require it`);
          }
        } else if (!row.description.includes(`flows/${name}`)) {
          failures.push(`${name}: tool:null row with no initials, and the description never points at the leaf that documents its face`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });

  // CO-W5 (flows-registry wave-2): discloseRegistry's leaf read
  // falls back to name-as-title when flows/<id>/tool.json is absent
  // — legal since the 2026-10-04 leaf retirement, but SILENT, and
  // nothing stated WHICH flows owe the leaf home the make-flow skill
  // promises ("a flow has TWO homes"). The law, derived from the
  // rows themselves: a flow OWES flows/<id>/tool.json iff its row
  // carries a RegistryTool (the agent tool face) or non-empty
  // skillRefs (the advertised skill bundle). The roster below is
  // DERIVED — a new tool row owes its leaf the hour it lands, no
  // roster edit, no repin.
  it("every row that owes a leaf (a RegistryTool or non-empty skillRefs) carries flows/<id>/tool.json", () => {
    const failures: string[] = [];
    const owed: string[] = [];
    for (const name of SEED.names()) {
      const row = SEED.get(name);
      if (row === undefined) continue;
      const hasTool = row.tool !== null && row.tool !== undefined;
      const hasRefs = row.skillRefs.length > 0;
      if (!hasTool && !hasRefs) continue;
      owed.push(name);
      if (!existsSync(`${REPO}flows/${name}/tool.json`)) {
        failures.push(
          `${name}: the row carries ${hasTool ? `RegistryTool '${row.tool!.name}'` : "non-empty skillRefs"} ` +
          `but flows/${name}/tool.json is absent — the leaf home is OWED ` +
          `(disclose falls back to name-as-title and the interlock judges nothing)`,
        );
      }
    }
    assert.ok(owed.length > 0, "the derived owed-leaf roster is empty — the derivation broke");
    console.log(`owed-leaf roster (RegistryTool or non-empty skillRefs): ${owed.sort().join(", ")}`);
    assert.deepEqual(failures, [],
      "rows that owe a leaf home but carry no flows/<id>/tool.json:\n" + failures.join("\n"));
  });
});

describe("the flow-registry wiring wall (the live door's own construction, over every registry flow)", () => {
  it("serves a non-empty registry", () => {
    // C-M7 (the wall audit, 2026-09-28): `>= 10` against the real
    // flow count let flows die silently. The census is exact, and it
    // is the registry's own name list — no hand number beside it.
    // The count is the CUT roster's (2026-10-13: five 3D/rig rows
    // retired; body-to-somax stays — the motion studio drives it)
    // + character-factory (2026-10-09: the AssetFurnace-shape
    // lift→rig→motion chain, gap audit 012)
    // + object-forge (2026-10-11: concept→lift, all card= — the
    // row's remesh stage left 2026-10-13; the second {flow:}-door
    // one-shot)
    // + extend-video (2026-11-12: the first MOD-BAG-arming flow —
    // one card= stage on h3-timeline whose extend bag rides $spells
    // resolved against the wired initials).
    const names = SEED.names();
    assert.equal(names.length, 11, `the registry serves exactly 11 flows, got ${names.length}`);
    assert.equal(new Set(names).size, names.length, "the registry's flow names are unique");
  });

  it("every registry flow compiles through inlineArm at 200 (wires + kinds + card gate + $channels)", () => {
    const failures: string[] = [];
    for (const name of SEED.names()) {
      const decl = SEED.get(name);
      assert.ok(decl !== undefined, `registry names ${name} but the getter misses it`);
      // the door's own order (stroke 4): expand, COMPOSE the family
      // stages (the booted models seat — boot-models.ts settles the
      // singleton liveFamilySeat reads), then inline.
      const composed = composeFamilyStages(expandRegistryFlow(decl!, SEED), liveFamilySeat().decls, liveFamilySeat().state);
      const inlineDoc = registryFlowToInline(composed);
      const answer = inlineArm({ flow_inline: inlineDoc }, cards);
      if (answer.status !== 200) {
        failures.push(`${name}: ${String(answer.payload["error"] ?? "?").slice(0, 160)}`);
      }
    }
    assert.deepEqual(failures, [], "every registry flow must compose and validate through the door's own construction");
  });

  it("the kindsOk law is pinned on the tts row (the hole this wall closed): every wired input has its expected Kind", () => {
    const tts = registryFlowToInline(expandRegistryFlow(SEED.get("audio-native-tts")!, SEED)) as {
      stages: Array<{ inputs: Record<string, unknown>; expected: Record<string, string> }>;
    };
    const stage = tts.stages[0]!;
    const names = Object.keys(stage.inputs);
    // C-L16 (the wall audit, 2026-09-28): `names.length > 0` is a
    // floor — a flow that wired the WRONG inputs passed. The truth is
    // exactly one wired input, "text", and it is pinned as a set.
    assert.deepEqual(names, ["text"],
      `audio-native-tts wires exactly ["text"] (got ${JSON.stringify(names)}) — a new wired input is a deliberate edit, not a floor`);
    for (const name of names) {
      assert.ok(stage.expected[name] !== undefined,
        `audio-native-tts stage wires input '${name}' with no expected Kind — the exact hole this wall closed`);
    }
  });

  // ── THE DERIVATION LAW (roadmap §12): a card stage's input kind
  // DERIVES from the card's own flowKinds.inputs when the port is
  // declared — the hand-written expected is the override for
  // initials the card cannot know, never a mirror the registry
  // hand-copies and rots.
  // THE MIGRATED CHANNEL (2026-09-25: the tts card's ports went
  // knob-aligned — `text`, per the flow-contract law that pins port
  // keys ⊆ schema keys (service-plane.spec's flow-port arm). The
  // probe wired the pre-migration `prompt` declaration and went
  // stale; it now wires the migrated channel. The LAW under test —
  // derive-when-declared, refuse-when-contradicted — is unchanged.
  const ttsCardStage = (expected: Record<string, string>): Record<string, unknown> => ({
    id: "tts",
    engine: "comfyui",
    card: "tts",
    description: "the derivation probe (roadmap §12 wall)",
    inputs: { text: { initial: "the words to speak" } },
    outputs: {},
    card_io: { wav: "audio" },
    expected,
    params: { model: "qwen3-tts", text: "$text", seed: 42 },
  });

  it("a card-declared input with NO hand-written kind derives from the card's own port map (200, never 'wired but untyped')", () => {
    const answer = inlineArm({
      flow_inline: {
        id: "probe-derived",
        description: "roadmap §12 derivation probe",
        stages: [ttsCardStage({})],
      },
    }, cards);
    assert.equal(answer.status, 200,
      `a text input the tts card declares as 'text' derives — no mirror owed. Got: ${String(answer.payload["error"] ?? "?")}`);
  });

  it("a hand-written kind the card CONTRADICTS refuses LOUD (never compiles a lie)", () => {
    const answer = inlineArm({
      flow_inline: {
        id: "probe-contradiction",
        description: "roadmap §12 contradiction probe",
        stages: [ttsCardStage({ text: "image" })],
      },
    }, cards);
    assert.notEqual(answer.status, 200, "a contradictory hand-written kind must refuse");
    assert.match(
      String(answer.payload["error"] ?? ""),
      /input "text": expected kind "image" contradicts card "tts" \(the card declares "text"\)/,
      "the refusal names the card, the port, and the card's own kind",
    );
  });
});

describe("the hermetic engine (the gate-37 flake cure: no live socket on the boot path)", () => {
  it("every prime rode the mock", () => {
    assertHermeticRode();
  });
});
