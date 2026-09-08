/**
 * shellDeclaration — the typed seam tables (row 5 stroke 4,
 * 2026-09-07; design record docs/design/studio-shell.md §3).
 *
 * THE PYDANTIC MIRROR, TS-side: python refuses bad shapes at
 * CONSTRUCTION (frozen rows, closed enums); the editor refuses bad
 * shapes at COMPILE. A tenant stops hand-writing JSX bones and
 * DECLARES its shell ride as DATA — the AssemblySlot pattern
 * generalized to the whole body:
 *
 *   export const shellDeclaration = defineShellDeclaration({
 *     center: { kind: "stage3d" },   // ViewportKind (closed union)
 *     bottom: { kind: "recipe" },    // BarKind (closed), optional
 *     rail:   { slots: ["input_image"] },
 *   })
 *
 * TEETH: `kind` outside the closed union is a BUILD ERROR — the TS
 * twin of a pydantic closed-enum refusal. Bogus slot keys,
 * missing required seam members, wrong-typed rows: compile-time.
 * The declaration is DATA (rows), not code — two cards that differ
 * only in values are two tables, not two components (rung-7).
 *
 * MEMBERS NAME REAL PRIMITIVES ONLY (no speculative kinds): each
 * union member maps to a viewport/bar primitive that EXISTS in the
 * tree today. A new member arrives WITH the primitive that earns
 * it, in the same stroke — the wall parses these unions and
 * refuses tenant kinds outside them.
 *
 * GENRE-BLIND: the kinds name PRIMITIVES (stage3d, paint2d), never
 * genres — the shell wall's shell-is-genre-blind pin covers this
 * module too (same import discipline as studioShell.tsx).
 */

/* The seam vocabularies are WRITTEN ONCE in python/ui_map.py (the map
 * SSOT); this module re-exports their generated TypeScript face.
 * Do not hand-spell a union here — the written-once wall refuses
 * it (tests/walls/suites/test_ui_map_parity.py). */
import type { BarKind, ViewportKind } from "./uiMap.generated"

export type { BarKind, ViewportKind }

/** One declared seam row. `kind` is the closed-vocabulary member;
 *  seam-specific data rides beside it as rows grow. */
export interface CenterSeam {
  kind: ViewportKind
}

export interface BottomSeam {
  kind: BarKind
}

/** The RAIL seam row: the slot keys the tenant's card declares
 *  (the vocabulary SlotGrid renders squares from — the same keys
 *  the studio-slots wall cross-checks against the card schema). */
export interface RailSeam {
  slots: readonly string[]
}

/** A tenant's whole shell ride, as data. `center` is REQUIRED (a
 *  studio without a center is not a studio); `bottom` optional. */
export interface ShellDeclaration {
  center: CenterSeam
  bottom?: BottomSeam
  rail: RailSeam
}

/** The construction door (the pydantic-at-construction mirror):
 *  one obvious way to build a declaration, typed at the call site.
 *  Runtime-frozen — a tenant may not mutate another's table. */
export function defineShellDeclaration(
  declaration: ShellDeclaration,
): Readonly<ShellDeclaration> {
  return Object.freeze(declaration)
}
