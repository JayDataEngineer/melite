// models/models.ts — THE COMPATIBILITY FACADE over the models
// SERVICE (the PORT LAW landing, 2026-09-08: "the Models are not
// cordis" — they are now; this module just keeps the import
// surface the consumers already speak).
//
// The SYSTEM (registration with boot-loud validation, resolution,
// the cascade on ctx.intercept + Service[symbols.resolveConfig])
// lives on ModelsService (service.ts), reached as ctx.models. The
// frozen registry stays DATA; every read below routes through the
// booted service.
//
// THE BOOT LAW (ledger li-m + li-cq): NOTHING waits at import and
// NOTHING fires at import — importing this module is side-effect
// free, so it can neither hang an importer (composition happens
// in apply, never at import) nor float a boot past a test
// environment's teardown. `cascadeInit()` is the call-fired
// entry: it boots on first call and memoizes; a failed boot
// clears the memo so the next call re-boots. Callers that read
// the sync singletons below await it (or bootModels) first — the
// estate's cardsRegistry awaits the SAME boot (cardsRegistry.ts,
// the composition seat). The lane seat (modelsFamiliesProvider)
// is a SEPARATE table in the estate's context — see service.ts.

import type { ModelRow } from "./families/contract.ts";
import type { CellRow, ModelDecl, VariantRow } from "./families/contract.ts";
import { bootModels, modelsService, resolveCascade } from "./service.ts";
import { buildCatalog } from "./catalogEmission.ts";

export * from "./families/contract.ts";
export { assertAddressesServe, assertFactsCallers, assertModInterlock, bootModels, modelsBooted, modelsService, resolveCascade, MODELS_SERVICE, ModelsService, modelsProvider, needModels } from "./service.ts";

let cascadePromise: Promise<void> | null = null;

/** The shared once-per-process boot entry: fires bootModels() on
 * first call, memoizes, never at import. A REJECTED boot clears
 * the memo — the next call re-boots (bootModels' own retry law).
 *
 * @returns a promise that settles when the booted table is served. */
export function cascadeInit(): Promise<void> {
  cascadePromise ??= bootModels().then(
    (): void => undefined,
    (err: unknown): Promise<void> => {
      cascadePromise = null;
      throw err;
    },
  );
  return cascadePromise;
}

export function getModel(id: string): ModelDecl {
  return modelsService().getModel(id);
}

export const modelIds = (): string[] => modelsService().modelIds();

/** THE LIVE OFFER's scan order (the machine truth): buildCatalog's
 *  served model ids over the registry, sorted — the existence set
 *  every presence-marked surface reads (the registry's admission,
 *  the form-spec's family marks, the load hints). ONE spelling:
 *  exported here, consumed everywhere (the no-silent-drop law's
 *  machine half). */
export function liveScanOrder(): string[] {
  // THE ONE enumeration (variant/cell routes included — a parallel
  // filter would silently drop them): buildCatalog's served keys.
  return Object.keys(
    buildCatalog(modelIds().map((id) => getModel(id))).models,
  ).sort();
}

/** The MODEL registry ids — one per model (the declaration plane,
 *  vs the served route view). */
export const registryModel = (id: string) => modelsService().registryModel(id);
/** The OWNING ATOM of an address (the fold read): a route composes
 *  through its owner, an atom owns itself — the envelope plane's
 *  one route→atom spelling. */
export const owningAtom = (id: string): string => modelsService().owningAtom(id);
export const registryIds = (): string[] => modelsService().registryIds();

export function mergedDefaults(
  id: string,
  variant?: string | null,
  quant?: string | null,
): Record<string, unknown> {
  return modelsService().mergedDefaults(id, variant, quant);
}

export function resolve(
  id: string,
  variant?: string | null,
  quant?: string | null,
): { route: string; engine: string; cell: CellRow | null; variant: VariantRow } {
  return modelsService().resolve(id, variant, quant);
}

export function modelCatalog(): Record<string, ModelRow> {
  return modelsService().servedModels();
}
