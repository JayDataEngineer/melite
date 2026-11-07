/**
 * owners.ts — the seam owner contracts (what a claim receives). Pure
 * types; the slots module imports them for its SlotMap entries, the
 * built-in atoms implement them.
 */
import type { SpecField, SpecValues } from './spec.ts';
/** The field-atom seam's owner share: the emitted field, its held
 *  value, the edit callback, and (slot-shaped fields only) the
 *  square host the host surface provided. */
export interface FieldOwnerProps {
    /** The emitted field row (type drives the dispatch key). */
    field: SpecField;
    value: unknown;
    onEdit(name: string, v: unknown): void;
    square?: {
        verbs: unknown;
        display?: string | null;
    };
}
/** The whole-form seam's owner share: the emitted spec document, the
 *  held values, the edit callback, and the square provider. */
export interface FormOwnerProps {
    cardId: string;
    spec: {
        fields: SpecField[];
    };
    values: SpecValues;
    onEdit(name: string, v: unknown): void;
}
//# sourceMappingURL=owners.d.ts.map