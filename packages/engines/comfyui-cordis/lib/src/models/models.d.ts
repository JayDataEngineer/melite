import type { ModelRow } from "./families/contract.js";
import type { CellRow, ModelDecl, VariantRow } from "./families/contract.js";
export * from "./families/contract.js";
export { assertAddressesServe, assertFactsCallers, assertModInterlock, bootModels, modelsService, resolveCascade, MODELS_SERVICE, ModelsService, modelsProvider, needModels } from "./service.js";
/** The shared once-per-process boot entry: fires bootModels() on
 * first call, memoizes, never at import. A REJECTED boot clears
 * the memo — the next call re-boots (bootModels' own retry law).
 *
 * @returns a promise that settles when the booted table is served. */
export declare function cascadeInit(): Promise<void>;
export declare function getModel(id: string): ModelDecl;
export declare const modelIds: () => string[];
/** THE LIVE OFFER's scan order (the machine truth): buildCatalog's
 *  served model ids over the registry, sorted — the existence set
 *  every presence-marked surface reads (the registry's admission,
 *  the form-spec's family marks, the load hints). ONE spelling:
 *  exported here, consumed everywhere (the no-silent-drop law's
 *  machine half). */
export declare function liveScanOrder(): string[];
/** The MODEL registry ids — one per model (the declaration plane,
 *  vs the served route view). */
export declare const registryModel: (id: string) => ModelDecl;
/** The OWNING ATOM of an address (the fold read): a route composes
 *  through its owner, an atom owns itself — the envelope plane's
 *  one route→atom spelling. */
export declare const owningAtom: (id: string) => string;
export declare const registryIds: () => string[];
export declare function mergedDefaults(id: string, variant?: string | null, quant?: string | null): Record<string, unknown>;
export declare function resolve(id: string, variant?: string | null, quant?: string | null): {
    route: string;
    engine: string;
    cell: CellRow | null;
    variant: VariantRow;
};
export declare function modelCatalog(): Record<string, ModelRow>;
