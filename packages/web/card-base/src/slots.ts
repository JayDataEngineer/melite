/**
 * slots.ts — @melite/card-base: the card-UI seams, declared into the
 * DSH client SlotMap the way @melite/viewer-base declares the viewer
 * seams and ui-tool declares `tool.call.toolview`
 * (declaration-merging; entry shape {kind, scope, owner}).
 *
 * THE BASE PLUGIN OWNS THE SEAMS AND NOTHING VISUAL (the viewer-base
 * law, mirrored 1:1): the base ships the CONSTRUCTOR (form.tsx) and
 * the default atoms — the ui-tool built-ins pattern (central default
 * views; a card's own client half is a takeover, claimed into these
 * seams). The base never registers a component into any of its own
 * seams; the composition or a card's client half claims.
 *
 * Scope 'session': every seam renders inside one session's card
 * surface (the sidebar cards tab), the same scope the toolview
 * itself carries.
 */
import type { FieldOwnerProps, FormOwnerProps } from './owners.ts'
// The anchor: ui-slots' own slots module imports the module it
// augments (declaration merging resolves through the same specifier).
import type { SlotEntryDef } from '@deepseek-ai/dsh-client-ui-slots'

/** The seams' entry defs, checked against the merged contract. */
export type CardSeamDefs = {
  field: SlotEntryDef
  form: SlotEntryDef
}

/** The seam ids, spelled once. Claims use these constants. */
export const CARD_SLOTS = {
  /** keyed by wire type: 'image' | 'file' | 'select' | ... — the
   *  ATOM seam. The constructor renders every emitted field through
   *  the claim for its declared type; the base's built-in atom is
   *  the default, a card takes over its own type's atom. */
  field: 'melite.card.field',
  /** keyed by card id: the WHOLE-FORM takeover — a card's client
   *  half replaces the constructed form entirely (the studio law's
   *  form half; the drill consults this before constructing). */
  form: 'melite.card.form',
} as const

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** One field atom, keyed by the emitted wire type. Keyed kind —
     *  the same dispatch shape as `tool.call.toolview`; the owner
     *  carries the field, its value, the edit callback, and the
     *  square provider's host (slot-shaped fields only). */
    'melite.card.field': {
      kind: 'keyed'
      scope: 'session'
      owner: FieldOwnerProps
    }
    /** The whole constructed card form, keyed by card id. Keyed
     *  kind: at most one claim renders per card — the base's
     *  constructor is the default; a card's claim replaces it. */
    'melite.card.form': {
      kind: 'keyed'
      scope: 'session'
      owner: FormOwnerProps
    }
  }
}
