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

describe("the flow-registry wiring wall (the live door's own construction, over every registry flow)", () => {
  it("serves a non-empty registry", () => {
    // C-M7 (the wall audit, 2026-09-28): `>= 10` against the real
    // flow count let flows die silently. The census is exact, and it
    // is the registry's own name list — no hand number beside it.
    // The count is the CUT roster's (2026-10-13: five 3D/rig rows
    // retired; body-to-somax stays — the motion studio drives it)
    // + character-factory (2026-10-09: the AssetFurnace-shape
    // lift→rig→motion chain, gap audit 012)
    // + object-forge (2026-10-11: concept→lift→remesh, all card=,
    // the second {flow:}-door one-shot).
    const names = SEED.names();
    assert.equal(names.length, 10, `the registry serves exactly 10 flows, got ${names.length}`);
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
