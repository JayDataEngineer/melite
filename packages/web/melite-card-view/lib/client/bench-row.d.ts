/** bench-row.ts — the bench stage distilled to the card row: the dot
 * map, the row interface, the distillation, the card grouping
 * (extracted from CardsTab.tsx hour 15). */
import type { CardsBenchValue, BenchStageView } from './cards-resource.js';
import { type CardStatus } from '@melite/contracts/stageView';
/** CardStatus → the installed StateDot union (FlowCards' CardRowLine
 *  law: done|warning|ongoing|error — a stage that never ran shows NO
 *  dot, never a fake state). */
export declare const STATUS_DOT: Record<CardStatus, 'done' | 'ongoing' | 'error' | 'warning' | null>;
/** THE CATEGORIES: bench stages grouped by card (first-appearance
 *  order — the agent's construction order survives; stages with no
 *  card gather under 'uncategorized', never dropped). */
export declare function groupStagesByCard(stages: BenchStageView[]): Array<{
    card: string;
    rows: BenchStageView[];
}>;
/** The chrome's running truth: the row's FOLDED status (the observer
 *  patches it terminal the moment the run lands). The folded live
 *  pair is running|queued — the waiting face. Folded `pending` is
 *  deliberately excluded: on the folded plane it is the
 *  no-information home (never-ran, or a word the fold does not
 *  know), and spinning on no information is a fake state. Raw
 *  'pending' words never reach here folded-pending: the fold maps a
 *  raw queued-for-start to 'queued'. Seats that judge RAW words use
 *  the owner's isLiveRunStatus instead. */
export declare function rowRunning(row: CardRowLineTabRow): boolean;
/** The bench stage as a card row (the same distillation cardRows()
 *  performs for the chat plane). */
export interface CardRowLineTabRow {
    id: string;
    kind: string;
    title: string;
    service: string | null;
    /** THE FOLDED STATUS (2026-10-01): the one vocabulary, end to end —
     *  raw words never ride a row. Consumers branch on CardStatus; the
     *  raw word stays on stage.runStatus for the drill's wire truth. */
    status: CardStatus;
    dot: 'done' | 'ongoing' | 'error' | 'warning' | null;
    /** THE TRANSPORT-HEALTH CARRY (LOW-23, 2026-10-12): the stage
     *  row's resource word ('unreachable' while the transport is
     *  down), or null — never folded into status, never laundered
     *  into run vocabulary. */
    health: string | null;
    prompt: string | null;
    /** the failure carry — the run's own refusal text (rendered on the
     *  tile caption and the drill; null when the run never failed). */
    error: string | null;
    /** THE PROGRESS CARRY (2026-09-13): the tap's live fold — percent
     *  faces on the tile spinner and the drill's run row while the row
     *  runs; null off-run (terminal rows carry none). */
    progress: {
        value: number;
        max: number;
    } | null;
    /** the activity line ("sampling 7/20", "node 12") — same channel. */
    activity: string;
    thumbUrl: string | null;
    /** the artifact's kind — drives the tile face dispatch. */
    face: 'video' | 'image' | 'audio' | 'mesh' | null;
    videoUrl: string | null;
    upstream: string | null;
    sourceAttached: boolean;
    stage: BenchStageView;
}
/** exported for the door-contract specs (the tile-face law). */
export declare function benchRow(stage: BenchStageView, bench?: CardsBenchValue): CardRowLineTabRow;
//# sourceMappingURL=bench-row.d.ts.map
