/**
 * Build config for the infer-media plugin: node-half lib/index.js plus the
 * browser bundle lib/client.js (closure-factory artifact for the GUI module
 * loader), via the workspace's shared client-bundle preset.
 */
import { clientBundle } from '../shared/tsdown.client.ts'

export default clientBundle('@infer-media/dsh-media', ['src/index.ts'], {
  libExternal: [
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-host-webserver',
  ],
})
