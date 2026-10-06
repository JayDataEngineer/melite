// index.ts — @melite/viewer-base: the seam layer of the melite viewer.
//
// THE BASE PLUGIN LAW: the base owns SEAMS and WIRING only — it
// CLAIMS no slot and renders
// nothing on its own. It declares the three viewer slots (typed
// SlotMap contracts), exports the seam ids, the run-scoped wire facts
// (route prefixes/URL builders), the gateway wiring, and the DEFAULT
// run-card row + claim helper that the composition (@melite/viewer)
// uses — the ui-tool built-ins pattern: central default views, cards
// ship client halves only as takeovers.
//
// This is a LIBRARY package, not a cordis plugin: no host apply, no
// dsh.client manifest — the browser loads whatever the composition
// package's client half imports from here.
export * from './slots.ts'
export * from './owners.ts'
export * from './gateway.ts'
export * from './wire.ts'
export * from './runCard.tsx'
