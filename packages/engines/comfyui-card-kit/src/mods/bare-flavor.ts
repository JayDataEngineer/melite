// @melite/comfyui-card-kit/src/mods/bare-flavor.ts — THE BARE
// FLAVOR PRIMITIVE (the shared mod component): a pack boarding
// whose fields ride the pack contract unchanged is one component
// parameterized by pack + families — never a hand-copied flavor
// file per family. The per-family mods/mask.ts (and its siblings)
// re-export this plugin's two members; cardDefs composes the
// module. A face that later diverges from the pack contract (the
// edit card's region fields vs the gen card's, say) lands as pack
// contract work, not as a second copy of this file.
import type { Context } from '../card-definition.ts'

export interface BareFlavorPlugin {
  inject: readonly string[]
  apply: (ctx: Context) => () => void
}

/**
 * Mint the bare-flavor cordis plugin for one pack scoped to the
 * given families (the registration the flavor-interlock wall
 * reads: a DECL mods entry with no flavor scoping the family
 * refuses at boot).
 *
 * @param pack - the mod pack id (the pack contract owns the fields).
 * @param families - the family ids the boarding scopes.
 * @returns the plugin module members (`inject`, `apply`) a family
 *   flavor file re-exports.
 */
export function bareFlavor(pack: string, families: readonly string[]): BareFlavorPlugin {
  return {
    inject: ['comfyui'],
    apply: (ctx: Context) =>
      ctx.effect(() => ctx.comfyui.registerFlavor({ pack, families: [...families] })),
  }
}
