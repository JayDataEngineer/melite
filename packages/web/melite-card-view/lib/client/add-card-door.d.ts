/** add-card-door.tsx — THE PLAIN DOOR: the picker whose pick IS the
 * add (extracted from CardsTab.tsx hour 15). */
import { createElement as h } from 'react';
import type { CardsBenchValue, BenchStageView } from './cards-resource.js';
/** THE ADD-CARD DOOR (the old system's power, DSH-native): the trailing
 *  + tile → the picker (the catalog's action cards, search + genre
 *  groups) → the card's DECLARED form (defaults seeded) → bench/add-stage
 *  as the user (CAS-chained). ONE surface: action cards; models are not
 *  entries (the model select lives ON the card's form). */
export declare function AddCardDoor({ bench, sessionKey, onAdded, onClose, onAddedRow }: {
    sessionKey: string;
    bench: CardsBenchValue;
    onAdded: () => void;
    /** The add's fresh row, when the bench diff found it — the parent
     *  opens the card's drilldown right after the add (the old tree's
     *  law, InlinePipelineCards.handlePick: "Auto-open the new card —
     *  the user types the prompt immediately, in the zoom drilldown,
     *  not a mystery tile"). */
    onAddedRow?: (row: BenchStageView) => void;
    onClose: () => void;
}): ReturnType<typeof h>;
//# sourceMappingURL=add-card-door.d.ts.map
