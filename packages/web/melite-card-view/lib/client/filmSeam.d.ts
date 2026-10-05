import { createElement as h } from 'react';
import type { FilmPlayerHandle } from '@melite-plugin/timeline/ui/timeline';
/** the observable bridge — player writes, bar reads */
export interface FilmSeam {
    handle: FilmPlayerHandle | null;
    current: number;
    duration: number;
    playing: boolean;
    fps: number;
    subscribe(fn: () => void): () => void;
    /** the player face wires itself here (the ref callback) */
    bind(handle: FilmPlayerHandle | null): void;
    report(partial: Partial<Pick<FilmSeam, 'current' | 'duration' | 'playing' | 'fps'>>): void;
}
export declare function createFilmSeam(fps?: number): FilmSeam;
/** THE PREVIEW SLOT FACE — the shared player, wired to the seam.
 * Carries the FIT LAW (one law per estate — .hero's own): the
 * shared player renders a bare <video>; without the class a
 * 1344px film overflows a narrow pane sideways (the operator's
 * tall-screen catch, 2026-09-23). */
export declare function FilmSeamPlayer(props: {
    seam: FilmSeam;
    src: string;
    'data-testid'?: string;
}): ReturnType<typeof h>;
/** THE BOTTOM SLOT FACE — the shared scrub bar, reading the seam */
export declare function FilmSeamBar(props: {
    seam: FilmSeam;
    'data-testid'?: string;
}): ReturnType<typeof h>;
//# sourceMappingURL=filmSeam.d.ts.map
