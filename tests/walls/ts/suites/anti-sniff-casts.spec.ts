// THE ANTI-SNIFF WALL (F-2/F-4 cure, 2026-11-05) — the ledger's
// anti-sniff scan, WRITTEN AT LAST: the ledger carried an arm claiming
// an inline-service-cast scan "forbidding `(ctx as {` casts" that had
// never been written — a contract with no wall is the same defect
// class as a gate that cannot fire (CONTRACTS.md §1).
//
// THE INVARIANT IT GUARDS: the packages' SOURCE planes carry no NEW
// inline structural casts — `as unknown as { … }` re-declarations and
// the `(ctx as { get(…) })` service-probe casts. The cordis-native
// alternatives are the typed Context members (logger/effect/get —
// cordis lib/types/reflect.d.ts), the service augmentations
// (dsh-tools' `interface Context { tools: ToolRuntime }`), the named
// structural host interfaces (estate.ts's EstateHost), and inject.
// The census below is a RATCHET: it asserts the per-file counts
// EXACTLY — a new cast reds, and so does an improvement, because both
// drift the adjudicated baseline; editing the baseline row in the
// same change is the conscious step (the coverage-baseline-ratchet
// precedent). melite-tools' CtxView + probe casts were retired in the
// same change (index.ts, doors.ts ×2, estate.ts ×2); the remaining
// sites are adjudicated HERE — their retirement is F-2's owed M-work,
// one baseline step-down at a time.
//
// SCOPE: packages/<vertical>/<pkg>/src/**/*.{ts,tsx} — the runtime
// package graph's source planes, derived by walking the tree (never a
// hand list). Test suites and walls fake the seam BY DESIGN (fakes
// are structural stands, not boundary casts) and sit out of scope.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

const REPO = join(import.meta.dirname, '..', '..', '..', '..')

/** The adjudicated census (2026-11-05, the F-2 cluster): repo-relative
 *  file → live `as unknown as {` count. A file whose source carries
 *  the pattern and is ABSENT here is itself a red. */
const BASELINE: Record<string, number> = {
  'packages/harness/melite-tools/src/tools/melite-view.ts': 7,
  'packages/harness/estate-call/src/executorHarness.ts': 3,
  'packages/harness/estate-queue/src/runsValidateStages.ts': 2,
  'packages/harness/estate-queue/src/manageRegistry.ts': 1,
  'packages/harness/estate-queue/src/runsExecute.ts': 1,
  'packages/engines/comfyui-cordis/src/models/service.ts': 1,
  'packages/engines/comfyui-cordis/src/supervisor.ts': 1,
  'packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageManipulators.ts': 2,
  'packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageOverlays.ts': 2,
  'packages/web/melite-card-view/src/client/stage-drill.tsx': 2,
  'packages/web/melite-card-view/src/client/add-stage.ts': 1,
  'packages/web/card-base/src/stage3d.ts': 1,
  'packages/web/infer-gallery/src/index.ts': 2,
  'packages/web/melite-estate/src/provisioning.ts': 1,
  'packages/harness/melite-tools/src/doors.ts': 1,
}

/** The probe-cast pattern's census: zero live sites after the F-2/F-4
 *  retirement — ANY introduction is a red (a cast named in the ledger's
 *  law verbatim: `(ctx as { get(…) })`). */
const PROBE_PATTERN = /\bas \{\s*\r?\n?\s*get\s*\(/g

function* walkSources(dir: string): Generator<string> {
  let ents: Array<{ name: string, isDirectory: boolean }>
  try {
    ents = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of ents) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'lib' || e.name === 'dist') continue
      yield* walkSources(full)
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      yield full
    }
  }
}

/** Every packages/<vertical>/<pkg>/src plane in the estate. */
function srcPlanes(): string[] {
  const planes: string[] = []
  const packagesDir = join(REPO, 'packages')
  for (const vertical of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!vertical.isDirectory()) continue
    for (const pkg of readdirSync(join(packagesDir, vertical.name), { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue
      const src = join(packagesDir, vertical.name, pkg.name, 'src')
      try {
        readdirSync(src)
        planes.push(src)
      } catch {
        /* a package without a src plane (pure manifests, bins) contributes nothing */
      }
    }
  }
  return planes
}

describe('THE ANTI-SNIFF WALL — the inline-cast census (F-2/F-4)', () => {
  test('the `as unknown as {` census matches its adjudicated baseline exactly', () => {
    const seen = new Map<string, number>()
    const offenders: string[] = []
    for (const plane of srcPlanes()) {
      for (const file of walkSources(plane)) {
        const rel = relative(REPO, file).split(sep).join('/')
        const count = (readFileSync(file, 'utf8').match(/as unknown as \{/g) ?? []).length
        if (count > 0) seen.set(rel, count)
      }
    }
    for (const [rel, count] of seen) {
      const admitted = BASELINE[rel]
      if (admitted === undefined) {
        offenders.push(`${rel}: ${count} cast(s) in a file with NO baseline row — add the row only as a conscious adjudication`)
      } else if (count !== admitted) {
        offenders.push(`${rel}: ${count} cast(s) vs baseline ${admitted} — ${count > admitted ? 'the census GREW' : 'the census SHRANK'}: re-adjudicate the baseline row in the same change`)
      }
    }
    for (const rel of Object.keys(BASELINE)) {
      if (!seen.has(rel)) offenders.push(`${rel}: baseline row is stale — the file carries no casts anymore; step the row out`)
    }
    assert.deepEqual(offenders, [], 'the inline-cast census drifted:\n  ' + offenders.join('\n  '))
  })

  test('the inline service-probe cast `(x as { get(` has zero live sites', () => {
    const offenders: string[] = []
    for (const plane of srcPlanes()) {
      for (const file of walkSources(plane)) {
        const text = readFileSync(file, 'utf8')
        if (PROBE_PATTERN.test(text)) offenders.push(relative(REPO, file))
        PROBE_PATTERN.lastIndex = 0
      }
    }
    assert.deepEqual(offenders, [], 'service-probe casts returned:\n  ' + offenders.join('\n  '))
  })
})
