import type { DocCall } from "./docModel.js";
/** One call's prompt editor: ONE textarea + ✨ H3 style. */
export declare function CallCardPrompt({ c, i, handlePromptUpdate, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, }: {
    c: DocCall;
    i: number;
    handlePromptUpdate: (id: string, text: string) => void;
    enhanceOne: (key: string, text: string, apply: (t: string) => void) => void;
    undoEnhance: (key: string, apply: (t: string) => void) => void;
    enhancing: Record<string, boolean>;
    enhanceErr: Record<string, string | null>;
    enhanceUndo: Record<string, string>;
}): import("react").JSX.Element;
//# sourceMappingURL=CallCardPrompt.d.ts.map
