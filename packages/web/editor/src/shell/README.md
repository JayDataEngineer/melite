# shell/ — the Minimal Shell (chrome as seams)

The 2026-08-19 proof cut of DSH-PLUGIN-GAP-ANALYSIS.md §8.1: chrome stops
being hardcoded component trees and becomes SEATS that any module —
first-party or plugin — occupies by registration. `everything is a seam`.

## Layout

- `slots/core.ts` — the slot registry pure core, VENDORED + ADAPTED from
  DeepSeek Harness (`packages/client/ui-slots`, MIT). Zero runtime
  dependencies (React types only). See `slots/ATTRIBUTION.md` for the
  adaptation ledger (kept: declaration merging, register-declares-children,
  load-time validation, priority/order ledger, disposal that collapses
  declared children, batched notifications, describe() tree; dropped:
  keyed/chain kinds, stores, locale, scopes, inject factories).
- `slots/react.tsx` — THE one module that binds React (the DSH
  ui-renderer discipline): `SlotOutlet` + `useSlotEntries` over
  `useSyncExternalStore`.
- `seats.ts` — the shell's SlotMap seat vocabulary + the one registry
  instance (`shellSlots`). New seats merge into SlotMap HERE and are
  declared by their owning registration — never a union at a render site.
- `activityEntries.tsx` — the first-party activity registrations (the
  dogfood law: first-party surfaces ride the same seams a plugin would).

## The seats (first cut)

| Seat | Kind | Owner share | Occupied by |
|---|---|---|---|
| `root` | single (a-priori) | — | ActivityBar (the rail) |
| `activity.primary` | list | `ActivityOwnerProps` | agent, library |
| `activity.drawer` | list | `ActivityOwnerProps` | history, media |
| `activity.studio` | list | `ActivityOwnerProps` | (empty — the seam) |
| `activity.foot` | list | `ActivityOwnerProps` | (empty — the seam) |
| `center.tabs` | list | — | flow, library (+ `plugin:<id>`) |
| `right.panels` | list | — | settings, workspace (+ `plugin-right:<id>`) |

`right.panels` (H-RIGHT, §16.7): the right sidebar's internal tab panes.
The layout-owned `RightPanelHost` is the tab host — chrome + internal
tab strip + the mode pick (each pane's `modes` lists the center-tab ids
it rides alongside). First-party panes register in rightPanelEntries.tsx;
plugin panes arrive via `packages/<id>/right/<id>.yaml` → `/v1/right-panes`. A
mode with no panes renders full-width (the host renders null).

Adding an icon = a registration at an interleaving `order`. No rail edit,
no union to extend, no component change.

## The rules (gate-enforced: src/__tests__/shell-slots.gate.test.tsx)

1. **No closed chrome unions.** `ActivityPanel` is dead; the registry is
   the authority (source-scan gate + occupancy pin).
2. **Declaration = render authorization.** A seat exists because the owning
   registration's `children` table declared it; one declarer per seat,
   loud failure on a second.
3. **One lifecycle axis.** The owner's disposer collapses every seat it
   declared, recursively; stale disposers are no-ops.
4. **First-party rides the seams** (dogfood law) — ActivityBar contains no
   item lists; activityEntries.tsx owns them and the gate pins the ids.
5. **Visual atoms are not seams.** The TECH NOIR button (`ActivityButton`)
   stays a plain exported atom that entries reuse — the seam is the seat,
   not the pixels.

## Next steps (per the gap analysis)

- The center seat (replaceable `TabId` — the dsh 'conversation' precedent
  so studios keep full-bleed geometry) — WorkspaceLayout migrates next.
- The plugin lane: `packages/*/shell/*/component.tsx` glob + the register
  action covering shell components (the third sanctioned lane, §8.2).
- `shell.overlay` for frame-wide surfaces (avatars, toasts).
