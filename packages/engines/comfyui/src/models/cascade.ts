// models/cascade.ts — THE DEFAULTS CASCADE ON THE CORDIS PRIMITIVE
// (correction stroke A3: the operator's charge (a) answered).
//
// The first port hand-rolled the cascade on Object.assign — a
// DSH-AS-LANGUAGE defect (hand-rolling a shipped primitive). This
// module rides the framework's own inherency machinery:
//
//   ctx.intercept(name, config)  — cordis context.ts:139 — adds a
//     service-scoped intercept entry on a child context (ancestor
//     entries apply first; the parent is untouched);
//   Service[symbols.resolveConfig](base, head) — cordis service.ts:86
//     — walks the intercept chain root-closer-first, then merges
//     base → intercepts → head (Config.merge when declared, else
//     Object.assign — for flat defaults dicts the semantics are
//     exactly the py compose's closest-wins cascade).
//
// MAPPING: family defaults = base; variant resolver_defaults = the
// intercept (one link per resolve); cell wire defaults = head. The
// py compose's own declaration of ENGINE_TRUTH ("mode", "variant")
// rides unchanged — the cascade only merges DEFAULTS, never truth.
//
// Verified live before landing: intercept {steps:52} over base
// {steps:8, cfg:3.5} with head {seed:42} → {steps:52, cfg:3.5,
// seed:42}; the root context stays clean. The krea-2 pins (raw
// variant → steps 52/cfg 3.5 over family 1024/euler) hold — see
// the walls (models-registry, models-against-cards).

import { Context, Service, symbols } from "@deepseek-ai/cordis";

/** The service name every family's defaults resolve under. */
export const DEFAULTS_SERVICE = "models.defaults";

class ModelDefaultsService extends Service {
  constructor(ctx: Context) {
    super(ctx, DEFAULTS_SERVICE);
  }
}

let root: Context | null = null;

/** Boot the cascade context once (idempotent). */
async function ensureRoot(): Promise<Context> {
  if (root !== null) return root;
  const ctx = new Context();
  await ctx.plugin({
    apply(c: Context): void {
      new ModelDefaultsService(c);
    },
  });
  // Service start is a fiber tick — settle once, then the sync
  // fast path below never awaits.
  await new Promise((r) => setTimeout(r, 0));
  root = ctx;
  return ctx;
}

/** The context graph is up (module init settled). */
export function cascadeReady(): boolean {
  if (root === null) return false;
  const svc = (root as unknown as Record<string, unknown>)[DEFAULTS_SERVICE];
  return svc !== undefined;
}

/**
 * Merge one family's defaults through the cordis inherency chain:
 * base (family) → intercept (the resolving variant's defaults) →
 * head (the resolving cell's wire defaults). Closest wins, exactly
 * as the py compose cascaded.
 */
export function resolveCascade(
  base: Record<string, unknown>,
  intercept: Record<string, unknown> | null,
  head: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!cascadeReady()) {
    throw new Error("cascade not booted — await cascadeInit() first");
  }
  const ctx = root as Context;
  let view: Context = ctx;
  if (intercept !== null && Object.keys(intercept).length > 0) {
    view = ctx.intercept(DEFAULTS_SERVICE, intercept);
  }
  const svc = (view as unknown as Record<string, unknown>)[DEFAULTS_SERVICE] as {
    [symbols.resolveConfig]: (b?: unknown, h?: unknown) => Record<string, unknown>;
  };
  return svc[symbols.resolveConfig](
    base,
    head !== null && Object.keys(head).length > 0 ? head : undefined,
  );
}

/** Module-level boot (top-level await — one tick on first import). */
export const cascadeInit: Promise<void> = ensureRoot().then((): void => undefined);
await cascadeInit;
