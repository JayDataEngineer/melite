// li-m WALL (the operator's boot brick, ROOT CUT): importing the
// package ROOT may never hang on the models boot. The old
// top-level `await cascadeInit` meant one stalled family
// composition deadlocked EVERY importer (cards, doors, queue — 36
// import sites), bricking the whole estate boot with zero output.
// The import is side-effect-cheap now; the boot happens where
// models are used (cardsRegistry applies `await bootModels()`),
// and the sync readers throw the named refusal before any boot.
import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";

// The rejecting-boot probe's own state rides vi.hoisted so the mock
// factory (hoisted above every import in the module graph) can reach it.
const boot = vi.hoisted(() => ({ calls: 0 }));

describe("THE IMPORT CHEAPNESS WALL (li-m)", () => {
  it("the package root resolves WITHOUT awaiting the models boot (a fresh module graph, a hard timeout)", async () => {
    const mod = await Promise.race([
      import("../src/index.ts"),
      new Promise<never>((_, reject) =>
        // 10s, not 2s (2026-10-12): this is a HANG detector — a
        // real li-m regression (a top-level await on the models
        // boot) never resolves, while a healthy cold import on a
        // loaded machine (pre-push runs beside the estate and
        // ComfyUI) measured 2.02s against the old 2s budget and
        // false-positived the push gate three times in a row.
        setTimeout(() => reject(new Error("IMPORT HANG: the package root still awaits the models boot (the li-m regression)")), 10_000),
      ),
    ]);
    assert.ok(mod !== null && mod !== undefined);
  });

  it("cascadeInit stays exported and memoizes (one boot per module registry, however many callers ask)", async () => {
    const mod = await import("../src/models/models.ts");
    assert.equal(typeof mod.cascadeInit, "function");
    assert.equal(mod.cascadeInit(), mod.cascadeInit());
    await mod.cascadeInit();
  });

  it("a REFUSED boot clears the memo, so the next call re-boots (bootModels' own retry law)", async () => {
    // Every in-tree boot is green, so the rejection handler below
    // cascadeInit's bootModels call is otherwise never reached. A
    // refusing boot is driven here through a mocked service module.
    boot.calls = 0;
    vi.resetModules();
    vi.doMock("../src/models/service.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/models/service.ts")>();
      return {
        ...actual,
        bootModels: (): Promise<never> => {
          boot.calls += 1;
          return Promise.reject(new Error("probe: the boot refused"));
        },
      };
    });
    try {
      const mod = await import("../src/models/models.ts");
      await assert.rejects(mod.cascadeInit(), /probe: the boot refused/u);
      // the memoized promise was the refused one and the handler nulled
      // it: the SECOND call re-boots rather than re-serving the dead
      // promise (two bootModels calls, not one).
      await assert.rejects(mod.cascadeInit(), /probe: the boot refused/u);
      assert.equal(boot.calls, 2, "the refused memo was cleared — the next call re-boots");
    } finally {
      vi.doUnmock("../src/models/service.ts");
      vi.resetModules();
    }
  });
});
