// DockBtn — the tool dock button. Pure move from component.tsx.
import { Button, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import styles from "./mask.module.css"

// ── Tool dock button ─────────────────────────────────────────────────────
export function DockBtn({
  active, onClick, title, children, disabled,
}: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode
  disabled?: boolean
}) {
  return (
  <Tooltip label={title} side="top">
  <Button variant="ghost"
  type="button" onClick={() => { if (!disabled) onClick() }} aria-label={title}
  aria-disabled={disabled || undefined}
  className={clsx(
  styles.dockBtn,
  disabled && styles.dockBtnDisabled,
  active ? styles.dockBtnActive : styles.dockBtnIdle,
  )}
  >
  {children}
  </Button>
  </Tooltip>
  )
}
