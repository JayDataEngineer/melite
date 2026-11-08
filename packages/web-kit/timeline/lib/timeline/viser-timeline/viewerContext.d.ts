interface GuiState {
    theme: {
        dark_mode: boolean;
    };
}
interface ViewerLike {
    useGui: <T>(selector: (state: GuiState) => T) => T;
}
export declare const ViewerContext: import("react").Context<ViewerLike | null>;
export {};
//# sourceMappingURL=viewerContext.d.ts.map