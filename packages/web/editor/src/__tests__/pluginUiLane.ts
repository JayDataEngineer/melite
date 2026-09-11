/**
 * pluginUiLane — the TEST fixture for the ui-claim lane's PLUGIN claims
 * (web-registry ruling, 2026-09-03). In the APP, WorkspaceLayout boots
 * loadPluginUi() → GET /v1/ui-slots → PLUGIN entries (served from
 * engines/<engine>/ui/<claim>/ui.yaml — the wire's plugin field is the OWNING
 * dir, exactly what the editor's component glob derives). The
 * FIRST-PARTY CHROME no longer rides this wire: it registers STATICALLY
 * at pluginUi import (chrome/* ids, precedence 10) — the melite-core
 * pseudo-plugin is dead. In TESTS there is no DSH host: seed the wire
 * through syncPluginUi with PLUGIN-shaped claims, or region-resolving
 * surfaces render the static chrome (never null).
 */
import { syncPluginUi } from "@/shell/pluginUi"
import type { UiSlotEntry } from "@melite/contracts"

/** A sample PLUGIN region claim, as GET /v1/ui-slots serves them. */
export const PLUGIN_REGION_CLAIMS: readonly UiSlotEntry[] = [
  { id: "media-sidebar", slot: "sidebar", precedence: 10, plugin: "my-plugin" },
]

/** Sample PLUGIN card-element claims (a plugin overriding the chrome
 *  cells). */
export const PLUGIN_ELEMENT_CLAIMS: readonly UiSlotEntry[] = [
  { id: "asset-preview", slot: "card-preview", precedence: 10, plugin: "my-plugin" },
  { id: "tile-run", slot: "card-run", precedence: 10, plugin: "my-plugin" },
]

/** Seed the wire exactly as the app's boot does (idempotent per
 *  entries). Extra claims ride the SAME sync — the diff law disposes
 *  anything a later sync omits, so callers must never seed twice. */
export async function seedPluginLane(extra: readonly UiSlotEntry[] = []): Promise<void> {
  await syncPluginUi([...PLUGIN_REGION_CLAIMS, ...PLUGIN_ELEMENT_CLAIMS, ...extra])
}
