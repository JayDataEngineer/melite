// ClassChip — one detect-class chip. Pure move from component.tsx
// (props shape unchanged).
import { Button, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { ScanFace } from "./icons"
import styles from "./mask.module.css"
import type { DetectClass } from "./constants"

/** One class chip. States mirror the RUN-time truth (runDetect's OR rule):
 * on = export flag OR is-primary; primary (the dot) = detect_mode, the
 * class that owns mask_combined. data-detect-mode stays on the chip — the
 * card-studio E4 contract test gestures through it. */
export function ClassChip({
  cls, label, Icon, state, onTap,
}: {
  cls: DetectClass
  label: string
  Icon: typeof ScanFace
  state: "primary" | "extra" | "off"
  onTap: () => void
}) {
  return (
  <Tooltip label={
  state === "primary"
  ? `${label} owns the Combined mask — press again to set its params`
  : state === "extra"
  ? `${label} rides along — press to set its params`
  : `Press to set the ${label} params — ADD commits the card`
  } side="top">
  <Button variant="ghost"
  type="button" data-detect-mode={cls} data-class-state={state}
  onClick={onTap}
  className={clsx(
  styles.classChip,
  state === "primary" && styles.classPrimary,
  state === "extra" && styles.classExtra,
  state === "off" && styles.classOff,
  )}
  >
  <span className={styles.chipTop}>
  {state === "primary" && <span className={styles.chipDot} />}
  <Icon className={styles.sz14} />
  </span>
  {label}
  </Button>
  </Tooltip>
  )
}
