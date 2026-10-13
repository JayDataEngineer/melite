import { ModelError } from "./families/contract.js";
import { armModelsSeat, disarmModelsSeat, failModelsSeat, validateBootContracts, } from "./service.js";
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
function familyFibers(ctx) {
    const out = [];
    ctx.registry.forEach((runtime) => {
        if (runtime.name === undefined || !runtime.name.startsWith(FAMILY_PREFIX))
            return;
        for (const fiber of runtime.fibers) {
            /* v8 ignore next -- the transient UNLOADING window: disposal
               removes the fiber from the runtime list before the
               coalesced census runs; the guard holds the line when the
               microtask wins the race. */
            if (fiber.state >= FIBER_DISPOSED)
                continue;
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
async function censusPass(ctx, svc) {
    const fibers = familyFibers(ctx);
    for (const fiber of fibers) {
        // rethrows the family's own startup refusal — the atomicity law
        await fiber.await();
    }
    if (svc.familyCount() !== fibers.length) {
        throw new ModelError(`the composition registered ${svc.familyCount()} families but ${fibers.length} family fibers mounted — a family registered nothing (the transactional gate)`);
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
export const modelsCensusGate = {
    name: "engine-model-census",
    inject: ["models"],
    async apply(ctx) {
        const svc = ctx.models;
        try {
            await censusPass(ctx, svc);
        }
        catch (err) {
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
        ctx.on("internal/status", (fiber) => {
            if (!armed || !fiber.name.startsWith(FAMILY_PREFIX))
                return;
            if (scheduled)
                return;
            scheduled = true;
            void Promise.resolve().then(() => {
                scheduled = false;
                // A refusal here is a live-add defect, not a boot defect:
                // log it loud and keep the last-good arm — the failed fiber
                // shows in the Loader's diagnostics; the walls pin the
                // healthy path.
                censusPass(ctx, svc).catch((err) => {
                    ctx.logger.error(new ModelError("models census re-check refused after a family-fiber change — the table stands at its last-good arm: " +
                        String(err instanceof Error ? err.message : err)));
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
//# sourceMappingURL=census.js.map
