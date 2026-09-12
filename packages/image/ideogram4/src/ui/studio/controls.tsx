/**
 * Shared studio controls — DSH ships no Textarea atom, so this is a
 * native <textarea> + module class (the sanctioned pattern); Tip is
 * the tooltip wrapper over the DSH Tooltip atom.
 */
import type { ReactElement, TextareaHTMLAttributes } from "react"
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { cx } from "@melite/card-base/chrome"
import styles from "./controls.module.css"

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="textarea"
      className={cx(styles.textarea, className)}
      {...props}
    />
  )
}

interface TipProps {
  /** Short label shown in the bubble. Undefined renders bare. */
  tip?: string
  /** Which side the bubble appears on. Defaults to top (kit parity). */
  side?: "top" | "bottom" | "right"
  children: ReactElement
}

export function Tip({ tip, side = "top", children }: TipProps) {
  if (tip === undefined) return children
  return (
    <Tooltip label={tip} side={side} delayMs={300}>
      {children}
    </Tooltip>
  )
}
