// @contract bench-hostpath-currency-transports
//
// THE HOST-PATH CURRENCY WALL, EVERY WRITE TRANSPORT (2026-11-28 —
// the D11 source-photo row's cure, ROADMAP L2370-rem). The burn,
// verbatim from the D11 proof: "the drill's source-photo preview
// builds a URL from a raw absolute-path param and the dev host 404s
// it (the run stages the file fine; the preview img is cosmetic)".
// The cause was never the preview alone: the currency arm that buys a
// host-absolute media path into `data/input/<name>` (minor-a,
// 2026-11-12) rode ONE door — drafts/patch — while the three
// authoring doors beside it (the bench verb's patch, add-stage,
// add-stages) stored the same path raw. The engine's stage walk
// reads any host file, so Run worked; the badge built
// `<img src="/home/…">` and the host answered 404. A second drift
// rode the read half: the badge carried its own copy of the preview
// grammar (meshAssetUrl) that never received the square's
// absolute-tail arm (2026-11-22) — a row holding the HOST spelling of
// an uploads leaf previewed on the square and 404'd on the badge of
// the same card.
//
// The law this wall holds, each arm on its own firing path:
//
//   ARM 1 — THE BENCH VERB'S PATCH buys: BenchRemoteService.patch
//     (the agent's `patch`) lands data/input/<name> + the bytes.
//   ARM 2 — ADD-STAGE buys, AND THE JUDGE SAW THE BOUGHT VIEW: the
//     admission spy receives the currency, never the host path
//     (the judged view is the stored view).
//   ARM 3 — ADD-STAGES buys across the batch (strings and string
//     arrays, row-wise), and a malformed params row in the same
//     batch still refuses in its own voice with NOTHING landed.
//   ARM 4 — THE BADGE RESOLVES THROUGH THE ONE DERIVATION: for the
//     anny drill's REAL served spec, uploads currency, the HOST
//     spelling of an uploads leaf, and an already-servable run-media
//     URL each resolve exactly as the square's mirror resolves them.
//   ARM 5 — THE JOURNEY (the burn's own hops, real doors end to
//     end): add-stage carries the host path through the real bench
//     door → the STORED row is currency → the drill's derivation
//     yields the assets-door URL → the REAL /v1/assets/inputs door
//     answers 200 with the photo's bytes.
//
// TOGGLES (each restored by git checkout after the red):
//   T1 — bench.ts patchBench: `bought` → `paramsIn` (the walk's
//        result dropped). Reds ARM 1.
//   T2 — bench.ts addStageBench: `buyHostPaths(rawParams)` →
//        `rawParams`. Reds ARM 2 and ARM 5.
//   T3 — glb-stage.tsx attachedImageOf: `estateInputUrl(v) ?? v` →
//        `meshAssetUrl(v)`. Reds ARM 4 (the HOST-tail leaf — the
//        burn's exact value, handed to the <img> verbatim). ARM 5
//        stays green under T3 alone: its row is already currency,
//        which both grammars map — the write half bought it.
//   T4 — bench.ts addStagesBench: the pre-pass dropped
//        (`boughtList` → `rawList`). Reds ARM 3.
//
// NOT THIS WALL'S: drafts/patch's own buy (patch-hostpath-currency,
// the five arms the move kept verbatim); the engine's stage walk;
// the inputs door's containment law (doors.spec).
import '../../../../tests/helpers/hermetic-engine.ts'
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, test } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { ensureBench, addStageBench } from '../../../../packages/estate/drafts/src/bench.ts'
import { BenchRemoteService, DraftsRemoteService } from '../../../../packages/estate/drafts/src/remote.ts'
import { bootCtx, codeOf, mintRoot, sig } from '../../../../packages/estate/drafts/tests/bench-helpers.ts'
import { apply as applyDoors } from '../../../../packages/harness/melite-tools/src/doors.ts'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'
import { attachedImageOf } from '../../../../packages/web/card-base/src/glb-stage.tsx'
import { fieldsOf, type FormSpecDoc } from '../../../../packages/web/card-base/src/spec.ts'
import { draftIdOf } from '@melite/contracts/benchStage'

const MAIN = draftIdOf('bench-main')

/** The anny drill's REAL served spec and its first image-kind field —
 *  the exact seat the D11 badge reads (the pin source is the FIRST
 *  non-empty image field; derived, never a hand-named key). */
async function annySpec(): Promise<{ spec: FormSpecDoc, field: string }> {
  const spec = (await formSpecArm('anny')) as FormSpecDoc | null
  expect(spec).not.toBeNull()
  const field = fieldsOf(spec!).find((f) => f.type === 'image')?.name
  expect(field, 'the anny card declares an image-kind input (the source photo)').toBeTruthy()
  return { spec: spec!, field: field! }
}

/** The photo the D11 proof pressed with: a host file OUTSIDE every
 *  estate tree — the class no read-side arm can heal. */
const PHOTO_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03])

