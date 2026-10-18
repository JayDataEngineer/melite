import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, test } from 'vitest'
import { Context, type Plugin } from '@deepseek-ai/cordis'
import { ACQUIRE_STALL_TIMEOUT_MS } from "@melite/estate-provisioning";
import composition, { ProvisioningCompositionConfig } from '../src/provisioning.ts'

function contextWithCards(): Context {
  const ctx = new Context()
  const get = ctx.get.bind(ctx)
  ctx.get = ((name: string) => name === 'cardRegistry'
    ? { defsSync: () => new Map() }
    : get(name)) as typeof ctx.get
  return ctx
}

describe('the provisioning declaration path', () => {
  test('resolves a served model route through its owning declaration', async () => {
    const ctx = contextWithCards()
    try {
      // Narrow the Plugin union to its real object arm: provisioning.ts
      // exports the { name, inject, apply } shape, and .apply is not
      // callable on the broad Function | Constructor | Object union.
      const plugin: Plugin.Object = composition
      plugin.apply(ctx, undefined)
      for (const id of ['h3-timeline', 'qwen-img-edit-21-int8', 'krea-2-raw']) {
        const plan = await ctx.provisioning.plan({ kind: 'model', owner: 'family', id })
        expect(plan.ref).toEqual({ kind: 'model', owner: 'family', id })
        expect(plan.items.length).toBeGreaterThan(0)
        expect(plan.items.every((item) => item.kind === 'model' && item.owner === 'family' && item.id === id)).toBe(true)
        if (id === 'krea-2-raw') {
          expect(plan.items.some((item) => item.kind === 'model' && item.name === 'krea2_raw_int8_convrot.safetensors' && item.variant === 'raw' && item.quant === 'int8')).toBe(true)
        }
      }
    } finally {
      await ctx.fiber.dispose()
    }
  })
})

describe("the acquire stall budget's deployment face (P5 F1)", () => {
  // ERRORS k2's stuck acquire (39 bytes frozen forever) ended only when
  // the stall watchdog failed it — but the budget rode a hardcoded
  // constant: the composition built ProvisioningConfig WITHOUT
  // acquireStallTimeoutMs, so a lossy-link operator could not widen the
  // window from deployment (cordis.yml / the composition Config face).
  // These arms judge the whole deployment path: the schema twin carries
  // the field (never stripped as unknown), the builder passes it, and
  // the mounted service's validated face answers it.
  test("the Config slot binds the twin (F-1: the silent-strip edge)", () => {
    // JOURNEY F-1 (not covered by the first three arms): they call the
    // EXPORTED twin directly — a stripped twin swapped into the Config
    // slot would keep them green while production (cordis parsing
    // cordis.yml through the slot) strips the field. This pin binds
    // the slot to the twin: the seam cordis actually invokes.
    const plugin: Plugin.Object = composition;
    expect(plugin.Config).toBe(ProvisioningCompositionConfig);
  });

  test("an operator-set budget rides schema -> composition -> mounted service", async () => {
    // THE SCHEMA NEVER STRIPS IT (the silent-strip guard): cordis
    // parses cordis.yml through this twin before apply — a field the
    // twin drops never reaches the builder, and the operator's tuning
    // would die silent. The callable schema validates AND normalizes.
    const parsed = ProvisioningCompositionConfig({ acquireStallTimeoutMs: 42_000 });
    expect(parsed.acquireStallTimeoutMs).toBe(42_000);
    const ctx = contextWithCards();
    try {
      const plugin: Plugin.Object = composition;
      plugin.apply(ctx, parsed);
      expect(ctx.provisioning.stallBudgetMs()).toBe(42_000);
    } finally {
      await ctx.fiber.dispose();
    }
  });

  test("an unset budget stays service-owned (the default is the contract, not a fallback)", async () => {
    const ctx = contextWithCards();
    try {
      const plugin: Plugin.Object = composition;
      plugin.apply(ctx, {});
      expect(ctx.provisioning.stallBudgetMs()).toBe(ACQUIRE_STALL_TIMEOUT_MS);
    } finally {
      await ctx.fiber.dispose();
    }
  });

  test("a misconfigured budget refuses loud at boot (never silently defaulted)", async () => {
    for (const bad of [0, -5, 2.5]) {
      const ctx = contextWithCards();
      try {
        const plugin: Plugin.Object = composition;
        expect(() => plugin.apply(ctx, { acquireStallTimeoutMs: bad })).toThrow(/positive integer/);
      } finally {
        await ctx.fiber.dispose();
      }
    }
  });
});
