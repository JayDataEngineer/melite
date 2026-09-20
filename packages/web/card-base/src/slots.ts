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
// The stage-view seam's owner: the bench row + the host drill's verbs.
// Type-only (erased — the client bundle-purity gate sees no value import).
import type { StageViewOwnerProps, PreviewOwnerProps } from '@melite/contracts'
// The anchor: ui-slots' own slots module imports the module it
// augments (declaration merging resolves through the same specifier).
import type { SlotEntryDef } from '@deepseek-ai/dsh-client-ui-slots'

/** The seams' entry defs, checked against the merged contract. */
export type CardSeamDefs = {
  field: SlotEntryDef
  form: SlotEntryDef
  stageView: SlotEntryDef
  stagePreview: SlotEntryDef
}

/** The seam ids, spelled once. Claims use these constants. */
export const CARD_SLOTS = {
  /** keyed by wire type: 'image' | 'file' | 'mesh' | 'select' | ... — the
   *  ATOM seam. The constructor renders every emitted field through
   *  the claim for its declared type; the base's built-in atom is
   *  the default, a card takes over its own type's atom. */
  field: 'melite.card.field',
  /** keyed by card id: the WHOLE-FORM takeover — a card's client
   *  half replaces the constructed form entirely (the studio law's
   *  form half; the drill consults this before constructing). */
  form: 'melite.card.form',
  /** keyed by card id: the BENCH stage view — a card's client half
   *  mounted on the bench slot (the studio law's bench half; the
   *  first-party studio surface every card package ships). */
  stageView: 'cards.stage.view',
  /** keyed by media kind ('video' | 'image'): THE PREVIEW SEAM —
   *  every card's rendered output previews through one shared slot
   *  (shared DSH primitives, hour-9 law); a card claims its kind's
   *  preview only to specialize, never to bespoke. */
  stagePreview: 'cards.stage.preview',
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
    /** The bench stage view, keyed by card id (declared 2026-09-12
     *  by the studio typecheck gate — every first-party client
     *  claims this seam, but no table declared it, so keyof-checked
     *  inject/register calls failed the gate estate-wide). Keyed
     *  kind: at most one studio per card. */
    'cards.stage.view': {
      kind: 'keyed'
      scope: 'session'
      owner: StageViewOwnerProps
    }
    /** The preview seam (hour-9): the stage's rendered outputs,
     *  keyed by media kind. Shared components claim 'video' and
     *  'image'; the host consults with a fallback. */
    'cards.stage.preview': {
      kind: 'keyed'
      scope: 'session'
      owner: PreviewOwnerProps
    }
  }
}
