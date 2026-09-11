/**
 * Standalone build config for the ray-card-deck client plugin.
 *
 * Same shared client-bundle preset as ray-gallery: node-half lib/ plus the
 * browser bundle lib/client.js for the GUI module loader.
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@melite-plugin/dsh-card-deck', ['src/index.ts'], {
  libExternal: [
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/dsh-host-frontend-static',
    '@deepseek-ai/dsh-host-webserver',
  ],
})
