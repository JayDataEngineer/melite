/**
 * CARD BIRTH LAW (operator order 2026-09-06, verbatim):
 *
 *   "IF THERE IS NO DRAFT_ID, THAT IS A HARD ERROR! THAT NEEDS TO
 *    HAPPEN!"
 *
 * The start door (POST /v1/flows/start) refuses ANY body without a
 * valid, doc-backed draft_id — 4xx BEFORE any run registers
 * (submit(); wall:
 * the wall pins it).
 * Every run is born from an action card; a cardless row cannot be
 * born, so the media sidebar's "run has no action card (no draft_id
 * in its run row)" click error is unreachable for new runs.
 *
 * The ritual is mechanical and shared here (ONE implementation,
 * every caller — no copy-paste mints): compose the card first
 * (POST /v1/flows/drafts — the ray compose door mints the card doc,
 * the body preserved verbatim as its extras), then ride the minted
 * id on the start envelope.
 */
import { type DraftId } from "@melite/contracts/benchStage";
/** The compose answer's draft id — branded at THIS birth (the id is
 *  pulled off the compose answer's wire body, the card plane's parse
 *  edge; the DraftId brand's compile-time law, benchStage.ts). */
export interface DraftComposeResult {
    draftId: DraftId;
}
/** Mint the card doc for a start body. The doc carries the body
 *  verbatim (intent/stages/model/params become the card extras —
 *  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
 *  so what the card shows is what the run consumed. Throws LOUDLY
 *  on any refusal — a refused compose never proceeds to a start
 *  (no silent cardless runs).
 *  @param body the raw start body (rides the compose POST verbatim)
 *  @param signal the caller's abort signal
 *  @returns the composed draft id, branded at this birth */
export declare function composeCard(body: Record<string, unknown>, signal?: AbortSignal): Promise<DraftId>;
/** The card-birth half of every run start: return the body's
 *  declared draft_id when present, else compose the card and return
 *  the minted id. Stamp the result onto the start envelope BEFORE
 *  the start fetch:
 *
 *    startBody.draft_id = await ensureDraftId(startBody, signal)
 *
 *  @param body the raw start body (its declared draft_id wins)
 *  @param signal the caller's abort signal
 *  @returns the declared-or-composed draft id, branded at this door */
export declare function ensureDraftId(body: Record<string, unknown>, signal?: AbortSignal): Promise<DraftId>;
//# sourceMappingURL=cardBirth.d.ts.map
