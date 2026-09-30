// load-card-order.spec.ts — the load door's CARD arm reads the
// referent before the dependency that serves it.
//
// The order is only observable when the two failures can compete: a
// lane whose models singleton never booted, asked for a card that
// does not exist. Read the seat first and the caller is told the
// engine is unprovisioned; read the referent first and the caller is
// told the card is unknown. Those are different repairs, so the door
// must say the right one.
//
// The stub replaces only `modelsService` (the barrel's singleton
// accessor) and keeps every other export real, so loadCard's real
// body runs against the real card registry shape.
import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return {
    ...mod,
    modelsService: (): never => {
      throw new Error("models service not booted — await bootModels() first");
    },
  };
});

const { loadCard } = await import("../src/loadPlane.ts");

/** A one-card registry: `anny` exists, everything else does not. */
const cards = {
  defsSync: (): Map<string, unknown> =>
    new Map<string, unknown>([["anny", { id: "anny", boarded: [] }]]),
  modelMids: (): Set<string> => new Set<string>(),
};

describe("loadCard — admission before the dependency", () => {
  it("an unknown card answers with the CARD's refusal on an unbooted lane", () => {
    // modelsSeat is null AND the singleton throws: the exact
    // competition. Read the dependency first and this throws
    // "models service not booted" for a name the registry never
    // held.
    assert.throws(
      () => loadCard("/repo", cards as never, null, "ghost-card"),
      /disclose: unknown card 'ghost-card'/,
    );
  });

  it("a card that EXISTS still reaches the dependency and reports it", () => {
    // The order swap must not swallow a real bootstrap failure: the
    // seated card needs the table, and the table's refusal is the
    // truth here.
    assert.throws(
      () => loadCard("/repo", cards as never, null, "anny"),
      /models service not booted/,
    );
  });
});
