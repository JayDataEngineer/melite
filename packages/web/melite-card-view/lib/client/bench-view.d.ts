/** bench-view.tsx — the bench user plane: the grouped tiles, the
 * reorder/group gestures, the drop zones (extracted from CardsTab.tsx
 * hour 15). */
import { createElement as h } from 'react';
import type { StageViewOwnerProps } from './types.js';
import type { BenchStageView, CardsBenchValue } from './cards-resource.js';
export declare function BenchView({ bench, sessionKey, onRun, onRunStage, onStopStage, onRemoveStage, stageRuns, running, onPatchParams, renderStageView, renderPreview, runId, refreshTick, startError }: {
    sessionKey: string;
    bench: CardsBenchValue;
    onRun: () => void;
    onRunStage: (stage: BenchStageView) => void;
    /** the tile chrome's stop + remove verbs (the chat-input law). */
    onStopStage: (stage: BenchStageView) => void;
    onRemoveStage: (stage: BenchStageView) => void;
    stageRuns: Record<string, string>;
    running: boolean;
    onPatchParams: (stage: BenchStageView, patch: Record<string, unknown>) => void;
    renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>;
    renderPreview?: (owner: {
        kind: 'video' | 'image' | 'audio' | 'mesh';
        artifacts: Array<{
            name: string;
            url: string;
        }>;
        runStatus: string;
        stageId: string;
        history?: Array<Array<{
            name: string;
            url: string;
        }>>;
    }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>;
    runId?: string | null;
    /** The outcome observer's touch — the rail re-reads so tile
     *  runStatus/result stay live without ever leaving the bench. */
    refreshTick?: number;
    /** THE START-ERROR SEAM (stroke 25): a run-start rejection rides
     *  INTO the open drill's webhook bar — the tab-level seat renders
     *  behind the zoom overlay, invisible where Run was pressed. */
    startError?: string | null;
}): ReturnType<typeof h>;
//# sourceMappingURL=bench-view.d.ts.map
