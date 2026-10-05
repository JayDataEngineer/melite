/**
 * card-drill.tsx — THE CARD DRILLDOWN: the second state of the card
 * system, ONE component every card surface drills through (the chat
 * toolview FlowCards and the sidebar Cards tab — the 2026-09-10 UX
 * reborn 2026-09-11 as shared state + shared tool between the agent
 * and the user).
 *
 * DSH Modal (body portal, Escape/mask close — the operator's split
 * directive 2026-09-10): params LEFT (editable — switch fields ride
 * the Pill toggle, everything else a raw-string Input; editPatch
 * coerces ONCE at patch time so decimal dots survive typing), outputs
 * + Run RIGHT. Run ON THE CARD is a USER GESTURE, and it runs what
 * the user SEES: the caller receives the coerced patch and owns the
 * write-then-run order (the shared-state law — the patch lands in the
 * domain BEFORE the run reads it).
 */
import { createElement as h } from 'react';
import type { ParamField } from './draft.js';
export interface CardDrillProps {
    /** Modal title — the surface names its card. */
    title: string;
    /** The stage's params as editable fields (paramFields()). */
    fields: ParamField[];
    /** The card's live output thumb, when one exists (else null). */
    thumbUrl: string | null;
    /** True while the caller's run is in flight (drives the button). */
    running: boolean;
    /** The run gesture: receives the coerced patch (null when no
     *  edits) — the caller patches, then runs, then closes. */
    onRun(patch: Record<string, unknown> | null): Promise<void>;
    onClose(): void;
}
export declare function CardDrill({ title, fields, thumbUrl, running, onRun, onClose }: CardDrillProps): ReturnType<typeof h>;
//# sourceMappingURL=card-drill.d.ts.map
