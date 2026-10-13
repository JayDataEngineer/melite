// card-definition-schema.spec.ts — THE CARD ENVELOPE GATE'S TEETH
// (the strictness audit's T1). registerCard runs every card —
// built-in OR hot plugin — through a strict schemastery resolve
// before the semantic doors: a carried key the interface never
// declares refuses LOUD here, named. The boot specs (carddefs, the
// estate's cards-registry walls) prove the real cards pass clean.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { validateCardDefinition } from "../src/card-definition-schema.ts";
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';

const valid = {
  id: "image-gen",
  skeleton: "image-gen-stage",
  boarded: ["flux"],
  tags: ["image"],
  schema: (v: unknown) => (v as Record<string, unknown>),
  compose: () => {},
  sidebar: { key: "image", order: 1, hidden: false },
  flowKinds: { inputs: {}, outputs: { image: "IMAGE" }, requiresModel: true },
} as unknown as CardDefinition;

describe("the card envelope schema gate (registerCard's first door)", () => {
  it("a healthy def passes clean", () => {
    validateCardDefinition(valid);
  });

  it("THE AUDIT'S GATE: a typo'd key refuses as drift, named (boardd)", () => {
    assert.throws(
      () => validateCardDefinition({ ...valid, boardd: ["flux"] } as unknown as CardDefinition),
      (e: unknown) => e instanceof Error && /unknown key\(s\) refused.*boardd/.test(e.message),
    );
  });

  it("every interface key admits its def (the envelope covers the whole interface)", () => {
    const full = {
      ...valid,
      requiresModel: true,
      admits: ["renderer"],
      jsonArrayParams: ["regions"],
      spells: ["image"],
      requires: ["pack"],
      requiresByFamily: { flux: ["pack"] },
      preview: { historyStrip: false, timeline: true },
      mods: [],
      schemaCarrier: undefined,
      finalize: (g: unknown) => g,
      identity: { label: "L", description: "D", genre: "image" },
      provisions: [],
      armWeights: () => [],
      surface: { size: "huge", layout: "studio" },
      flowOutputBindings: [],
      primaryFile: "mask_combined",
    } as unknown as CardDefinition;
    validateCardDefinition(full);
  });

  it("a shape miss refuses in the envelope's voice (the wrapped ValidationError)", () => {
    assert.throws(
      () => validateCardDefinition({ ...valid, id: 42 } as unknown as CardDefinition),
      (e: unknown) => e instanceof Error && /card-envelope/.test(String((e as { code?: string }).code))
        && /envelope schema refused/.test(e.message),
    );
    assert.throws(
      () => validateCardDefinition({ ...valid, boarded: "flux" } as unknown as CardDefinition),
      /envelope schema refused.*boarded/,
    );
  });

  it("drift names every unknown key, sorted", () => {
    assert.throws(
      () => validateCardDefinition({ ...valid, zeta: 1, alpha: 2 } as unknown as CardDefinition),
      /alpha, zeta/,
    );
  });
});
