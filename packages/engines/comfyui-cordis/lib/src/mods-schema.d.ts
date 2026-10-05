import type { DeclaredModifierKind } from "./service.js";
/** The gate registerCard calls for def.mods: strict schema resolve
 *  (drift refuses) + the type-truth predicates. */
export declare function validateDeclaredMods(cardId: string, mods: readonly DeclaredModifierKind[] | undefined): void;
