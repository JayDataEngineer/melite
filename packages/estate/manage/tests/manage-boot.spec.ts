// manage-boot.spec.ts — THE MANAGE ROUTE BOOT WALL (the operator's
// 2026-11-05 report: the ComfyUI Manager tab's "Refresh failed:
// transport failure for /api/manage/act: HTTP 404"). The 404 shape
// is a route ABSENT at the wire — a boot that never mounted the
// manage rows. This wall boots the estate's own manage composition
// (timer → queue → manageProvider → manageRemotePlugin, the
// estate's mount order) in a REAL cordis Context and calls the
// remote door the web gateway binds: `manage/act` must ANSWER — an
// ok envelope, or a managed refusal (RemoteError 'manage/refused'
// IS the lane's own answer shape, the envelope riding the details)
// — never an unmounted crash or a missing namespace. The estate
// census (melite-estate's estate.spec) pins that these rows ride
// every estate apply; this wall pins the rows themselves serve.
import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import TimerService from '@deepseek-ai/cordis-plugin-timer'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
// self-reference (the compiled package's own export map face — the
// test tier keeps rootDir, so `.ts` specifiers are illegal beside
// the real emit; the package name is the one spelling)
import { manageRemotePlugin } from '@melite/estate-manage'

/** The models boot arm, by SOURCE URL (the queue spec's own law for
 * test-only edges): a manifest devDep on @melite/comfyui-cordis
 * builds the workspace cycle card-base → estate-manage →
 * comfyui-cordis → … → card-base (the acyclicity gate, all three
 * dep sections) — the dynamic edge is the one spell that arms the
 * table without coupling the manifests. */
type ModelsBoot = { bootModels(): Promise<unknown> }
const modelsBootUrl = new URL(
  '../../../engines/comfyui-cordis/src/models/service.ts',
  import.meta.url,
)
// the plugin call face (what ctx.plugin accepts) — the URL-borne
// seats are untyped at the import site, so they seat through the
// context's own plugin parameter, never `never` (a never config
// refuses every call)
type PluginFace = Parameters<Context['plugin']>[0]
type QueueFace = {
  // the queue row's plugin face + the manage seat it re-exports
  // (estate-queue src/index.ts), by the same URL law as the models
  // arm — BOTH workspace edges cycle through card-base, so BOTH
  // ride dynamic source imports; the manifest stays acyclic.
  default: PluginFace
  manageProvider: PluginFace
}
const queueUrl = new URL(
  '../../../harness/estate-queue/src/index.ts',
  import.meta.url,
)

vi.setConfig({ testTimeout: 120_000 })

describe('THE MANAGE ROUTE BOOT WALL (/api/manage/act answers after boot)', () => {
  it('the estate manage rows boot in order and the remote door ANSWERS — never an unmounted 404', async () => {
    const root = mkdtempSync(join(tmpdir(), 'manage-boot-'))
    const ctx = new Context()
    try {
      // THE ESTATE'S OWN ORDER (melite-estate/src/index.ts): the
      // models table arms FIRST (the census gate's whenModelsArmed
      // settle — the process seat the manage seat's catalog read
      // rides), then the timer seat (the rail's timeouts), the
      // queue row with config-named roots (the J12 law — never an
      // env seam), the manage seat, and the manage remote.
      const queueFace = await import(queueUrl.href) as QueueFace
      const queuePlugin = queueFace.default
      await (await import(modelsBootUrl.href) as ModelsBoot).bootModels()
      await ctx.plugin(TimerService)
      await ctx.plugin(queuePlugin, { stateRoot: join(root, 'runs') })
      await ctx.plugin(queueFace.manageProvider, {})
      await ctx.plugin(manageRemotePlugin)

      // THE NAMESPACE IS MOUNTED: the tab resolves ctx.remote.manage
      // through the shell; the unmounted-404 shape is this seat
      // absent. The declaration merge types the property — presence
      // is the boot's own fact.
      expect(ctx.manageRemote).toBeTruthy()

      // THE DOOR: `manage/act` with a status probe. The engine at
      // the default loopback may be unreachable in a unit lane —
      // the plane's own answer (the 503 plane-unavailable fold) is
      // a MANAGED refusal; only a crash or a missing door is the
      // 404's shape.
      let refused: RemoteError | undefined
      const row = await ctx.manageRemote.remoteExportAct(
        { action: 'status' },
        new AbortController().signal,
      ).catch((error: unknown) => {
        // a refusal IS an answer: the envelope rides the details —
        // anything else (TypeError, unmounted, abort) rethrows and
        // reds this wall
        expect(error).toBeInstanceOf(RemoteError)
        refused = error as RemoteError
        return undefined
      })
      if (refused !== undefined) {
        expect((refused as { message: string }).message).toBeTruthy()
      } else {
        expect(row).toBeTruthy()
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
