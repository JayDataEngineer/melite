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

/** The FULL-census baseline (item 16 drain, 2026-11-12 — the V4 cure
 *  the 2026-10-20 sweep named: "a baseline wall"): every `as unknown`
 *  spelling in every src plane, per file. The structural class above
 *  is the subset that re-declares a shape inline; THIS census freezes
 *  the whole tail (~242 sites, 86 files) so a new
 *  site of ANY spelling reds and every step-down is a conscious
 *  baseline edit. The tail's retirement (typed values or validation at
 *  each site) is the row's owed M-work — one file at a time. */
const ALL_FORMS_BASELINE: Record<string, number> = {
  'packages/audio/tts/src/card.ts': 1,
  'packages/engines/agent/src/agent-engine.ts': 1,
  'packages/engines/comfyui-card-kit/src/admission.ts': 1,
  'packages/engines/comfyui-card-kit/src/card-definition.ts': 1,
  'packages/engines/comfyui-card-kit/src/coerceWireArrays.ts': 1,
  'packages/engines/comfyui-card-kit/src/facts.ts': 1,
  'packages/engines/comfyui-card-kit/src/lanes-image.ts': 2,
  'packages/engines/comfyui-card-kit/src/model-contract.ts': 2,
  'packages/engines/comfyui-card-kit/src/vocab.ts': 3,
  'packages/engines/comfyui-cordis/src/card-definition-schema.ts': 2,
  'packages/engines/comfyui-cordis/src/comfyui-merge.ts': 1,
  'packages/engines/comfyui-cordis/src/envelope-laws.ts': 1,
  'packages/engines/comfyui-cordis/src/models/service.ts': 5,
  'packages/engines/comfyui-cordis/src/mods-schema.ts': 3,
  'packages/engines/comfyui-cordis/src/service.ts': 1,
  'packages/engines/comfyui-cordis/src/supervisor.ts': 1,
  'packages/engines/comfyui-cordis/src/userLoras.ts': 3,
  'packages/engines/comfyui-cordis/src/wiringWall.ts': 1,
  'packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageManipulators.ts': 4,
  'packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageOverlays.ts': 5,
  'packages/engines/craft/src/craft-engine.ts': 2,
  'packages/estate/drafts/src/bench.ts': 17,
  'packages/estate/drafts/src/remote.ts': 7,
  // trail.ts: 1 — the archived-history copy VERBATIM MOVED here from remote.ts
  // (the carry-batch extraction, 2026-10-26); remote.ts stepped 8→7 in the same move.
  'packages/estate/drafts/src/trail.ts': 1,
  'packages/estate/drafts/src/store.ts': 1,
  'packages/estate/provisioning/src/manager-client.ts': 1,
  'packages/estate/provisioning/src/operation-store.ts': 5,
  'packages/estate/provisioning/src/snapshot.ts': 1,
  'packages/harness/estate-call/src/executorHarness.ts': 4,
  'packages/harness/estate-queue/src/cardsCompose.ts': 1,
  'packages/harness/estate-queue/src/cardsLanes.ts': 1,
  'packages/harness/estate-queue/src/cardsRegistry.ts': 1,
  'packages/harness/estate-queue/src/cardsVariant.ts': 1,
  'packages/harness/estate-queue/src/loadPlane.ts': 1,
  'packages/harness/estate-queue/src/managePlane.ts': 8,
  'packages/harness/estate-queue/src/manageRegistry.ts': 1,
  'packages/harness/estate-queue/src/managerRail.ts': 1,
  'packages/harness/estate-queue/src/runsExecute.ts': 4,
  'packages/harness/estate-queue/src/runsGates.ts': 2,
  'packages/harness/estate-queue/src/runsRegistry.ts': 23,
  'packages/harness/estate-queue/src/runsStart.ts': 2,
  'packages/harness/estate-queue/src/runsTypes.ts': 2,
  'packages/harness/estate-queue/src/runsValidateArms.ts': 1,
  'packages/harness/estate-queue/src/runsValidateStages.ts': 2,
  'packages/harness/estate-queue/src/runtimeProvision.ts': 3,
  'packages/harness/melite-tools/src/discovery.ts': 1,
  'packages/harness/melite-tools/src/doors.ts': 2,
  'packages/harness/melite-tools/src/tools/melite-construct.ts': 1,
  'packages/harness/melite-tools/src/tools/melite-flow.ts': 4,
  'packages/harness/melite-tools/src/tools/melite-view.ts': 8,
  'packages/models/h3/src/actions.ts': 3,
  'packages/models/krea-2/src/actions.ts': 2,
  'packages/models/qwen-img-21/src/actions.ts': 2,
  'packages/models/yue2/src/actions.ts': 1,
  'packages/motion/motion/src/ui/studio/motionDoc.ts': 2,
  'packages/video/h3-timeline/src/tool.ts': 1,
  'packages/video/h3-timeline/src/ui/studio/CallCard.tsx': 1,
  'packages/video/h3-timeline/src/ui/studio/RunRecipeEngine.tsx': 8,
  'packages/video/h3-timeline/src/ui/studio/docCalls.ts': 1,
  'packages/video/h3-timeline/src/ui/studio/docHydrate.ts': 3,
  'packages/video/h3-timeline/src/ui/studio/useShownDoc.ts': 5,
  'packages/web-kit/catalog/src/FlowProtocol.ts': 1,
  'packages/web-kit/contracts/src/familyLane.ts': 1,
  'packages/web-kit/contracts/src/formSpec.ts': 1,
  'packages/web-kit/contracts/src/modifierSubcards.ts': 4,
  'packages/web-kit/contracts/src/stageView.ts': 1,
  'packages/web-kit/formats/src/pngMeta.ts': 1,
  'packages/web-kit/formats/src/poseCodec.ts': 1,
  'packages/web/card-base/src/runs-policy.ts': 4,
  'packages/web/card-base/src/spec-panel.tsx': 1,
  'packages/web/card-base/src/spec.ts': 2,
  'packages/web/card-base/src/stage3d.ts': 1,
  'packages/web/card-base/src/wire.ts': 1,
  'packages/web/infer-gallery/src/client/mesh-view.tsx': 2,
  'packages/web/infer-gallery/src/client/useFeed.ts': 1,
  'packages/web/infer-gallery/src/index.ts': 2,
  'packages/web/melite-card-deck/src/client/assets-tab.tsx': 1,
  'packages/web/melite-card-view/src/client/add-stage.ts': 3,
  'packages/web/melite-card-view/src/client/bench-row.ts': 1,
  'packages/web/melite-card-view/src/client/cards-resource.ts': 14,
  'packages/web/melite-card-view/src/client/draft.ts': 5,
  'packages/web/melite-card-view/src/client/run-rescue-core.ts': 1,
  'packages/web/melite-card-view/src/client/stage-drill.tsx': 8,
  'packages/web/melite-card-view/src/client/zoomPromotion.ts': 2,
  'packages/web/melite-estate/src/provisioning.ts': 1,
  'packages/web/melite-run-wire/src/index.ts': 1,
}

