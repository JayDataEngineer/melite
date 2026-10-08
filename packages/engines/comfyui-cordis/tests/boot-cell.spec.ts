// The single-instance contract (design
// dev_docs/design/models-table-single-instance-2026-10-18.md): a
// consumer install nests same-version copies of this package
// per-edge (the drive-2 settle probe's four-copy evidence), and
// module-scoped memos split the booted table across seat stacks —
// the web bundle's boot primes one copy while the tools plane
// reads another and refuses "models service not booted". The
// boot cell anchors the memo on globalThis, so every copy in one
// process converges. These walls pin that convergence with a real
// second copy: the same module imported under a distinct query is
// a separate ESM instance with its own module scope.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { resetModelsBootForTests } from "../src/models/service.ts";

const COPY_B_QUERY = "../src/models/service.ts?copy=2";

describe("the models boot cell (single instance per process)", () => {
  it("two module copies in one process converge on ONE booted table", async () => {
    resetModelsBootForTests();
    const [a, b] = await Promise.all([
      import("../src/models/service.ts"),
      import(COPY_B_QUERY),
    ]);
    // the copies are distinct module instances (the premise of the
    // consumer failure — if the registry collapsed them, these
    // walls would pass vacuously, so pin the distinctness first).
    assert.notEqual(a.bootModels, b.bootModels, "distinct module copies");
    const [svcA, svcB] = await Promise.all([a.bootModels(), b.bootModels()]);
    assert.equal(svcB, svcA, "both copies serve the one booted service");
    assert.equal(b.modelsService(), a.modelsService(), "the sync readers converge too");
    assert.equal(a.modelsBooted(), b.modelsBooted(), "the boot probe reads one cell");
  });

  it("a copy's reset clears the cell every copy reads (one storage, not N)", async () => {
    const a = await import("../src/models/service.ts");
    const b = await import(COPY_B_QUERY);
    await a.bootModels();
    assert.ok(b.modelsBooted(), "copy B sees copy A's boot");
    b.resetModelsBootForTests();
    assert.ok(!a.modelsBooted(), "the reset cleared the shared cell");
    // leave the worker booted for later files: re-prime through A.
    await a.bootModels();
  });
});
