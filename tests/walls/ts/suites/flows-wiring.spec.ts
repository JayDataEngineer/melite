// flows-wiring.spec.ts — THE FLOW-REGISTRY WIRING WALL (the
// round-trip stroke 2026-09-20): every registry flow must pass the
// SAME construction the live /v1/flows/validate door runs for a
// named flow — expandRegistryFlow → registryFlowToInline →
// inlineArm against the primed card registry.
//
// The hole this closes: audio-native-tts shipped with a wired
// `prompt` input and NO expected Kind (kindsOk's own law: "every
// input needs an expected Kind"), and NO wall ever ran the
// registry's flows through the door's validators — only the live
// HTTP path tripped it, months after the row landed. A registry
// that no wall compiles is a registry that can rot.
//
// Run: npx vitest run tests/walls/ts/suites/flows-wiring.spec.ts

import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowNames,
  registryFlowToInline,
} from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { inlineArm } from "../../../../packages/harness/estate-queue/src/runsValidateServe.ts";
import type { CardRegistryLike } from "../../../../packages/harness/estate-queue/src/runsValidateShared.ts";

let cards: CardRegistryLike;

beforeAll(async (): Promise<void> => {
  const ctx = new Context();
  const svc = new CardRegistryService(ctx);
  await svc.prime();
  cards = svc as unknown as CardRegistryLike;
});

describe("the flow-registry wiring wall (the live door's own construction, over every registry flow)", () => {
  it("serves a non-empty registry", () => {
    const names = registryFlowNames();
    assert.ok(names.length >= 10, `expected ≥10 registry flows, got ${names.length}`);
  });

  it("every registry flow compiles through inlineArm at 200 (wires + kinds + card gate + $channels)", () => {
    const failures: string[] = [];
    for (const name of registryFlowNames()) {
      const decl = getRegistryFlow(name);
      assert.ok(decl !== undefined, `registry names ${name} but the getter misses it`);
      const inlineDoc = registryFlowToInline(expandRegistryFlow(decl!));
      const answer = inlineArm({ flow_inline: inlineDoc }, cards);
      if (answer.status !== 200) {
        failures.push(`${name}: ${String(answer.payload["error"] ?? "?").slice(0, 160)}`);
      }
    }
    assert.deepEqual(failures, [], "every registry flow must validate through the door's own construction");
  });

  it("the kindsOk law is pinned on the tts row (the hole this wall closed): every wired input has its expected Kind", () => {
    const tts = registryFlowToInline(expandRegistryFlow(getRegistryFlow("audio-native-tts")!)) as {
      stages: Array<{ inputs: Record<string, unknown>; expected: Record<string, string> }>;
    };
    const stage = tts.stages[0]!;
    for (const name of Object.keys(stage.inputs)) {
      assert.ok(stage.expected[name] !== undefined,
        `audio-native-tts stage wires input '${name}' with no expected Kind — the exact hole this wall closed`);
    }
  });

  // ── THE DERIVATION LAW (roadmap §12): a card stage's input kind
  // DERIVES from the card's own flowKinds.inputs when the port is
  // declared — the hand-written expected is the override for
  // initials the card cannot know, never a mirror the registry
  // hand-copies and rots.
  const ttsCardStage = (expected: Record<string, string>): Record<string, unknown> => ({
    id: "tts",
    engine: "comfyui",
    card: "tts",
    description: "the derivation probe (roadmap §12 wall)",
    inputs: { prompt: { initial: "prompt" } },
    outputs: {},
    card_io: { wav: "audio" },
    expected,
    params: { model: "qwen3-tts", text: "$prompt", seed: 42 },
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
      `a prompt input the tts card declares as 'text' derives — no mirror owed. Got: ${String(answer.payload["error"] ?? "?")}`);
  });

  it("a hand-written kind the card CONTRADICTS refuses LOUD (never compiles a lie)", () => {
    const answer = inlineArm({
      flow_inline: {
        id: "probe-contradiction",
        description: "roadmap §12 contradiction probe",
        stages: [ttsCardStage({ prompt: "image" })],
      },
    }, cards);
    assert.notEqual(answer.status, 200, "a contradictory hand-written kind must refuse");
    assert.match(
      String(answer.payload["error"] ?? ""),
      /prompt.*contradicts card.*tts.*declares.*text/s,
      "the refusal names the card, the port, and the card's own kind",
    );
  });
});
