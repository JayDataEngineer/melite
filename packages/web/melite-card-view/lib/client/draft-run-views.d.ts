/** draft-run-views.tsx — the draft authoring face and the run's live
 * status view (extracted from CardsTab.tsx hour 15). */
import { createElement as h } from 'react';
import type { StageViewOwnerProps } from './types.js';
import type { CardsDraftValue, CardsRunValue } from './cards-resource.js';
/**
 * THE DRAFT VIEW (the conversation card's target, 2026-09-12 — the
 * old embed's law restored): one flow draft's stage on the authoring
 * surface. The studio claims `cards.stage.view` exactly as the bench's
 * zoom does — same slot, same owner currency, same run/patch doors —
 * so the chat card opens the timeline/video/splits/audio surface, and
 * a card with no registered studio falls back to the generic zoom
 * card (params + Run), the bench's own fallback.
 *
 * Removal is NOT offered (the draft's shape belongs to its authoring
 * surface — the bench CAS door has no business here); the back affordance
 * returns to the shared bench, the tab's home address.
 */
export declare function DraftView({ value, running, onRun, onStop, onBack, onPatchParams, renderStageView, renderPreview, runId, bindRun }: {
    value: CardsDraftValue;
    running: boolean;
    onRun: () => void;
    /** THE STOP DOOR (2026-09-13): the draft drill's run button flips
     *  to stop mid-run, same gesture as the bench faces. */
    onStop: () => void;
    onBack: () => void;
    onPatchParams: (patch: Record<string, unknown>) => void;
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
    runId: string | null;
    bindRun?: (run: () => void) => void;
}): ReturnType<typeof h>;
export declare function RunView({ run, sessionKey, onBack, onRestored, onStop }: {
    sessionKey: string;
    run: CardsRunValue;
    onBack: (() => void) | undefined;
    onRestored: () => void;
    onStop: ((runId: string) => void) | undefined;
}): ReturnType<typeof h>;
//# sourceMappingURL=draft-run-views.d.ts.map
