// tool-projection.spec.ts — the registry-native projection: the
// identity fence (missing label/description refuse LOUD), the
// boarded[0] model (null rides), the wire name, and the live
// params_schema (required omitted when empty).
import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import {
  baseRowFor,
  projectCardRow,
  toolBaseRows,
} from "../src/toolProjection.ts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";

// The table-failure seat: this worker never boots the models table,
// so every arm above rides the unbooted fallback. One arm forces the
// booted-but-broken table to prove the outer catch keeps the bare
// fallback instead of throwing.
const tableSeat = vi.hoisted(() => ({ broken: false }));

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return {
    ...real,
    modelsBooted: (): boolean => (tableSeat.broken ? true : real.modelsBooted()),
    modelsService: () => {
      if (tableSeat.broken) throw new Error("table failure keeps the bare fallback");
      return real.modelsService();
    },
  };
});

const DEF = (over: Record<string, unknown> = {}): CardDefinition =>
  ({
    identity: { label: "L", description: "d" },
    boarded: ["fam-a"],
    schema: { dict: {} },
    ...over,
  }) as unknown as CardDefinition;
const DEFS = (rows: Array<[string, CardDefinition]>): ReadonlyMap<string, CardDefinition> =>
  new Map(rows);

describe("toolBaseRows", () => {
  it("derives the wire row (name/version/kind/model/titles)", () => {
    const rows = toolBaseRows(DEFS([["img-gen", DEF()]]));
    assert.deepEqual(rows.get("img-gen"), {
      name: "img_gen_card",
      version: 1,
      kind: "card-compose",
      card: "img-gen",
      model: "fam-a",
      stageTitle: "L",
      description: "d",
    });
  });

  it("boarded-less cards serve null (multi boards pick [0])", () => {
    const rows = toolBaseRows(
      DEFS([
        ["pure", DEF({ boarded: [] })],
        ["multi", DEF({ boarded: ["a", "b"] })],
      ]),
    );
    assert.equal(rows.get("pure")?.model, null);
    assert.equal(rows.get("multi")?.model, "a");
  });

  it("a failing table keeps the bare boarded fallback (the caller never throws for a missing style)", () => {
    tableSeat.broken = true;
    try {
      const rows = toolBaseRows(DEFS([["img-gen", DEF()]]));
      assert.equal(rows.get("img-gen")?.model, "fam-a");
    } finally {
      tableSeat.broken = false;
    }
  });

  it("missing prose refuses LOUD (each fence leg)", () => {
    assert.throws(
      () => toolBaseRows(DEFS([["x", DEF({ identity: undefined })]])),
      /carries no identity/,
    );
    assert.throws(
      () => toolBaseRows(DEFS([["x", DEF({ identity: { label: "", description: "d" } })]])),
      /carries no identity/,
    );
    assert.throws(
      () => toolBaseRows(DEFS([["x", DEF({ identity: { label: "L", description: "" } })]])),
      /carries no identity/,
    );
  });
});

describe("baseRowFor", () => {
  it("unregistered ids refuse at the map fence", () => {
    assert.throws(() => baseRowFor(DEFS([]), "ghost"), /has no registry entry/);
    assert.equal(baseRowFor(DEFS([["c", DEF()]]), "c").card, "c");
  });
});

describe("projectCardRow", () => {
  it("emits the manifest row (empty required omitted)", () => {
    const row = projectCardRow(DEF(), toolBaseRows(DEFS([["c", DEF()]])).get("c")!);
    assert.equal(row.name, "c_card");
    assert.equal(row.flow, "");
    assert.equal(row.hidden, null);
    assert.equal(row.paramsSchema.type, "object");
    assert.equal("required" in (row.paramsSchema as Record<string, unknown>), false);
  });

  it("required knobs ride; multi boards gain the model knob", () => {
    const def = DEF({
      boarded: ["a", "b"],
      schema: { dict: { p: { type: "string", meta: { extra: { required: true } } } } },
    });
    const row = projectCardRow(def, toolBaseRows(DEFS([["c", def]])).get("c")!);
    const schema = row.paramsSchema as { required?: string[]; properties: Record<string, unknown> };
    assert.deepEqual(schema.required, ["p"]);
    assert.ok("model" in schema.properties);
  });

  it("the carrier mirror wins over the schema", () => {
    const def = DEF({
      schema: { dict: {} },
      schemaCarrier: { dict: { q: { type: "string" } } },
    });
    const row = projectCardRow(def, toolBaseRows(DEFS([["c", def]])).get("c")!);
    const schema = row.paramsSchema as { properties: Record<string, unknown> };
    assert.ok("q" in schema.properties);
  });
});
