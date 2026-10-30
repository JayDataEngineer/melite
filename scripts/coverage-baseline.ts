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
// Re-seated 2026-10-28 (the swap build, R6): seven rows seated by
// the regen's missing-rows law at the stable clean-pool min face
// (two consecutive env-clean full runs, A==B), and two rows the
// landing itself lowered are argued in coverage-baseline-ratchet
// spec.ts (discovery.ts schema_key arms; h3-timeline card.ts the
// replace emission) — every other committed floor stands; the 59
// pre-existing gate reds at this tree are the coverage track's
// debt, receipted in dev_docs/swap-parity-plan-2026-10-28.md.
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
// A floor is a number, or null. THE NULL FLOOR LAW (flake audit
// 2026-10-13 item 5, seated 2026-10-26): istanbul reports pct 100
// for a metric with ZERO paths on its file — a numeric floor there
// (the vacuous-100 class) is a lie the gate enforces against
// nothing. null is the honest "zero paths" spelling: the istanbul
// threshold spread EXCLUDES the metric (vitest.config.ts), and the
// regen owns the classification — a null floor whose metric later
// carries >0 paths REFUSES the regen until the row is re-seated at
// a number. Number floors mint with the K=1 margin (item 6):
// 100 · max(0, covered − 1) / total — losing one covered path
// stays green, distinguishing regression from jitter.
export type CoverageFloor = number | null;
export const COVERAGE_BASELINE: Record<string, {
  statements: CoverageFloor
  branches: CoverageFloor
  functions: CoverageFloor
  lines: CoverageFloor
}> = {
  '**/packages/engines/comfyui-cordis/src/comfyui-vram.ts': { statements: 95.83, branches: 89.29, functions: 80, lines: 95.24 },
  '**/packages/image/mask-studio/src/ui/paintCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  // the extend emission seat (extend-video flow, 2026-11-12):
  // 100x4 measured over extend-mod.spec.ts — the card-door harness
  // drives every branch (both refusal seats, the grid door, all three
  // pairwise one-door edges, the empty-bag guard, the emission)
  '**/packages/models/h3/src/chainEdit.ts': { statements: 98.44, branches: 95.45, functions: 85.71, lines: 98.33 },
  '**/packages/models/h3/src/extend.ts': { statements: 97.62, branches: 95, functions: 80, lines: 97.56 },
  '**/packages/models/h3/src/repair.ts': { statements: 97.22, branches: 93.75, functions: 75, lines: 97.22 },
  '**/packages/models/h3/src/swap.ts': { statements: 95.83, branches: 92.86, functions: 75, lines: 95.83 },
  '**/packages/motion/motion/src/ui/studio/motionCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/video/frames/src/card.ts': { statements: 91.67, branches: 75, functions: 66.67, lines: 90.91 },
  '**/packages/video/frames/src/index.ts': { statements: 0, branches: null, functions: 0, lines: 0 },
  '**/packages/video/track/src/card.ts': { statements: 92.86, branches: 75, functions: 60, lines: 96 },
  '**/packages/video/track/src/index.ts': { statements: 0, branches: null, functions: 0, lines: 0 },
  '**/packages/video/trim/src/card.ts': { statements: 93.75, branches: 90, functions: 66.67, lines: 93.33 },
  '**/packages/video/trim/src/index.ts': { statements: 0, branches: null, functions: 0, lines: 0 },
  '**/packages/web/card-base/src/abortable.ts': { statements: 90.91, branches: 50, functions: 75, lines: 80 },
  '**/packages/web/card-base/src/cards-address.ts': { statements: 0, branches: null, functions: 0, lines: 0 },
  '**/packages/web/card-base/src/locales/chromeCopy.ts': { statements: 88.89, branches: 87.5, functions: 75, lines: 87.5 },
  '**/packages/web/card-base/src/locales/square.ts': { statements: 88.89, branches: 87.5, functions: 75, lines: 87.5 },
  '**/packages/web/melite-card-view/src/chromeCopy.ts': { statements: 0, branches: 75, functions: 0, lines: 0 },
  '**/packages/web/melite-card-deck/src/assetsCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  // the copy-scope extension dictionaries (2026-11-05): the v8-ignore census
  // arm keeps each at 100x4, the same shape as the five rows above
  // (action_cards compiles as two tsc build units — src and motion/ui —
  // so its tree seats one actionCopy.ts per unit)
  '**/packages/web/infer-gallery/src/client/galleryCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/timeline/src/timelineCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui/src/action_cards/src/actionCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/actionCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/3d/anny/src/card.ts': { statements: 93.75, branches: 83.33, functions: 83.33, lines: 92.86 },
  '**/packages/3d/anny/src/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/3d/img-to-mesh/src/card.ts': { statements: 95.24, branches: 96.15, functions: 87.5, lines: 94.74 },
  '**/packages/3d/img-to-mesh/src/client/index.ts': { statements: 80, branches: null, functions: 0, lines: 80 },
  '**/packages/3d/img-to-mesh/src/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/3d/rig/src/card.ts': { statements: 96.97, branches: 95, functions: 80, lines: 96.88 },
  '**/packages/3d/rig/src/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/3d/rig/src/validateRigReport.ts': { statements: 98.92, branches: 98.53, functions: 96.3, lines: 98.59 },
  '**/packages/audio/music/src/card.ts': { statements: 93.75, branches: 87.5, functions: 80, lines: 93.33 },
  '**/packages/audio/music/src/index.ts': { statements: 85.71, branches: 50, functions: 0, lines: 83.33 },
  '**/packages/audio/music/src/tool.ts': { statements: 66.67, branches: null, functions: 0, lines: 66.67 },
  '**/packages/audio/sfx/src/card.ts': { statements: 93.33, branches: 87.5, functions: 75, lines: 92.31 },
  '**/packages/audio/tts/src/card.ts': { statements: 94.57, branches: 86.36, functions: 93.33, lines: 96.3 },
  '**/packages/audio/tts/src/index.ts': { statements: 85.71, branches: 50, functions: 0, lines: 83.33 },
  '**/packages/audio/tts/src/tool.ts': { statements: 66.67, branches: null, functions: 0, lines: 66.67 },
  '**/packages/engines/agent/src/agent-engine.ts': { statements: 99.29, branches: 99.16, functions: 93.75, lines: 99.25 },
  '**/packages/engines/agent/src/formDoc.ts': { statements: 50, branches: null, functions: 50, lines: 50 },
  '**/packages/engines/agent/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/agent/src/params.ts': { statements: 98.21, branches: 98.08, functions: 90, lines: 98.04 },
  '**/packages/engines/comfyui-card-kit/src/admission.ts': { statements: 90, branches: 85.71, functions: 75, lines: 88.89 },
  '**/packages/engines/comfyui-card-kit/src/card-definition.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-card-kit/src/action.ts': { statements: 93.33, branches: 87.5, functions: 75, lines: 92.31 },
  '**/packages/engines/comfyui-card-kit/src/tts-segments.ts': { statements: 91.67, branches: 93.91, functions: 87.5, lines: 91.38 },
  '**/packages/engines/comfyui-card-kit/src/blocks/audio-kit.ts': { statements: 90, branches: 80, functions: 75, lines: 90 },
  '**/packages/engines/comfyui-card-kit/src/blocks/poser-kit.ts': { statements: 91.67, branches: 85.71, functions: 75, lines: 91.67 },
  '**/packages/engines/comfyui-card-kit/src/blocks/render-kit.ts': { statements: 95, branches: 75, functions: 80, lines: 94.74 },
  '**/packages/engines/comfyui-card-kit/src/errors.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/engines/comfyui-card-kit/src/coerceWireArrays.ts': { statements: 99.08, branches: 99.19, functions: 83.33, lines: 98.84 },
  // the card-owned craft seam (rework slice 6): one regex body, so
  // the branch metric carries ZERO paths — null is the honest floor
  // (a vacuous 100 would claim judgment over nothing)
  '**/packages/engines/comfyui-card-kit/src/craft.ts': { statements: 0, branches: null, functions: 0, lines: 0 },
  '**/packages/engines/comfyui-card-kit/src/facts.ts': { statements: 98.92, branches: 99.38, functions: 94.12, lines: 98.72 },
  '**/packages/engines/comfyui-card-kit/src/fields.ts': { statements: 85.71, branches: 96.15, functions: 75, lines: 85.71 },
  '**/packages/engines/comfyui-card-kit/src/graph-helpers.ts': { statements: 92.86, branches: 91.67, functions: 50, lines: 90.91 },
  '**/packages/engines/comfyui-card-kit/src/graph.ts': { statements: 98.21, branches: 96.55, functions: 90, lines: 97.96 },
  '**/packages/engines/comfyui-card-kit/src/impact.ts': { statements: 91.67, branches: 50, functions: 80, lines: 91.67 },
  '**/packages/engines/comfyui-card-kit/src/kit.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-card-kit/src/lanes-3d.ts': { statements: 95.45, branches: 91.67, functions: 66.67, lines: 95.45 },
  '**/packages/engines/comfyui-card-kit/src/lanes-audio.ts': { statements: 97.14, branches: 97.83, functions: 66.67, lines: 96.55 },
  '**/packages/engines/comfyui-card-kit/src/lanes-image-tools.ts': { statements: 92.59, branches: 94.12, functions: 71.43, lines: 96 },
  '**/packages/engines/comfyui-card-kit/src/linked.ts': { statements: 92.86, branches: 87.5, functions: 66.67, lines: 92.31 },
  '**/packages/engines/comfyui-card-kit/src/model-contract.ts': { statements: 93.18, branches: 42.86, functions: 83.33, lines: 92.86 },
  '**/packages/engines/comfyui-card-kit/src/lanes-image.ts': { statements: 97.83, branches: 97.25, functions: 94.74, lines: 98.32 },
  '**/packages/engines/comfyui-card-kit/src/mods/guard.ts': { statements: 98.67, branches: 99.2, functions: 90.91, lines: 98.48 },
  // 2026-11-07 MASK ORDER: the shared bare-flavor boarding primitive —
  // the seven families' mods/mask.ts re-export its plugin; the cordis
  // cardDefs boot sweep exercises both arms of apply.
  '**/packages/engines/comfyui-card-kit/src/mods/bare-flavor.ts': { statements: 66.67, branches: null, functions: 66.67, lines: 50 },
  '**/packages/engines/comfyui-card-kit/src/pack-fields.ts': { statements: 92.86, branches: 0, functions: 0, lines: 92.31 },
  '**/packages/engines/comfyui-card-kit/src/morphs.ts': { statements: 66.67, branches: null, functions: null, lines: 66.67 },
  '**/packages/engines/comfyui-card-kit/src/service-faces.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-card-kit/src/semanticModelKnob.ts': { statements: 93.75, branches: 93.75, functions: 66.67, lines: 92.31 },
  '**/packages/engines/comfyui-card-kit/src/params-emit.ts': { statements: 99.19, branches: 99.28, functions: 94.12, lines: 98.98 },
  '**/packages/engines/comfyui-card-kit/src/paramRows.ts': { statements: 85.71, branches: 81.82, functions: 50, lines: 85.71 },
  '**/packages/engines/comfyui-card-kit/src/vocab.ts': { statements: 90, branches: 50, functions: 75, lines: 88.89 },
  '**/packages/engines/comfyui-cordis/src/_z.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-cordis/src/card-definition-schema.ts': { statements: 90, branches: 50, functions: 50, lines: 88.89 },
  '**/packages/engines/comfyui-cordis/src/cardDefs.ts': { statements: 99.06, branches: 89.13, functions: 94.12, lines: 98.97 },
  '**/packages/engines/comfyui-cordis/src/catalog.ts': { statements: 99.26, branches: 99.32, functions: 95.65, lines: 99.13 },
  '**/packages/engines/comfyui-cordis/src/configOverlay.ts': { statements: 92.86, branches: 94.74, functions: 50, lines: 90.91 },
  '**/packages/engines/comfyui-cordis/src/comfyui-config.ts': { statements: 97.83, branches: 97.06, functions: 85.71, lines: 97.44 },
  '**/packages/engines/comfyui-cordis/src/comfyui-control.ts': { statements: 95.45, branches: 85.71, functions: 88.89, lines: 94.74 },
  '**/packages/engines/comfyui-cordis/src/comfyui-execute.ts': { statements: 92.77, branches: 85.56, functions: 77.61, lines: 93.7 },
  '**/packages/engines/comfyui-cordis/src/comfyui-host.ts': { statements: 99, branches: 98.04, functions: 95.83, lines: 98.9 },
  '**/packages/engines/comfyui-cordis/src/comfyui-merge.ts': { statements: 98.51, branches: 95.68, functions: 95.24, lines: 98.91 },
  '**/packages/engines/comfyui-cordis/src/comfyui-outputs.ts': { statements: 99.44, branches: 97.78, functions: 95, lines: 99.35 },
  '**/packages/engines/comfyui-cordis/src/comfyui-transport.ts': { statements: 87.5, branches: 76.36, functions: 84.21, lines: 89.47 },
  '**/packages/engines/comfyui-cordis/src/comfyui-types.ts': { statements: 80, branches: null, functions: 50, lines: 80 },
  '**/packages/engines/comfyui-cordis/src/comfyui-upload.ts': { statements: 98.07, branches: 95.5, functions: 88.24, lines: 98.25 },
  '**/packages/engines/comfyui-cordis/src/comfyui.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-cordis/src/entries/catalog-registry.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-cordis/src/entries/comfyui-engine.ts': { statements: 95, branches: 90.91, functions: 87.5, lines: 94.74 },
  '**/packages/engines/comfyui-cordis/src/entries/comfyui-host.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-cordis/src/entries/comfyui-wiring.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-cordis/src/envelope-laws.ts': { statements: 98.88, branches: 95.74, functions: 87.5, lines: 98.73 },
  '**/packages/engines/comfyui-cordis/src/generated/vocab.ts': { statements: 93.75, branches: null, functions: null, lines: 93.75 },
  '**/packages/engines/comfyui-cordis/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui-cordis/src/models/catalogEmission.ts': { statements: 95.24, branches: 97.44, functions: 66.67, lines: 95 },
  '**/packages/engines/comfyui-cordis/src/models/census.ts': { statements: 97.5, branches: 87.5, functions: 90, lines: 97.3 },
  '**/packages/engines/comfyui-cordis/src/models/enhanceRecipes.ts': { statements: 99.38, branches: 98.88, functions: 87.5, lines: 99.27 },
  '**/packages/engines/comfyui-cordis/src/models/families/index.ts': { statements: 83.33, branches: null, functions: 0, lines: 83.33 },
  '**/packages/engines/comfyui-cordis/src/models/models.ts': { statements: 95, branches: 50, functions: 92.31, lines: 93.75 },
  '**/packages/engines/comfyui-cordis/src/models/service.ts': { statements: 97.97, branches: 96.17, functions: 98.77, lines: 98.48 },
  '**/packages/engines/comfyui-cordis/src/models/validate.ts': { statements: 99.05, branches: 99.11, functions: 80, lines: 98.85 },
  '**/packages/engines/comfyui-cordis/src/mods-schema.ts': { statements: 97.22, branches: 97.22, functions: 75, lines: 96.88 },
  '**/packages/engines/comfyui-cordis/src/mods/packs.ts': { statements: 95.45, branches: null, functions: 85.71, lines: 93.75 },
  '**/packages/engines/comfyui-cordis/src/mods/userLorasFlavor.ts': { statements: 92.86, branches: 75, functions: 50, lines: 92.31 },
  '**/packages/engines/comfyui-cordis/src/no-cheat.ts': { statements: 94.74, branches: 92.86, functions: 50, lines: 93.75 },
  '**/packages/engines/comfyui-cordis/src/service.ts': { statements: 99.75, branches: 97.61, functions: 98.41, lines: 99.7 },
  '**/packages/engines/comfyui-cordis/src/serviceMods.ts': { statements: 98.28, branches: 99.13, functions: 83.33, lines: 98.18 },
  '**/packages/engines/comfyui-cordis/src/supervisor.ts': { statements: 99.35, branches: 99.19, functions: 96, lines: 99.28 },
  '**/packages/engines/comfyui-cordis/src/userLoras.ts': { statements: 98.15, branches: 98.93, functions: 95.45, lines: 97.67 },
  '**/packages/engines/comfyui-cordis/src/wiringWall.ts': { statements: 99.19, branches: 98.56, functions: 96, lines: 99.05 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/PoseEditMode.tsx': { statements: null, branches: null, functions: null, lines: null },
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
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/PoseViewer3D.tsx': { statements: 47.42, branches: 49.73, functions: 33.33, lines: 50 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStage.ts': { statements: 34.93, branches: 0, functions: 0, lines: 36.55 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageCamera.ts': { statements: 78.95, branches: 50, functions: 50, lines: 77.78 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageCarriers.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageManipulators.ts': { statements: 2.55, branches: 0, functions: 0, lines: 1.35 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageMesh.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageOverlays.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageReference.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageSkeleton.ts': { statements: 19.18, branches: 5, functions: 28.57, lines: 16.95 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageTypes.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/MotionPoster.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/MotionViewer.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui/src/action_cards/motion/ui/viewers/motionImageStore.ts': { statements: 95.45, branches: 88.89, functions: 80, lines: 94.74 },
  '**/packages/engines/comfyui/src/action_cards/src/form-fields.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/comfyui/src/action_cards/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/comfyui/src/action_cards/src/poster-shell.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/engines/contract/src/engines.ts': { statements: 95.65, branches: 92.31, functions: 87.5, lines: 95.65 },
  '**/packages/engines/contract/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/contract/src/vocabulary.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/craft/src/craft-engine.ts': { statements: 98.04, branches: 98.36, functions: 90.91, lines: 97.89 },
  '**/packages/engines/craft/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/craft/src/params.ts': { statements: 97.3, branches: 97.62, functions: 75, lines: 97.3 },
  '**/packages/engines/mcp/src/formDoc.ts': { statements: 83.33, branches: 50, functions: 80, lines: 83.33 },
  '**/packages/engines/mcp/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/engines/mcp/src/mcp-engine.ts': { statements: 98.92, branches: 98.28, functions: 92.86, lines: 98.82 },
  '**/packages/estate/drafts/src/bench.ts': { statements: 99.28, branches: 95.55, functions: 98.91, lines: 99.6 },
  '**/packages/estate/drafts/src/index.ts': { statements: 80, branches: 0, functions: 0, lines: 80 },
  '**/packages/estate/drafts/src/remote.ts': { statements: 96.32, branches: 97.33, functions: 94.44, lines: 96.09 },
  '**/packages/estate/drafts/src/spec.ts': { statements: 87.5, branches: null, functions: 0, lines: 87.5 },
  '**/packages/estate/drafts/src/store.ts': { statements: 97.75, branches: 92.73, functions: 90, lines: 98.7 },
  '**/packages/estate/drafts/src/trail.ts': { statements: 95.7, branches: 97.27, functions: 92.86, lines: 94.94 },
  '**/packages/estate/manage/src/index.ts': { statements: 88.89, branches: null, functions: 75, lines: 85.71 },
  '**/packages/estate/media/src/index.ts': { statements: 98.56, branches: 96.7, functions: 95.24, lines: 98.87 },
  '**/packages/estate/models/src/index.ts': { statements: 94.7, branches: 94.77, functions: 83.72, lines: 95.42 },
  '**/packages/estate/provisioning/src/artifact-writer.ts': { statements: 97.19, branches: 96.52, functions: 91.67, lines: 98.96 },
  '**/packages/estate/provisioning/src/contracts.ts': { statements: 90.32, branches: 84.21, functions: 85.71, lines: 96.3 },
  '**/packages/estate/provisioning/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/estate/provisioning/src/manager-client.ts': { statements: 99.4, branches: 99.17, functions: 95.65, lines: 99.38 },
  '**/packages/estate/provisioning/src/manager-provider.ts': { statements: 99.52, branches: 99.22, functions: 97.22, lines: 99.46 },
  '**/packages/estate/provisioning/src/operation-store.ts': { statements: 91.04, branches: 92.31, functions: 93.94, lines: 92.94 },
  '**/packages/estate/provisioning/src/ports.ts': { statements: null, branches: null, functions: null, lines: null },
  // 2026-10-21: the 100s above were the driver-seat-env over-count;
  // the stripped gate measures the honest floor. The landing deleted
  // runWithId's dead caller-signal machinery (sole caller passed
  // undefined). The remaining gap is three defensive arms no public
  // caller reaches (proofs in the TEST-2 ledger): the ensureProgress
  // create arm (executeEnsure's synchronous seed dominates it, no
  // deletion path) and the .then/.catch current-undefined arms (both
  // start paths seed the id before attaching handlers).
  '**/packages/estate/provisioning/src/service.ts': { statements: 95.74, branches: 92.03, functions: 94.39, lines: 97.1 },
  // the snapshot channel's pure helpers (2026-10-21): measured with
  // the wall seated — the uncovered branches are the external-JSON
  // defensive arms (null body, non-array siblings, non-string
  // rfilenames) the listing parser tolerates by contract.
  '**/packages/estate/provisioning/src/snapshot.ts': { statements: 93.94, branches: 84.78, functions: 93.33, lines: 98.21 },
  '**/packages/estate/runs/src/index.ts': { statements: 97.06, branches: 90.91, functions: 94.12, lines: 98.28 },
  '**/packages/harness/estate-call/src/cardTool.ts': { statements: 98.36, branches: 98.82, functions: 90, lines: 98.11 },
  '**/packages/harness/estate-call/src/estateCall.ts': { statements: 94.12, branches: 91.67, functions: 66.67, lines: 93.33 },
  '**/packages/harness/estate-call/src/executorHarness.ts': { statements: 99.29, branches: 95.45, functions: 97.37, lines: 99.25 },
  '**/packages/harness/estate-queue/src/bakeParams.ts': { statements: 99.01, branches: 98.72, functions: 88.89, lines: 98.92 },
  '**/packages/harness/estate-queue/src/bench.ts': { statements: 92, branches: 90.48, functions: 83.33, lines: 91.67 },
  '**/packages/harness/estate-queue/src/cardsArmError.ts': { statements: 93.33, branches: 90, functions: 66.67, lines: 90 },
  '**/packages/harness/estate-queue/src/cardsCompose.ts': { statements: 98.59, branches: 97.73, functions: 93.33, lines: 98.53 },
  '**/packages/harness/estate-queue/src/cardsDangling.ts': { statements: 97.59, branches: 98.51, functions: 83.33, lines: 97.44 },
  '**/packages/harness/estate-queue/src/cardsFacts.ts': { statements: 97.06, branches: 96.88, functions: 83.33, lines: 96.15 },
  '**/packages/harness/estate-queue/src/cardsLanes.ts': { statements: 98.8, branches: 90.63, functions: 96.97, lines: 99.26 },
  // measured over the full coverage gate (2026-11-10, the cell-fold
  // cure's extracted helper)
  '**/packages/harness/estate-queue/src/cardsLanesCopy.ts': { statements: 75, branches: 85.71, functions: 50, lines: 75 },
  '**/packages/harness/estate-queue/src/cardsRegistry.ts': { statements: 97.22, branches: 93.02, functions: 97.53, lines: 98.47 },
  '**/packages/harness/estate-queue/src/cardsVariant.ts': { statements: 99.19, branches: 97.01, functions: 92.86, lines: 99 },
  '**/packages/harness/estate-queue/src/discloseRegistry.ts': { statements: 98.5, branches: 92.78, functions: 96, lines: 99.05 },
  '**/packages/harness/estate-queue/src/filmLead.ts': { statements: 66.67, branches: 50, functions: 50, lines: 50 },
  '**/packages/harness/estate-queue/src/filmMemoryWarn.ts': { statements: 97.87, branches: 97.87, functions: 75, lines: 97.37 },
  '**/packages/harness/estate-queue/src/flowsData.ts': { statements: 98.56, branches: 97.51, functions: 97.06, lines: 99.47 },
  '**/packages/harness/estate-queue/src/flowsFamilyCompose.ts': { statements: 98.08, branches: 96.97, functions: 88.89, lines: 97.73 },
  // measured over the owning package suite (2026-10-11, the ratchet's
  // seat-the-three-files cure)
  '**/packages/harness/estate-queue/src/flowsParamsOverlay.ts': { statements: 93.65, branches: 78.46, functions: 92.86, lines: 94.83 },
  '**/packages/harness/estate-queue/src/flowsRegistryRows.ts': { statements: 90.91, branches: null, functions: null, lines: 90.91 },
  '**/packages/harness/estate-queue/src/index.ts': { statements: 85.71, branches: 0, functions: 50, lines: 85.71 },
  '**/packages/harness/estate-queue/src/ledgerTail.ts': { statements: 98.36, branches: 94.12, functions: 88.89, lines: 98.21 },
  // measured over the owning package suite (2026-10-11)
  '**/packages/harness/estate-queue/src/lifecycleLatch.ts': { statements: 88.89, branches: 75, functions: 66.67, lines: 87.5 },
  '**/packages/harness/estate-queue/src/loadRegistry.ts': { statements: 91.67, branches: 87.5, functions: 66.67, lines: 91.67 },
  '**/packages/harness/estate-queue/src/manageOps.ts': { statements: 98.46, branches: 98.08, functions: 92.31, lines: 98.04 },
  '**/packages/harness/estate-queue/src/managePlane.ts': { statements: 97.66, branches: 95.41, functions: 99.4, lines: 97.71 },
  // managePreflight (audit 019 C3, measured 2026-11-12 over
  // manage-preflight.spec.ts: the uncovered branch arms are the
  // defensive optional-field variants — probe.reason undefined,
  // per-key sub default, the wiring-budget stop, the packs-cascade
  // engine arm split).
  '**/packages/harness/estate-queue/src/managePreflight.ts': { statements: 97.18, branches: 82.61, functions: 88.89, lines: 98.48 },
  '**/packages/harness/estate-queue/src/manageProbe.ts': { statements: 90.57, branches: 91.53, functions: 85.71, lines: 92.47 },
  '**/packages/harness/estate-queue/src/manageRegistry.ts': { statements: 87.5, branches: 90, functions: 66.67, lines: 86.67 },
  '**/packages/harness/estate-queue/src/managerRail.ts': { statements: 96.97, branches: 96.43, functions: 83.33, lines: 96.55 },
  '**/packages/harness/estate-queue/src/mediaKinds.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/harness/estate-queue/src/queue.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/harness/estate-queue/src/queueCore.ts': { statements: 98.15, branches: 95.65, functions: 92.31, lines: 98.04 },
  '**/packages/harness/estate-queue/src/queueLifecycle.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/harness/estate-queue/src/queueLock.ts': { statements: 98.46, branches: 96.88, functions: 92.31, lines: 98.36 },
  '**/packages/harness/estate-queue/src/queueResurrect.ts': { statements: 99.24, branches: 98.95, functions: 92.86, lines: 99.12 },
  '**/packages/harness/estate-queue/src/queueRetry.ts': { statements: 50, branches: 50, functions: 50, lines: 50 },
  '**/packages/harness/estate-queue/src/queueSidecar.ts': { statements: 96.18, branches: 88.29, functions: 85.71, lines: 96.12 },
  '**/packages/harness/estate-queue/src/queueSubmit.ts': { statements: 97.62, branches: 97.44, functions: 93.33, lines: 97.4 },
  '**/packages/harness/estate-queue/src/queueSweep.ts': { statements: 98.51, branches: 98.08, functions: 66.67, lines: 98.31 },
  '**/packages/harness/estate-queue/src/resurrect.ts': { statements: 0, branches: null, functions: 0, lines: 0 },
  '**/packages/harness/estate-queue/src/rootsManifest.ts': { statements: null, branches: null, functions: null, lines: null },
  // measured over the full coverage gate (2026-11-10, the provision
  // extensions door's extracted face)
  '**/packages/harness/estate-queue/src/runtimeProvision.ts': { statements: 88.89, branches: 93.94, functions: 88.24, lines: 88.31 },
  '**/packages/harness/estate-queue/src/runsChange.ts': { statements: 95.83, branches: 75, functions: 91.67, lines: 95 },
  '**/packages/harness/estate-queue/src/runsErrorCodes.ts': { statements: 0, branches: null, functions: null, lines: 0 },
  '**/packages/harness/estate-queue/src/runsExecute.ts': { statements: 97.8, branches: 94.02, functions: 96.88, lines: 98.8 },
  '**/packages/harness/estate-queue/src/runsGates.ts': { statements: 98.89, branches: 98.36, functions: 94.74, lines: 98.61 },
  '**/packages/harness/estate-queue/src/runsList.ts': { statements: 99.43, branches: 98.02, functions: 97.14, lines: 99.66 },
  '**/packages/harness/estate-queue/src/runsRefusalVoices.ts': { statements: 93.94, branches: 85.71, functions: 88.89, lines: 93.1 },
  '**/packages/harness/estate-queue/src/runsRegistry.ts': { statements: 98.79, branches: 94.29, functions: 98.84, lines: 99.59 },
  '**/packages/harness/estate-queue/src/runsSourceEcho.ts': { statements: 98.52, branches: 98.8, functions: 90.91, lines: 98.25 },
  '**/packages/harness/estate-queue/src/runsStart.ts': { statements: 97.41, branches: 95.87, functions: 92.86, lines: 98.52 },
  '**/packages/harness/estate-queue/src/runsTypes.ts': { statements: 99.1, branches: 97.24, functions: 88.89, lines: 98.99 },
  '**/packages/harness/estate-queue/src/runsValidate.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/harness/estate-queue/src/runsValidateArms.ts': { statements: 98.92, branches: 90.67, functions: 80, lines: 98.9 },
  '**/packages/harness/estate-queue/src/runsValidateInline.ts': { statements: 96.67, branches: 97.62, functions: 75, lines: 96.55 },
  '**/packages/harness/estate-queue/src/runsValidateRefusals.ts': { statements: 80, branches: 85.71, functions: 50, lines: 80 },
  '**/packages/harness/estate-queue/src/runsValidateServe.ts': { statements: 99.07, branches: 98.55, functions: 95, lines: 98.97 },
  '**/packages/harness/estate-queue/src/runsValidateShared.ts': { statements: 92.31, branches: 87.5, functions: 66.67, lines: 91.67 },
  '**/packages/harness/estate-queue/src/runsValidateStages.ts': { statements: 99.48, branches: 98.91, functions: 93.33, lines: 99.43 },
  '**/packages/harness/estate-queue/src/runsValidateSweeps.ts': { statements: 98.33, branches: 98.68, functions: 75, lines: 97.96 },
  '**/packages/harness/estate-queue/src/service.ts': { statements: 90.91, branches: 84.21, functions: 80, lines: 90.48 },
  '**/packages/harness/estate-queue/src/skillFrontmatter.ts': { statements: 94.44, branches: 90, functions: 50, lines: 94.12 },
  '**/packages/harness/estate-queue/src/skillFs.ts': { statements: 94.74, branches: 50, functions: 85.71, lines: 94.44 },
  '**/packages/harness/estate-queue/src/skillPlane.ts': { statements: 98.92, branches: 98.33, functions: 92.86, lines: 98.7 },
  '**/packages/harness/estate-queue/src/skillRegistry.ts': { statements: 91.67, branches: 66.67, functions: 75, lines: 90.91 },
  '**/packages/harness/estate-queue/src/skillRows.ts': { statements: 99.45, branches: 99.12, functions: 93.75, lines: 99.34 },
  '**/packages/harness/estate-queue/src/toolProjection.ts': { statements: 96.67, branches: 94.44, functions: 75, lines: 96.43 },
  '**/packages/harness/estate-queue/src/vocab.ts': { statements: 66.67, branches: null, functions: null, lines: 66.67 },
  // provisioner's "." door is an import-safe identity const for
  // EXTERNAL bare-extract consumers — no in-tree spec imports it
  // (the bin is the imperative surface), so its one statement
  // measures 0 until an in-tree consumer lands.
  '**/packages/harness/provisioner/src/index.ts': { statements: 0, branches: null, functions: null, lines: 0 },
  // 2026-11-06 follow-up regen: the deletion cure (28edf55c9) retired the
  // one dead statement/branch pair; the full gate re-measured 100x4.
  '**/packages/harness/melite-tools/src/discovery.ts': { statements: 98.39, branches: 98.98, functions: 96.36, lines: 98.03 },
  '**/packages/harness/melite-tools/src/doors.ts': { statements: 99.04, branches: 97.36, functions: 97.83, lines: 99.18 },
  '**/packages/harness/melite-tools/src/enhance-agent.ts': { statements: 96.3, branches: 96.3, functions: 75, lines: 96 },
  // F-1 (2026-11-05): the typed-lane rewrite re-measured this row.
  // The three dead statements are the doors-law's own: the two
  // closed-union `never` throws (the router regex and BenchVerb admit
  // six arms only) and withEstateBound's non-TimeoutReason reject —
  // the bound's upstream is `undefined` BY DESIGN (doors.spec pins
  // the rolled-back fused form), so that reason is unreachable. The
  // removal clause carries the drop: the rewrite deleted lines from
  // this same file (git diff --numstat HEAD). Receipt:
  // dev_docs/audits/contracts/cures-2026-11-05-harness-seam.md.
  '**/packages/harness/melite-tools/src/estate.ts': { statements: 97.14, branches: 96.67, functions: 98.41, lines: 96.72 },
  '**/packages/harness/melite-tools/src/faceStamp.ts': { statements: 93.33, branches: 87.5, functions: 75, lines: 92.31 },
  '**/packages/harness/melite-tools/src/index.ts': { statements: 87.78, branches: 89.36, functions: 88.24, lines: 89.87 },
  '**/packages/harness/melite-tools/src/json-clean.ts': { statements: 93.33, branches: 95, functions: 50, lines: 88.89 },
  '**/packages/harness/melite-tools/src/llm-complete.ts': { statements: 98.94, branches: 98.72, functions: 92.86, lines: 98.78 },
  // runsDelegation (3370c9b64, the delegation outlives the mount):
  // measured 2026-10-21 — the three cond-expr fallback arms (the
  // failed-write voices) ride the delegation suites; branch floor
  // is the measured 82.35, ratchets up as arms land.
  '**/packages/harness/melite-tools/src/runsDelegation.ts': { statements: 95.45, branches: 76.47, functions: 75, lines: 95 },
  '**/packages/harness/melite-tools/src/stageViewPlane.ts': { statements: 96.43, branches: 90.91, functions: 80, lines: 96 },
  '**/packages/harness/melite-tools/src/tools/comfy-manage.ts': { statements: 99.22, branches: 96.44, functions: 95.65, lines: 98.91 },
  '**/packages/harness/melite-tools/src/tools/glbSummary.ts': { statements: 98.89, branches: 98.65, functions: 87.5, lines: 98.67 },
  '**/packages/harness/melite-tools/src/tools/ledger-tail.ts': { statements: 97.67, branches: 96.55, functions: 75, lines: 97.62 },
  '**/packages/harness/melite-tools/src/tools/melite-construct.ts': { statements: 89.84, branches: 84.83, functions: 98.39, lines: 93.35 },
  '**/packages/harness/melite-tools/src/tools/melite-discover.ts': { statements: 97.83, branches: 96.18, functions: 81.82, lines: 98.63 },
  '**/packages/harness/melite-tools/src/tools/melite-flow.ts': { statements: 96.84, branches: 94.06, functions: 97.5, lines: 98.07 },
  // 2026-10-21: same driver-seat correction; the landing deleted the
  // `?? ''` on split(':')[0] (ECMA-262 always returns at least one
  // element). The remaining gap is the fam === '' guard in
  // familyPackSeats: the sole call site's seatFams structurally
  // excludes the empty family (proof in the TEST-2 ledger).
  '**/packages/harness/melite-tools/src/tools/melite-load.ts': { statements: 98.91, branches: 97.69, functions: 96, lines: 99.36 },
  '**/packages/harness/melite-tools/src/tools/melite-read.ts': { statements: 98.94, branches: 94.2, functions: 93.75, lines: 98.86 },
  '**/packages/harness/melite-tools/src/tools/melite-view.ts': { statements: 99.43, branches: 98.2, functions: 98.21, lines: 99.68 },
  '**/packages/harness/melite-tools/src/tools/mp4Probe.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/harness/melite-tools/src/tools/run-status.ts': { statements: 98.8, branches: 97.81, functions: 91.67, lines: 98.68 },
  // (skill-index.ts row deleted with 57cc90a41 — melite_skill_index
  // was deleted; its id law already lived in melite_load.)
  '**/packages/harness/melite-tools/src/tools/skill-read.ts': { statements: 94.74, branches: 90, functions: 75, lines: 94.74 },
  '**/packages/harness/melite-tools/src/tools/vision-route.ts': { statements: 98.51, branches: 98.21, functions: 83.33, lines: 98.25 },
  '**/packages/image/image-edit/src/card.ts': { statements: 97.3, branches: 96.77, functions: 87.5, lines: 96.97 },
  '**/packages/image/image-edit/src/index.ts': { statements: 85.71, branches: 50, functions: 0, lines: 83.33 },
  '**/packages/image/image-edit/src/tool.ts': { statements: 66.67, branches: null, functions: 0, lines: 66.67 },
  '**/packages/image/image-gen/src/card.ts': { statements: 94.55, branches: 86.05, functions: 90.91, lines: 94.23 },
  '**/packages/image/image-gen/src/index.ts': { statements: 85.71, branches: 50, functions: 0, lines: 83.33 },
  '**/packages/image/image-gen/src/tool.ts': { statements: 66.67, branches: 75, functions: 50, lines: 66.67 },
  '**/packages/image/image-gen/src/wire.ts': { statements: 0, branches: null, functions: null, lines: 0 },
  // (2026-11-06) the ANNY-style crop studio's src faces — floors
  // pinned at the studio suite's measured coverage (the crop
  // preview's branch floor is the pointer-gesture matrix; the
  // component's the restage lane).
  '**/packages/image/input-prep/src/client/index.ts': { statements: 66.67, branches: null, functions: null, lines: 66.67 },
  '**/packages/image/input-prep/src/ui/studio/CropPreview.tsx': { statements: 95.58, branches: 81.33, functions: 94.44, lines: 98.92 },
  '**/packages/image/input-prep/src/ui/studio/component.tsx': { statements: 91.01, branches: 94.26, functions: 80, lines: 94.52 },
  '**/packages/image/input-prep/src/card.ts': { statements: 98.59, branches: 98.9, functions: 91.67, lines: 98.36 },
  '**/packages/image/input-prep/src/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/image/mask-studio/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/image/mask-studio/src/paintInk.ts': { statements: 0, branches: null, functions: null, lines: 0 },
  '**/packages/image/mask-studio/src/ui/BboxLeafCanvas.tsx': { statements: 99.12, branches: 98, functions: 94.74, lines: 98.94 },
  '**/packages/image/mask-studio/src/ui/PaintLeafCanvas.tsx': { statements: 99.33, branches: 98.68, functions: 94.44, lines: 99.19 },
  '**/packages/image/mask/src/card.ts': { statements: 99.56, branches: 99.39, functions: 97.3, lines: 99.49 },
  '**/packages/image/mask/src/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/image/tagger/src/card.ts': { statements: 94.74, branches: 90, functions: 85.71, lines: 94.12 },
  '**/packages/image/upscale-tools/src/card.ts': { statements: 96.55, branches: 96.3, functions: 80, lines: 96.15 },
  '**/packages/models/anima/src/actions.ts': { statements: 94.44, branches: 83.33, functions: 50, lines: 94.44 },
  '**/packages/models/anima/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/anima/src/promptTags.ts': { statements: 97.62, branches: 97.44, functions: 75, lines: 97.14 },
  '**/packages/models/anny/src/actions.ts': { statements: 95.45, branches: 92.86, functions: 85.71, lines: 95.24 },
  '**/packages/models/anny/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/anycreature/src/actions.ts': { statements: 83.33, branches: null, functions: 50, lines: 83.33 },
  '**/packages/models/anycreature/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/concat/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  // 2026-11-08, the third edit lane: fibo2-edit lands at 100x4 on its own
  // spec pair (decl.spec + action.spec drive every branch).
  '**/packages/models/fibo2-edit/src/actions.ts': { statements: 97.56, branches: 96.97, functions: 66.67, lines: 97.44 },
  '**/packages/models/fibo2-edit/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/fit/src/actions.ts': { statements: 90, branches: 75, functions: 50, lines: 90 },
  '**/packages/models/fit/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/florence2/src/actions.ts': { statements: 83.33, branches: 50, functions: 0, lines: 83.33 },
  '**/packages/models/florence2/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/flux-klein/src/actions.ts': { statements: 90.91, branches: 81.25, functions: 75, lines: 89.66 },
  '**/packages/models/flux-klein/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/moss-image/src/actions.ts': { statements: 93.75, branches: 83.33, functions: 50, lines: 93.75 },
  '**/packages/models/moss-image/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/gem-soma/src/actions.ts': { statements: 83.33, branches: 50, functions: 50, lines: 83.33 },
  '**/packages/models/gem-soma/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/h3/src/actions.ts': { statements: 97.94, branches: 94.92, functions: 98.21, lines: 99.5 },
  '**/packages/models/h3/src/filmMix.ts': { statements: 98.89, branches: 98.82, functions: 91.67, lines: 98.67 },
  '**/packages/models/h3/src/finalize.ts': { statements: 75, branches: 50, functions: 0, lines: 66.67 },
  '**/packages/models/h3/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  // openjutsu lane, feature 023: first seat at the MAX of two scoped
  // json-summary faces (h3/tests/reshoot.spec.ts + the walls seated
  // spec), K=1 margin mint — the file is feature-024's in-flight
  // reshoot module; its own spec carries the 100 face.
  '**/packages/models/h3/src/reshoot.ts': { statements: 97.56, branches: 96, functions: 88.89, lines: 97.5 },
  // h3 F19 (2026-11-12): first seat at the scoped json-summary face
  // (models/h3 tests/ alone — refine.spec.ts drives renderH3Refine's
  // full surface incl. the RefineHandoff 2x emission), measured
  // 100x4: 28/28 statements, 10/10 branches, 3/3 functions.
  '**/packages/models/h3/src/refine.ts': { statements: 96.43, branches: 90, functions: 66.67, lines: 96.43 },
  // h3 F19 deferred ChainUpscale loop (2026-11-12): first seat at the
  // scoped json-summary face (models/h3 tests/chainUpscale.spec.ts
  // drives renderH3ChainUpscale's own door — the full loop compose,
  // the bare-name head, the recipe defaults, both refusals, and the
  // upscaleArmed predicate), measured 100x4: 32/32 statements,
  // 12/12 branches, 4/4 functions.
  '**/packages/models/h3/src/chainUpscale.ts': { statements: 96.88, branches: 91.67, functions: 75, lines: 96.88 },
  '**/packages/models/h3/src/schema.ts': { statements: 98.17, branches: 96.91, functions: 88.89, lines: 98.02 },
  '**/packages/models/h3/src/timelineContract.ts': { statements: 99.27, branches: 99.02, functions: 96, lines: 99.15 },
  '**/packages/models/input/src/actions.ts': { statements: 97.62, branches: 97.56, functions: 50, lines: 97.62 },
  '**/packages/models/input/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/joycaption/src/actions.ts': { statements: 83.33, branches: 50, functions: 0, lines: 83.33 },
  '**/packages/models/joycaption/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/joytag/src/actions.ts': { statements: 80, branches: 50, functions: 0, lines: 80 },
  '**/packages/models/joytag/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/kimodo/src/actions.ts': { statements: 94.44, branches: 91.67, functions: 50, lines: 93.33 },
  '**/packages/models/kimodo/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/krea-2/src/actions.ts': { statements: 95, branches: 83.33, functions: 50, lines: 95 },
  '**/packages/models/krea-2/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/mask/src/actions.ts': { statements: 99.53, branches: 99.48, functions: 96.43, lines: 99.49 },
  '**/packages/models/mask/src/index.ts': { statements: 83.33, branches: null, functions: 50, lines: 80 },
  '**/packages/models/moss-sfx/src/actions.ts': { statements: 83.33, branches: null, functions: 50, lines: 83.33 },
  '**/packages/models/moss-sfx/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/music3/src/actions.ts': { statements: 97.06, branches: 96.67, functions: 80, lines: 96.55 },
  '**/packages/models/music3/src/decode.ts': { statements: 87.5, branches: 87.5, functions: 0, lines: 83.33 },
  '**/packages/models/music3/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/music3/src/tier.ts': { statements: 88.89, branches: 87.5, functions: 66.67, lines: 88.89 },
  '**/packages/models/pixal3d/src/actions.ts': { statements: 98.28, branches: 87.5, functions: 80, lines: 98.28 },
  '**/packages/models/pixal3d/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/qwen-img-21/src/actions.ts': { statements: 96.15, branches: 85.71, functions: 75, lines: 96 },
  '**/packages/models/qwen-img-21/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/qwen-img-edit-21/src/actions.ts': { statements: 97.5, branches: 96.97, functions: 75, lines: 97.44 },
  '**/packages/models/qwen-img-edit-21/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/qwen-img-edit-2511/src/actions.ts': { statements: 97.73, branches: 97.87, functions: 66.67, lines: 97.67 },
  '**/packages/models/qwen-img-edit-2511/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/qwen3-tts/src/actions.ts': { statements: 93.33, branches: 91.67, functions: 75, lines: 92.86 },
  '**/packages/models/qwen3-tts/src/index.ts': { statements: 91.67, branches: 60, functions: 85.71, lines: 87.5 },
  '**/packages/models/seedvr2-ema/src/actions.ts': { statements: 90, branches: 75, functions: 66.67, lines: 88.89 },
  '**/packages/models/seedvr2-ema/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/skin/src/actions.ts': { statements: 92.31, branches: null, functions: 50, lines: 92.31 },
  '**/packages/models/skin/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/somax/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/transfer-rig/src/actions.ts': { statements: 93.33, branches: 90, functions: 66.67, lines: 92.31 },
  '**/packages/models/transfer-rig/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/trellis2-native/src/actions.ts': { statements: 98, branches: 50, functions: 75, lines: 98 },
  '**/packages/models/trellis2-native/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/wd14/src/actions.ts': { statements: 80, branches: 50, functions: 0, lines: 80 },
  '**/packages/models/wd14/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/yue2/src/actions.ts': { statements: 95.24, branches: 91.67, functions: 50, lines: 95.24 },
  '**/packages/models/yue2/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  '**/packages/models/z-image/src/actions.ts': { statements: 93.33, branches: 75, functions: 50, lines: 93.33 },
  '**/packages/models/z-image/src/index.ts': { statements: 75, branches: null, functions: 50, lines: 66.67 },
  // openjutsu lane, feature 023: first seats at the MAX of two scoped
  // json-summary faces (decl.spec/card.spec + the walls seated spec),
  // K=1 margin mint; actions' audio arms and card's fallback branches
  // carry the honest sub-100 faces. openjutsu/src/index.ts is the
  // plugin entry — unexercised at both scoped faces, floor 0/null
  // spells that honestly.
  '**/packages/motion/motion/src/card.ts': { statements: 94.44, branches: 91.67, functions: 83.33, lines: 93.75 },
  '**/packages/motion/motion/src/client/upstream.ts': { statements: 66.67, branches: 75, functions: 50, lines: 66.67 },
  '**/packages/motion/motion/src/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/motion/motion/src/tool.ts': { statements: 66.67, branches: null, functions: 0, lines: 66.67 },
  '**/packages/motion/motion/src/ui/studio/MotionRail.tsx': { statements: 94.12, branches: 98.41, functions: 91.67, lines: 92.31 },
  '**/packages/motion/motion/src/ui/studio/MotionStageView.tsx': { statements: 93.75, branches: 96.88, functions: 92.31, lines: 93.33 },
  '**/packages/motion/motion/src/ui/studio/MotionTimelineSection.tsx': { statements: 90.91, branches: 96.55, functions: 83.33, lines: 90 },
  '**/packages/motion/motion/src/ui/studio/kit.tsx': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/motion/motion/src/ui/studio/motionParams.ts': { statements: 66.67, branches: null, functions: null, lines: 66.67 },
  // 2026-11-05 merge: the ratchet's new row-census arm fired on
  // three files the 2026-11-05 lanes added but never measured —
  // measured here scoped (json-summary, motion suite alone; the
  // pool-merge break documented above stands). useMotionDoc is F7's
  // projection spine: measured 100/100/100/100 at dc711f41f
  // (2026-11-12, scoped json-summary — the abort/undo corner seats
  // the 2026-11-05 comment called owed are driven; the slice-3 debt
  // is closed, ROADMAP row "(2) useMotionDoc.ts 83.33 branches").
  '**/packages/motion/motion/src/ui/studio/useMotionDoc.ts': { statements: 97.96, branches: 83.33, functions: 90, lines: 97.62 },
  '**/packages/motion/motion/src/ui/studio/useMotionMedia.ts': { statements: 99.55, branches: 99.27, functions: 97.62, lines: 99.43 },
  '**/packages/motion/motion/src/ui/studio/useMotionStage.ts': { statements: 99.22, branches: 98.63, functions: 95.65, lines: 99.07 },
  '**/packages/motion/motion/src/ui/studio/useMotionUndoStack.ts': { statements: 97.47, branches: 94.12, functions: 95, lines: 98.48 },
  // 2026-11-05 (harness-seam cure session): the ratchet's row-census
  // arm caught this gated file carrying NO row (another lane's new
  // file). Row pinned at its measured face (21 files, 263 tests).
  '**/packages/motion/motion/src/ui/studio/motionDoc.ts': { statements: 98.72, branches: 93.18, functions: 95.65, lines: 98.41 },
  '**/packages/motion/motion/src/ui/studio/usePoseEditing.ts': { statements: 98.59, branches: 98.04, functions: 87.5, lines: 98.39 },
  '**/packages/motion/motion/src/ui/studio/useTimelineAuthoring.ts': { statements: 98.25, branches: 92.86, functions: 96, lines: 97.83 },
  '**/packages/motion/motion/src/ui/studio/useTimelineEnvelope.ts': { statements: 94.74, branches: 87.5, functions: 75, lines: 94.12 },
  '**/packages/video/h3-timeline/src/card.ts': { statements: 99.17, branches: 99.23, functions: 92.86, lines: 99.09 },
  '**/packages/video/h3-timeline/src/client/index.ts': { statements: 87.5, branches: null, functions: 66.67, lines: 85.71 },
  '**/packages/video/h3-timeline/src/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/video/h3-timeline/src/tool.ts': { statements: 75, branches: 50, functions: 50, lines: 75 },
  // (row 2026-11-06: RailBackButton — the submenu law's ONE exit
  // door (Sahar R2, order b); scoped probe over the component +
  // call-cards suites measures 100×4)
  '**/packages/video/h3-timeline/src/ui/studio/RailBackButton.tsx': { statements: 66.67, branches: null, functions: 50, lines: 50 },
  // (B2, journey-closure 2026-11-06) useFamilyReseatHeal.ts DELETED —
  // the D8 mount heal dissolved into the commit seam (useShownDoc.ts),
  // its row dies with the file (one row per gated file).
  // (2026-11-06) the square-grammar sweep: the mods chip-row swap
  // arms (listing/upload/chipOfListing's verbatim else) are doors
  // the wire-picker re-wiring orphaned — branches argued to the
  // measured face, every other metric climbed. Receipt: the
  // ARGUED_FLOOR_DROPS entry + the roadmap heading.
  // §9 NEW ROW 100x4 (2026-11-12): the studio's mod projection — its
  // derivation spec + the refusal-coercion spec cover every branch
  // (disarmed/non-object entries, seat filtering, doomed geometry).
  '**/packages/video/h3-timeline/src/ui/studio/commissions.ts': { statements: 98, branches: 97.44, functions: 75, lines: 97.67 },
  '**/packages/video/h3-timeline/src/ui/studio/CallCard.tsx': { statements: 98.84, branches: 95.51, functions: 97.06, lines: 99.24 },
  '**/packages/video/h3-timeline/src/ui/studio/CallCardPrompt.tsx': { statements: 83.33, branches: 93.75, functions: 83.33, lines: 80 },
  '**/packages/video/h3-timeline/src/ui/studio/CallCardsPanel.tsx': { statements: 96.67, branches: 93.75, functions: 94.74, lines: 97.87 },
  '**/packages/video/h3-timeline/src/ui/studio/CallFrameSubcard.tsx': { statements: 50, branches: 83.33, functions: 50, lines: 50 },
  '**/packages/video/h3-timeline/src/ui/studio/RunRecipeEngine.tsx': { statements: 90.91, branches: 84.62, functions: 90.91, lines: 97.92 },
  '**/packages/video/h3-timeline/src/ui/studio/RunRefsClips.tsx': { statements: 92.31, branches: 86.36, functions: 87.5, lines: 91.67 },
  '**/packages/video/h3-timeline/src/ui/studio/StudioPreview.tsx': { statements: 88.89, branches: 97.14, functions: 80, lines: 87.5 },
  '**/packages/video/h3-timeline/src/ui/studio/StudioStripPane.tsx': { statements: 96.43, branches: 97.41, functions: 97.5, lines: 98.84 },
  '**/packages/video/h3-timeline/src/ui/studio/component.tsx': { statements: 98.04, branches: 86.96, functions: 90.91, lines: 97.78 },
  '**/packages/video/h3-timeline/src/ui/studio/docCalls.ts': { statements: 99.46, branches: 99.61, functions: 94.74, lines: 99.34 },
  '**/packages/video/h3-timeline/src/ui/studio/docGrid.ts': { statements: 98.25, branches: 97.37, functions: 93.33, lines: 97.96 },
  '**/packages/video/h3-timeline/src/ui/studio/docHydrate.ts': { statements: 99.25, branches: 99.57, functions: 93.75, lines: 99.05 },
  '**/packages/video/h3-timeline/src/ui/studio/docModel.ts': { statements: 93.33, branches: 93.75, functions: 66.67, lines: 92.86 },
  // (row 2026-10-17: omitT4Recipe landed with the B1 emit-law round —
  // the J4 negative control drives both branches at the served spec)
  '**/packages/video/h3-timeline/src/ui/studio/omitT4Recipe.ts': { statements: 86.67, branches: 76.92, functions: 83.33, lines: 88.89 },
  // (row 2026-11-01: docPatch landed with the rail-law round)
  '**/packages/video/h3-timeline/src/ui/studio/docPatch.ts': { statements: 80, branches: null, functions: 66.67, lines: 75 },
  '**/packages/video/h3-timeline/src/ui/studio/pendingOps.ts': { statements: 97.5, branches: 94.59, functions: 91.67, lines: 96.97 },
  '**/packages/video/h3-timeline/src/ui/studio/pickVerdict.ts': { statements: 91.67, branches: 87.5, functions: 66.67, lines: 88.89 },
  '**/packages/video/h3-timeline/src/ui/studio/projection.ts': { statements: 98.77, branches: 99, functions: 93.33, lines: 98.48 },
  '**/packages/video/h3-timeline/src/ui/studio/refUtils.ts': { statements: 98.96, branches: 96.97, functions: 93.75, lines: 98.67 },
  // (row 2026-11-01, repinned from a false 0×4 the same landing:
  // the studio suite imports the dictionary transitively through
  // every studio component — the full-suite measured face is 100×4;
  // the h3 copy wall judges it key-by-key on top)
  '**/packages/video/h3-timeline/src/ui/studio/studioCopy.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/video/h3-timeline/src/ui/studio/useBeatMutations.ts': { statements: 95.45, branches: 92.86, functions: 90, lines: 94.12 },
  '**/packages/video/h3-timeline/src/ui/studio/useCallMutations.ts': { statements: 99.17, branches: 98.86, functions: 94.12, lines: 98.98 },
  '**/packages/video/h3-timeline/src/ui/studio/useDerivedView.ts': { statements: 98.36, branches: 98.18, functions: 96.67, lines: 98.97 },
  '**/packages/video/h3-timeline/src/ui/studio/useEnhance.ts': { statements: 96.77, branches: 87.5, functions: 88.89, lines: 96 },
  '**/packages/video/h3-timeline/src/ui/studio/useFilmAudio.ts': { statements: 99.3, branches: 98.18, functions: 96.88, lines: 99.13 },
  '**/packages/video/h3-timeline/src/ui/studio/useFilmSync.ts': { statements: 97.56, branches: 92.86, functions: 91.67, lines: 97.06 },
  '**/packages/video/h3-timeline/src/ui/studio/usePromptMutations.ts': { statements: 95.08, branches: 93.18, functions: 90.91, lines: 95.92 },
  // (row 2026-11-07: useReopenRefit — the parallel h3 lane's new hook;
  // scoped probe over the h3-timeline dom suite measures
  // 96.42/90/100/100, the uncovered lines 58-64 being the no-op
  // early return; floor re-pin owned by that lane)
  '**/packages/video/h3-timeline/src/ui/studio/useReopenRefit.ts': { statements: 92.86, branches: 85, functions: 87.5, lines: 95.24 },
  '**/packages/video/h3-timeline/src/ui/studio/useShownDoc.ts': { statements: 99.06, branches: 98.57, functions: 96, lines: 98.78 },
  '**/packages/video/h3-timeline/src/ui/studio/useStudioViewSync.ts': { statements: 92.31, branches: 83.33, functions: 80, lines: 90 },
  '**/packages/video/h3-timeline/src/ui/studio/useViewSelection.ts': { statements: 97.22, branches: 94.44, functions: 85.71, lines: 96.67 },
  '**/packages/web-kit/catalog/src/FlowProtocol.ts': { statements: 99.29, branches: 99.22, functions: 92.31, lines: 99.22 },
  '**/packages/web-kit/catalog/src/api.ts': { statements: 98.84, branches: 98.21, functions: 93.33, lines: 98.68 },
  '**/packages/web-kit/catalog/src/cardBirth.ts': { statements: 93.33, branches: 91.67, functions: 50, lines: 92.86 },
  '**/packages/web-kit/catalog/src/cardLlm.ts': { statements: 90, branches: 90, functions: 66.67, lines: 90 },
  '**/packages/web-kit/catalog/src/catalogContract.ts': { statements: 97.5, branches: 97.83, functions: 80, lines: 97.26 },
  '**/packages/web-kit/catalog/src/catalogContractStore.ts': { statements: 96.77, branches: 90, functions: 90, lines: 96.67 },
  '**/packages/web-kit/catalog/src/clientStore.ts': { statements: 96.88, branches: 83.33, functions: 88.89, lines: 96.67 },
  '**/packages/web-kit/catalog/src/contractToast.ts': { statements: 80, branches: 50, functions: 50, lines: 80 },
  '**/packages/web-kit/catalog/src/enhance.ts': { statements: 99.06, branches: 97.73, functions: 92.86, lines: 98.94 },
  '**/packages/web-kit/catalog/src/familyParamContract.ts': { statements: 99.12, branches: 99.09, functions: 93.33, lines: 99.5 },
  '**/packages/web-kit/catalog/src/familyProvenance.ts': { statements: 96.97, branches: 96.77, functions: 50, lines: 95.83 },
  '**/packages/web-kit/catalog/src/generated/gatewayDoors.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/catalog/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/catalog/src/modelCatalog.ts': { statements: 99.55, branches: 99.63, functions: 98.41, lines: 99.43 },
  '**/packages/web-kit/catalog/src/runStatusContract.ts': { statements: 96.15, branches: 96, functions: 80, lines: 96.15 },
  '**/packages/web-kit/catalog/src/runStatusContractStore.ts': { statements: 96.43, branches: 83.33, functions: 91.67, lines: 96.3 },
  '**/packages/web-kit/catalog/src/serviceForms.ts': { statements: 98.28, branches: 96.55, functions: 94.44, lines: 97.83 },
  '**/packages/web-kit/catalog/src/sleep.ts': { statements: 90.91, branches: 50, functions: 75, lines: 90.91 },
  '**/packages/web-kit/catalog/src/tagMap.ts': { statements: 98.11, branches: 97.53, functions: 97.06, lines: 97.69 },
  '**/packages/web-kit/catalog/src/waveform-peaks.ts': { statements: 97.78, branches: 97.22, functions: 80, lines: 97.22 },
  '**/packages/web-kit/contracts/src/FlowTypes.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/benchResult.ts': { statements: 98.46, branches: 98.85, functions: 80, lines: 98.41 },
  '**/packages/web-kit/contracts/src/benchSnapshot.ts': { statements: 98.73, branches: 98.61, functions: 85.71, lines: 98.39 },
  '**/packages/web-kit/contracts/src/benchStage.ts': { statements: 99, branches: 98.85, functions: 92.86, lines: 98.8 },
  '**/packages/web-kit/contracts/src/card.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/character.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/extraKeys.ts': { statements: 98.8, branches: 98.68, functions: 80, lines: 98.51 },
  '**/packages/web-kit/contracts/src/formSpec.ts': { statements: 0, branches: 50, functions: 0, lines: 0 },
  '**/packages/web-kit/contracts/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/laneRelations.ts': { statements: 99.45, branches: 96.67, functions: 98.51, lines: 99.64 },
  // (new-row pin 2026-11-12, the ratchet's rowless-file refusal caught
  // the one-seat migration's landing: familyLane.ts (commit 6925103d0)
  // entered the gated tree without a row. Scoped two-face MIN — the
  // walls face (variant-switch-parity + cardsRegistry.spec) and the
  // estate-queue project face — the full pool only adds covered paths
  // on top; lift with the lane law's own arms)
  '**/packages/web-kit/contracts/src/familyLane.ts': { statements: 93.94, branches: 90.91, functions: 85.71, lines: 91.3 },
  '**/packages/web-kit/contracts/src/loraTypes.ts': { statements: null, branches: null, functions: null, lines: null },
  // (new-row pin 2026-10-28, the ratchet's rowless-file refusal caught
  // the clip-geometry stamp's landing: media-probe.ts (commit 20d0a760e)
  // — the mp4/wav byte probe moved to its zero-dep contracts seat to
  // break the harness-tools↔estate-queue cycle — entered the gated
  // tree without a row. Verbatim copy of mp4Probe.ts, a 100-file on
  // both seats; the stamp wall's craftMinimalMp4 fixture exercises
  // probeMp4's tkhd-fallback arm from the estate-queue face)
  '**/packages/web-kit/contracts/src/media-probe.ts': { statements: 99.67, branches: 99.57, functions: 96.55, lines: 99.58 },
  '**/packages/web-kit/contracts/src/mediaKinds.ts': { statements: 95.24, branches: 88, functions: 91.67, lines: 97.14 },
  // (row re-pin 2026-11-06, coverage-gaps F1: the 2026-11-01 comment
  // was already stale — the planeRefusals wire arms at
  // comfyui-cordis models-service.spec.ts:158 measure this file at
  // 97.61/95.45/100/97.36; the floor-0 row left [0, 97.61) unguarded,
  // violating the table's own "a regression fails" property. Scoped
  // json-summary probe re-run this session: same numbers.)
  '**/packages/web-kit/contracts/src/planes.ts': { statements: 95.24, branches: 95.45, functions: 75, lines: 94.74 },
  '**/packages/web-kit/contracts/src/mediaRange.ts': { statements: 95, branches: 95, functions: 0, lines: 92.86 },
  '**/packages/web-kit/contracts/src/mediaTypes.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/modifierFaces.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/modifierSubcards.ts': { statements: 98, branches: 98.36, functions: 96.97, lines: 97.5 },
  '**/packages/web-kit/contracts/src/objectUrlCache.ts': { statements: 0, branches: 66.67, functions: 0, lines: 0 },
  '**/packages/web-kit/contracts/src/rootsManifest.ts': { statements: 90, branches: 80, functions: 75, lines: 85.71 },
  // batch AS 2026-10-17: schema.ts (python-era openapi output) deleted; its two
  // wireTypes successors are TYPE-ONLY modules (zero statements) at their owners
  '**/packages/web-kit/contracts/src/wireTypes.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/catalog/src/wireTypes.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/stagePreview.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/stageView.ts': { statements: 98.91, branches: 99.32, functions: 95.65, lines: 98.82 },
  '**/packages/web-kit/contracts/src/studio.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/contracts/src/timelineTypes.ts': { statements: 85.71, branches: 75, functions: 0, lines: 85.71 },
  '**/packages/web-kit/contracts/src/vocab.ts': { statements: 66.67, branches: 50, functions: 0, lines: 66.67 },
  '**/packages/web-kit/formats/src/b64.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/web-kit/formats/src/bodyPresets.ts': { statements: 87.5, branches: null, functions: 50, lines: 85.71 },
  '**/packages/web-kit/formats/src/captionSplitter.ts': { statements: 98.59, branches: 97.44, functions: 91.67, lines: 98.44 },
  '**/packages/web-kit/formats/src/cardMutations.ts': { statements: 94.74, branches: 93.75, functions: 85.71, lines: 94.74 },
  '**/packages/web-kit/formats/src/downloads.ts': { statements: 97.5, branches: 95.24, functions: 80, lines: 97.06 },
  '**/packages/web-kit/formats/src/extractVideoFrame.ts': { statements: 98.36, branches: 94.74, functions: 90, lines: 98.25 },
  '**/packages/web-kit/formats/src/glbLoad.ts': { statements: 95.65, branches: 85.71, functions: 80, lines: 95.45 },
  '**/packages/web-kit/formats/src/glbSkin.ts': { statements: 98.57, branches: 95, functions: 80, lines: 98.39 },
  '**/packages/web-kit/formats/src/handPose.ts': { statements: 97.62, branches: 90.91, functions: 75, lines: 97.37 },
  '**/packages/web-kit/formats/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/formats/src/keyframeExtract.ts': { statements: 97.96, branches: 96.55, functions: 80, lines: 97.67 },
  '**/packages/web-kit/formats/src/maskPrep.ts': { statements: 99.66, branches: 98.96, functions: 95.24, lines: 99.48 },
  '**/packages/web-kit/formats/src/motionConstraints.ts': { statements: 99.38, branches: 98.97, functions: 97.22, lines: 99.22 },
  '**/packages/web-kit/formats/src/motionEnvelope.ts': { statements: 97.06, branches: 96.67, functions: 80, lines: 96 },
  '**/packages/web-kit/formats/src/motionNpz.ts': { statements: 99.66, branches: 98.28, functions: 96.15, lines: 99.62 },
  '**/packages/web-kit/formats/src/npz.ts': { statements: 98.72, branches: 98.04, functions: 87.5, lines: 98.65 },
  '**/packages/web-kit/formats/src/openPoseCanvas.ts': { statements: 98.04, branches: 97.14, functions: 66.67, lines: 97.73 },
  '**/packages/web-kit/formats/src/pngMeta.ts': { statements: 99.25, branches: 97.78, functions: 92.31, lines: 99.04 },
  '**/packages/web-kit/formats/src/pngMetaInfo.ts': { statements: 98.82, branches: 93.75, functions: 85.71, lines: 98.57 },
  '**/packages/web-kit/formats/src/poseCodec.ts': { statements: 87.5, branches: null, functions: 0, lines: 85.71 },
  '**/packages/web-kit/formats/src/poseTransforms.ts': { statements: 98.88, branches: 96.55, functions: 90.91, lines: 98.78 },
  '**/packages/web-kit/formats/src/poserSkin.ts': { statements: 98.33, branches: 98.15, functions: 87.5, lines: 98.08 },
  '**/packages/web-kit/formats/src/promptTags.ts': { statements: 97.37, branches: 95.45, functions: 75, lines: 97.06 },
  '**/packages/web-kit/formats/src/psdExport.ts': { statements: 99.39, branches: 91.67, functions: 94.44, lines: 99.35 },
  '**/packages/web-kit/formats/src/readFile.ts': { statements: 85.71, branches: 50, functions: 75, lines: 80 },
  '**/packages/web-kit/formats/src/somaSkin.ts': { statements: 99.42, branches: 96.77, functions: 88.89, lines: 99.17 },
  '**/packages/web-kit/formats/src/textToPose.ts': { statements: 99.59, branches: 99.46, functions: 96.97, lines: 99.54 },
  '**/packages/web-kit/formats/src/uploadToEstate.ts': { statements: 95.24, branches: 94.74, functions: 80, lines: 95 },
  '**/packages/web-kit/timeline/src/playback/index.ts': { statements: null, branches: null, functions: null, lines: null },
  // (row re-pin 2026-11-06, coverage-gaps F2: its own R-E1 dom-lane
  // spec (useAudioPlayback.spec.tsx, in the lane since 2026-10-10)
  // exercises play/pause/seek/rAF — the measured face is
  // 43.7/12.06/58.33/47.61; the 2026-10-31 scoped-faces regen missed
  // it (the broken full-pool merge confessed in the header). Scoped
  // probe re-run this session: same numbers. The floor rides the
  // measured face; the sub-100 halves are honest debt, guarded.)
  '**/packages/web-kit/timeline/src/playback/useAudioPlayback.ts': { statements: 92.72, branches: 75.86, functions: 91.67, lines: 96.03 },
  '**/packages/web-kit/timeline/src/store/createStore.ts': { statements: 0, branches: null, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/store/index.ts': { statements: 0, branches: null, functions: null, lines: 0 },
  '**/packages/web-kit/timeline/src/store/segmentClipboard.ts': { statements: 90.91, branches: 50, functions: 80, lines: 90 },
  '**/packages/web-kit/timeline/src/store/timelineAudio.ts': { statements: 97.96, branches: 94.44, functions: 96.3, lines: 97.37 },
  '**/packages/web-kit/timeline/src/store/timelineBlobs.ts': { statements: 98.28, branches: 90, functions: 95.83, lines: 97.5 },
  '**/packages/web-kit/timeline/src/store/timelineHistory.ts': { statements: 94.74, branches: 83.33, functions: 83.33, lines: 93.75 },
  '**/packages/web-kit/timeline/src/store/timelineIds.ts': { statements: 90.91, branches: 75, functions: 66.67, lines: 90 },
  '**/packages/web-kit/timeline/src/store/timelinePersistence.ts': { statements: 98.92, branches: 98.46, functions: 92.86, lines: 98.78 },
  '**/packages/web-kit/timeline/src/store/timelineSegments.ts': { statements: 99.55, branches: 98.61, functions: 98.53, lines: 99.47 },
  '**/packages/web-kit/timeline/src/store/timelineStore.ts': { statements: 50, branches: null, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/store/timelineStoreTypes.ts': { statements: 66.67, branches: null, functions: null, lines: 66.67 },
  '**/packages/web-kit/timeline/src/store/timelineUi.ts': { statements: 99.12, branches: 98.21, functions: 98, lines: 98.89 },
  '**/packages/web-kit/timeline/src/store/timelineVariants.ts': { statements: 98.53, branches: 98.15, functions: 95.45, lines: 98.08 },
  '**/packages/web-kit/timeline/src/timeline/FilmPlayer.tsx': { statements: 98.18, branches: 96.15, functions: 85.71, lines: 97.87 },
  // §9 NEW ROW 100x4 (2026-11-12): the commission rail — its own spec
  // (packages/web-kit/timeline/test/commissionsRail.spec.tsx) covers
  // every branch (opt-in empty, bare label span, window segments).
  '**/packages/web-kit/timeline/src/timeline/CommissionsRail.tsx': { statements: 83.33, branches: 90, functions: 50, lines: 83.33 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBar.tsx': { statements: 90, branches: 94.44, functions: 50, lines: 90 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarChrome.tsx': { statements: 77.08, branches: 84.09, functions: 78.95, lines: 79.07 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarDrag.ts': { statements: 89.36, branches: 74.05, functions: 76.19, lines: 94.02 },
  '**/packages/web-kit/timeline/src/timeline/motionTimelineState.ts': { statements: 85.71, branches: 83.33, functions: 50, lines: 83.33 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarLanes.tsx': { statements: 69.17, branches: 76.4, functions: 64.29, lines: 73 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarLayout.ts': { statements: 61.54, branches: null, functions: 25, lines: 60.87 },
  '**/packages/web-kit/timeline/src/timeline/MotionTimelineBarScale.ts': { statements: 84.34, branches: 78.43, functions: 84.62, lines: 87.67 },
  // 2026-11-05 merge: the F1 viser zoom re-home created this file;
  // measured 0 across its own package's suite — the re-home moved
  // the zoom cluster to exported API surface with NO direct test
  // (vendored-provenance judges the copy's origin, not its
  // behavior). The 0-row is the honest debt: a behavior wall for
  // the scrollbar (drag/zoom math) is OWED (roadmap row).
  '**/packages/web-kit/timeline/src/timeline/TimelineScrollbar.tsx': { statements: 81.25, branches: 45, functions: 50, lines: 81.25 },
  '**/packages/web-kit/timeline/src/timeline/TimelineScrubBar.tsx': { statements: 90.91, branches: 91.18, functions: 85.71, lines: 96.3 },
  '**/packages/web-kit/timeline/src/timeline/icons.tsx': { statements: 85.71, branches: null, functions: 85.71, lines: 85.71 },
  '**/packages/web-kit/timeline/src/timeline/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/Timeline.tsx': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/TimelineConstants.ts': { statements: 50, branches: null, functions: null, lines: 50 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/constants.ts': { statements: 75, branches: null, functions: null, lines: 75 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/draw.ts': { statements: 99.38, branches: 96.92, functions: 85.71, lines: 99.38 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/interactions.ts': { statements: 92.86, branches: 91.67, functions: 0, lines: 92.86 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/messages.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/styles.ts': { statements: 93.33, branches: null, functions: null, lines: 93.33 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-auto-pan.ts': { statements: 0.48, branches: 0, functions: 0, lines: 0.5 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-geometry.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-interaction-state.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-mouse.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-overlays.tsx': { statements: 2.17, branches: 0, functions: 0, lines: 2.5 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-render-background.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-render-foreground.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-scales.ts': { statements: 18.42, branches: 0, functions: 0, lines: 18.42 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/timeline-viewport.ts': { statements: 0, branches: 0, functions: 0, lines: 0 },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/types.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web-kit/timeline/src/timeline/viser-timeline/viewerContext.ts': { statements: 33.33, branches: null, functions: 0, lines: 33.33 },
  '**/packages/web/card-base/src/atoms.tsx': { statements: 99.12, branches: 98.47, functions: 96.97, lines: 98.97 },
  '**/packages/web/card-base/src/axes.tsx': { statements: 97.39, branches: 97.58, functions: 97.56, lines: 98.91 },
  '**/packages/web/card-base/src/chrome.ts': { statements: 96.55, branches: 96.55, functions: 80, lines: 95.65 },
  '**/packages/web/card-base/src/client/index.ts': { statements: 85.71, branches: null, functions: 60, lines: 85.71 },
  '**/packages/web/card-base/src/estate-remote.ts': { statements: 97.44, branches: 97.78, functions: 90.91, lines: 97.3 },
  '**/packages/web/card-base/src/form.tsx': { statements: 99.23, branches: 99.19, functions: 97.56, lines: 99.07 },
  // windowSpec.ts (the window-parity seam, another hand's landing):
  // the remainder the landing hand owed — measured 0 today; the row
  // exists so the ratchet counts the gated file (never a silent
  // rowless pass).
  '**/packages/models/h3/src/windowSpec.ts': { statements: 92.86, branches: 25, functions: 83.33, lines: 91.67 },
  // LaneHead.tsx (the lane-parity (c) landing, 61d2eaf71): the shared
  // lane-head shell — same tracked-debt pin as its neighbors above;
  // the parity walls drive it; re-pin UP at the next full-pool
  // regeneration.
  '**/packages/web-kit/timeline/src/timeline/LaneHead.tsx': { statements: 50, branches: 75, functions: 0, lines: 50 },
  '**/packages/web/card-base/src/host.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/web/card-base/src/icons.tsx': { statements: 97.06, branches: null, functions: 97.06, lines: 97.06 },
  '**/packages/web/card-base/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web/card-base/src/layout.tsx': { statements: 90.91, branches: 97.06, functions: 85.71, lines: 90 },
  '**/packages/web/card-base/src/media-library.ts': { statements: 66.67, branches: 75, functions: 50, lines: 50 },
  '**/packages/web/card-base/src/mods.tsx': { statements: 99.13, branches: 97.12, functions: 97.94, lines: 99.18 },
  '**/packages/web/card-base/src/owners.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web/card-base/src/pick-store.ts': { statements: 94.44, branches: 75, functions: 75, lines: 94.12 },
  '**/packages/web/card-base/src/rejection-voice.ts': { statements: 0, branches: 50, functions: 0, lines: 0 },
  '**/packages/web/card-base/src/poser-figure.tsx': { statements: 99.2, branches: 98.94, functions: 95.65, lines: 99.07 },
  '**/packages/web/card-base/src/preview.tsx': { statements: 99.17, branches: 94.65, functions: 97.96, lines: 98.98 },
  '**/packages/web/card-base/src/report-view.tsx': { statements: 87.5, branches: 90, functions: 66.67, lines: 87.5 },
  '**/packages/web/card-base/src/rows.tsx': { statements: 97.37, branches: 99.07, functions: 90.91, lines: 97.06 },
  '**/packages/web/card-base/src/runs-policy.ts': { statements: 98.86, branches: 98.95, functions: 94.12, lines: 98.63 },
  '**/packages/web/card-base/src/shell.tsx': { statements: 95, branches: 88.89, functions: 90.91, lines: 92.86 },
  '**/packages/web/card-base/src/slots.ts': { statements: 83.33, branches: 50, functions: 75, lines: 80 },
  '**/packages/web/card-base/src/spec-panel.tsx': { statements: 96.3, branches: 96.15, functions: 90, lines: 95.24 },
  '**/packages/web/card-base/src/spec.ts': { statements: 98.53, branches: 96.52, functions: 99.07, lines: 99.84 },
  '**/packages/web/card-base/src/square-provider.tsx': { statements: 99.34, branches: 98.97, functions: 97.37, lines: 98.97 },
  '**/packages/web/card-base/src/square.tsx': { statements: 97.59, branches: 98.66, functions: 89.47, lines: 96.97 },
  '**/packages/web/card-base/src/studio.tsx': { statements: 91.67, branches: 94.2, functions: 88.46, lines: 89.74 },
  '**/packages/web/card-base/src/studioRail.tsx': { statements: 90.91, branches: 87.5, functions: 50, lines: 87.5 },
  '**/packages/web/card-base/src/toast.tsx': { statements: 93.75, branches: 83.33, functions: 85.71, lines: 92.86 },
  '**/packages/web/card-base/src/toastStore.ts': { statements: 97.5, branches: 91.67, functions: 94.74, lines: 97.06 },
  '**/packages/web/card-base/src/use-form-spec.ts': { statements: 94.12, branches: 87.5, functions: 80, lines: 92.86 },
  '**/packages/web/card-base/src/use-resolved.ts': { statements: 95.24, branches: 94.12, functions: 83.33, lines: 94.74 },
  '**/packages/web/card-base/src/viewportChrome.tsx': { statements: 83.33, branches: 66.67, functions: 66.67, lines: 80 },
  '**/packages/web/card-base/src/write-through.ts': { statements: 96.97, branches: 83.33, functions: 85.71, lines: 96 },
  '**/packages/web/card-base/src/wire.ts': { statements: 98.65, branches: 98.91, functions: 92.31, lines: 98.46 },
  '**/packages/web/card-base/src/wirePicker.tsx': { statements: 90, branches: 96.88, functions: 80, lines: 90 },
  '**/packages/web/infer-gallery/src/client/artifact-address.ts': { statements: 95.45, branches: 75, functions: 75, lines: 94.12 },
  '**/packages/web/infer-gallery/src/client/artifact-ops.ts': { statements: 97.22, branches: 92.31, functions: 87.5, lines: 97.06 },
  '**/packages/web/infer-gallery/src/client/bench-load.ts': { statements: 97.33, branches: 90.45, functions: 96.15, lines: 99.36 },
  '**/packages/web/infer-gallery/src/client/decode.ts': { statements: 96.43, branches: 95.45, functions: 66.67, lines: 95.65 },
  '**/packages/web/infer-gallery/src/client/index.ts': { statements: 96.15, branches: 50, functions: 90, lines: 95.45 },
  '**/packages/web/infer-gallery/src/client/media-kinds.ts': { statements: 87.5, branches: null, functions: 0, lines: 87.5 },
  '**/packages/web/infer-gallery/src/client/mesh-tile.tsx': { statements: 94.12, branches: 87.5, functions: 85.71, lines: 90.91 },
  '**/packages/web/infer-gallery/src/client/mesh-view.tsx': { statements: 94.51, branches: 92.45, functions: 83.33, lines: 95.29 },
  '**/packages/web/infer-gallery/src/client/ui.tokens.ts': { statements: 96.55, branches: null, functions: null, lines: 96.55 },
  '**/packages/web/infer-gallery/src/client/ui.tsx': { statements: 93.33, branches: 75, functions: 88.89, lines: 92.86 },
  '**/packages/web/infer-gallery/src/client/useFeed.ts': { statements: 96.47, branches: 90.63, functions: 94.44, lines: 97.22 },
  '**/packages/web/infer-gallery/src/client/waitState.ts': { statements: 97.67, branches: 93.94, functions: 88.89, lines: 97.14 },
  '**/packages/web/infer-gallery/src/drilldown.tsx': { statements: 98.52, branches: 97.09, functions: 94.74, lines: 98.06 },
  '**/packages/web/melite-card-deck/src/client/index.ts': { statements: 80, branches: null, functions: 0, lines: 80 },
  '**/packages/web/melite-card-deck/src/client/lora-section.tsx': { statements: 90.32, branches: 86.57, functions: 85.29, lines: 92.77 },
  '**/packages/web/melite-card-deck/src/index.ts': { statements: 90, branches: 75, functions: 66.67, lines: 88.89 },
  '**/packages/web/melite-card-view/src/client/add-card-door.tsx': { statements: 98.46, branches: 97.56, functions: 94.74, lines: 98.11 },
  '**/packages/web/melite-card-view/src/client/add-stage.ts': { statements: 96.97, branches: 87.5, functions: 90.91, lines: 96.55 },
  // the Q1 auto-mode decoration (2026-10-20): row pinned at the scoped
  // measured face of its own suite (auto-mode-menu.spec.ts) — the
  // refusal/unmaterialized throw arms are the uncovered residue
  '**/packages/web/melite-card-view/src/client/auto-mode-decoration.ts': { statements: 76.92, branches: 71.43, functions: 62.5, lines: 81.82 },
  '**/packages/web/melite-card-view/src/client/bench-row.ts': { statements: 98.28, branches: 99.21, functions: 90, lines: 97.96 },
  '**/packages/web/melite-card-view/src/client/bench-view.tsx': { statements: 97.67, branches: 95.14, functions: 98.59, lines: 99.5 },
  '**/packages/web/melite-card-view/src/client/card-drill.tsx': { statements: 92.59, branches: 92.31, functions: 81.82, lines: 91.67 },
  '**/packages/web/melite-card-view/src/client/card-labels.ts': { statements: 92.86, branches: 83.33, functions: 85.71, lines: 88.89 },
  '**/packages/web/melite-card-view/src/client/card-mentions.ts': { statements: 98.18, branches: 96.15, functions: 90, lines: 97.56 },
  '**/packages/web/melite-card-view/src/client/card-tools.ts': { statements: 50, branches: null, functions: null, lines: 50 },
  // the q3 frozen in-chat previews (2026-10-20): row pinned at the
  // scoped measured face of its own suites (chat-preview.spec.ts +
  // flow-cards-chat-preview.spec.tsx)
  '**/packages/web/melite-card-view/src/client/chat-preview.ts': { statements: 84.62, branches: 76.92, functions: 50, lines: 90.91 },
  '**/packages/web/melite-card-view/src/client/cards-resource.ts': { statements: 98.16, branches: 96.93, functions: 92.93, lines: 98.65 },
  '**/packages/web/melite-card-view/src/client/cards-tab-body.tsx': { statements: 98.02, branches: 96.13, functions: 96.3, lines: 98.8 },
  '**/packages/web/melite-card-view/src/client/construct-card.tsx': { statements: 97.67, branches: 97.01, functions: 87.5, lines: 97.37 },
  '**/packages/web/melite-card-view/src/client/dnd-payloads.ts': { statements: 0, branches: null, functions: null, lines: 0 },
  '**/packages/web/melite-card-view/src/client/draft-run-views.tsx': { statements: 97.37, branches: 98.21, functions: 88.89, lines: 97.3 },
  '**/packages/web/melite-card-view/src/client/filmSeam.tsx': { statements: 97.14, branches: 90.91, functions: 95.45, lines: 96 },
  '**/packages/web/melite-card-view/src/client/forms-edge-meta.ts': { statements: 90, branches: null, functions: 75, lines: 88.89 },
  '**/packages/web/melite-card-view/src/client/index.ts': { statements: 98.02, branches: 83.33, functions: 96.3, lines: 97.65 },
  // burn e (2026-10-26): the enhance picker's pure filter — measured at the
  // scoped face of its own suite (tests/llm-picker.spec.ts)
  '**/packages/web/melite-card-view/src/client/llm-picker.ts': { statements: 80, branches: 50, functions: 50, lines: 66.67 },
  // audit 016 C5 + 018 C4 (2026-10-27): the strike's pure judges — measured at lane-strike-carryover.spec.tsx's 8 arms
  '**/packages/web/melite-card-view/src/client/lane-strike.ts': { statements: 95.45, branches: 95.24, functions: 50, lines: 94.74 },
  '**/packages/web/melite-card-view/src/client/preview-kinds.ts': { statements: 98.31, branches: 98.96, functions: 87.5, lines: 97.96 },
  '**/packages/web/melite-card-view/src/client/rejection-voice.ts': { statements: 85.71, branches: 83.33, functions: 50, lines: 80 },
  '**/packages/web/melite-card-view/src/client/run-rescue-core.ts': { statements: 96.99, branches: 95.1, functions: 91.67, lines: 99.29 },
  '**/packages/web/melite-card-view/src/client/run-rescue.tsx': { statements: 98.25, branches: 94.91, functions: 95.45, lines: 99.04 },
  '**/packages/web/melite-card-view/src/client/sortable-tile.tsx': { statements: 94.74, branches: 96.26, functions: 92.86, lines: 98.28 },
  // 2026-11-06 follow-up regen: the disposition (af120dcb9) deleted the
  // null guard and cited the two defense arms; the file measures 100x4.
  '**/packages/web/melite-card-view/src/client/stage-drill.tsx': { statements: 99.34, branches: 98.43, functions: 98.39, lines: 99.59 },
  '**/packages/web/melite-card-view/src/client/stage-run.ts': { statements: 98.96, branches: 98.98, functions: 80, lines: 98.8 },
  '**/packages/web/melite-card-view/src/client/types.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web/melite-card-view/src/client/zoomPromotion.ts': { statements: 99.47, branches: 98.92, functions: 95.24, lines: 99.35 },
  '**/packages/web/melite-card-view/src/index.ts': { statements: 66.67, branches: null, functions: 0, lines: 66.67 },
  '**/packages/web/melite-estate/src/bundle-gate.ts': { statements: 97.83, branches: 94.44, functions: 87.5, lines: 97.5 },
  '**/packages/web/melite-estate/src/index.ts': { statements: 97.66, branches: 88.75, functions: 96, lines: 97.37 },
  '**/packages/web/melite-estate/src/provisioning.ts': { statements: 99.11, branches: 95.51, functions: 98.18, lines: 98.93 },
  '**/packages/web/melite-run-wire/src/index.ts': { statements: 99.21, branches: 99.24, functions: 94.74, lines: 99.03 },
  // the three graph row (the one-row law for 3D): both faces measured
  // 100x4 under their host-face contract spec.
  '**/packages/web/three-client/src/client/index.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/web/three-client/src/host.ts': { statements: 50, branches: null, functions: 0, lines: 50 },
  '**/packages/web/viewer-base/src/index.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web/viewer-base/src/owners.ts': { statements: null, branches: null, functions: null, lines: null },
  '**/packages/web/viewer-base/src/runCard.tsx': { statements: 97.78, branches: 98.39, functions: 90.91, lines: 97.56 },
  '**/packages/web/viewer-base/src/slots.ts': { statements: 0, branches: null, functions: null, lines: 0 },
  '**/packages/web/viewer-base/src/wire.ts': { statements: 75, branches: null, functions: 50, lines: 75 },
  '**/packages/web/viewer/src/client/index.ts': { statements: 97.92, branches: 95, functions: 87.5, lines: 97.44 },
  '**/packages/web/viewer/src/index.ts': { statements: 96.97, branches: 91.67, functions: 87.5, lines: 96.3 },
}
