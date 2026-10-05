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
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
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
export const STAGE_BACKGROUND_DARK = "#0e0e1a";
export const STAGE_BACKGROUND_LIGHT = "#e4e4f0";
/** The r3f pointer-events analogue lives on userData.pick (see header). */
function findPickCarrier(o) {
    let cur = o;
    while (cur !== null) {
        if (cur.userData !== undefined && cur.userData.pick !== undefined)
            return cur;
        cur = cur.parent;
    }
    return null;
}
/** Skip hits on a TransformControls gizmo subtree (invisible pick planes
 *  would swallow every click while a gizmo is attached). */
function isGizmoHit(o) {
    let cur = o;
    while (cur !== null) {
        // TransformControls root carries .gizmo / .plane children
        if (cur.gizmo !== undefined)
            return true;
        cur = cur.parent;
    }
    return false;
}
export function mountStage3D(canvas, opts = {}) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: opts.alpha !== false,
            preserveDrawingBuffer: opts.preserveDrawingBuffer === true,
        });
    }
    catch (e) {
        opts.onContextFailure?.(e instanceof Error ? e.message : "WebGL unavailable");
        return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    // PCFShadowMap (not PCFSoft): three r184 DEPRECATED PCFSoftShadowMap —
    // it warns on every mount and falls back to PCF anyway; PCF is the
    // recommended soft-shadow type post-r155 (the old r3f Canvas's
    // shadows="percentage", ported deliberately).
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = opts.toneMapping ?? THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(opts.fov ?? 45, 1, opts.near ?? 0.05, opts.far ?? 60);
    camera.position.set(...(opts.camera ?? [2.2, 1.6, 2.6]));
    camera.lookAt(0, 0.8, 0);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...(opts.target ?? [0, 0.8, 0]));
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    if (opts.minDistance !== undefined)
        controls.minDistance = opts.minDistance;
    if (opts.maxDistance !== undefined)
        controls.maxDistance = opts.maxDistance;
    if (opts.maxPolarAngle !== undefined)
        controls.maxPolarAngle = opts.maxPolarAngle;
    controls.update();
    // ── the tick registry (useFrame's raw analogue) ────────────────────
    const ticks = [];
    const addTick = (fn) => {
        ticks.push(fn);
        return () => {
            const i = ticks.indexOf(fn);
            if (i >= 0)
                ticks.splice(i, 1);
        };
    };
    // ── pointer picking ────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;
    let downAt = 0;
    const threshold = opts.clickVsDragMs ?? 350;
    const pickAt = (ev) => {
        const r = canvas.getBoundingClientRect();
        if (r.width === 0 || r.height === 0)
            return null;
        pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        for (const hit of hits) {
            if (isGizmoHit(hit.object))
                continue;
            const carrier = findPickCarrier(hit.object);
            if (carrier !== null)
                return { carrier, point: hit.point };
        }
        return null;
    };
    const onPointerDown = (e) => { downAt = e.timeStamp; };
    const onPointerMove = (e) => {
        const found = pickAt(e);
        const carrier = found?.carrier ?? null;
        if (carrier !== hovered) {
            const prevPick = hovered?.userData.pick;
            prevPick?.out?.(e);
            document.body.style.cursor = "auto";
            hovered = carrier;
            if (carrier !== null && found !== null) {
                ;
                carrier.userData.pick.over?.(found.point, e);
            }
        }
    };
    const onPointerLeave = (e) => {
        if (hovered !== null) {
            ;
            hovered.userData.pick.out?.(e);
            document.body.style.cursor = "auto";
            hovered = null;
        }
    };
    const onClick = (e) => {
        if (e.timeStamp - downAt > threshold)
            return; // a drag, not a click
        const found = pickAt(e);
        if (found !== null)
            found.carrier.userData.pick.click?.(found.point, e);
        else
            opts.onEmptyClick?.();
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("click", onClick);
    // ── the rAF loop ───────────────────────────────────────────────────
    let raf = 0;
    const clock = new THREE.Clock();
    const frame = () => {
        raf = requestAnimationFrame(frame);
        const delta = clock.getDelta();
        for (const t of ticks)
            t(delta);
        controls.update();
        renderer.render(scene, camera);
    };
    frame();
    // ── resize ─────────────────────────────────────────────────────────
    const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0)
            return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return {
        canvas,
        renderer,
        scene,
        camera,
        controls,
        addTick,
        resize,
        dispose: () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerleave", onPointerLeave);
            canvas.removeEventListener("click", onClick);
            controls.dispose();
            renderer.dispose();
        },
    };
}
/** A billboard TEXT label — the drei <Billboard><Text/></Text> analogue:
 *  canvas-drawn glyphs on a THREE.Sprite (sprites always face the camera,
 *  which IS the billboard). worldHeight is the label's height in scene
 *  units (drei Text's fontSize is world units too). */
export function makeLabelSprite(text, color, worldHeight) {
    const px = 96;
    const pad = 16;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (ctx !== null) {
        ctx.font = `600 ${px}px system-ui, sans-serif`;
        const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
        c.width = w;
        c.height = px + pad * 2;
        // re-set font after resize (canvas resets state)
        ctx.font = `600 ${px}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color;
        ctx.fillText(text, w / 2, (px + pad * 2) / 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    const aspect = c.width / c.height;
    sprite.scale.set(worldHeight * aspect, worldHeight, 1);
    return sprite;
}
//# sourceMappingURL=stage3d.js.map
