/** studio.ts — the tenant props contract (E1): the ENTIRE interface a
 * card body sees. stage + running in; onSave/onRun/onWireSlot/
 * onSaveToMedia out. */
import type { CardStage } from "./card.js";
export interface StudioTenantProps {
    stage: CardStage;
    /** True while this card's run is active. */
    running: boolean;
    /** The ONE param write channel → updateStageParams (same as the agent's). */
    onSave: (params: Record<string, unknown>) => void;
    /** READ-ONLY context: every stage of the enclosing run, in order (the
     *  wire picker's prior-stages filter + wired-image resolution). Never a
     *  write channel. */
    upstreams?: CardStage[];
    /** The shell's Run, forwarded — for one-gesture flows that persist
     *  params then run (the mask card's Segm/Bbox/Segment). The control
     *  plane stays shell-owned: the tenant forwards, it never owns. */
    onRun?: () => void;
    /** The ONE graph-edge channel → setSlotInput (stage-scoped by the
     *  caller). Omit and the tenant hides its wire affordances entirely. */
    onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void;
    /** The shell's MEDIA SAVE, forwarded — uploads a file into the Media
     *  library (the m-prefixed synthetic runs listMedia serves) and bumps
     *  the media version so open library views refetch. Returns the served
     *  URL, or null on failure (the tenant toasts). An OUTPUT channel, not
     *  a param write: exports are artifacts, never node inputs (E1's spirit
     *  — the tenant still has zero RPC imports; card-studio-boundary.test.ts
     *  holds the line). */
    onSaveToMedia?: (file: File) => Promise<string | null>;
}
//# sourceMappingURL=studio.d.ts.map
