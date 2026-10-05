/**
 * CardsTab.tsx — the cards tab's stable surface: the local prop
 * typings + the re-export seam. The body lives in cards-tab-body.tsx;
 * the seams (stage-run, preview-kinds, bench-row, sortable-tile,
 * stage-drill, add-card-door, bench-view, draft-run-views,
 * forms-edge-meta, dnd-payloads) each live in their own file (the
 * hour-15 godfile split — same law as card-base's form.tsx split).
 */
import type { StageViewOwnerProps } from './types.js';
import type { CardsBenchValue, CardsDraftValue, CardsRunValue } from './cards-resource.js';
/** The injected tab information hook's shape (dsh-client-ui-sidebar-right's
 *  UseSidebarRightTabInfo, spelled locally). */
interface TabInfo {
    readonly tab: {
        readonly kind: string;
        readonly contentId?: string;
        readonly navigation: {
            readonly address: string;
        };
        readonly actions: {
            openResource(address: string): void;
        };
    };
}
/** The global standard resource hook's shape (UseResource specialized to
 *  the cards protocol, local spelling). */
interface ResourceHook {
    (address: string): {
        status: 'none' | 'loading' | 'live' | 'failed';
        value?: CardsBenchValue | CardsRunValue | CardsDraftValue;
        failure?: {
            message?: string;
        };
    };
}
export interface CardsTabProps {
    useTabInfo?: () => TabInfo;
    useResource?: ResourceHook;
    /** The conversation this tab serves (SessionStandardProps — the
     *  ui-session merge delivers sessionId to every session-scoped slot
     *  body). The bench is per-conversation (stroke 44): the tab binds
     *  its bench to exactly this key; unattributed seats serve 'main'. */
    sessionId?: string;
    /** Injected by the slot system because the seat registration
     *  declares 'cards.stage.view' + 'cards.stage.preview' as children
     *  (PropsRenderSlots shape; optional so test doubles and legacy
     *  mounts render the generic card). */
    renderSlot?: StageViewRenderSlot;
}
/** The typed dispatch fn the slot system injects for the declared
 *  children — RenderSlotFn spelled locally so the component file
 *  stays free of the slot package's runtime graph. Hour-9: the
 *  preview seam's consult rides the same injection (keyed by media
 *  kind — the shared video/image previews). */
export interface StageViewRenderSlot {
    (key: 'cards.stage.view', owner: StageViewOwnerProps, opts?: {
        entryKey?: string;
        fallback?: import('react').ReactNode;
    }): import('react').ReactNode;
    (key: 'cards.stage.preview', owner: import('@melite/contracts').PreviewOwnerProps, opts?: {
        entryKey?: string;
        fallback?: import('react').ReactNode;
    }): import('react').ReactNode;
}
export { CardsTab, resolveCardsAddress } from './cards-tab-body.js';
export { loadFormsEdgeMeta } from './forms-edge-meta.js';
export { runCardStage, runBenchSequential } from './stage-run.js';
export { previewKindFor, primaryKindFor, paramsDiffKeys, previewArtifactsFor, previewReportsFor } from './preview-kinds.js';
export { groupStagesByCard, benchRow } from './bench-row.js';
export type { CardRowLineTabRow } from './bench-row.js';
export type { CardsBenchValue, CardsDraftValue, CardsRunValue, BenchStageView } from './cards-resource.js';
//# sourceMappingURL=CardsTab.d.ts.map
