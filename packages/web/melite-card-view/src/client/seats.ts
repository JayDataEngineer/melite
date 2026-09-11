/**
 * seats.ts — the card-view app's SlotMap declaration (2026-09-11).
 *
 * The slots law: every APP program declares the seat map it hosts
 * (the editor does this in src/shell/seats.ts). The card-view plugin
 * pulls @melite/slots sources into its typecheck graph via the ported
 * flow tree (CardDetailModal, cardElements, cardStudios), and the
 * a-priori 'root' key — seeded by SlotCore at runtime, declared by
 * the consumer at compile time — must exist or cardSeam's root claim
 * fails to typecheck. Same shape as the editor's declaration; the
 * plugin hosts no activity tiers of its own.
 */
declare module '@melite/slots/vendored/core' {
  interface SlotMap {
    /** The a-priori render-tree root hole (seeded by SlotCore itself;
     * the runtime owns this key — do not redeclare). */
    root: { kind: 'single' }
  }
}

export {} // module declaration file — no runtime surface
