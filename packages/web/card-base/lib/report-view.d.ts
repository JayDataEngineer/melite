/** report-view.tsx — THE REPORT ATOM (ROADMAP 11e, primitive ①):
 * the default face for a result row's machine-readable verdicts.
 * A run may write named `reports` (kind 'report' — the contract's
 * BenchReport) beside its media; the result row claims ONE default
 * atom per entry and THIS is it: the DSH StateDot semantic (pass →
 * done, warn → warning, fail → error) + the status word, the title
 * (or the entry's own name), the check chips, and the key-value
 * rows. The agent loop reads the same object the row renders — the
 * machine-readable gate and its human face are ONE shape. */
import type { BenchReport } from '@melite/contracts/benchResult';
import { createElement as h } from 'react';
/** Render one report. Pure: every arm derived from the contract's
 *  own optionals (title absent → the name; chips/rows absent → no
 *  section). The card claims this by kind in the result row — the
 *  base owns the DEFAULT, a studio may claim over it (the
 *  claim-over-default law every preview kind rides). */
export declare function ReportView(props: {
    name: string;
    report: BenchReport;
}): ReturnType<typeof h>;
//# sourceMappingURL=report-view.d.ts.map