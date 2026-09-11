// pluginKinds — the kinds lane's frontend materializer (the fourth
// lane, 2026-08-19). The server owns the truth (packages/*/kinds/*.yaml,
// served on GET /v1/kinds); this module is the ONE diff point keeping
// cardSeam in step with the wire:
//
//   syncPluginKinds(entries) — dispose gone, register new (idempotent:
//   an unchanged kind is not re-registered, no dispose churn).
//   loadPluginKinds() — fetch + sync; failures are LOGGED, never thrown
//   (a dead lane must not brick boot — the shell lane's contract).
//   useCardKindsVersion() — the live-propagation organ: React
//   subscribes to the registry version, so a mid-session flip
//   re-renders kind-derived chrome (Run affordance, badge tone, tile
//   icon) NOW — no reload.
//
// melite-core is the zeroth provider: the FIRST-PARTY table rides this same
// wire (cardKindRegistrations.ts is deleted; no code registrations
// anywhere). A plugin kind is owned by its plugin server-side — the
// cross-plugin duplicate guard — and a disabled plugin's kinds vanish:
// cards of a gone kind render fail-safe (UNKNOWN: never runnable, no
// form-spec fetch).
import { useSyncExternalStore } from "react"
import {
  getCardKindsVersion,
  markCardKindsLaneSettled,
  registerCardKind,
  subscribeCardKinds,
} from "@melite/slots"
import { SHELL_ICONS } from "@/shell/pluginShell"
import type { KindEntry } from "@/rpc/editorApi"
import { editorClient } from "@/rpc/editorClient"

const _disposers = new Map<string, () => void>()

/** Diff the wire into the registry (the ONE sync point). */
export function syncPluginKinds(entries: readonly KindEntry[]): void {
  const next = new Set(entries.map((e) => e.kind))
  for (const [kind, dispose] of _disposers) {
    if (!next.has(kind)) {
      dispose()
      _disposers.delete(kind)
    }
  }
  for (const e of entries) {
    if (_disposers.has(e.kind)) {
      // A within-wire duplicate: the server's cross-plugin guard makes
      // this a mount failure upstream, so it cannot happen on a real
      // wire — but sync never bricks. Loud, not fatal.
      console.error(
        `pluginKinds: kind ${JSON.stringify(e.kind)} appears twice on the wire — keeping the first registration`,
      )
      continue
    }
    try {
      _disposers.set(
        e.kind,
        registerCardKind({
          kind: e.kind,
          runnable: e.runnable,
          executable: e.executable,
          formSpec: e.formSpec,
          compound: e.compound,
          opensStudio: e.opensStudio,
          badgeTone: e.badgeTone,
          // Declarative runner — absent on the wire === "" (the default
          // rule). The dispatcher (resolveStageRunner) reads this; no
          // kind-name branching in the dispatch (2026-09-05).
          ...(e.runner !== undefined ? { runner: e.runner } : { runner: "" }),
          ...(e.icon !== undefined ? { icon: SHELL_ICONS[e.icon] } : {}),
        }),
      )
    } catch (err) {
      // Loud but non-fatal: a duplicate means the wire and the registry
      // disagree (two plugins stealing a kind is already a server-side
      // mount failure). Keep the first registration.
      console.error(
        `pluginKinds: cannot register kind ${JSON.stringify(e.kind)} — ${err}`,
      )
    }
  }
}

/** Fetch + sync. NEVER throws (boot and flip both ride this). */
export function loadPluginKinds(): Promise<void> {
  // CONCURRENT CALLS SHARE ONE FETCH (2026-08-21): boot mounts two
  // surfaces that both start the lane (WorkspaceLayout + PluginsPanel);
  // the second rode a SECOND fetch whose identical entries then tripped
  // the within-wire duplicate guard for every kind. Sequential calls
  // (the PluginsPanel refresh) still re-fetch.
  if (_inflightLoad) return _inflightLoad
  _inflightLoad = (async () => {
  try {
    syncPluginKinds(await editorClient.listKinds())
  } catch (e) {
    console.error(`pluginKinds: kinds lane sync failed — ${e}`)
  } finally {
    _inflightLoad = null
    // The lane's first load settled (success or failure): from here a
    // kindDef() miss is genuinely unknown, not the boot race — cardSeam
    // un-gates its loud log (see _kindsLaneSettled there).
    markCardKindsLaneSettled()
  }
  })()
  return _inflightLoad
}

/** The in-flight load coalescer — see loadPluginKinds. */
let _inflightLoad: Promise<void> | null = null

/** Live propagation: subscribe React to registry mutations. */
export function useCardKindsVersion(): number {
  return useSyncExternalStore(subscribeCardKinds, getCardKindsVersion)
}
