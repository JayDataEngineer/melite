/**
 * pluginUi — the UI-slot lane's frontend materializer (the fifth lane,
 * 2026-08-19, the overrides doctrine). The server owns the CLAIM TABLE
 * (ui claims declared at packages/<plugin>/ui/<claim>/ui.yaml, served on
 *  GET /v1/ui-slots); the components ride import.meta.glob over the
 *  matching component.tsx files (the cardStudios pattern — the server
 *  NEVER loads frontend code; the microkernel line stays uncrossed).
 *  This module is the ONE diff point keeping the slots in step with
 *  the wire:
 *
 *   syncPluginUi(entries) — dispose gone claims, register new (async:
 *   components lazy-load once, then cache). Idempotent.
 *   loadPluginUi() — fetch + sync; failures are LOGGED, never thrown
 *   (a dead lane must not brick boot — the shell lane's contract).
 *
 * The SLOT UNION lives here at the seam edge: a wire entry naming an
 *  unknown slot is logged + skipped (fail-safe — a stale plugin on a
 *  newer/older editor never breaks boot). The FIRST-PARTY CHROME is
 *  STATIC (web-registry ruling 2026-09-03, docs/design/web-registry.md
 *  §4): the shell's own claims (asset-preview, media-sidebar, tile-run)
 *  register directly at import — the cardStudios precedent for
 *  first-party tenants. The melite-core pseudo-plugin (shim claims
 *  re-exporting editor components through the glob) is DEAD; the wire
 *  is PURE PLUGIN. A plugin claim at a HIGHER precedence shadows the
 *  chrome (that is the point — chrome is the quietest tier, 10). A
 *  precedence
 *  tie with another claim on the slot fails LOUD at register — the
 *  kernel's law — surfaced here as a logged error, not a boot crash.
 *
 * NOT on this lane: the card BODY (card-body). A body claim carries the
 *  E4 writes contract, so it rides the CARD lane (the card's body: block
 *  + the cards glob) where that contract is declared. This wire is for
 *  component-only cells: card elements and app regions.
 */
import type { ComponentType } from "react"
import { editorClient } from "@/rpc/editorClient"
import type { UiSlotEntry } from "@melite/contracts"
import { cardIconSlot, cardPreviewSlot, cardRunSlot } from "@melite/slots"
import { sidebarRegionSlot } from "@melite/slots"
import { meshViewerSlot, motionViewerSlot, videoViewerSlot, audioViewerSlot } from "@melite/slots"
import { RayCoreCardPreview, RayCoreTileRun } from "@/surfaces/flow/cardElements"
import { AppSidebar } from "@/surfaces/shared/AppSidebar"

// ── FIRST-PARTY CHROME (static — the web-registry ruling) ────────────────
// The shell's own slot claims, registered directly at import: the
// components live in the editor tree, owned by the shell that mounts
// them — no wire round-trip for one's own chrome, no pseudo-plugin
// costume. Plugins override LOUDER through the seam; chrome is the
// quietest tier (10) and never disposes (it ships with the shell).
cardPreviewSlot.register({
  id: "chrome/asset-preview",
  precedence: 10,
  resolve: () => ({ Preview: RayCoreCardPreview }),
})
sidebarRegionSlot.register({
  id: "chrome/media-sidebar",
  precedence: 10,
  resolve: () => ({ Sidebar: AppSidebar }),
})
cardRunSlot.register({
  id: "chrome/tile-run",
  precedence: 10,
  resolve: () => ({ Run: RayCoreTileRun }),
})

// Lazy component loaders — the ui claim dirs' component.tsx files. The
// glob is empty until a plugin actually ships a UI override; that is the
// seam's resting state (the defaults render).
// ComponentType<any> is deliberate: these are PLUGIN-OWNED components
// loaded dynamically over the wire — their props contract belongs to the
// claiming plugin, not to the shell (the seam edge, not a typed boundary).
// The 2026-09 formalization: card claims live at
// packages/engines/<engine>/action_cards/<card>/ui/<claim>/component.tsx;
// PLUGIN-LEVEL claims live at packages/engines/<engine>/ui/<claim>/
// component.tsx; and the FIRST-PARTY chrome claims (the asset preview
// cell, the media sidebar, the tile run affordance — editor chrome no
// engine owns) live at packages/melite-core/ui/<claim>/component.tsx,
// the zeroth plugin's own home (2026-09-03: they had been parked under
// engines/comfyui/ui/ — an engine owning first-party chrome was a
// taxonomy violation). The wire entry carries plugin=<card, engine, or
// melite-core> + id=<claim> (the server serves ids, not paths), so the
// claim key matches on the owner/claim SUFFIX of the glob path,
// engine-agnostic.
const UI_COMPONENT_LOADERS = import.meta.glob<{
  default: ComponentType<any>
}>([
  "../../../../../packages/engines/*/action_cards/*/ui/*/component.tsx",
  "../../../../../packages/engines/*/ui/*/component.tsx",
])

// SEGMENT-ANCHORED (the cardStudios lesson): vite normalizes glob keys —
// the literal "packages/engines" prefix collapses into ../ and any
// absolute-prefix regex silently matches nothing in the module runner.
// The segments AFTER the anchors are stable: /action_cards/<card>/ui/
// for card claims, /engines/<engine>/ui/ for plugin-level claims,
// /melite-core/ui/ for the zeroth plugin's chrome claims.
const CARD_CLAIM_PATH = /\/action_cards\/([^/]+)\/ui\/([^/]+)\/component\.tsx$/
const PLUGIN_LEVEL_PATH = /\/engines\/([^/]+)\/ui\/([^/]+)\/component\.tsx$/
function pluginUiId(path: string): string | null {
  const card = CARD_CLAIM_PATH.exec(path)
  if (card) return `${card[1]}/${card[2]}`
  const plug = PLUGIN_LEVEL_PATH.exec(path)
  return plug ? `${plug[1]}/${plug[2]}` : null
}

