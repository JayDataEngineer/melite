/**
 * defineShellDeclaration — studio-local copy of the former kit shell
 * seam (that kit import is dead). Same declaration shape; the
 * declaration is data, runtime-frozen.
 */

export interface CenterSeam {
  kind: string
}

export interface BottomSeam {
  kind: string
}

export interface RailSeam {
  slots: readonly string[]
}

export interface ShellDeclaration {
  center: CenterSeam
  bottom?: BottomSeam
  rail: RailSeam
}

/** The construction door: one obvious way to build a declaration,
 *  typed at the call site. Runtime-frozen. */
export function defineShellDeclaration(
  declaration: ShellDeclaration,
): Readonly<ShellDeclaration> {
  return Object.freeze(declaration)
}