describe('THE ANTI-SNIFF WALL — the full as-unknown census (V4/16 drain)', () => {
  test('the whole-tail census matches its adjudicated baseline exactly', () => {
    const seen = new Map<string, number>()
    const offenders: string[] = []
    for (const plane of srcPlanes()) {
      for (const file of walkSources(plane)) {
        const rel = relative(REPO, file).split(sep).join('/')
        const count = (readFileSync(file, 'utf8').match(/as unknown/g) ?? []).length
        if (count > 0) seen.set(rel, count)
      }
    }
    for (const [rel, count] of seen) {
      const admitted = ALL_FORMS_BASELINE[rel]
      if (admitted === undefined) {
        offenders.push(`${rel}: ${count} site(s) in a file with NO baseline row — a NEW as-unknown site: type the value or validate it, do not cast`)
      } else if (count !== admitted) {
        offenders.push(`${rel}: ${count} site(s) vs baseline ${admitted} — ${count > admitted ? 'the tail GREW: type the value instead' : 'the tail SHRANK: step the baseline row down in the same change'}`)
      }
    }
    for (const rel of Object.keys(ALL_FORMS_BASELINE)) {
      if (!seen.has(rel)) offenders.push(`${rel}: baseline row is stale — the file is cast-free; step the row out`)
    }
    assert.deepEqual(offenders, [], 'the as-unknown tail drifted:\n  ' + offenders.join('\n  '))
  })
})

/** The zero-any ratchet (item 18 drain, 2026-11-12 — the V5 cure the
 *  2026-10-20 sweep carried): the src planes carry NO live `any`
 *  type spelling. Every site the census found was TYPED, not
 *  why-marked (viser's intervals → TimelineInterval; persistence's
 *  blob writes → the segment's own members; the LTX sweep → a
 *  string-keyed view; deriveDefaults/setObjectInfo → the structural
 *  ObjectInfoInput; emitKnob's meta → MetaView; the modifier
 *  feature reads → ModifiersFormSpec; the catalog guards →
 *  unknown). A new `any` of ANY spelling reds here.
 *
 *  PINNED (the one adjudicated row): agent params.ts carries the
 *  literal text `value: any` INSIDE an error-message template string
 *  — message prose naming the wire shape, not a type. */
const ANY_PINNED: Record<string, number> = {
  'packages/engines/agent/src/params.ts': 1,
}

describe('THE ANTI-SNIFF WALL — the zero-any ratchet (V5/18 drain)', () => {
  test('no src plane carries a live any type spelling', () => {
    const RX = /(?::\s*any\b|as\s+any\b|any\[\]|<any>|,\s*any>)/g
    const offenders: string[] = []
    for (const plane of srcPlanes()) {
      for (const file of walkSources(plane)) {
        const rel = relative(REPO, file).split(sep).join('/')
        const stripped = readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|\s)\/\/[^\n]*/g, '$1')
        const count = (stripped.match(RX) ?? []).length
        const admitted = ANY_PINNED[rel] ?? 0
        if (count > admitted) {
          offenders.push(`${rel}: ${count} any spelling(s) vs ${admitted} pinned — type the value, do not cast`)
        } else if (count < admitted) {
          offenders.push(`${rel}: ${count} any spelling(s) vs ${admitted} pinned — the pin is stale; step it out`)
        }
      }
    }
    assert.deepEqual(offenders, [], 'the any census drifted:\n  ' + offenders.join('\n  '))
  })
})
