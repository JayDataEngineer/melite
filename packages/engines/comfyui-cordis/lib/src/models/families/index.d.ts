import type { Plugin } from "@deepseek-ai/cordis";
/** The frozen load order, one row per family package. Exported for
 *  the census test: the roster is judged against packages/models
 *  without mounting a single plugin (loading is loadFamilies). */
export declare const FAMILY_PKGS: readonly string[];
/** Load every family plugin, in table order. */
export declare function loadFamilies(): Promise<Plugin[]>;