/** The slot union (the seam edge): wire slot name → a claim factory
 *  wrapping the loaded component in that slot's payload key. Unknown
 *  names are handled by the caller (logged + skipped, fail-safe). */
const SLOT_FACTORIES: Record<
  string,
  (claim: { id: string; precedence: number; component: ComponentType<any> }) => (() => void) | null
> = {
  "card-icon": ({ id, precedence, component }) =>
    cardIconSlot.register({ id, precedence, resolve: () => ({ Icon: component }) }),
  "card-preview": ({ id, precedence, component }) =>
    cardPreviewSlot.register({ id, precedence, resolve: () => ({ Preview: component }) }),
  "card-run": ({ id, precedence, component }) =>
    cardRunSlot.register({ id, precedence, resolve: () => ({ Run: component }) }),
  sidebar: ({ id, precedence, component }) =>
    sidebarRegionSlot.register({ id, precedence, resolve: () => ({ Sidebar: component }) }),
  // The history-sidebar / chat-input regions left the union 2026-08-21 —
  // their only claims and consumers were the deleted native-agent chat
  // surfaces; a stale plugin shipping those slots now hits the loud
  // unknown-slot skip below.
  // The viewer seam (2026-08-21): one slot per media kind; the claim
  // owns the mode dispatch (tile poster/waveform vs full transport).
  "mesh-viewer": ({ id, precedence, component }) =>
    meshViewerSlot.register({ id, precedence, resolve: () => ({ Viewer: component }) }),
  "motion-viewer": ({ id, precedence, component }) =>
    motionViewerSlot.register({ id, precedence, resolve: () => ({ Viewer: component }) }),
  "video-viewer": ({ id, precedence, component }) =>
    videoViewerSlot.register({ id, precedence, resolve: () => ({ Viewer: component }) }),
  "audio-viewer": ({ id, precedence, component }) =>
    audioViewerSlot.register({ id, precedence, resolve: () => ({ Viewer: component }) }),
}

const _disposers = new Map<string, () => void>()
const _components = new Map<string, ComponentType<any>>()

/** Diff the wire into the slots (the ONE sync point). Async: components
 *  lazy-load on first sight, then cache; a gone claim disposes TOTAL
 *  (the default re-renders — the seam is a live store). */
export function syncPluginUi(entries: readonly UiSlotEntry[]): Promise<void> {
  // SERIALIZED (2026-08-21): the body has an async gap (the component
  // load below), and two concurrent boot callers (WorkspaceLayout +
  // PluginsPanel) both passed the _disposers guard BEFORE either await
  // resolved — the second register then hit "already registered" and,
  // worse, left the slot registered WITHOUT a disposer entry (a later
  // diff could never remove it). One sync at a time; queued callers see
  // the populated _disposers and no-op through the diff law.
  const run = async (): Promise<void> => {
  const next = new Set(entries.map((e) => `${e.plugin}/${e.id}`))
  for (const [key, dispose] of _disposers) {
    if (!next.has(key)) {
      dispose()
      _disposers.delete(key)
    }
  }
  for (const e of entries) {
    const key = `${e.plugin}/${e.id}`
    if (_disposers.has(key)) continue
    const factory = SLOT_FACTORIES[e.slot]
    if (!factory) {
      // Fail-safe: a claim naming a slot this editor doesn't host. The
      // slot union is FRONTEND territory; a version skew must not brick
      // boot. Loud, then skip.
      console.error(
        `pluginUi: claim ${JSON.stringify(key)} names unknown slot ${JSON.stringify(e.slot)} — skipping`,
      )
      continue
    }
    let component = _components.get(key)
    if (!component) {
      const loader = Object.entries(UI_COMPONENT_LOADERS).find(([path]) => pluginUiId(path) === key)
      if (!loader) {
        console.error(
          `pluginUi: claim ${JSON.stringify(key)} has no component.tsx under packages/engines/*/ui/${e.plugin}/${e.id}/ — skipping`,
        )
        continue
      }
      component = (await loader[1]()).default
      _components.set(key, component)
    }
    try {
      _disposers.set(key, factory({ id: `plugin/${key}`, precedence: e.precedence, component }))
    } catch (err) {
      // The kernel's tier law, surfaced: a precedence tie on this slot.
      // Loud, not fatal — the rest of the lane still mounts.
      console.error(`pluginUi: cannot register claim ${JSON.stringify(key)} — ${err}`)
    }
  }
  }
  _syncChain = _syncChain.then(run, run)
  return _syncChain
}

/** The serializer — see syncPluginUi. */
let _syncChain: Promise<void> = Promise.resolve()

/** Fetch + sync. NEVER throws (boot and flip both ride this). */
export function loadPluginUi(): Promise<void> {
  // CONCURRENT CALLS SHARE ONE FETCH (2026-08-21): boot mounts two
  // surfaces that both start the lane; the second call rides the first
  // in-flight load instead of re-fetching (sequential calls — the
  // PluginsPanel refresh after a plugin toggle — still re-fetch).
  if (_inflightLoad) return _inflightLoad
  _inflightLoad = (async () => {
  try {
    await syncPluginUi(await editorClient.listUiSlots())
  } catch (e) {
    console.error(`pluginUi: ui-slot lane sync failed — ${e}`)
  } finally {
    _inflightLoad = null
  }
  })()
  return _inflightLoad
}

/** The in-flight load coalescer — see loadPluginUi. */
let _inflightLoad: Promise<void> | null = null
