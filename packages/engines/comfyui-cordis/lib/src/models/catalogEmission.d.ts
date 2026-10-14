import { ModelRow, type ModelDecl } from '@melite/comfyui-card-kit/model-contract';
export interface CatalogSections {
    models: Record<string, ModelRow>;
    families: Record<string, {
        label: string;
        genre: string;
        studio?: unknown;
        accepts?: readonly string[];
    }>;
}
/** A family serves iff its engine is comfyui (LAW 0) and it is
 *  offered (unoffered families serve no row at all — the 2026-08-11
 *  catalog contract: every served model routes and renders). */
export declare function isServedFamily(decl: ModelDecl): boolean;
/** The full catalog — all five sections, deterministic key order.
 *  Reads the REGISTERED table (the service's allDecls — the
 *  registry.generated module is retired; the table is the truth). */
export declare function buildCatalog(decls: readonly ModelDecl[]): CatalogSections;
