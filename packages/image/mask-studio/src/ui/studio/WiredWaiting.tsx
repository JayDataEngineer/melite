// WiredWaiting — the blocked-canvas waiting card. Pure move from
// component.tsx (props shape unchanged).
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { Hourglass, Link2 } from "@melite/card-base/icons"
import styles from "./mask.module.css"

// ── Waiting state: wired to an upstream that hasn't run yet ───────────────
// The "goofy" case (2026-08-10): a wire is a LIVE reference, but it only
// resolves once the upstream produces. Painting needs a concrete image, so
// the canvas is BLOCKED until then — this card says why + how to unblock
// (run the upstream, or unwire and attach a file instead). Replaces both
// the canvas and the empty-state-import while the wire is pending.
export function WiredWaiting({
  upstreamTitle, onUnwire,
}: {
  upstreamTitle: string
  onUnwire: () => void
}) {
  return (
  <div
  className={styles.emptyState}
  data-wired-waiting
  >
  <div className={styles.emptyIcon}>
  <Hourglass className={clsx(styles.sz28, styles.accentInk)} />
  </div>
  <div>
  <div className={styles.emptyTitle}>
  Waiting for <span className={styles.emptyTitleAccent}>{upstreamTitle}</span> to run
  </div>
  <div className={styles.waitingSub}>
  This input is wired to a previous card's output. It arrives once that card
  runs — masking unlocks then. Run the flow up to that stage, or unwire
  to attach a file now.
  </div>
  </div>
  <Button variant="ghost"
  type="button"
  onClick={onUnwire}
  data-wired-unwire
  className={styles.unwireBtn}
  >
  <Link2 className={styles.sz14} /> Unwire
  </Button>
  </div>
  )
}
