// shellDeclaration — local native port of the shared kit/shellDeclaration.
//
// The tenant's shell ride as DATA (the pydantic-at-construction
// mirror): closed viewport/bar kind unions, runtime-frozen. Member
// names match the ui-map vocabulary (paint2d = PaintCanvas2D,
// recipe = OutputStrip).
export type ViewportKind = "stage3d" | "paint2d" | "native"
export type BarKind = "recipe" | "timeline"

/** One declared seam row. `kind` is the closed-vocabulary member;
 * seam-specific data rides beside it as rows grow. */
export interface CenterSeam {
  kind: ViewportKind
}

export interface BottomSeam {
  kind: BarKind
}

/** The RAIL seam row: the slot keys the tenant's card declares. */
export interface RailSeam {
  slots: readonly string[]
}

/** A tenant's whole shell ride, as data. `center` is REQUIRED (a
 * studio without a center is not a studio); `bottom` optional. */
export interface ShellDeclaration {
  center: CenterSeam
  bottom?: BottomSeam
  rail: RailSeam
}

/** The construction door: one obvious way to build a declaration,
 * typed at the call site. Runtime-frozen. */
export function defineShellDeclaration(
  declaration: ShellDeclaration,
): Readonly<ShellDeclaration> {
  return Object.freeze(declaration)
}
