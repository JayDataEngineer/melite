// types.spec.ts — the pure-type GATE files (card, character,
// loraTypes, mediaTypes, studio, FlowTypes, schema.d.ts)
// carry zero runtime exports, so importing them (plus the index barrel
// that re-exports all) is the 100% play. The type-level assertions below
// pin representative shapes so the imports are load-bearing, not bare.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { FormField } from "../src/wireTypes.ts";
import type { CardStage } from "../src/card.ts";
import type { Character } from "../src/character.ts";
import type { LoRAEntry } from "../src/loraTypes.ts";
import type { StudioTenantProps } from "../src/studio.ts";
import type { FlowDoc } from "../src/FlowTypes.ts";
import * as barrel from "../src/index.ts";

describe("pure-type GATE files import cleanly", () => {
  it("barrel re-exports the runtime surface", () => {
    assert.equal(typeof barrel.isProvenance, "function");
    assert.equal(typeof barrel.normalizeSegmentStatus, "function");
    assert.equal(typeof barrel.isDataUrl, "function");
    assert.equal(typeof barrel.subcardId, "function");
  });

  it("representative shapes compile as declared", () => {
    const stage: CardStage = { id: "s", params: {} } as CardStage;
    const character: Character = { id: "c" } as unknown as Character;
    const lora: LoRAEntry = { id: "l", strength: 1 };
    const tenant: StudioTenantProps = {} as unknown as StudioTenantProps;
    const doc: FlowDoc = { id: "f" } as unknown as FlowDoc;
    const formField: FormField = {
      key: "k",
    } as unknown as FormField;
    for (const v of [
      stage,
      character,
      lora,
      tenant,
      doc,
      formField,
    ]) {
      assert.ok(v !== null);
    }
  });
});
