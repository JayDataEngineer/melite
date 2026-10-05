import type { CardDefinition } from "./service.js";
/** The registerCard envelope gate: strict resolve, then the
 * drift test (a carried key the resolve stripped is a key the
 * interface never declared — it refuses, named). A shape miss
 * (a string leaf carrying a number) refuses in the same breath. */
export declare function validateCardDefinition(def: CardDefinition): void;
