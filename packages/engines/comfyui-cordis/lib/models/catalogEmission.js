// models/catalogEmission.ts — THE SERVED CATALOG, all five
// sections (correction stroke A1).
//
// SERVE LAW (LAW 0): only comfyui-engine families serve. The 12
// retired-engine rows are frozen data with engine markers — the
// registry carries them (the families the operator mourned), the
// wire never runs them.
import { ModelError, ModelRow, } from '@melite/comfyui-card-kit/model-contract';
;
/** A family serves iff its engine is comfyui (LAW 0) and it is
 *  offered (unoffered families serve no row at all — the 2026-08-11
 *  catalog contract: every served model routes and renders). */
export function isServedFamily(decl) {
    return (decl.engine === undefined || decl.engine === "" || decl.engine === "comfyui") && !decl.unoffered;
}
function servedRow(decl) {
    // FORM LAW (restored 2026-09-10): every served row carries a
    // non-empty form tag. The emission (melite_models grammar
    // model_row) always set it; the TS flip dropped it silently and
    // shipped 53 formless rows — the frontend catalog contract caught it. Refuse LOUD here
    // (QUEUE LANE LAW): a formless row must fail the boot/emission,
    // never the GUI.
    const form = (decl.form ?? "").trim();
    if (form === "") {
        throw new ModelError(`family ${decl.id} is served but declares no form — a model without ` +
            "a form cannot route or render (set form: '<tag>' in the DECL)");
    }
    const row = {
        id: decl.id,
        family: decl.id,
        genre: decl.genre,
        label: decl.label,
        description: decl.description ?? "",
        form,
        source: {
            type: decl.source?.type ?? "",
            ...(decl.source?.repo_id ? { repo_id: decl.source.repo_id } : {}),
            ...(decl.source?.filename ? { filename: decl.source.filename } : {}),
        },
        defaults: decl.defaults ?? {},
        engine: decl.engine ?? "",
        has_inference: decl.has_inference === true,
        has_rubric: decl.has_rubric === true,
        ...(decl.has_agent === true ? { has_agent: true } : {}),
    };
    ModelRow(row); // schema-validates loud
    return row;
}
/** The full catalog — all five sections, deterministic key order.
 *  Reads the REGISTERED table (the service's allDecls — the
 *  registry.generated module is retired; the table is the truth). */
export function buildCatalog(decls) {
    const models = {};
    const families = {};
    for (const decl of decls) {
        const id = decl.id;
        if (!isServedFamily(decl))
            continue;
        models[id] = servedRow(decl);
        families[id] = { label: decl.label, genre: decl.genre };
        if (decl.accepts !== undefined && decl.accepts.length > 0) {
            families[id].accepts = decl.accepts;
        }
        const studio = decl.studio;
        if (studio !== undefined && studio !== null && typeof studio.tenant === "string") {
            families[id].studio = {
                tenant: studio.tenant,
                owns_params: studio.owns_params === true,
                ...(studio.writes !== undefined ? { writes: studio.writes } : {}),
                ...(studio.size !== undefined ? { size: studio.size } : {}),
                ...(studio.layout !== undefined ? { layout: studio.layout } : {}),
            };
        }
    }
    return {
        models,
        families,
    };
}
//# sourceMappingURL=catalogEmission.js.map