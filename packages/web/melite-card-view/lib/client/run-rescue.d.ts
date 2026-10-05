/**
 * run-rescue.tsx — the run-gate rescue's face (roadmap item 4): the
 * banner that renders under a failed run's error WHEN the miss is
 * rescueable — a missing extension pack or a missing model file —
 * offering ONE confirm that routes through the manage seat and
 * re-offers the run. THE LINKS-IN-CODE LAW: names only, the DECL
 * owns every URL server-side (run-rescue-core.ts's header).
 *
 * Mounts where the failure carry already lands (cards-tab-body's
 * runError faces); inert — renders null — for every non-rescueable
 * error. The user's run press stays the only run starter: the
 * banner offers the INSTALL, and the re-run rides the caller's own
 * onRun (never an automatic re-fire).
 */
import { createElement as h } from 'react';
export declare function RunRescue({ error, stages, onRun }: {
    error: string;
    stages: Array<{
        params?: Record<string, unknown>;
        card?: string;
    }>;
    /** the caller's own run press — offered again after a successful
     * install, never fired automatically */
    onRun: () => void;
}): ReturnType<typeof h> | null;
//# sourceMappingURL=run-rescue.d.ts.map
