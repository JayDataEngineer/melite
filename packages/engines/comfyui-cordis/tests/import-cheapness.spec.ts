// li-m WALL (the operator's boot brick, ROOT CUT): importing the
// package ROOT may never hang on the models boot. The old
// top-level `await cascadeInit` meant one stalled family
// composition deadlocked EVERY importer (cards, doors, queue — 36
// import sites), bricking the whole estate boot with zero output.
// The import is side-effect-cheap now; the boot happens where
// models are used (cardsRegistry applies `await bootModels()`),
// and the sync readers throw the named refusal before any boot.
import { describe, it } from "vitest";
import assert from "node:assert/strict";

describe("THE IMPORT CHEAPNESS WALL (li-m)", () => {
  it("the package root resolves WITHOUT awaiting the models boot (a fresh module graph, a hard timeout)", async () => {
    const mod = await Promise.race([
      import("../src/index.ts"),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("IMPORT HANG: the package root still awaits the models boot (the li-m regression)")), 2_000),
      ),
    ]);
    assert.ok(mod !== null && mod !== undefined);
  });

  it("cascadeInit stays exported (the shared once-per-process boot promise)", async () => {
    const mod = await import("../src/models/models.ts");
    assert.equal(typeof mod.cascadeInit.then, "function");
  });
});