interface Rig {
  bench: BenchRemoteService
  drafts: DraftsRemoteService
  root: string
  photo: string
}

/** The temp stack: a minted root pinned as MELITE_REPO_ROOT (the
 *  currency tree AND the doors' input dir both resolve through it —
 *  the arm mirrors resolveRepoRoot's law; this wall rides both the
 *  mirror and the original against the same override). */
async function rig(): Promise<Rig> {
  const root = mintRoot()
  process.env['MELITE_REPO_ROOT'] = root
  const { ctx, domain } = await bootCtx()
  await ensureBench(domain, { session: 'main', stages: [{ id: 's_0' }] })
  mkdirSync(join(root, 'shots'), { recursive: true })
  const photo = join(root, 'shots', 'person.png')
  writeFileSync(photo, PHOTO_BYTES)
  return { bench: new BenchRemoteService(ctx), drafts: new DraftsRemoteService(ctx), root, photo }
}

function release(): void {
  delete process.env['MELITE_REPO_ROOT']
}

/** The stored params of the one stage, read back through the drafts
 *  door (the same read the drill's serve rides). */
async function storedParams(drafts: DraftsRemoteService, id = 's_0'): Promise<Record<string, unknown>> {
  const doc = await drafts.get(MAIN, sig)
  const stage = (doc['stages'] as Array<Record<string, unknown>>).find((s) => s['id'] === id)!
  return (stage['params'] ?? {}) as Record<string, unknown>
}

async function revOf(drafts: DraftsRemoteService): Promise<number> {
  const doc = await drafts.get(MAIN, sig)
  return Number((doc['bench'] as Record<string, unknown>)['rev'])
}

describe('the host-path currency arm rides EVERY params-bearing write transport', () => {
  test('ARM 1 — the bench verb\'s patch buys the host path (row + bytes)', async () => {
    const { bench, drafts, root, photo } = await rig()
    try {
      await bench.patch('main', { stage: 's_0', params: { photo }, expect_rev: 0 }, sig)
      const params = await storedParams(drafts)
      expect(params['photo']).toBe('data/input/person.png')
      expect(existsSync(join(root, 'data', 'input', 'person.png'))).toBe(true)
      expect(readFileSync(join(root, 'data', 'input', 'person.png')).equals(PHOTO_BYTES)).toBe(true)
    } finally {
      release()
    }
  })

  test('ARM 2 — add-stage buys BEFORE the judge: the admission sees the currency, never the host path', async () => {
    const { root, photo } = await rig()
    try {
      // a second boot over the same root: the direct door function
      // takes the admission this arm spies through
      const { domain } = await bootCtx()
      await ensureBench(domain, { session: 'spy', stages: [{ id: 's_0' }] })
      const judged: Array<{ card: string, params: Record<string, unknown> }> = []
      const row = await addStageBench(domain, 'spy', { card: 'anny', params: { photo }, expect_rev: 0 }, (card, params) => {
        judged.push({ card, params: { ...params } })
      })
      expect(row.stage).toBeTruthy()
      expect(judged.length).toBe(1)
      // THE JUDGED VIEW IS THE STORED VIEW: the judge was handed the
      // currency, so a card refusing a host path as a non-uploads
      // value never refuses what the store keeps — and a judge that
      // demands uploads currency passes on the row that lands.
      expect(judged[0]!.params['photo']).toBe('data/input/person.png')
      expect(existsSync(join(root, 'data', 'input', 'person.png'))).toBe(true)
    } finally {
      release()
    }
  })

  test('ARM 3 — add-stages buys across the batch; a malformed row still refuses with nothing landed', async () => {
    const { bench, drafts, root, photo } = await rig()
    try {
      mkdirSync(join(root, 'shots2'), { recursive: true })
      const second = join(root, 'shots2', 'second.png')
      writeFileSync(second, Buffer.from('second-bytes'))
      const out = await bench.addStages('main', {
        expect_rev: 0,
        stages: [
          { card: 'anny', params: { photo } },
          { card: 'anny', params: { input_images: [second, 'data/input/kept.png'] } },
          { card: 'anny' },
        ],
      }, sig)
      const ids = [...out.stages]
      expect(ids.length).toBe(3)
      const first = await storedParams(drafts, ids[0]!)
      expect(first['photo']).toBe('data/input/person.png')
      const secondRow = await storedParams(drafts, ids[1]!)
      expect(secondRow['input_images']).toEqual(['data/input/second.png', 'data/input/kept.png'])
      // the untouched currency item never re-bought (no byte move)
      expect(existsSync(join(root, 'data', 'input', 'kept.png'))).toBe(false)
      expect(readFileSync(join(root, 'data', 'input', 'second.png')).toString()).toBe('second-bytes')
      // the params-less row lands with no params key at all (the
      // walk rewrites values, never invents a container)
      const bare = await storedParams(drafts, ids[2]!)
      expect(Object.keys(bare)).toEqual([])

      // THE SHAPE LAW STANDS: a malformed params container in a batch
      // refuses in the loop's own voice, and no row of that batch lands
      const before = await revOf(drafts)
      const code = await codeOf(bench.addStages('main', {
        expect_rev: before,
        stages: [
          { card: 'anny', params: { photo } },
          { card: 'anny', params: ['the', 'knobs'] },
        ],
      }, sig))
      expect(code.startsWith('bench/bad-body|')).toBe(true)
      expect(await revOf(drafts)).toBe(before)
      const doc = await drafts.get(MAIN, sig)
      expect((doc['stages'] as unknown[]).length).toBe(4)
    } finally {
      release()
    }
  })
})

