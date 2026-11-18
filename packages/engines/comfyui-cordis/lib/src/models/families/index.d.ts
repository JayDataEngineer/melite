import type { Plugin } from "@deepseek-ai/cordis";
/** One frozen row: the package specifier beside the family id its
 *  DECL must carry. The pairing cannot drift — loadFamilies refuses
 *  a loaded DECL whose id differs from the row. */
export interface FamilyRow {
    readonly pkg: string;
    readonly id: string;
}
/** A family package that failed to load and retired alone. The id
 *  stays threaded forward: validate.ts treats a boarded id in the
 *  dead roster as LAWFUL ABSENCE (the card serves; compose refuses
 *  by name), so the plugin law survives the boot. */
export interface DeadFamily {
    readonly pkg: string;
    readonly id: string;
    readonly error: string;
}
/** The load result: the survivors and the retired. */
export interface FamilyLoad {
    readonly families: readonly Plugin[];
    readonly dead: readonly DeadFamily[];
}
/** The frozen roster, one row per family package. Exported for
 *  the census test: the roster is judged against packages/models
 *  without mounting a single plugin (loading is loadFamilies). */
export declare const FAMILY_ROWS: readonly FamilyRow[];
/** The package specifiers in load order (derived; the rows are the
 *  source of truth). Kept for the census wall and any roster reader
 *  that only needs the pkg column. */
export declare const FAMILY_PKGS: readonly string[];
/** Load every family plugin, in table order. A package that fails
 *  to load retires ALONE into the dead roster (the plugin law); a
 *  loaded DECL whose id differs from its row REFUSES the whole load
 *  (that is authoring drift, never runtime absence); zero
 *  survivors refuses (total outage — the estate install is
 *  broken, the receipt's own law). */
export declare function loadFamilies(): Promise<FamilyLoad>;
