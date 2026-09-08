// ClassChip — one detect-class chip. Pure move from component.tsx
// (props shape unchanged).
import { ScanFace } from "lucide-react"
import { Button } from "@melite/ui/button"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"
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
  <Tip tip={
  state === "primary"
  ? `${label} owns the Combined mask — press again to set its params`
  : state === "extra"
  ? `${label} rides along — press to set its params`
  : `Press to set the ${label} params — ADD commits the card`
  }>
  <Button variant="ghost"
  type="button" data-detect-mode={cls} data-class-state={state}
  onClick={onTap}
  className={cn(
  "flex flex-1 flex-col items-center gap-0.5 rounded border px-1 py-1 text-[10px] capitalize transition-colors",
  state === "primary" && "border-brand bg-brand/20 text-brand",
  state === "extra" && "border-brand/40 bg-brand/5 text-brand/90",
  state === "off" && "border-border/40 text-muted-foreground hover:bg-sidebar/50",
  )}
  >
  <span className="flex items-center gap-1">
  {state === "primary" && <span className="h-1 w-1 rounded-full bg-brand" />}
  <Icon className="h-3.5 w-3.5" />
  </span>
  {label}
  </Button>
  </Tip>
  )
}
