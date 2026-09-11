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
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@melite-plugin/dsh-card-view', ['src/index.ts', 'src/invariant.ts'], {
  libExternal: [
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-host-webserver',
  ],
})
