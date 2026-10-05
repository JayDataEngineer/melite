export interface TimelineScrubBarProps {
    /** the playhead's clock (seconds) */
    current: number;
    /** the film's length (seconds); <= 0 renders the bar inert */
    duration: number;
    /** seek to a second (owner → player handle) */
    onSeek: (sec: number) => void;
    /** optional transport toggle (owner → player handle) */
    onTogglePlay?: () => void;
    /** playing state for the toggle's glyph */
    playing?: boolean;
    /** frames-per-second for the readout's frame column (omit = time only) */
    fps?: number;
    /** testid hook */
    "data-testid"?: string;
}
export declare function TimelineScrubBar({ current, duration, onSeek, onTogglePlay, playing, fps, "data-testid": tid, }: TimelineScrubBarProps): import("react").JSX.Element;
