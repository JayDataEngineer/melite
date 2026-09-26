import { defineConfig, devices } from '@playwright/test'

/**
 * The gallery's OWN browser plane: the 3D media door (e2e/mesh-door.spec.ts).
 *
 * Unlike the studio/deck browser walls, this one boots NOTHING of the
 * estate: the spec starts its own static server for the built harness and
 * the one .glb under test. That is deliberate — the thing being verified
 * is a WebGL canvas drawing a glTF, and a lane's auth, boot order and
 * GPU would only add ways for the wall to pass for the wrong reason.
 *
 * The harness build is a separate step (it imports the component from
 * src): `pnpm exec vite build --config e2e/mesh-door/vite.config.mts`.
 * The spec self-skips when that bundle (or the artifact) is absent.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'mesh-door.spec.ts',
  timeout: 300_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:1',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // WebGL in headless Chromium: SwiftShader is the software
          // rasterizer. Without it getContext('webgl') returns null and
          // the wall would "pass" by proving the failure arm instead of
          // the render.
          args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
  ],
})
