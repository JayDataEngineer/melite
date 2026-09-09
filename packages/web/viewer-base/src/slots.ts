// slots.ts — the viewer seams: OUR slot contracts, declared into the
// DSH client SlotMap the way ui-tool declares `tool.call.toolview`
// (declaration-merging; entry shape {kind, scope, owner}).
//
// THE BASE PLUGIN OWNS THE SEAMS AND NOTHING VISUAL. Extensions claim
// these slots; the base never registers a component into any of them
// and never renders. One spelling per slot id lives here (the seam-id
// constants), so claims and renderers import the same string.
//
// Scope 'session': every seam renders inside one session's viewer
// surface (the demo: the DSH web GUI), the same scope the toolview
// itself carries.
import type {
  TimelineOwnerProps, SizeOwnerProps, WindowOwnerProps,
} from './owners.ts'
// The anchor: ui-tool's own slots.ts imports the module it augments
// (declaration merging resolves through the same specifier).
import type { SlotEntryDef } from '@deepseek-ai/dsh-client-ui-slots'

/** The three seams' entry defs, checked against the merged contract. */
export type ViewerSeamDefs = {
  timeline: SlotEntryDef
  size: SlotEntryDef
  window: SlotEntryDef
}

/** The seam ids, spelled once. Claims use these constants. */
export const VIEWER_SLOTS = {
  timeline: 'melite.viewer.timeline',
  size: 'melite.viewer.size',
  window: 'melite.viewer.window',
} as const

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * Chronological run surface (stages/progress) for one run. List
     * kind: each entry is one timeline contribution (a stage band, a
     * log strip); the owner supplies the run identity and the
     * currently-known status.
     */
    'melite.viewer.timeline': {
      kind: 'list'
      scope: 'session'
      owner: TimelineOwnerProps
    }
    /**
     * Display-size negotiation for a viewer surface. Single kind: at
     * most one size claim renders; the owner states the box being
     * negotiated (tile/full modes and the natural pixel size).
     */
    'melite.viewer.size': {
      kind: 'single'
      scope: 'session'
      owner: SizeOwnerProps
    }
    /**
     * One dockable viewer panel, keyed by panel id. Keyed kind — the
     * same dispatch shape as `tool.call.toolview` (keyed by wire tool
     * name); here the key domain is the panel ids the windows
     * extension mints. The owner carries the panel's run binding.
     */
    'melite.viewer.window': {
      kind: 'keyed'
      scope: 'session'
      owner: WindowOwnerProps
    }
  }
}
