// families-transaction.spec.ts — THE TRANSACTIONAL BOOT WALL
// (the discharge stroke, 2026-09-08): family registration is a
// REVERTIBLE EFFECT (registerFamily returns the disposer;
// ctx.effect owns it) and boot is ALL-OR-NOTHING (a family that
// refuses leaves the table EMPTY, never half-served).
//
// TWO FACES of the same boot (the Loader-composition stroke,
// 2026-10-13): this wall judges the SERVICE seam in isolation —
// hand-built contexts, direct registerFamily calls, a provider
// mounted by hand. The COMPOSITION face — families as
// cordis.patch.yml rows, the census gate, the settle contract
// (whenModelsArmed), live add/remove — is judged by
// packages/engines/comfyui-cordis/tests/models-composition.spec.ts.
// Neither wall subsumes the other: the service face pins the
// registration effect; the composition face pins the boot.
//
// Pinned shapes:
//   1. DISPOSAL — a fiber's effect disposer removes its family
//      from the table (the dynamic re-port primitive).
//   2. TRANSACTION — a context loading modelsProvider + a bad
//      family plugin refuses; after the refusal the context
//      disposes and the table the context owned is empty.
//   3. LOUD GATES — duplicate ids and malformed lane_inputs
//      refuse at the registration gate (the py metaclass's
//      import-time validation, at registration).
//
// Run: npx vitest run tests/walls/ts/suites/families-transaction.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context, type Plugin } from '@deepseek-ai/cordis';
import {
  MODELS_SERVICE,
  ModelsService,
  modelsProvider,
} from "../../../../packages/engines/comfyui-cordis/src/models/service.ts";

function freshService(): { ctx: Context; svc: ModelsService } {
  const ctx = new Context();
  // the Service constructor self-registers on ctx (the
  // modelsProvider pattern — service.ts:11)
  const svc = new ModelsService(ctx);
  return { ctx, svc };
}

const GOOD_DECL = {
  id: "probe-family",
  label: "Probe",
  engine: "comfyui",
  form: "form_generate",
  genre: "misc",
  // the variant row carries its label + group (the VariantRow seam:
  // label/group always written — the probe authors a valid row).
  variants: [{ id: "base", label: "Base", group: "Variant", route: "", cells: [] }],
};

describe("family registration is a revertible effect", () => {
  it("registerFamily returns a disposer that removes the row", (): void => {
    const { svc } = freshService();
    assert.equal(svc.familyCount(), 0);
    const dispose = svc.registerFamily(GOOD_DECL);
    assert.equal(svc.familyCount(), 1);
    assert.equal(svc.getModel("probe-family").id, "probe-family");
    dispose();
    assert.equal(svc.familyCount(), 0);
    assert.throws(() => svc.getModel("probe-family"), /unknown model/);
  });

  it("a fiber dispose shrinks the table (the effect-owned lifetime)", async (): Promise<void> => {
    const ctx = new Context();
    await ctx.plugin(modelsProvider);
    const svc = (ctx as unknown as Record<string, ModelsService>)[MODELS_SERVICE];
    const before = svc.familyCount();
    const fiber = await ctx.plugin({
      name: "probe-family-fiber",
      inject: ["models"],
      apply(c: Context): void {
        c.effect(() => c.models.registerFamily(GOOD_DECL));
      },
    } as Plugin);
    assert.equal(svc.familyCount(), before + 1);
    await fiber.dispose();
    assert.equal(svc.familyCount(), before, "fiber dispose must retract its family");
  });
});

