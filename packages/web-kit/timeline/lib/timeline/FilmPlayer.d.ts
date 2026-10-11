export interface FilmPlayerHandle {
    seekTo: (sec: number) => void;
    current: () => number;
    duration: () => number;
    play: () => void;
    pause: () => void;
    toggle: () => void;
}
export interface FilmPlayerProps {
    src: string;
    onTime?: (sec: number) => void;
    onDuration?: (sec: number) => void;
    onPlayingChange?: (playing: boolean) => void;
    onEnded?: () => void;
    muted?: boolean;
    loop?: boolean;
    autoPlay?: boolean;
    poster?: string;
    className?: string;
    "data-testid"?: string;
}
export declare const FilmPlayer: import("react").ForwardRefExoticComponent<FilmPlayerProps & import("react").RefAttributes<FilmPlayerHandle>>;
//# sourceMappingURL=FilmPlayer.d.ts.map