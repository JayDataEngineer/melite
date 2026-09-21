/** report-view.tsx — THE REPORT ATOM (ROADMAP 11e, primitive ①):
 * the default face for a result row's machine-readable verdicts.
 * A run may write named `reports` (kind 'report' — the contract's
 * BenchReport) beside its media; the result row claims ONE default
 * atom per entry and THIS is it: the DSH StateDot semantic (pass →
 * done, warn → warning, fail → error) + the status word, the title
 * (or the entry's own name), the check chips, and the key-value
 * rows. The agent loop reads the same object the row renders — the
 * machine-readable gate and its human face are ONE shape. */
import { createElement as h } from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './preview.module.css'

/** The report status vocabulary → the DSH dot's own states (the
 *  semantic set StateDot ships: done/warning/error — no invented
 *  colors, no hand-rolled dots). TOTAL over the contract's union —
 *  the harvest rejects any other status before it reaches the atom. */
const DOT_OF = { pass: 'done', warn: 'warning', fail: 'error' } as const

/** Render one report. Pure: every arm derived from the contract's
 *  own optionals (title absent → the name; chips/rows absent → no
 *  section). The card claims this by kind in the result row — the
 *  base owns the DEFAULT, a studio may claim over it (the
 *  claim-over-default law every preview kind rides). */
export function ReportView(props: { name: string, report: {
  kind: 'report'
  status: 'pass' | 'fail' | 'warn'
  title?: string
  chips?: string[]
  rows?: Record<string, string | number | boolean>
} }): ReturnType<typeof h> {
  const { name, report } = props
  const dot = DOT_OF[report.status]
  const chips = report.chips ?? []
  const rows = Object.entries(report.rows ?? {})
  return h('section', { className: css.reportCard, 'data-testid': 'report-card', 'aria-label': 'run report ' + name },
    h('header', { className: css.reportHead },
      h(StateDot, { state: dot, size: 8 }),
      h('span', { className: css.reportStatus, 'data-report-status': report.status }, report.status.toUpperCase()),
      h('span', { className: css.reportTitle }, report.title ?? name)),
    chips.length > 0
      ? h('div', { className: css.reportChips, 'aria-label': 'report chips' },
          chips.map((c) => h('span', { key: c, className: css.reportChip }, c)))
      : null,
    rows.length > 0
      ? h('dl', { className: css.reportRows, 'aria-label': 'report rows' },
          rows.map(([k, v]) => h('div', { key: k, className: css.reportRow },
            h('dt', { className: css.reportKey }, k),
            h('dd', { className: css.reportVal }, String(v)))))
      : null)
}
