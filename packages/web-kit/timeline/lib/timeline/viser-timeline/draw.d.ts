import type { TimelineTheme } from "./styles.ts";
import type { TimelineInterval } from './messages.ts';
import type { TimelineCoordinates, TimelineKeyframe, TimelineTrack } from "./types.ts";
export declare function drawHighlightFrameBox(ctx: CanvasRenderingContext2D, x: number, frame: number, boxY: number, boxWidth: number, boxHeight: number, boxRadius: number): void;
export declare function drawInterval(ctx: CanvasRenderingContext2D, interval: TimelineInterval, coords: TimelineCoordinates, trackY: number, trackHeight: number, trackColor: [number, number, number], theme: TimelineTheme, width?: number, roundLeft?: boolean, roundRight?: boolean, drawFill?: boolean, drawBorder?: boolean): void;
export declare function drawKeyframe(ctx: CanvasRenderingContext2D, keyframe: TimelineKeyframe, coords: TimelineCoordinates, trackY: number, trackHeight: number, trackColor: [number, number, number], theme: TimelineTheme, width: number): void;
export declare function drawFrameLabels(ctx: CanvasRenderingContext2D, coords: TimelineCoordinates, width: number, height: number, drawTicks: boolean | undefined, theme: TimelineTheme): void;
export declare function drawEndFrameLine(ctx: CanvasRenderingContext2D, coords: TimelineCoordinates, zoomLevel: number, width: number, height: number, theme: TimelineTheme): void;
export declare function drawLabelOverlay(ctx: CanvasRenderingContext2D, _coords: TimelineCoordinates, tracks: TimelineTrack[], hasPrompts: boolean, _width: number, height: number, theme: TimelineTheme): void;
//# sourceMappingURL=draw.d.ts.map