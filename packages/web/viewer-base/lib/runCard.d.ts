import type { JSX } from 'react';
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
/**
 * The run-card meta projection every model card's tool emits via
 * `output.presentationMeta` (persisted on the settled node). The row
 * narrows defensively — a card projecting a subset still renders.
 */
export interface RunCardMeta {
    model?: string;
    run_id?: string;
    error?: string;
}
type RowState = 'running' | 'ok' | 'refused' | 'error' | 'stopped';
interface RowModel {
    state: RowState;
    model: string | null;
    runId: string | null;
    prompt: string | null;
    headline: string | null;
}
/** Derive the row model from the durable slice alone (replay-safe). */
export declare function runCardModel(props: ToolCallViewProps): RowModel;
interface GalleryState {
    status: string | null;
    artifacts: readonly string[];
}
/** One gallery frame — the run row's live facts as the composition
 * serves them: the registry's status word plus the artifact names in
 * the runs row's own spelling (`<runId>/<rel>`; absolute and rooted
 * urls pass through the row's media rewrite verbatim). */
export interface RunGalleryFrame {
    readonly status: string;
    readonly artifacts: readonly string[];
}
/** The live-run source the composition hands down: `runs/subscribe`
 * through the gateway's stream face, one frame per row that moved.
 * The source owns the stream's lifecycle laws — it ends on the
 * terminal row, disposes on abort, and re-serves nothing (the
 * row-change gate is the source's, one law with the run view's
 * tail); aborting the signal ends the iterable. */
export type RunFramesSource = (runId: string, signal: AbortSignal) => AsyncIterable<RunGalleryFrame>;
/** Ride the composition's run frames for the gallery arm. No source
 * (a composition without the estate's runs namespace) is no arm: the
 * state stays empty and the row renders its durable model alone. An
 * ended source keeps the last frame standing (the terminal row is the
 * source's own last yield). */
export declare function useRunGallery(runId: string | null, source: RunFramesSource | undefined): GalleryState;
/** The row's props: the slot's view props plus the composition's
 * live-run source (optional — the claim threads it when the
 * composition holds the estate's runs namespace). */
export type RunCardRowProps = ToolCallViewProps & {
    readonly runFrames?: RunFramesSource;
};
export declare function RunCardRow(props: RunCardRowProps): JSX.Element;
/**
 * The narrow client-ctx face the claim needs (the real service merges
 * come from dsh-client-ui-renderer — `ctx.slots` — and cordis's
 * `ctx.effect`; typed locally so this library stays runtime-dep-free,
 * the media-plugin TabCtx law).
 */
export interface ClaimCtx {
    effect(fn: () => unknown, name?: string): unknown;
    slots: {
        inject(key: string, callback: () => unknown): unknown;
        register(options: {
            name: string;
            key: string;
        }, component: unknown): unknown;
    };
}
/**
 * Claim `tool.call.toolview` for one run card's wire tool name, with
 * the default row — the ui-skill registration shape (the
 * declaration-aware `slots.inject`, reconciling + disposal included).
 * `runFrames` (the composition's live-run source) rides the
 * registered component's props; absent, the row registers bare and
 * renders its durable model alone. Returns nothing; the claim lives
 * and dies with `ctx`.
 *
 * @param ctx the claiming composition's client ctx
 * @param toolName the card's wire tool name (the keyed slot's key)
 * @param label the effect's name (the composition's own line)
 * @param runFrames the live-run source the composition holds, if any
 */
export declare function claimRunCardToolview(ctx: ClaimCtx, toolName: string, label: string, runFrames?: RunFramesSource): void;
export {};
//# sourceMappingURL=runCard.d.ts.map
