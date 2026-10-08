import type { CardDefinition } from './service.ts';
/** The refusal type — a distinct name so the door reads loud. */
export declare class EnvelopeLawRefusal extends Error {
    constructor(message: string);
}
/** THE REGISTRATION GATE — registerCard calls this after the flow
 *  contract assert. Walks the card's serialized schema per boarded
 *  family plus every mod pack's envelope; any law below refuses
 *  the registration. */
export declare function assertEnvelopeLaws(def: CardDefinition): void;
/** THE PACK GATE — registerPack calls this beside validateFields:
 *  a mod pack's envelope obeys the same laws as a card's (the
 *  absorbed fields render through the same faces). */
export declare function assertPackEnvelopeLaws(pack: string, fields: {
    toJSON?: () => unknown;
}): void;
//# sourceMappingURL=envelope-laws.d.ts.map