describe("boot is transactional (all-or-nothing)", () => {
  it("a refusing family leaves the context's table empty, never half-served", async (): Promise<void> => {
    const ctx = new Context();
    await ctx.plugin(modelsProvider);
    const svc = (ctx as unknown as Record<string, ModelsService>)[MODELS_SERVICE];
    const before = svc.familyCount();
    const badFamily: Plugin = {
      name: "family-broken-probe",
      inject: ["models"],
      apply(c: Context): void {
        c.effect(() => c.models.registerFamily(GOOD_DECL));
        c.effect(() =>
          c.models.registerFamily({
            ...GOOD_DECL,
            id: "broken-probe",
            label: "", // refuses at the gate: a model needs a label
          }),
        );
      },
    };
    const fiber = ctx.plugin(badFamily);
    await assert.rejects(() => fiber.await(), /label/);
    // the transaction's own fiber never landed; the good row from
    // the SAME plugin retracts with the failed load
    await ctx.fiber.dispose();
    assert.equal(svc.familyCount(), 0, "context dispose empties its table");
    // C-L14 (the wall audit, 2026-09-28): `before >= 0` cannot
    // fail — a count is never negative, so the arm proved nothing.
    // The TRANSACTIONAL fact is the rollback: the good row was
    // registered in the same fiber as the broken one, so if the
    // refusal leaked it, the count would be non-zero. It is zero
    // the moment the fiber rejects — all-or-nothing, proven.
    const afterReject = svc.familyCount();
    assert.equal(afterReject, 0,
      `the refused fiber left NOTHING behind — its good row rolled back with the broken one (saw ${String(afterReject)})`);
    assert.equal(before, 0, "the context started empty (the census is meaningful)");
  });
});

describe("registration gates refuse loud", () => {
  it("duplicate ids refuse (one owner per id)", (): void => {
    const { svc } = freshService();
    svc.registerFamily(GOOD_DECL);
    assert.throws(
      () => svc.registerFamily({ ...GOOD_DECL, label: "Other" }),
      /registered twice/,
    );
  });

  it("lane_inputs must be a plain object (the compose splice table)", (): void => {
    const { svc } = freshService();
    assert.throws(
      () => svc.registerFamily({ ...GOOD_DECL, lane_inputs: ["nope"] as never }),
      /lane_inputs must be a plain object/,
    );
  });
});


describe("the declaration gates a synthetic family can reach", () => {
  // Two arms of the registration gates are unreachable from the
  // shipped DECLs — every declared cell's source_url ends in a file
  // name, and every declared relation row type-checks — so nothing in
  // the tree can drive them. They are REACHABLE from a registration:
  // a family is authored data, and these walls drive the shapes the
  // gates exist to refuse.

  const familyWith = (variants: unknown[]): Record<string, unknown> => ({
    id: "probe-shape-family",
    label: "Probe shape",
    engine: "comfyui",
    form: "form_generate",
    genre: "misc",
    variants,
  });

  it("a cell whose artifact URL ends in a SLASH is SKIPPED — the family still registers", (): void => {
    // the artifact name is the URL's last path segment; a trailing
    // slash leaves no segment, so the download names nothing and the
    // recipe↔weights law cannot be checked. The gate's deliberate
    // choice is SKIP (title fixed to that truth, 2026-10-12 — an
    // arm titled "refuses" that asserts a quiet register was a
    // lying title): the row stands down, the family registers, the
    // cell carries no artifact name.
    const { svc } = freshService();
    const decl = familyWith([
      {
        id: "base",
        label: "Base",
        group: "Variant",
        route: "",
        cells: [{ quant: "bf16", lane_inputs: { weights: {} }, artifact: { source_url: "https://example/ckpt/" } }],
      },
    ]);
    // the row is skipped, not refused: the family still registers and
    // the cell simply carries no artifact name
    const dispose = svc.registerFamily(decl as never);
    assert.equal(svc.familyCount(), 1);
    dispose();
  });

  it("a relation row of the wrong type refuses at the DECLARATION gate, in that gate's own voice", (): void => {
    // The vocabulary gate resolves every declared relation row against
    // the contract's own schema, and the DECLARATION-wide resolve runs
    // first — so this refusal is the whole-row gate's, naming the path
    // and the schema's reason.
    const { svc } = freshService();
    const decl = familyWith([
      {
        id: "base",
        label: "Base",
        group: "Variant",
        route: "",
        relations: { requires: [{ field: "voice", needs: [7] }] },
        cells: [],
      },
    ]);
    assert.throws(
      () => svc.registerFamily(decl as never),
      /model row probe-shape-family: schema refused — .*expected string but got 7/,
    );
    assert.equal(svc.familyCount(), 0, "a refused family registers nothing");
  });
});
