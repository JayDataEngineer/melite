/**
 * Standalone build config for the melite-card-deck client plugin.
 *
 * Same shared client-bundle preset as melite-gallery: node-half lib/ plus the
 * browser bundle lib/client.js for the GUI module loader.
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@melite-plugin/dsh-card-deck', ['src/index.ts'], {
  libExternal: [
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-host-webserver',
  ],
})
