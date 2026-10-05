/**
 * run-rescue-core.ts — the run-gate rescue's data half (roadmap item 4,
 * the operator's 2026-09-20 order: hit RUN without a model or a
 * ComfyUI extension → a popup offers the install through the
 * manage seat, right where the run refused).
 *
 * THE LINKS-IN-CODE LAW (the operator, same order: "we NEVER do
 * one-time downloads, ALL download links are KEPT IN CODE"): the
 * client NEVER carries a URL. It passes NAMES ONLY —
 * install_extension takes the pack id from the refusal's own text;
 * provision_model takes the FAMILY id and the manage seat resolves
 * the DECL provision rows server-side (the declaration is the one
 * truth for what downloads from where). An ad-hoc URL has no door
 * here, by construction.
 *
 * THE ONE WIRE: the install rides postManageAction (card-base's
 * manage/act gateway door — the SAME wire the form-time prompts
 * ride; there is no second manage client). This module is the
 * RUN-TIME half: the form-time prompts (PackPrompt, the model
 * offer) catch the miss BEFORE the press; this catches the miss
 * the press itself surfaced — a pack the form could not see, a
 * model file the presence mark believed present, an engine refusal
 * mid-run. Same seat, same vocabulary, later gate.
 */
/** What a failed run can offer to fix. `extension` names a pack id
 * (from the missing-extension refusal's own text); `model` names a
 * missing model FILE (from the engine's error) — the family rides
 * separately (the stage params own it; the DECL owns the file). */
export type Rescue = {
    kind: 'extension';
    pack: string;
} | {
    kind: 'model';
    file: string;
    target?: string;
};
/** Parse a failed run's reason for a rescueable miss. The
 * missing-extension refusal names its pack verbatim
 * ("card 'x' requires 'PACK' …"); a model miss names a weight file
 * in a not-found context. Anything else is not ours to fix — null
 * (never a wrong install). */
export declare function parseRescue(error: string): Rescue | null;
export interface RescueResult {
    detail: string;
    restartRequired: boolean;
}
/** Offer one rescue through the manage seat. Names only — the
 * server owns every URL (the declaration law above). The target
 * is the model family OR the card id (model-less tool cards carry
 * their own provision rows under the card id — provision_model
 * resolves both). Resolves
 * with the reply's detail line, refuses with its own name. */
export declare function runRescueCall(rescue: Rescue, target: string): Promise<RescueResult>;
export declare function terminalStageErrorOf(stages: ReadonlyArray<{
    runStatus?: unknown;
    result?: unknown;
}>): string | null;
/** The first family id on a bench/draft's stage params (the model
 * the run shot — the rescue's provision target). Null when no
 * stage names one (the card-id fallback below gets its turn). */
export declare function familyOfStages(stages: Array<{
    params?: Record<string, unknown>;
}>): string | null;
/** THE CARD-ID FALLBACK (the mask SAM2 law, 2026-09-19):
 * model-less tool cards name no family — the stage's own card id
 * is the provision target (the manage door resolves card-owned
 * DECL rows under it). Null when no stage names a card. */
export declare function cardOfStages(stages: Array<{
    card?: string;
}>): string | null;
//# sourceMappingURL=run-rescue-core.d.ts.map
