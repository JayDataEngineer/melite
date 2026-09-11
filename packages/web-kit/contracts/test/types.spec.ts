// types.spec.ts — the pure-type GATE files (card, character, enhanceTypes,
// loraTypes, mediaTypes, regions, studio, wire, FlowTypes, schema.d.ts)
// carry zero runtime exports, so importing them (plus the index barrel
// that re-exports all) is the 100% play. The type-level assertions below
// pin representative shapes so the imports are load-bearing, not bare.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { CardStage } from "../src/card.ts";
import type { Character } from "../src/character.ts";
import type { EnhanceModel } from "../src/enhanceTypes.ts";
import type { LoRAEntry } from "../src/loraTypes.ts";
import type { MediaAsset } from "../src/mediaTypes.ts";
import type { AppSidebarProps } from "../src/regions.ts";
import type { StudioTenantProps } from "../src/studio.ts";
import type { PluginRow } from "../src/wire.ts";
import type { FlowDoc } from "../src/FlowTypes.ts";
import type { components } from "../src/schema.d.ts";
import * as barrel from "../src/index.ts";

describe("pure-type GATE files import cleanly", () => {
  it("barrel re-exports the runtime surface", () => {
    assert.equal(typeof barrel.isProvenance, "function");
    assert.equal(typeof barrel.normalizeSegmentStatus, "function");
    assert.equal(typeof barrel.dataUrlToObjectUrl, "function");
    assert.equal(typeof barrel.optionValue, "function");
    assert.equal(typeof barrel.subcardId, "function");
  });

  it("representative shapes compile as declared", () => {
    const stage: CardStage = { id: "s", params: {} } as CardStage;
    const character: Character = { id: "c" } as unknown as Character;
    const enhance: EnhanceModel = { id: "e" } as unknown as EnhanceModel;
    const lora: LoRAEntry = { id: "l", strength: 1 };
    const asset: MediaAsset = { id: "m" } as unknown as MediaAsset;
    const sidebar: AppSidebarProps = {} as unknown as AppSidebarProps;
    const tenant: StudioTenantProps = {} as unknown as StudioTenantProps;
    const plugin: PluginRow = { id: "p" } as unknown as PluginRow;
    const doc: FlowDoc = { id: "f" } as unknown as FlowDoc;
    const formField: components["schemas"]["FormField"] = {
      key: "k",
    } as unknown as components["schemas"]["FormField"];
    for (const v of [
      stage,
      character,
      enhance,
      lora,
      asset,
      sidebar,
      tenant,
      plugin,
      doc,
      formField,
    ]) {
      assert.ok(v !== null);
    }
  });
});
