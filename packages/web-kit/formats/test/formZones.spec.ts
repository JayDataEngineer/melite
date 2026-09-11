// formZones.spec.ts — the form-card zone backstops.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { FORM_ZONES, zoneByField, zoneOfGroup } from "../src/formZones.ts";
import type { SchemaGroupDef } from "@melite/contracts";

const group = (over: Record<string, unknown> = {}): SchemaGroupDef =>
  ({
    id: "g",
    label: "G",
    order: 0,
    collapsed: false,
    fields: [],
    zone: "params",
    ...over,
  }) as unknown as SchemaGroupDef;

describe("zoneOfGroup", () => {
  it("passes every known zone through", () => {
    for (const z of FORM_ZONES) {
      assert.equal(zoneOfGroup(group({ zone: z })), z);
    }
  });

  it("defaults an absent zone to params", () => {
    assert.equal(
      zoneOfGroup({ zone: undefined } as unknown as Pick<SchemaGroupDef, "zone">),
      "params",
    );
  });

  it("maps an unknown zone to params", () => {
    assert.equal(
      zoneOfGroup({ zone: "weird" } as unknown as Pick<SchemaGroupDef, "zone">),
      "params",
    );
  });
});

describe("zoneByField", () => {
  it("returns an empty map for null and empty input", () => {
    assert.equal(zoneByField(null as unknown as SchemaGroupDef[]).size, 0);
    assert.equal(zoneByField([]).size, 0);
  });

  it("maps each field to its group's zone", () => {
    const map = zoneByField([
      group({
        zone: "inputs",
        fields: [{ name: "image" }, { name: "video" }],
      }),
      group({ zone: "params", fields: [{ name: "steps" }] }),
    ]);
    assert.equal(map.get("image"), "inputs");
    assert.equal(map.get("video"), "inputs");
    assert.equal(map.get("steps"), "params");
    assert.equal(map.get("missing"), undefined);
  });

  it("tolerates a group with missing fields", () => {
    const map = zoneByField([
      { zone: "mods" } as unknown as SchemaGroupDef,
      group({ zone: "inputs", fields: [{ name: "image" }] }),
    ]);
    assert.equal(map.size, 1);
    assert.equal(map.get("image"), "inputs");
  });
});