describe('the read half: the badge resolves through the ONE derivation', () => {
  test('ARM 4 — uploads currency, the HOST spelling of an uploads leaf, and a run-media URL resolve as the square resolves them', async () => {
    const { spec, field } = await annySpec()
    // the currency the write doors mint
    expect(attachedImageOf(spec, { [field]: 'data/input/person.png' })?.url).toBe('/v1/assets/inputs/person.png')
    // THE HOST SPELLING (a row written before this cure, or restored
    // from one): the square's absolute-tail arm, now the badge's too —
    // this is the exact 404 of the burn
    expect(attachedImageOf(spec, { [field]: '/home/operator/estate/data/input/person.png' })?.url)
      .toBe('/v1/assets/inputs/person.png')
    // a value already servable rides VERBATIM (a picked stage output)
    const served = '/melite-media/runs/run-abc123/out.png'
    expect(attachedImageOf(spec, { [field]: served })?.url).toBe(served)
    // whitespace is emptiness; a non-image leaf heals nothing (it
    // rides verbatim — the compose door's refusal owns that voice)
    expect(attachedImageOf(spec, { [field]: '   ' })).toBe(null)
    expect(attachedImageOf(spec, { [field]: '/home/operator/data/input/notes.txt' })?.url)
      .toBe('/home/operator/data/input/notes.txt')
  })
})

// ── the real inputs door, driven in-process ────────────────────────
interface DoorRoute { kind: string, path: string, handler: (req: IncomingMessage, res: ServerResponse) => void }

/** Mount the melite-tools doors over a capturing web server (the
 *  doors.spec host's shape, pared to what apply reads at mount). */
function mountDoors(): Array<DoorRoute> {
  const routes: Array<DoorRoute> = []
  const host = {
    effect: (fn: () => void) => { fn(); return () => {} },
    llm: {},
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    registry: { values: () => [] },
    tools: { schemas: () => [{ name: 'melite_discover' }, { name: 'melite_flow' }] },
    webServer: {
      port: 3080,
      register: (route: DoorRoute) => { routes.push(route); return () => {} },
    },
    get: () => undefined,
  }
  applyDoors(host as never, {})
  return routes
}

/** One GET through a mounted route's handler. */
function get(route: DoorRoute, url: string): Promise<{ status: number, type: string, bytes: Buffer }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let status = 0
    let type = ''
    const res = {
      writeHead(code: number, headers: Record<string, string>) {
        status = code
        type = headers['content-type'] ?? ''
        return this
      },
      setHeader() { return this },
      end(body?: Buffer | string) {
        chunks.push(Buffer.isBuffer(body) ? body : Buffer.from(body ?? ''))
        resolve({ status, type, bytes: Buffer.concat(chunks) })
      },
    }
    try {
      void route.handler({ method: 'GET', url, headers: {} } as unknown as IncomingMessage, res as unknown as ServerResponse)
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

describe('THE JOURNEY — the burn\'s own hops, real doors end to end', () => {
  test('ARM 5 — add-stage carries the host path → the stored row is currency → the drill\'s badge names the assets door → the REAL door answers the bytes', async () => {
    const routes = mountDoors()
    const inputs = routes.find((r) => r.path === '/v1/assets/inputs')
    expect(inputs).toBeDefined()
    const { spec, field } = await annySpec()
    const { bench, drafts, photo } = await rig()
    try {
      const row = await bench.addStage('main', { card: 'anny', params: { [field]: photo }, expect_rev: 0 }, sig)
      // hop 1 — the WRITE door: the row that lands is the row the next
      // run composes (uploads currency, never the host path)
      const stored = await storedParams(drafts, row.stage)
      expect(stored[field]).toBe('data/input/person.png')
      expect(JSON.stringify(stored).includes(photo)).toBe(false)
      // hop 2 — the DRILL's derivation over the drill's REAL spec and
      // the STORED row (the serve hands the drill)
      const pin = attachedImageOf(spec, stored)
      expect(pin?.id).toBe(field)
      expect(pin?.url).toBe('/v1/assets/inputs/person.png')
      // hop 3 — the SERVED lane: the real door serves the photo's bytes
      const served = await get(inputs!, pin!.url)
      expect(served.status).toBe(200)
      expect(served.type).toBe('image/png')
      expect(served.bytes.equals(PHOTO_BYTES)).toBe(true)
    } finally {
      release()
    }
  })
})
