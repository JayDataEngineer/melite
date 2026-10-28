// WirePickerModal — THE shared wire picker (promoted from the
// mask-studio local port, hour 25 stroke 17): one component, every
// surface that wires EDGES adopts it; value-attaching surfaces ride
// SourceRow instead. Both live in card-base now.
//
// The shared "link to a previous output" picker: prior stages by
// ARRAY INDEX, named outputs expanded per-row, "not run yet" for
// un-run upstreams. PRESENTATIONAL: the caller owns the write
// contract (onPick → setSlotInput + clear the slot param; onUnwire →
// setSlotInput null + clear). Chrome rides the DSH Modal atom (mask,
// Escape, labelled dialog); rows keep their data-wire-* hooks and
// byte-identical selection math.
import type { CardStage } from "@melite/contracts"
import { IconLinkOutlineRegular, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { clsx } from "clsx"

import { isImageUrl } from "./square.tsx"
import { t } from "./locales/square.ts"
import styles from "./card.module.css"

export interface WirePickerModalProps {
  /** Slot key being wired (display only — "Wire {slot} from …"). */
  slot: string
  /** Prior stages by ARRAY INDEX (the caller already filtered forward of the
   * current stage — F4: wires only point backwards). */
  priorStages: CardStage[]
  /** Currently-wired upstream id (undefined = nothing wired). */
  currentId?: string
  /** Currently-selected named output (null = primary assetUrls[0]). */
  currentOutput?: string | null
  /** Pick an upstream (+ optional named output). The caller writes the wire
   * AND clears the slot param (mutual-exclusion). */
  onPick: (upstreamId: string, outputName?: string | null) => void
  /** Unwire — the slot returns to manual-attach / empty. */
  onUnwire: () => void
  onClose: () => void
}

/** The wire picker — prior stages by ARRAY INDEX, including ones that
 * haven't run yet ("not run yet" — wire BEFORE the upstream runs).
 *
 * Named outputs: when an upstream stage produced >1 named artifact
 * (input_prep → media + mask), it expands into ONE ROW PER output so the
 * user can wire mask → input_mask specifically. Upstreams with 0–1
 * named artifacts render as a single row (legacy — primary via
 * assetUrls[0]). The output name rides onPick → setSlotInput →
 * inputOutputs → collectUpstreamResults. */
export function WirePickerModal({
  slot,
  priorStages,
  currentId,
  currentOutput,
  onPick,
  onUnwire,
  onClose,
}: WirePickerModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={t('wireTitle', { slot })}
      closeLabel={t('closeWirePicker')}
      className={styles.wireDialog}
    >
      <div data-wire-modal>
        {currentId && (
          // ARGUED RAW SEAT (S7j, the row-face class): a full-width
          // modal row-action strip — DSH's own modal body rows type
          // raw buttons + module css (ChangedFiles.tsx:83; the Modal's
          // own close verb is raw + module css, Modal.tsx:70-72).
          <button type="button" onClick={onUnwire} data-wire-unwire className={styles.wireUnwire}>
            {t('unwire')}
          </button>
        )}
        <ul className={styles.wireList}>
          {priorStages.length === 0 && (
            <li className={styles.wireEmpty}>
              {t('noEarlierCards')}
            </li>
          )}
          {priorStages.map((u, i) => {
            // Named artifacts the upstream produced (media, mask, …). When
            // >1, expand into per-output rows; else a single primary row.
            const named = u.result?.artifacts ?? {}
            const namedEntries = Object.entries(named)
            const multi = namedEntries.length > 1
            const rows: Array<{ outputName: string | null; thumb?: string; label: string }> = multi
              ? namedEntries.map(([name, url]) => ({ outputName: name, thumb: url, label: name }))
              : [{ outputName: null, thumb: u.result?.assetUrls[0], label: t('primaryOutput') }]
            return rows.map((row, ri) => {
              const selected = u.id === currentId && (currentOutput ?? null) === (row.outputName ?? null)
              return (
                <li key={u.id + (ri > 0 ? `:${row.outputName}` : "")}>
                  <button
                    type="button"
                    // ARGUED RAW SEAT (S7j, the row-face class): the
                    // selection row (idx + thumb + meta + tag) is a
                    // list face, not a verb pill — the ChangedFiles
                    // css.row receipt (ChangedFiles.tsx:83).
                    onClick={() => onPick(u.id, row.outputName)}
                    data-wire-option={row.outputName ?? "primary"}
                    className={clsx(styles.wireOption, selected && styles.wireSelected)}
                  >
                    <span className={styles.wireIdx}>{String(i + 1).padStart(2, "0")}</span>
                    {row.thumb && isImageUrl(row.thumb) ? (
                      <img src={row.thumb} alt="" className={styles.wireThumb} />
                    ) : (
                      <div className={styles.wireThumbFallback}>
                        <IconLinkOutlineRegular className={styles.sz14} />
                      </div>
                    )}
                    <div className={styles.wireMeta}>
                      <div className={styles.wireTitle}>
                        {u.title}
                        {multi && <span className={styles.wireOut}>· {row.label}</span>}
                      </div>
                      <div className={styles.wireSub}>
                        {u.result ? (row.thumb ?? t('noArtifacts')) : t('notRunYet')}
                      </div>
                    </div>
                    {selected && <span className={styles.wiredTag}>{t('wired')}</span>}
                  </button>
                </li>
              )
            })
          })}
        </ul>
      </div>
    </Modal>
  )
}
