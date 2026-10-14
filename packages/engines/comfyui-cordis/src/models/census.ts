// census.ts — the composition census gate (ROADMAP "Models-boot
// Loader composition", 2026-10-13). Families mount as Loader
// composition rows (the estate bundle's cordis.patch.yml — the DSH
// shape: cordis.yml rows, --dump-config visibility, config HMR), so
// no plugin loop loads them and the transactional boot count needs
// a composition seat. This gate:
//
//   1. awaits every family fiber the registry holds — fiber.await()
//      RETHROWS a family's startup refusal;
//   2. censuses the table against the fiber count — a family that
//      applied without registering is a failed boot, not a warning
//      (the transactional gate, re-pointed from FAMILY_PLUGINS.length
//      to the Loader's own truth);
//   3. cross-validates the boot contracts (validateBootContracts —
//      the same pass the singleton boot runs);
//   4. ARMS the process seat (armModelsSeat) so Context-less readers
//      (theService/bootModels — the registry prime, the doors) serve
//      the COMPOSED table, never a private boot beside it.
//
// A composition that refuses FAILS the settle (failModelsSeat): an
// estate awaiting whenModelsArmed() fails its own fiber before any
// door mounts — the all-or-nothing law. internal/status re-runs the
// census on later family-fiber transitions — the live-add law: a
// config-HMR row lands or leaves, the table re-censuses, seat
// listeners re-prime. A family fiber failing AFTER boot logs loud
// and leaves the last-good arm standing — the failed fiber is
// visible in the Loader's own diagnostics.
import type { Context, Fiber, Plugin } from "@deepseek-ai/cordis";
import { ModelError } from '@melite/comfyui-card-kit/model-contract';
import {
  armModelsSeat,
  disarmModelsSeat,
  failModelsSeat,
  ModelsService,
  validateBootContracts,
} from "./service.ts";

/** Family plugin names carry this prefix (make-model: one family
 * per @melite/models-* package, plugin name family-<id>). */
const FAMILY_PREFIX = "family-";

/** Fiber lifecycle states (cordis fiber.d.ts FiberState — a const
 * enum inlined in the vendor, not importable at runtime). Every
 * state below DISPOSED counts toward the census: PENDING/LOADING/
 * ACTIVE settle through fiber.await(), and FAILED rethrows its
 * startup error — the atomicity law. UNLOADING/DISPOSED fibers are
 * on their way out (their families already unregistered), and
 * counting them would refuse every benign config-HMR removal. */
const FIBER_DISPOSED = 4;

/** Every registry fiber of a family-named plugin that still counts
 * toward the census (see the state consts above).
 *
 * @param ctx — any context of the composition (the registry is
 * shared app-wide).
 * @returns the live family fibers, in registry order. */
function familyFibers(ctx: Context): Fiber[] {
  const out: Fiber[] = [];
  ctx.registry.forEach((runtime) => {
    if (runtime.name === undefined || !runtime.name.startsWith(FAMILY_PREFIX)) return;
    for (const fiber of runtime.fibers) {
      /* v8 ignore next -- the transient UNLOADING window: disposal
         removes the fiber from the runtime list before the
         coalesced census runs; the guard holds the line when the
         microtask wins the race. */
      if (fiber.state >= FIBER_DISPOSED) continue;
      out.push(fiber);
    }
  });
  return out;
}

/** One census pass: await settlement, count, validate, arm. Shared
 * by the boot path and every later family-fiber transition.
 *
 * @param ctx — the gate's context (reads the shared registry and
 * the injected models service).
 * @param svc — the composition's models service. */
async function censusPass(ctx: Context, svc: ModelsService): Promise<void> {
  const fibers = familyFibers(ctx);
  for (const fiber of fibers) {
    // rethrows the family's own startup refusal — the atomicity law
    await fiber.await();
  }
  if (svc.familyCount() !== fibers.length) {
    throw new ModelError(
      `the composition registered ${svc.familyCount()} families but ${fibers.length} family fibers mounted — a family registered nothing (the transactional gate)`,
    );
  }
  await validateBootContracts(svc);
  armModelsSeat(svc, import.meta.url);
}

/** The census gate (fiber-owned): mounted by a composition whose
 * families arrive as Loader rows. A BOOT refusal fails the settle
 * (the estate's fiber fails before any door mounts); a LATER
 * refusal (a broken live-add) logs and keeps the last-good arm.
 * Loadable entry:
 * packages/engines/comfyui-cordis/src/entries/catalog-registry.ts. */
export const modelsCensusGate: Plugin = {
  name: "engine-model-census",
  inject: ["models"],
  async apply(ctx: Context): Promise<void> {
    // the gate is engine-internal: it narrows the plugin face to the
    // concrete registry it owns (familyCount, the contracts walk).
    const svc = ctx.models as ModelsService;
    try {
      await censusPass(ctx, svc);
    } catch (err: unknown) {
      // the boot refusal crosses the settle — never a hang
      failModelsSeat(err);
      throw err;
    }
    // live changes: re-census on family-fiber transitions (mount,
    // unmount, failure). One microtask coalesces the per-family
    // burst a config reload produces. After the gate's own dispose
    // (disarmed) the listener no-ops — teardown disposals are not
    // composition events.
    let armed = true;
    let scheduled = false;
    ctx.on("internal/status", (fiber: Fiber) => {
      if (!armed || !fiber.name.startsWith(FAMILY_PREFIX)) return;
      if (scheduled) return;
      scheduled = true;
      void Promise.resolve().then(() => {
        scheduled = false;
        // A refusal here is a live-add defect, not a boot defect:
        // log it loud and keep the last-good arm — the failed fiber
        // shows in the Loader's diagnostics; the walls pin the
        // healthy path.
        censusPass(ctx, svc).catch((err: unknown) => {
          ctx.logger.error(
            new ModelError(
              "models census re-check refused after a family-fiber change — the table stands at its last-good arm: " +
                String(err instanceof Error ? err.message : err),
            ),
          );
        });
      });
    });
    ctx.effect(() => {
      return () => {
        armed = false;
        disarmModelsSeat(svc);
      };
    });
  },
};
