/**
 * stage3d — the SHARED raw-three stage core (the substrate law).
 *
 * One imperative mount that every 3D viewport in the card plane builds
 * on: renderer + camera + OrbitControls + the rAF loop + resize
 * observation + pointer picking + full disposal. Pure TypeScript over
 * three and three/addons — NO @react-three anywhere (the r3f
 * react-reconciler version-skew boot crash is why this exists).
 *
 * Consumers own their SCENE CONTENT (lights, floor, figures) and their
 * FRAME LOGIC via addTick (ordered registry — ticks run in registration
 * order before each render, the raw analogue of useFrame declared top
 * to bottom in a JSX tree).
 *
 * Pointer semantics (the r3f onClick/onPointerOver/onPointerOut
 * analogue): an object becomes interactive by carrying
 * `userData.pick = { click?, over?, out? }` on itself or an ancestor.
 * The stage raycasts on pointermove and click, walks parentward from
 * the hit to the first pick carrier, and calls the handlers with the
 * world intersection point + the DOM event. A drag-orbit never reads
 * as a click (the 350ms threshold). Gizmo subtrees (TransformControls)
 * are excluded from picking — r3f did this implicitly.
 */
import * as THREE from "@melite/three-client/client";
import { OrbitControls } from "@melite/three-client/client";
/** THE 3D STAGE COLOUR (the one owner). The void every raw-three
 *  viewport clears behind its scene, and the light counterpart the
 *  pose stage flips to. Every renderer/background that paints this
 *  stage reads these constants — a stage colour edited in one place
 *  lands at every stage.
 *
 *  The CSS channel is the `--melite-stage-bg` custom property:
 *  ViewportFrame sets it from STAGE_BACKGROUND_DARK on the frame
 *  element, and the sheets that tint the frame and the overlays on
 *  it read that property, so no stylesheet restates the hex. */
export declare const STAGE_BACKGROUND_DARK = "#0e0e1a";
export declare const STAGE_BACKGROUND_LIGHT = "#e4e4f0";
/** Interactive handlers for a pickable object subtree. */
export interface StagePick {
    click?: (point: THREE.Vector3, ev: MouseEvent | PointerEvent) => void;
    over?: (point: THREE.Vector3, ev: PointerEvent) => void;
    out?: (ev: PointerEvent) => void;
}
export interface Stage3DOptions {
    fov?: number;
    near?: number;
    far?: number;
    camera?: [number, number, number];
    target?: [number, number, number];
    minDistance?: number;
    maxDistance?: number;
    maxPolarAngle?: number;
    /** false → alpha:false + caller clear color (opaque canvas). */
    alpha?: boolean;
    /** WebGL context failure sink (canvas falls back to a message). */
    onContextFailure?: (msg: string) => void;
    /** Click-vs-drag threshold in ms (default 350). */
    clickVsDragMs?: number;
    /** WebGL preserveDrawingBuffer — REQUIRED by consumers that read the
     *  canvas back (toDataURL screenshots: motion's export dialog).
     *  Without it the buffer is cleared after present and screenshots
     *  come back blank. Default false (the browser default). */
    preserveDrawingBuffer?: boolean;
    /** Tone mapping (default ACESFilmic — the r3f Canvas default this
     *  core mirrors; r3f set ACES unless overridden). */
    toneMapping?: THREE.ToneMapping;
    /** Fired when a click resolves NO pick carrier (empty-space click —
     *  selection-style consumers deselect on it). */
    onEmptyClick?: () => void;
}
export interface Stage3D {
    canvas: HTMLCanvasElement;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    /** Ordered frame hook — runs before render each rAF. Returns unregister. */
    addTick(fn: (delta: number) => void): () => void;
    /** Imperatively frame the canvas size once (after layout). */
    resize(): void;
    dispose(): void;
}
export declare function mountStage3D(canvas: HTMLCanvasElement, opts?: Stage3DOptions): Stage3D | null;
/** A billboard TEXT label — the drei <Billboard><Text/></Text> analogue:
 *  canvas-drawn glyphs on a THREE.Sprite (sprites always face the camera,
 *  which IS the billboard). worldHeight is the label's height in scene
 *  units (drei Text's fontSize is world units too). */
export declare function makeLabelSprite(text: string, color: string, worldHeight: number): THREE.Sprite;
//# sourceMappingURL=stage3d.d.ts.map