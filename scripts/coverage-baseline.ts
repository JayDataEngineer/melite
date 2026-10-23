// coverage-baseline.ts — THE PER-FILE COVERAGE BASELINE (the
// per-file coverage gate's tree debt, 2026-10-12).
// Regenerated 2026-10-31 (the acyclicity move's nine rows): the six
// cordis homes (admission, errors, linked, params-emit,
// semanticModelKnob, models/families/contract) died with the move; the
// nine kit rows carry the MAX of two scoped measured faces (the kit's
// own suite + the cordis suite; json-summary, 2026-10-31). The
// FULL-POOL json-summary run that was broken at the 2026-10-31 HEAD is
// CURED (journey E5, 2026-10-17, audit
// dev_docs/audits/journey/e5-coverage-pool-merge-2026-10-17.md): the
// "vitest 4 pool merge" was not a pool bug — vitest 4 splices every
// project's test `include` verbatim into coverage.exclude, and the
// typecheck-lane split's two `!`-prefixed rows negated against every
// file there, so every coverage run collected ZERO rows and the
// per-file floors judged the empty map vacuously green. The negations
// became plain exclude rows, coverage runs stage in per-process
// tmp.melite-coverage-* scratch trees (run isolation — two concurrent
// runs no longer share coverage/.tmp), json-summary rides every run,
// and the gate chains scripts/coverage-rows-tripwire.mjs so an empty
// table is a LOUD refusal, never a silent 0% pass. The rows below
// hold the scoped faces with their provenance until a full-pool
// regeneration re-pins them.
// Regenerated 2026-10-23: 45 rows re-pinned at the stable measured
// faces (three same-tree runs agreed; five load-jitter rows pinned at
// their failing face) — the argued transitions and the sweep window
// live in coverage-baseline-ratchet.spec.ts; the heading and the debt
// ledger live in dev_docs/ROADMAP.md.
// Regenerated 2026-11-07: 108 rows re-pinned (255 metric floors
// raised) from the fresh full-gate triple — three consecutive green
// `pnpm run test:coverage` runs on one tree (580 gated files at this
// HEAD); each raised floor is the MIN of the three runs' text-table
// faces and the run-3 json-summary face (14 jitter metrics pinned at
// their failing face). Five metrics keep their floors (h3-timeline
// studio component.tsx x4, useBeatMutations.ts branches): their rows
// are name-ambiguous in the text table and the raise is unproven, so
// the gate-proven floor stands. Headline transitions: card-kit
// linked.ts 14.28 -> 100x4 (the cordis-move debt repaid to the gate's
// own shape); the required-defaults and mask-order landings
// (qwen-img-21 / -edit-21, anima, krea-2, z-image, mesh-official)
// enter through their own raised rows. The argued transitions and the
// sweep window live in coverage-baseline-ratchet.spec.ts; the heading
// and the debt ledger live in dev_docs/ROADMAP.md.
// Regenerated 2026-10-23 (round 8, the first TOOLED regen):
// scripts/coverage-regen.mjs re-seated 590 rows at the three-run MIN
// faces (runs A/B/C: identical 135-metric failing set, zero fail-set
// drift), argued 61 drops into the ratchet spec (reviewBy
// 2026-12-23), and seated FOUR first rows for gated files that had
// none (comfyui-vram.ts + card-base's abortable/cards-address/
// locales/square) — the "every gated file has a row" arm's debt paid
// by mechanism, not by hand.
//
// The gate is per-file 100x4 over every file the coverage include
// glob matches (510 at this HEAD). The tree does not meet it: 86 of
// those files sit below 100 on at least one metric (212 threshold
// errors, measured). A gate that cannot pass makes every per-file
// number advisory, so the debt is BASELINED here instead: one row
// per gated file, carrying that file's MEASURED percentage on each
// of the four metrics.
//
// WHY EVERY FILE HAS A ROW (not just the 86): vitest resolves its
// thresholds as ONE global set over every collected file PLUS any
// number of glob sets (its own words: "Global threshold is for all
// files, even if they are included by glob patterns"). A glob row
// therefore ADDS a check and never relaxes the global 100 — so the
// four global metric keys are removed (vitest.config.ts), and any
// gated file without a row here would be judged by nothing at all.
// With one row per file the table is hole-free: every gated file is
// checked, at its measured number.
//
// THE PROPERTIES:
// - a regression fails: a floor equals the measured value, so any
//   coverage DROP trips it;
// - a too-high floor self-announces: a floor above the measured
//   value fails the gate, so a wrong number cannot hide;
// - nothing is exempt: the 86 sub-100 files are named with their
//   real numbers, not hidden.
//
// RATCHET LAW: floors only move UP. When a baselined file gains
// coverage, raise its row in the same landing; the gate will not
// demand it, this file's law does. A file that REACHES 100 keeps a
// row of four 100s, which is the gate's original shape.
//
// GENERATED, then reviewed: the numbers were measured by
// `pnpm run test:coverage` (json-summary reporter) on commit
// 00c4615d. Regenerate by running the gate with
// --coverage.reporter=json-summary, reading coverage-summary.json,
// and re-emitting one row per file the include glob matches.
//
// REGENERATED 2026-10-22 (16 rows, the poisoned-era correction):
// the 2026-10-18 instability row's residual — files whose full-pool
// numbers moved between runs of the SAME tree — root-caused to the
// era that recorded the flat-100 floors: a stray /tmp/node_modules
// winning probe resolution and a broken npm under the mise tree
// reshaped what the pool executed. With the host clean (both roots
// removed; receipt dev_docs/audits/coverage-gate-cure-2026-10-22.md)
// runs 3, 4 and 7 deliver a STABLE 16-file set below the old
// floors — the too-high-floor self-announce doing its job. Rows are
// re-emitted at the measured values; per-metric moves are
// independent, so some rows rise. lora-section's functions drop
// traces to the sibling-gated 311bccca drag-drop arms (unpushed,
// untested — named in the receipt); upscale-tools is the largest
// attribution casualty and the concrete candidate for the row's
// owed item 3 (a local wall in its own package).
export const COVERAGE_BASELINE: Record<string, {
  statements: number
  branches: number
  functions: number
  lines: number
}> = {
  '**/packages/engines/comfyui-cordis/src/comfyui-vram.ts': { statements: 100, branches: 92.85, functions: 100, lines: 100 },
  '**/packages/image/mask-studio/src/ui/paintCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/motionCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/abortable.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/cards-address.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/locales/chromeCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/locales/square.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/chromeCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-deck/src/assetsCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // the copy-scope extension dictionaries (2026-11-05): the v8-ignore census
  // arm keeps each at 100x4, the same shape as the five rows above
  // (action_cards compiles as two tsc build units — src and motion/ui —
  // so its tree seats one actionCopy.ts per unit)
  '**/packages/web/infer-gallery/src/client/galleryCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timelineCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/src/actionCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/actionCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/anny/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/anny/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/img-to-mesh/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/img-to-mesh/src/client/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/img-to-mesh/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/rig/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/rig/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/3d/rig/src/validateRigReport.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/audio/music/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/audio/music/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/audio/music/src/tool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/audio/sfx/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/audio/tts/src/card.ts': { statements: 95.55, branches: 86.53, functions: 100, lines: 97.46 },
  '**/packages/audio/tts/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/audio/tts/src/tool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/agent/src/agent-engine.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/agent/src/formDoc.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/agent/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/agent/src/params.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/admission.ts': { statements: 100, branches: 92.85, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/card-definition.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/action.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/tts-segments.ts': { statements: 93.33, branches: 94.78, functions: 100, lines: 93.1 },
  '**/packages/engines/comfyui-card-kit/src/blocks/audio-kit.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/blocks/poser-kit.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/blocks/render-kit.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/errors.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/coerceWireArrays.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/facts.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/fields.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/graph-helpers.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/graph.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/impact.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/kit.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/lanes-3d.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/lanes-audio.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/lanes-image-tools.ts': { statements: 96.29, branches: 100, functions: 85.71, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/linked.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/model-contract.ts': { statements: 95.34, branches: 57.14, functions: 100, lines: 95.12 },
  '**/packages/engines/comfyui-card-kit/src/lanes-image.ts': { statements: 99.25, branches: 98.42, functions: 100, lines: 99.16 },
  '**/packages/engines/comfyui-card-kit/src/mods/guard.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // 2026-11-07 MASK ORDER: the shared bare-flavor boarding primitive —
  // the seven families' mods/mask.ts re-export its plugin; the cordis
  // cardDefs boot sweep exercises both arms of apply.
  '**/packages/engines/comfyui-card-kit/src/mods/bare-flavor.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/pack-fields.ts': { statements: 100, branches: 50, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/morphs.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/service-faces.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/semanticModelKnob.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/params-emit.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/paramRows.ts': { statements: 100, branches: 90.9, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-card-kit/src/vocab.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/_z.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/card-definition-schema.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/cardDefs.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/catalog.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/configOverlay.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/comfyui-config.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/comfyui-control.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/comfyui-execute.ts': { statements: 99.42, branches: 96.52, functions: 96.66, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/comfyui-host.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/comfyui-merge.ts': { statements: 98.98, branches: 96.4, functions: 100, lines: 99.44 },
  '**/packages/engines/comfyui-cordis/src/comfyui-outputs.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/comfyui-transport.ts': { statements: 90.9, branches: 80, functions: 94.73, lines: 92.1 },
  '**/packages/engines/comfyui-cordis/src/comfyui-types.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/comfyui-upload.ts': { statements: 98.64, branches: 97.74, functions: 100, lines: 98.46 },
  '**/packages/engines/comfyui-cordis/src/comfyui.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/entries/catalog-registry.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/entries/comfyui-host.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/entries/comfyui-wiring.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/envelope-laws.ts': { statements: 100, branches: 96.73, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/generated/vocab.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/models/catalogEmission.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/models/census.ts': { statements: 100, branches: 93.75, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/models/enhanceRecipes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/models/families/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/models/models.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/models/service.ts': { statements: 97.91, branches: 96.01, functions: 100, lines: 98.7 },
  '**/packages/engines/comfyui-cordis/src/models/validate.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/mods-schema.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/mods/packs.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/mods/userLorasFlavor.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/no-cheat.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/service.ts': { statements: 100, branches: 98.04, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/serviceMods.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/supervisor.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui-cordis/src/userLoras.ts': { statements: 98.61, branches: 99.46, functions: 100, lines: 98.25 },
  '**/packages/engines/comfyui-cordis/src/wiringWall.ts': { statements: 100, branches: 99.25, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/PoseEditMode.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // PoseViewer3D (2026-10-18, the H-flap cure): the load-racy path
  // is NAMED — the b64 decode effect's `cancelled` guards
  // (PoseViewer3D.tsx:385/:387) execute only when a decode is in
  // flight at unmount, a scheduling coin flip across suites (83
  // statements unloaded, 82 under worker load). The cure pins both
  // guards deterministically (pose-viewer-decode-cancel.spec.tsx:
  // deferred fetch/buffer gates, unmount first, resolve second —
  // single-threaded JS makes the early return the only reachable
  // continuation), covering both guards plus the direct-render
  // setup/cleanup on every run. Floor measured 2026-10-18 under
  // two consecutive full batteries (93/194 stmts, stable twice).
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/PoseViewer3D.tsx': { statements: 47.93, branches: 50.27, functions: 36.36, lines: 50.65 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStage.ts': { statements: 35.4, branches: 1.01, functions: 7.69, lines: 37.05 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageCamera.ts': { statements: 84.21, branches: 62.5, functions: 100, lines: 83.33 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageCarriers.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageManipulators.ts': { statements: 2.91, branches: 0, functions: 0, lines: 1.79 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageMesh.ts': { statements: 4.54, branches: 0, functions: 0, lines: 5.26 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageOverlays.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageReference.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageSkeleton.ts': { statements: 20.54, branches: 10, functions: 42.85, lines: 18.64 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/MotionPoster.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/MotionViewer.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/motionImageStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/src/form-fields.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/comfyui/src/action_cards/src/poster-shell.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/contract/src/engines.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/contract/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/contract/src/vocabulary.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/craft/src/craft-engine.ts': { statements: 98.69, branches: 99.18, functions: 100, lines: 98.59 },
  '**/packages/engines/craft/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/craft/src/params.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/mcp/src/formDoc.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/mcp/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/engines/mcp/src/mcp-engine.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/estate/drafts/src/bench.ts': { statements: 99.48, branches: 96.26, functions: 100, lines: 99.85 },
  '**/packages/estate/drafts/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/estate/drafts/src/remote.ts': { statements: 98.35, branches: 99.09, functions: 97.16, lines: 98.16 },
  '**/packages/estate/drafts/src/spec.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/estate/drafts/src/store.ts': { statements: 98.87, branches: 94.54, functions: 100, lines: 100 },
  '**/packages/estate/drafts/src/trail.ts': { statements: 93.61, branches: 98.03, functions: 100, lines: 92.1 },
  '**/packages/estate/manage/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/estate/media/src/index.ts': { statements: 99.03, branches: 97.8, functions: 100, lines: 99.43 },
  '**/packages/estate/models/src/index.ts': { statements: 95.07, branches: 95.42, functions: 86.04, lines: 95.83 },
  '**/packages/estate/provisioning/src/artifact-writer.ts': { statements: 97.5, branches: 97.01, functions: 93.75, lines: 99.3 },
  '**/packages/estate/provisioning/src/contracts.ts': { statements: 93.54, branches: 89.47, functions: 100, lines: 100 },
  '**/packages/estate/provisioning/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/estate/provisioning/src/manager-client.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/estate/provisioning/src/manager-provider.ts': { statements: 100, branches: 99.61, functions: 100, lines: 100 },
  '**/packages/estate/provisioning/src/operation-store.ts': { statements: 96.53, branches: 97.45, functions: 100, lines: 97.94 },
  '**/packages/estate/provisioning/src/ports.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // 2026-10-21: the 100s above were the driver-seat-env over-count;
  // the stripped gate measures the honest floor. The landing deleted
  // runWithId's dead caller-signal machinery (sole caller passed
  // undefined). The remaining gap is three defensive arms no public
  // caller reaches (proofs in the TEST-2 ledger): the ensureProgress
  // create arm (executeEnsure's synchronous seed dominates it, no
  // deletion path) and the .then/.catch current-undefined arms (both
  // start paths seed the id before attaching handlers).
  '**/packages/estate/provisioning/src/service.ts': { statements: 95.48, branches: 92.18, functions: 93.78, lines: 97.06 },
  // the snapshot channel's pure helpers (2026-10-21): measured with
  // the wall seated — the uncovered branches are the external-JSON
  // defensive arms (null body, non-array siblings, non-string
  // rfilenames) the listing parser tolerates by contract.
  '**/packages/estate/provisioning/src/snapshot.ts': { statements: 95.45, branches: 86.95, functions: 100, lines: 100 },
  '**/packages/estate/runs/src/index.ts': { statements: 98.52, branches: 95.45, functions: 100, lines: 100 },
  '**/packages/harness/estate-call/src/cardTool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-call/src/estateCall.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-call/src/executorHarness.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/bakeParams.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/bench.ts': { statements: 96, branches: 95.23, functions: 100, lines: 95.83 },
  '**/packages/harness/estate-queue/src/cardsArmError.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/cardsCompose.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/cardsDangling.ts': { statements: 98.79, branches: 100, functions: 100, lines: 98.71 },
  '**/packages/harness/estate-queue/src/cardsFacts.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/cardsLanes.ts': { statements: 98.62, branches: 91.77, functions: 100, lines: 99.13 },
  // measured over the full coverage gate (2026-11-10, the cell-fold
  // cure's extracted helper)
  '**/packages/harness/estate-queue/src/cardsLanesCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/cardsRegistry.ts': { statements: 98.68, branches: 94.75, functions: 100, lines: 99.24 },
  '**/packages/harness/estate-queue/src/cardsVariant.ts': { statements: 100, branches: 97.29, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/discloseRegistry.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/filmLead.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/filmMemoryWarn.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/flowsData.ts': { statements: 99.03, branches: 98.98, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/flowsFamilyCompose.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // measured over the owning package suite (2026-10-11, the ratchet's
  // seat-the-three-files cure)
  '**/packages/harness/estate-queue/src/flowsParamsOverlay.ts': { statements: 95.23, branches: 80, functions: 100, lines: 96.55 },
  '**/packages/harness/estate-queue/src/flowsRegistryRows.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/ledgerTail.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // measured over the owning package suite (2026-10-11)
  '**/packages/harness/estate-queue/src/lifecycleLatch.ts': { statements: 100, branches: 87.5, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/loadRegistry.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/manageOps.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/managePlane.ts': { statements: 97.8, branches: 96.13, functions: 100, lines: 97.75 },
  '**/packages/harness/estate-queue/src/manageProbe.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/manageRegistry.ts': { statements: 93.75, branches: 100, functions: 83.33, lines: 93.33 },
  '**/packages/harness/estate-queue/src/managerRail.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/mediaKinds.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/queue.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/queueCore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/queueLifecycle.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/queueLock.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/queueResurrect.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/queueRetry.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/queueSidecar.ts': { statements: 96.94, branches: 88.73, functions: 90.47, lines: 97.08 },
  '**/packages/harness/estate-queue/src/queueSubmit.ts': { statements: 98.21, branches: 98.03, functions: 100, lines: 98.03 },
  '**/packages/harness/estate-queue/src/queueSweep.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/resurrect.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/rootsManifest.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // measured over the full coverage gate (2026-11-10, the provision
  // extensions door's extracted face)
  '**/packages/harness/estate-queue/src/runtimeProvision.ts': { statements: 90, branches: 95.45, functions: 94.11, lines: 89.61 },
  '**/packages/harness/estate-queue/src/runsChange.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsErrorCodes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsExecute.ts': { statements: 98.35, branches: 94.87, functions: 100, lines: 99.39 },
  '**/packages/harness/estate-queue/src/runsGates.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsList.ts': { statements: 100, branches: 98.78, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsRefusalVoices.ts': { statements: 95.45, branches: 92.85, functions: 100, lines: 94.82 },
  '**/packages/harness/estate-queue/src/runsRegistry.ts': { statements: 98.95, branches: 94.56, functions: 100, lines: 99.85 },
  '**/packages/harness/estate-queue/src/runsSourceEcho.ts': { statements: 99.25, branches: 100, functions: 100, lines: 99.12 },
  '**/packages/harness/estate-queue/src/runsStart.ts': { statements: 97.84, branches: 96.28, functions: 96.42, lines: 99.01 },
  '**/packages/harness/estate-queue/src/runsTypes.ts': { statements: 100, branches: 97.93, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidate.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidateArms.ts': { statements: 100, branches: 92, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidateInline.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidateRefusals.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidateServe.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidateShared.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidateStages.ts': { statements: 100, branches: 99.45, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/runsValidateSweeps.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/service.ts': { statements: 95.45, branches: 89.47, functions: 100, lines: 95.23 },
  '**/packages/harness/estate-queue/src/skillFrontmatter.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/skillFs.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/skillPlane.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/skillRegistry.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/skillRows.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/toolProjection.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/estate-queue/src/vocab.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // provisioner's "." door is an import-safe identity const for
  // EXTERNAL bare-extract consumers — no in-tree spec imports it
  // (the bin is the imperative surface), so its one statement
  // measures 0 until an in-tree consumer lands.
  '**/packages/harness/provisioner/src/index.ts': { statements: 0, branches: 100, functions: 100, lines: 0 },
  // 2026-11-06 follow-up regen: the deletion cure (28edf55c9) retired the
  // one dead statement/branch pair; the full gate re-measured 100x4.
  '**/packages/harness/melite-tools/src/discovery.ts': { statements: 98.91, branches: 99.47, functions: 98.14, lines: 98.66 },
  '**/packages/harness/melite-tools/src/doors.ts': { statements: 100, branches: 99.3, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/enhance-agent.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // F-1 (2026-11-05): the typed-lane rewrite re-measured this row.
  // The three dead statements are the doors-law's own: the two
  // closed-union `never` throws (the router regex and BenchVerb admit
  // six arms only) and withEstateBound's non-TimeoutReason reject —
  // the bound's upstream is `undefined` BY DESIGN (doors.spec pins
  // the rolled-back fused form), so that reason is unreachable. The
  // removal clause carries the drop: the rewrite deleted lines from
  // this same file (git diff --numstat HEAD). Receipt:
  // dev_docs/audits/contracts/cures-2026-11-05-harness-seam.md.
  '**/packages/harness/melite-tools/src/estate.ts': { statements: 98.2, branches: 97.65, functions: 100, lines: 97.93 },
  '**/packages/harness/melite-tools/src/faceStamp.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/index.ts': { statements: 88.88, branches: 91.48, functions: 94.11, lines: 91.13 },
  '**/packages/harness/melite-tools/src/json-clean.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/llm-complete.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // runsDelegation (3370c9b64, the delegation outlives the mount):
  // measured 2026-10-21 — the three cond-expr fallback arms (the
  // failed-write voices) ride the delegation suites; branch floor
  // is the measured 82.35, ratchets up as arms land.
  '**/packages/harness/melite-tools/src/runsDelegation.ts': { statements: 100, branches: 82.35, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/stageViewPlane.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/comfy-manage.ts': { statements: 99.59, branches: 97.23, functions: 100, lines: 99.42 },
  '**/packages/harness/melite-tools/src/tools/glbSummary.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/ledger-tail.ts': { statements: 100, branches: 98.27, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/melite-construct.ts': { statements: 98.62, branches: 94.44, functions: 100, lines: 99.6 },
  '**/packages/harness/melite-tools/src/tools/melite-discover.ts': { statements: 100, branches: 99.02, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/melite-flow.ts': { statements: 99.71, branches: 97.49, functions: 100, lines: 100 },
  // 2026-10-21: same driver-seat correction; the landing deleted the
  // `?? ''` on split(':')[0] (ECMA-262 always returns at least one
  // element). The remaining gap is the fam === '' guard in
  // familyPackSeats: the sole call site's seatFams structurally
  // excludes the empty family (proof in the TEST-2 ledger).
  '**/packages/harness/melite-tools/src/tools/melite-load.ts': { statements: 99.4, branches: 98.34, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/melite-read.ts': { statements: 100, branches: 95.65, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/melite-view.ts': { statements: 100, branches: 99.37, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/mp4Probe.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/run-status.ts': { statements: 100, branches: 98.36, functions: 100, lines: 100 },
  // (skill-index.ts row deleted with 57cc90a41 — melite_skill_index
  // was deleted; its id law already lived in melite_load.)
  '**/packages/harness/melite-tools/src/tools/skill-read.ts': { statements: 100, branches: 92.5, functions: 100, lines: 100 },
  '**/packages/harness/melite-tools/src/tools/vision-route.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/image-edit/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/image-edit/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/image-edit/src/tool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/image-gen/src/card.ts': { statements: 94.44, branches: 87.09, functions: 100, lines: 94.28 },
  '**/packages/image/image-gen/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/image-gen/src/tool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/image-gen/src/wire.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // (2026-11-06) the ANNY-style crop studio's src faces — floors
  // pinned at the studio suite's measured coverage (the crop
  // preview's branch floor is the pointer-gesture matrix; the
  // component's the restage lane).
  '**/packages/image/input-prep/src/client/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/input-prep/src/ui/studio/CropPreview.tsx': { statements: 96.46, branches: 82.66, functions: 100, lines: 100 },
  '**/packages/image/input-prep/src/ui/studio/component.tsx': { statements: 92.13, branches: 95.08, functions: 84, lines: 95.89 },
  '**/packages/image/input-prep/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/input-prep/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/mask-studio/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/mask-studio/src/paintInk.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/mask-studio/src/ui/BboxLeafCanvas.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/mask-studio/src/ui/PaintLeafCanvas.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/mask/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/mask/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/tagger/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/image/upscale-tools/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/anima/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/anima/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/anima/src/promptTags.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/anny/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/anny/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/anycreature/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/anycreature/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/concat/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // 2026-11-08, the third edit lane: fibo2-edit lands at 100x4 on its own
  // spec pair (decl.spec + action.spec drive every branch).
  '**/packages/models/fibo2-edit/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/fibo2-edit/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/fit/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/fit/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/florence2/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/florence2/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/flux-klein/src/actions.ts': { statements: 93.93, branches: 87.5, functions: 100, lines: 93.1 },
  '**/packages/models/flux-klein/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/moss-image/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/moss-image/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/gem-soma/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/gem-soma/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/h3/src/actions.ts': { statements: 98.29, branches: 94.91, functions: 100, lines: 100 },
  '**/packages/models/h3/src/filmMix.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/h3/src/finalize.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/h3/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/h3/src/schema.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/h3/src/timelineContract.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/input/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/input/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/joycaption/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/joycaption/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/joytag/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/joytag/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/kimodo/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/kimodo/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/krea-2/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/krea-2/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/mask/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/mask/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/moss-sfx/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/moss-sfx/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/music3/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/music3/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/pixal3d/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/pixal3d/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/qwen-img-21/src/actions.ts': { statements: 100, branches: 92.85, functions: 100, lines: 100 },
  '**/packages/models/qwen-img-21/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/qwen-img-edit-21/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/qwen-img-edit-21/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/qwen-img-edit-2511/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/qwen-img-edit-2511/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/qwen3-tts/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/qwen3-tts/src/index.ts': { statements: 100, branches: 70, functions: 100, lines: 100 },
  '**/packages/models/seedvr2-ema/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/seedvr2-ema/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/skin/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/skin/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/somax/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/transfer-rig/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/transfer-rig/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/trellis2-native/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/trellis2-native/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/wd14/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/wd14/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/yue2/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/yue2/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/z-image/src/actions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/models/z-image/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/client/upstream.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/tool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/MotionRail.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/MotionStageView.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/MotionTimelineSection.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/kit.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/motionParams.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // 2026-11-05 merge: the ratchet's new row-census arm fired on
  // three files the 2026-11-05 lanes added but never measured —
  // measured here scoped (json-summary, motion suite alone; the
  // pool-merge break documented above stands). useMotionDoc is F7's
  // projection spine: sub-100 arms are the boundary seats the studio
  // suite does not drive (abort/undo corners) — owed with the slice-3
  // UI work, not exempt.
  '**/packages/motion/motion/src/ui/studio/useMotionDoc.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/useMotionMedia.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/useMotionStage.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/useMotionUndoStack.ts': { statements: 98.73, branches: 97.05, functions: 100, lines: 100 },
  // 2026-11-05 (harness-seam cure session): the ratchet's row-census
  // arm caught this gated file carrying NO row (another lane's new
  // file). Row pinned at its measured face (21 files, 263 tests).
  '**/packages/motion/motion/src/ui/studio/motionDoc.ts': { statements: 100, branches: 94.31, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/usePoseEditing.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/useTimelineAuthoring.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/motion/motion/src/ui/studio/useTimelineEnvelope.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/client/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/tool.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // (row 2026-11-06: RailBackButton — the submenu law's ONE exit
  // door (Sahar R2, order b); scoped probe over the component +
  // call-cards suites measures 100×4)
  '**/packages/video/h3-timeline/src/ui/studio/RailBackButton.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // (B2, journey-closure 2026-11-06) useFamilyReseatHeal.ts DELETED —
  // the D8 mount heal dissolved into the commit seam (useShownDoc.ts),
  // its row dies with the file (one row per gated file).
  // (2026-11-06) the square-grammar sweep: the mods chip-row swap
  // arms (listing/upload/chipOfListing's verbatim else) are doors
  // the wire-picker re-wiring orphaned — branches argued to the
  // measured face, every other metric climbed. Receipt: the
  // ARGUED_FLOOR_DROPS entry + the roadmap heading.
  '**/packages/video/h3-timeline/src/ui/studio/CallCard.tsx': { statements: 99.42, branches: 96.06, functions: 98.52, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/CallCardPrompt.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/CallCardsPanel.tsx': { statements: 98.33, branches: 95.83, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/CallFrameSubcard.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/RunRecipeEngine.tsx': { statements: 92.72, branches: 87.17, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/RunRefsClips.tsx': { statements: 100, branches: 90.9, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/StudioPreview.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/StudioStripPane.tsx': { statements: 97.14, branches: 98.07, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/component.tsx': { statements: 100, branches: 95.23, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/docCalls.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/docGrid.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/docHydrate.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/docModel.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // (row 2026-10-17: omitT4Recipe landed with the B1 emit-law round —
  // the J4 negative control drives both branches at the served spec)
  '**/packages/video/h3-timeline/src/ui/studio/omitT4Recipe.ts': { statements: 93.33, branches: 84.61, functions: 100, lines: 100 },
  // (row 2026-11-01: docPatch landed with the rail-law round)
  '**/packages/video/h3-timeline/src/ui/studio/docPatch.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/pendingOps.ts': { statements: 100, branches: 97.29, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/pickVerdict.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/projection.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/refUtils.ts': { statements: 100, branches: 98.48, functions: 100, lines: 100 },
  // (row 2026-11-01, repinned from a false 0×4 the same landing:
  // the studio suite imports the dictionary transitively through
  // every studio component — the full-suite measured face is 100×4;
  // the h3 copy wall judges it key-by-key on top)
  '**/packages/video/h3-timeline/src/ui/studio/studioCopy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useBeatMutations.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useCallMutations.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useDerivedView.ts': { statements: 99.16, branches: 99.09, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useEnhance.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useFilmAudio.ts': { statements: 100, branches: 99.09, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useFilmSync.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/usePromptMutations.ts': { statements: 96.72, branches: 95.45, functions: 100, lines: 97.95 },
  // (row 2026-11-07: useReopenRefit — the parallel h3 lane's new hook;
  // scoped probe over the h3-timeline dom suite measures
  // 96.42/90/100/100, the uncovered lines 58-64 being the no-op
  // early return; floor re-pin owned by that lane)
  '**/packages/video/h3-timeline/src/ui/studio/useReopenRefit.ts': { statements: 96.42, branches: 90, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useShownDoc.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useStudioViewSync.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/video/h3-timeline/src/ui/studio/useViewSelection.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/FlowProtocol.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/api.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/cardBirth.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/cardLlm.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/catalogContract.ts': { statements: 98.75, branches: 98.91, functions: 100, lines: 98.63 },
  '**/packages/web-kit/catalog/src/catalogContractStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/clientStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/contractToast.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/enhance.ts': { statements: 100, branches: 98.86, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/familyParamContract.ts': { statements: 99.55, branches: 99.54, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/familyProvenance.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/generated/gatewayDoors.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/modelCatalog.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/runStatusContract.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/runStatusContractStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/serviceForms.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/sleep.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/tagMap.ts': { statements: 98.74, branches: 98.76, functions: 100, lines: 98.46 },
  '**/packages/web-kit/catalog/src/waveform-peaks.ts': { statements: 98.79, branches: 100, functions: 87.5, lines: 98.46 },
  '**/packages/web-kit/contracts/src/FlowTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/benchResult.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/benchSnapshot.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/benchStage.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/card.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/character.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/extraKeys.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/formSpec.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/laneRelations.ts': { statements: 99.69, branches: 97.11, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/loraTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/mediaKinds.ts': { statements: 97.5, branches: 91.3, functions: 100, lines: 100 },
  // (row re-pin 2026-11-06, coverage-gaps F1: the 2026-11-01 comment
  // was already stale — the planeRefusals wire arms at
  // comfyui-cordis models-service.spec.ts:158 measure this file at
  // 97.61/95.45/100/97.36; the floor-0 row left [0, 97.61) unguarded,
  // violating the table's own "a regression fails" property. Scoped
  // json-summary probe re-run this session: same numbers.)
  '**/packages/web-kit/contracts/src/planes.ts': { statements: 97.61, branches: 97.72, functions: 100, lines: 97.36 },
  '**/packages/web-kit/contracts/src/mediaRange.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/mediaTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/modifierFaces.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/modifierSubcards.ts': { statements: 99, branches: 99.18, functions: 100, lines: 98.75 },
  '**/packages/web-kit/contracts/src/objectUrlCache.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/rootsManifest.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // batch AS 2026-10-17: schema.ts (python-era openapi output) deleted; its two
  // wireTypes successors are TYPE-ONLY modules (zero statements) at their owners
  '**/packages/web-kit/contracts/src/wireTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/catalog/src/wireTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/stagePreview.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/stageView.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/studio.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/timelineTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/contracts/src/vocab.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/b64.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/bodyPresets.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/captionSplitter.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/cardMutations.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/downloads.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/extractVideoFrame.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/glbLoad.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/glbSkin.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/handPose.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/keyframeExtract.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/maskPrep.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/motionConstraints.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/motionEnvelope.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/motionNpz.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/npz.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/openPoseCanvas.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/pngMeta.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/pngMetaInfo.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/poseCodec.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/poseTransforms.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/poserSkin.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/promptTags.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/psdExport.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/readFile.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/somaSkin.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/textToPose.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/formats/src/uploadToEstate.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/playback/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // (row re-pin 2026-11-06, coverage-gaps F2: its own R-E1 dom-lane
  // spec (useAudioPlayback.spec.tsx, in the lane since 2026-10-10)
  // exercises play/pause/seek/rAF — the measured face is
  // 43.7/12.06/58.33/47.61; the 2026-10-31 scoped-faces regen missed
  // it (the broken full-pool merge confessed in the header). Scoped
  // probe re-run this session: same numbers. The floor rides the
  // measured face; the sub-100 halves are honest debt, guarded.)
  '**/packages/web-kit/timeline/src/playback/useAudioPlayback.ts': { statements: 93.37, branches: 77.58, functions: 95.83, lines: 96.82 },
  '**/packages/web-kit/timeline/src/store/createStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/segmentClipboard.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineAudio.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineBlobs.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineHistory.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineIds.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelinePersistence.ts': { statements: 99.46, branches: 99.23, functions: 100, lines: 99.39 },
  '**/packages/web-kit/timeline/src/store/timelineSegments.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineStoreTypes.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineUi.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/store/timelineVariants.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/FilmPlayer.tsx': { statements: 100, branches: 100, functions: 90.47, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBar.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarChrome.tsx': { statements: 78.18, branches: 84, functions: 84.21, lines: 81.63 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarDrag.ts': { statements: 90.07, branches: 73.28, functions: 80.95, lines: 94.87 },
  '**/packages/web-kit/timeline/src/timeline/motionTimelineState.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarLanes.tsx': { statements: 70, branches: 76.96, functions: 66.66, lines: 74 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarLayout.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarScale.ts': { statements: 85.54, branches: 80.39, functions: 92.3, lines: 89.04 },
  // 2026-11-05 merge: the F1 viser zoom re-home created this file;
  // measured 0 across its own package's suite — the re-home moved
  // the zoom cluster to exported API surface with NO direct test
  // (vendored-provenance judges the copy's origin, not its
  // behavior). The 0-row is the honest debt: a behavior wall for
  // the scrollbar (drag/zoom math) is OWED (roadmap row).
  '**/packages/web-kit/timeline/src/timeline/TimelineScrollbar.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/TimelineScrubBar.tsx': { statements: 93.93, branches: 94.11, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/icons.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/Timeline.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/TimelineConstants.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/constants.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/draw.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/interactions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/messages.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/styles.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-auto-pan.ts': { statements: 0.95, branches: 0, functions: 0, lines: 1 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-geometry.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-interaction-state.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-mouse.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-overlays.tsx': { statements: 4.34, branches: 0, functions: 0, lines: 5 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-render-background.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-render-foreground.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-scales.ts': { statements: 10.52, branches: 0, functions: 0, lines: 10.52 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-viewport.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/types.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/viewerContext.ts': { statements: 66.66, branches: 100, functions: 0, lines: 66.66 },
  '**/packages/web/card-base/src/atoms.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/axes.tsx': { statements: 98.26, branches: 98.18, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/chrome.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/client/index.ts': { statements: 100, branches: 100, functions: 80, lines: 100 },
  '**/packages/web/card-base/src/estate-remote.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/form.tsx': { statements: 100, branches: 99.59, functions: 100, lines: 100 },
  // windowSpec.ts (the window-parity seam, another hand's landing):
  // the remainder the landing hand owed — measured 0 today; the row
  // exists so the ratchet counts the gated file (never a silent
  // rowless pass).
  '**/packages/models/h3/src/windowSpec.ts': { statements: 100, branches: 50, functions: 100, lines: 100 },
  // LaneHead.tsx (the lane-parity (c) landing, 61d2eaf71): the shared
  // lane-head shell — same tracked-debt pin as its neighbors above;
  // the parity walls drive it; re-pin UP at the next full-pool
  // regeneration.
  '**/packages/web-kit/timeline/src/timeline/LaneHead.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/host.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/icons.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/layout.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/media-library.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/mods.tsx': { statements: 99.76, branches: 97.65, functions: 98.95, lines: 99.7 },
  '**/packages/web/card-base/src/owners.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/pick-store.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/rejection-voice.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/poser-figure.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/preview.tsx': { statements: 100, branches: 97.04, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/report-view.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/rows.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/runs-policy.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/shell.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/slots.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/spec-panel.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/spec.ts': { statements: 98.26, branches: 96.44, functions: 100, lines: 99.67 },
  '**/packages/web/card-base/src/square-provider.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/square.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/studio.tsx': { statements: 92.7, branches: 95.65, functions: 92.3, lines: 91.02 },
  '**/packages/web/card-base/src/studioRail.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/toast.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/toastStore.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/use-form-spec.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/use-resolved.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/viewportChrome.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/write-through.ts': { statements: 100, branches: 91.66, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/wire.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/card-base/src/wirePicker.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/artifact-address.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/artifact-ops.ts': { statements: 100, branches: 96.15, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/bench-load.ts': { statements: 100, branches: 96.26, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/decode.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/media-kinds.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/mesh-tile.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/mesh-view.tsx': { statements: 95.6, branches: 94.33, functions: 91.66, lines: 96.47 },
  '**/packages/web/infer-gallery/src/client/ui.tokens.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/ui.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/client/useFeed.ts': { statements: 97.05, branches: 100, functions: 100, lines: 96.66 },
  '**/packages/web/infer-gallery/src/client/waitState.ts': { statements: 100, branches: 96.96, functions: 100, lines: 100 },
  '**/packages/web/infer-gallery/src/drilldown.tsx': { statements: 99.25, branches: 98.05, functions: 97.36, lines: 99.02 },
  '**/packages/web/melite-card-deck/src/client/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-deck/src/client/lora-section.tsx': { statements: 91.39, branches: 88.05, functions: 88.23, lines: 93.97 },
  '**/packages/web/melite-card-deck/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/add-card-door.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/add-stage.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // the Q1 auto-mode decoration (2026-10-20): row pinned at the scoped
  // measured face of its own suite (auto-mode-menu.spec.ts) — the
  // refusal/unmaterialized throw arms are the uncovered residue
  '**/packages/web/melite-card-view/src/client/auto-mode-decoration.ts': { statements: 80.76, branches: 78.57, functions: 75, lines: 86.36 },
  '**/packages/web/melite-card-view/src/client/bench-row.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/bench-view.tsx': { statements: 98.02, branches: 96.42, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/card-drill.tsx': { statements: 96.29, branches: 96.15, functions: 90.9, lines: 95.83 },
  '**/packages/web/melite-card-view/src/client/card-labels.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/card-mentions.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/card-tools.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // the q3 frozen in-chat previews (2026-10-20): row pinned at the
  // scoped measured face of its own suites (chat-preview.spec.ts +
  // flow-cards-chat-preview.spec.tsx)
  '**/packages/web/melite-card-view/src/client/chat-preview.ts': { statements: 92.3, branches: 84.61, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/cards-resource.ts': { statements: 98.33, branches: 97.39, functions: 93.87, lines: 98.85 },
  '**/packages/web/melite-card-view/src/client/cards-tab-body.tsx': { statements: 98.42, branches: 96.66, functions: 98, lines: 99.37 },
  '**/packages/web/melite-card-view/src/client/construct-card.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/dnd-payloads.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/draft-run-views.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/filmSeam.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/forms-edge-meta.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/index.ts': { statements: 99.05, branches: 100, functions: 100, lines: 98.91 },
  '**/packages/web/melite-card-view/src/client/preview-kinds.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/rejection-voice.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/run-rescue-core.ts': { statements: 97.59, branches: 95.51, functions: 95.83, lines: 100 },
  '**/packages/web/melite-card-view/src/client/run-rescue.tsx': { statements: 98.68, branches: 95.27, functions: 97.72, lines: 99.51 },
  '**/packages/web/melite-card-view/src/client/sortable-tile.tsx': { statements: 96.05, branches: 97.14, functions: 100, lines: 100 },
  // 2026-11-06 follow-up regen: the disposition (af120dcb9) deleted the
  // null guard and cited the two defense arms; the file measures 100x4.
  '**/packages/web/melite-card-view/src/client/stage-drill.tsx': { statements: 99.47, branches: 98.77, functions: 99.15, lines: 99.78 },
  '**/packages/web/melite-card-view/src/client/stage-run.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/types.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/client/zoomPromotion.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-card-view/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-estate/src/bundle-gate.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/melite-estate/src/index.ts': { statements: 98.19, branches: 92.85, functions: 100, lines: 97.95 },
  '**/packages/web/melite-estate/src/provisioning.ts': { statements: 99.55, branches: 95.65, functions: 100, lines: 99.46 },
  '**/packages/web/melite-run-wire/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  // the three graph row (the one-row law for 3D): both faces measured
  // 100x4 under their host-face contract spec.
  '**/packages/web/three-client/src/client/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/three-client/src/host.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/viewer-base/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/viewer-base/src/owners.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/viewer-base/src/runCard.tsx': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/viewer-base/src/slots.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/viewer-base/src/wire.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/viewer/src/client/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  '**/packages/web/viewer/src/index.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
}
