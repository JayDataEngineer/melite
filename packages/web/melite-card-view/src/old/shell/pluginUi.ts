// pluginUi — PORT SHIM (2026-09-11, the 1:1 flow port into the DSH
// card-view plugin). In the editor app this lane syncs plugin UI slot
// components into the app shell (AppSidebar swaps etc. — editor-app
// machinery, not part of the flow UX). The DSH host owns its own
// shell; there are no plugin UI slots to mount, so the load is a
// resolved no-op. AgentCardsEmbed's call site is unchanged.
export function loadPluginUi(): Promise<void> {
  return Promise.resolve()
}
