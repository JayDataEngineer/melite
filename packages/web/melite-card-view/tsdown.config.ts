/**
 * Standalone build config for the melite-card-view client plugin.
 *
 * Uses the workspace's vendored shared client-bundle preset (melite/dsh/shared/
 * tsdown.client.ts — the dsh-web-ui copy adjusted for this repository's
 * layout): node-half lib/ plus the browser bundle lib/client.js (the
 * closure-factory artifact calling window.__ModuleLoader__.load, CSS Modules
 * inlined with auto-injected <style data-plugin>).
 *
 * Node-half entries point at src (tsdown compiles TS directly), so the build
 * needs no separate tsc emit for runtime artifacts.
 *
 * Phase 2 (2026-09-11): the legacy 1:1 FlowCanvas branch (src/old/ +
 * OldFlowMount + old-flow.css + the dsh-global-css-inline plugin) is retired.
 * The tab is pure DSH — card.module.css rides the shared preset's module-CSS
 * inlining, no global stylesheets, no build plugins.
 */
import { clientBundle } from '../shared/tsdown.client.ts'

const PLUGIN_ID = '@melite-plugin/dsh-card-view'

const faces = clientBundle(PLUGIN_ID, ['src/index.ts', 'src/invariant.ts'], {
  libExternal: [
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-host-webserver',
  ],
})

export default faces
