/**
 * index.ts — @melite/card-base: the seam layer of the melite card UI.
 *
 * THE BASE PLUGIN LAW (the @melite/viewer-base precedent, mirrored
 * 1:1): the base owns SEAMS and CONSTRUCTION only — the emission
 * contract (spec.ts), the SlotMap seams (slots.ts), the constructor
 * + the default atoms (form.tsx), the ONE input square (square.tsx),
 * and the /v1 wire facts (wire.ts). A card package EMITS; the base
 * CONSTRUCTS from the emission (operator order, 2026-09-12: "the
 * package to construct the card ui should see that the card package
 * emits an image input, then constructs the input component
 * automatically"). Cards ship client halves only as TAKEOVERS —
 * claims into the seams.
 *
 * This is a LIBRARY package, not a cordis plugin: no host apply, no
 * dsh.client manifest — the browser loads whatever the composition
 * (the card-view tab) imports from here.
 */
export * from './spec.ts'
export * from './layout.tsx'
export { WirePickerModal, type WirePickerModalProps } from './wirePicker.tsx'
export * from './mods.tsx'
export * from './owners.ts'
export * from './slots.ts'
export * from './wire.ts'
export * from './square.tsx'
export * from './form.tsx'
export * from './use-resolved.ts'
export * from './stage3d.ts'
