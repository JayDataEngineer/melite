import type { Context } from '../card-definition.js';
export interface BareFlavorPlugin {
    inject: readonly string[];
    apply: (ctx: Context) => () => void;
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
export declare function bareFlavor(pack: string, families: readonly string[]): BareFlavorPlugin;
//# sourceMappingURL=bare-flavor.d.ts.map
