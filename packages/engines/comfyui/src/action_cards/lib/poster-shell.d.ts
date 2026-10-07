export interface PosterStoreLike {
    getState: () => {
        images: Record<string, string>;
        setImage: (key: string, dataUrl: string) => void;
    };
}
export declare function usePosterDataUrl(url: string, store: PosterStoreLike, render: (isCancelled: () => boolean) => Promise<string | null>): {
    src: string | null;
    error: boolean;
};
interface PosterShellProps {
    src: string | null;
    error: boolean;
    className?: string;
    loadingLabel: string;
    alt: string;
}
export declare function PosterShell({ src, error, className, loadingLabel, alt }: PosterShellProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=poster-shell.d.ts.map
