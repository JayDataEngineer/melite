/**
 * Standalone build config for the infer-gallery client plugin.
 *
 * Uses the workspace's shared client-bundle preset (melite/dsh/shared/tsdown.client.ts):
 * node-half lib/ plus the browser bundle lib/client.js (closure-factory artifact
 * for the GUI module loader, CSS Modules inlined with auto-injected
 * <style data-plugin>). The node half stays a single entry — the host half's
 * only runtime dependency is the cordis framework, external by default.
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@infer-media/dsh-gallery', ['src/index.ts'], {
  libExternal: [
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-host-webserver',
  ],
})