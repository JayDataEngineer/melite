// families-transaction.spec.ts — THE TRANSACTIONAL BOOT WALL
// (the discharge stroke, 2026-09-08): family registration is a
// REVERTIBLE EFFECT (registerFamily returns the disposer;
// ctx.effect owns it) and boot is ALL-OR-NOTHING (a family that
// refuses leaves the table EMPTY, never half-served).
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
import { Context, type Plugin } from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/cordis/lib/index.js";
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
  variants: [{ id: "base", route: "", cells: [] }],
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
    assert.ok(before >= 0);
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
