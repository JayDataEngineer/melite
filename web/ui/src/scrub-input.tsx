/** ScrubInput — the kit's invisible overlay scrubber. Media transports
 *  lay an opacity-0 range input over the timeline strip to capture
 *  drag/keyboard seeking with zero custom pointer math; the native
 *  range input is the right DEVICE (a11y, touch, keys) — the kit owns
 *  the invisibility contract so tenants never hand-roll one. The visual
 *  track is the consumer's to render; this input IS the interaction.
 *  Registry: registry:ui. */
import * as React from "react"

import { cn } from "./utils"

function ScrubInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      type="range"
      data-slot="scrub-input"
      aria-hidden={false}
      className={cn(
        "absolute inset-0 h-full w-full cursor-pointer opacity-0",
        className,
      )}
    />
  )
}

export { ScrubInput }
