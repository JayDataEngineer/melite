// THE PER-FILE BOOT (li-m, 2026-10-10 — the estate boot brick and
// its test-side lesson). Models never boot at import: the old
// `await cascadeInit` at the package root hung EVERY importer on one
// stalled family composition (a 3088 boot that printed nothing for
// minutes, zero pending I/O). The boot is lazy now, and a spec that
// reads the model table synchronously — `getModel`/`modelIds`/
// `buildCatalog` at describe scope, which is how most card specs
// read — owns that world explicitly.
//
// WHY NOT A GLOBAL SETUP FILE: a vitest setup runs before the spec
// and imports the engine barrel, which evaluates the modules a spec
// intends to `vi.mock`. The transport-seam mocks
// (comfyui-control.spec.ts) were silently disarmed — the real
// module answered, its best-effort swallow hid the failure, and the
// suite went red with no cause at the seam. There is deliberately
// NO models pre-boot in vitest.config.ts; specs that need it import
// THIS file as their FIRST import. The module's top-level await
// settles before the importing spec's own imports evaluate, so a
// describe-scope read sees a booted service — the same guarantee,
// scoped to the files that ask for it.
import { cascadeInit } from "../../packages/engines/comfyui-cordis/src/models/models.ts";

await cascadeInit();

export {};
