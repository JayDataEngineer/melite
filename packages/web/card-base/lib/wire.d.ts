/**
 * wire.ts — @melite/card-base: the same-origin /v1 wire facts the
 * constructor's verbs ride (the viewer-base precedent: the base owns
 * the wire FACTS — door paths and shapes — while surfaces own their
 * own orchestration). Fetchers for the emission (catalog, form-spec)
 * and the one upload door.
 */
import type { CatalogCard, FormSpecDoc } from './spec.js';
import type { ManageJsonValue } from '@melite/estate-manage/types';
export interface ManageActionReply {
    ok: boolean;
    detail?: string;
    data?: ManageJsonValue;
}
/** POST one manage action through the MOUNTED `manage` remote —
 * ctx.remote's generated namespace (the typert contribution card-view
 * mounts; the api-gateway law reserves transport, RPC ids, response
 * envelopes, and cancellation to the Connection, and the zod codecs
 * on both ends own frame validation). The single argument is `doc`
 * (the action plus its JSON params — the dispatcher validates the
 * params per action). THE DOWNLOAD PROMPT's arm (no-silent-drop law,
 * stroke 18): a boarded-but-not-downloaded model is OFFERED — the
 * surfaces prompt the user, the click lands here as provision_model
 * (the manager queues the download; present files are skipped). A
 * refusal is a DOMAIN outcome: the seat throws manage/refused, the
 * Connection folds it into the RemoteResult error branch, and the
 * envelope carries it (ok:false + detail) — the caller renders the
 * truth, never a throw past the surface. Transport failures (an
 * unmounted lane, a dead connection) still throw LOUD — never a
 * silent ok:false.
 * @param action - the manage action name (the doc's action field).
 * @param payload - the action's JSON params (spread over the doc).
 * @param signal - caller cancellation, threaded to the Connection.
 * @returns the envelope reply: ok true with detail/data, or ok false
 * with the refusal's text. */
export declare function postManageAction(action: string, payload: Record<string, ManageJsonValue>, signal?: AbortSignal): Promise<ManageActionReply>;
/** /v1/model-catalog → the cards section (the picker's ONE surface —
 *  action cards, one tile per card package; models are NOT entries). */
export declare function fetchCardCatalog(signal?: AbortSignal): Promise<CatalogCard[]>;
/** The form-spec boundary judgment (one home — audit #48's cure):
 * refuses a doc without a schema envelope and walks every envelope's
 * refs for a wtype outside WTYPE_SET (strictness fix 5, 2026-10-01 —
 * LAW 8's missing side: the write-side bag guard refuses foreign
 * spellings at the declaration; THIS is the boundary the served doc
 * crosses, and a foreign wtype renders the silent plain-text
 * fallback, so here it refuses, naming the field and the set's home).
 * Exported so a test seating a fixture crosses the SAME judgment the
 * live fetch does — no `as unknown as` sidestep can outlive it.
 * @param doc the served doc (or a fixture standing in for one)
 * @param model names the doc in the refusal
 * @returns the doc, narrowed, when every judgment passes
 * @throws Error naming the first structural failure */
export declare function assertFormSpecDoc(doc: unknown, model: string): FormSpecDoc;
/** /v1/form-spec?model=<family> — the card family's emission (the
 *  serialized schema envelope + model defaults + the declared edges
 *  + the mod kinds and their envelopes). */
export declare function fetchFormSpec(model: string, signal?: AbortSignal): Promise<FormSpecDoc>;
/** One /v1/forms row — the card META table (label/genre/sidebar plus
 *  THE DECLARED EDGES: inputs/outputs as served from flowKinds).
 *  Surfaces kind-match picker candidates from THIS table without
 *  fetching per-card form-specs. */
export interface FormsTableRow {
    label: string;
    genre?: string;
    order?: number | string;
    inputs?: Record<string, string>;
    outputs?: Record<string, string>;
}
/** /v1/forms — every card's meta row (the edge emission included). */
export declare function fetchFormsTable(signal?: AbortSignal): Promise<Record<string, FormsTableRow>>;
/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL; the
 *  mesh wire type boards .glb/.gltf — model/gltf-binary, or the
 *  browser's octet-stream with a GLB name) → the input-dir path the
 *  param accepts. The door's own gates (type whitelist, one clean
 *  segment) are the law — the client only voices its refusals, never
 *  invents its own. */
export declare function uploadInputFile(file: File): Promise<{
    name: string;
    file: string;
}>;
//# sourceMappingURL=wire.d.ts.map
