// DockBtn — the tool dock button. Pure move from component.tsx.
import { Button } from "@melite/ui/button"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"

// ── Tool dock button ─────────────────────────────────────────────────────
export function DockBtn({
  active, onClick, title, children, disabled,
}: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode
  disabled?: boolean
}) {
  return (
  <Tip tip={title}>
  <Button variant="ghost"
  type="button" onClick={() => { if (!disabled) onClick() }} aria-label={title}
  aria-disabled={disabled || undefined}
  className={cn(
  "flex h-7 w-7 items-center justify-center rounded transition-colors",
  disabled && "cursor-not-allowed opacity-35",
  active ? "bg-brand text-white" : "text-muted-foreground hover:bg-sidebar/60 hover:text-foreground",
  )}
  >
  {children}
  </Button>
  </Tip>
  )
}
