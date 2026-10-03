// paramRows.ts — THE SHARED ACTION PARAM SURFACES (the atom
// vocabulary's declared-plane half: dev_docs/design/atom-vocabulary-
// 2026-10-12.md's "declare once, compose everywhere", applied to
// the write plane).
//
// The grammar (ParamSpec) is engine-agnostic and lives at
// packages/engines/contract/src/vocabulary.ts; the CONTENT is the
// engine's, so the shared surfaces live here beside the generated
// vocabularies they cite (./vocab.ts). Before this module the
// diffusion surface was re-typed by hand in six actions across six
// families — four text-to-image blocks byte-identical, two edit
// blocks byte-identical — so a bounds change was a six-file edit
// with no wall to catch a miss. One factory, one home.
//
// BOUNDS ARE PARAMETERS, NOT CONSTANTS: the edit families
// legitimately declare a tighter envelope (steps [1,50], cfg
// [0.1,10]) than text-to-image ([1,100] / [1,20]), and the edit
// families declare width/height UNBOUNDED (the served door judges
// them, the engine takes the engine's own). A family passes what
// differs and inherits the rest; it never re-types a row.

import type { ParamSpec } from "@melite/engine-contract/vocabulary";
import { SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "./vocab.ts";

/** The bounds a family may narrow on the shared diffusion surface. */
export interface DiffusionParamBounds {
  /** The KSampler steps envelope. Default: [1, 100]. */
  readonly steps?: readonly [number, number];
  /** The KSampler cfg envelope. Default: [1, 20]. */
  readonly cfg?: readonly [number, number];
  /** The width/height envelope; `null` declares the rows UNBOUNDED. Default: [256, 2048]. */
  readonly size?: readonly [number, number] | null;
}

/**
 * The nine-row diffusion param surface, in served order: the prompt
 * pair, the size pair, the managed seed, the sampler knobs.
 * @param bounds the family's narrowing; omitted keys take the defaults above
 * @returns the declared rows, fresh objects per call (a family may spread them into its own surface)
 */
export function diffusionParamRows(bounds: DiffusionParamBounds = {}): readonly ParamSpec[] {
  const steps: readonly [number, number] = bounds.steps ?? [1, 100];
  const cfg: readonly [number, number] = bounds.cfg ?? [1, 20];
  const size: readonly [number, number] | null = bounds.size === undefined ? [256, 2048] : bounds.size;
  const sized = (name: string): ParamSpec => (size === null
    ? { name, type: "number" }
    : { name, type: "number", bounds: size });
  return [
    { name: "prompt", type: "string" },
    { name: "negative_prompt", type: "string" },
    sized("width"),
    sized("height"),
    { name: "seed", type: "number", rule: "seed-sentinel" },
    { name: "steps", type: "number", bounds: steps },
    { name: "cfg", type: "number", bounds: cfg },
    { name: "sampler", type: "enum", options: SAMPLER_OPTIONS },
    { name: "scheduler", type: "enum", options: SCHEDULER_OPTIONS },
  ];
}

/** The narrowing the two image-edit families declare (steps [1,50], cfg [0.1,10], size unbounded). */
export const EDIT_DIFFUSION_BOUNDS: DiffusionParamBounds = {
  steps: [1, 50],
  cfg: [0.1, 10],
  size: null,
}
