// models/models.ts — THE COMPATIBILITY FACADE over the models
// SERVICE (the PORT LAW landing, 2026-09-08: "the Models are not
// cordis" — they are now; this module just keeps the import
// surface the consumers already speak).
//
// The SYSTEM (registration with boot-loud validation, resolution,
// the cascade on ctx.intercept + Service[symbols.resolveConfig])
// lives on ModelsService (service.ts), reached as ctx.models. The
// frozen registry stays DATA; every read below routes through the
// booted service. The top-level await settles the boot once per
// process — imports after that are sync forever.

import type { ModelRow } from "./contract.ts";
import type { CellRow, ModelDecl, VariantRow } from "./contract.ts";
import { bootModels, modelsService, resolveCascade } from "./service.ts";

export * from "./contract.ts";
export { bootModels, modelsService, resolveCascade, MODELS_SERVICE, ModelsService, modelsProvider, needModels } from "./service.ts";

export const cascadeInit: Promise<void> = bootModels().then((): void => undefined);
await cascadeInit;

export function getModel(id: string): ModelDecl {
  return modelsService().getModel(id);
}

export const modelIds = (): string[] => modelsService().modelIds();

/** The MODEL registry ids — one per model (the declaration plane,
 *  vs the served route view). */
export const registryModel = (id: string) => modelsService().registryModel(id);
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
