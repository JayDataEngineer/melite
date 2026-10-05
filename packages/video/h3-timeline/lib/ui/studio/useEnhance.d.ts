/** Per-prompt H3-style enhancement (tenant §7). Verbatim lines 2044–2086. */
export declare function useEnhance(): {
    enhancing: Record<string, boolean>;
    enhanceErr: Record<string, string | null>;
    enhanceUndo: Record<string, string>;
    enhanceOne: (key: string, text: string, apply: (t: string) => void) => Promise<void>;
    undoEnhance: (key: string, apply: (t: string) => void) => void;
};
//# sourceMappingURL=useEnhance.d.ts.map
