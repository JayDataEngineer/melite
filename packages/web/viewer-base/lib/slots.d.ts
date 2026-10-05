import type { TimelineOwnerProps, SizeOwnerProps, WindowOwnerProps } from './owners.js';
import type { SlotEntryDef } from '@deepseek-ai/dsh-client-ui-slots';
/** The three seams' entry defs, checked against the merged contract. */
export type ViewerSeamDefs = {
    timeline: SlotEntryDef;
    size: SlotEntryDef;
    window: SlotEntryDef;
};
/** The seam ids, spelled once. Claims use these constants. */
export declare const VIEWER_SLOTS: {
    readonly timeline: "melite.viewer.timeline";
    readonly size: "melite.viewer.size";
    readonly window: "melite.viewer.window";
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        /**
         * Chronological run surface (stages/progress) for one run. List
         * kind: each entry is one timeline contribution (a stage band, a
         * log strip); the owner supplies the run identity and the
         * currently-known status.
         */
        'melite.viewer.timeline': {
            kind: 'list';
            scope: 'session';
            owner: TimelineOwnerProps;
        };
        /**
         * Display-size negotiation for a viewer surface. Single kind: at
         * most one size claim renders; the owner states the box being
         * negotiated (tile/full modes and the natural pixel size).
         */
        'melite.viewer.size': {
            kind: 'single';
            scope: 'session';
            owner: SizeOwnerProps;
        };
        /**
         * One dockable viewer panel, keyed by panel id. Keyed kind — the
         * same dispatch shape as `tool.call.toolview` (keyed by wire tool
         * name); here the key domain is the panel ids the windows
         * extension mints. The owner carries the panel's run binding.
         */
        'melite.viewer.window': {
            kind: 'keyed';
            scope: 'session';
            owner: WindowOwnerProps;
        };
    }
}
//# sourceMappingURL=slots.d.ts.map
