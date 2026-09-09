/**
 * `@melite/viewer` — client half: the default run-card toolview
 * claims, ONE line per composed card.
 *
 * This is the composition point that knows the run cards (the ui-tool
 * built-ins pattern: central default views). A card ships its own
 * client half only to OVERRIDE its view — a takeover of the same
 * keyed slot (the contract's replacement arm); all-defaults cards
 * ship none and land here.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { claimRunCardToolview } from '@melite/viewer-base/runCard'
import { TOOL_NAME as IMAGE_GEN } from '@melite/image-image-gen/wire'

/** The run cards this composition serves default views for. */
const RUN_CARDS: ReadonlyArray<{ readonly name: string; readonly label: string }> = [
  { name: IMAGE_GEN, label: '@melite/viewer: image_gen run-card claim' },
]

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  for (const card of RUN_CARDS) claimRunCardToolview(ctx, card.name, card.label)
}
