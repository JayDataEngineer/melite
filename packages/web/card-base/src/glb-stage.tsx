/**
 * glb-stage.tsx — THE MESH PREVIEW (the preview seam's mesh-kind
 * claim, hour 14 2026-09-13). Grown from img-to-mesh's GlbViewport
 * (the raw-three substrate, verbatim) + the old @melite-plugin/3d
 * Stage's multi-asset contract (assets/selection/per-asset errors —
 * the four props anny's assembly actually uses; drop-placement
 * gizmos and mixers stay unported until a consumer ports them, the
 * promotion law).
 *
 * SUBSTRATE LAW (verbatim, the 2026-09-12 boot-crash lesson): RAW
 * three.js — imperative scene in a useEffect, NO @react-three. r3f's
 * bundled react-reconciler reads the seeded React 19 internals by
 * minified single-letter fields and a version-skew throws at boot
 * ("reading 'S' of undefined"). three is a pure leaf library: no
 * React entanglement, mounts like any imperative canvas lib.
 *
 * THE PREVIEW-PORT INTERACTION LAW (the operator's catch, hour 14:
 * "Anny and Trellis are close to the same, but the way they interact
 * with the preview port is different"): ONE stage component serves
 * both — selection + per-asset errors are the stage's own uniform
 * interaction surface; studio chrome (anchors, badges, in-card
 * actions like anny's HMR fit-body) docks AROUND it, never inside.
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { mountStage3D, makeLabelSprite } from './stage3d.ts'
import s from './preview.module.css'

let draco: DRACOLoader | null = null
function loader(): GLTFLoader {
  if (draco === null) {
    draco = new DRACOLoader()
    draco.setDecoderPath('/draco/gltf/')
  }
  const l = new GLTFLoader()
  l.setDRACOLoader(draco)
  return l
}

/** One stage asset — the old Stage contract's live subset (the four
 *  fields consumers set: id/url/name + the placement override; the
 *  drop-raycast position stays caller-computed). */
export interface StageAsset {
  /** unique id (caller-supplied — run id + artifact name is fine) */
  id: string
  /** the GLB url */
  url: string
  /** display name (chips / selection list) */
  name?: string
  /** the comparison seat's label (N named slots: source/result,
   *  body/garment, donor/target…). Omit for an unlabeled seat. */
  slot?: string
  /** world position override; omit for the row layout */
  position?: readonly [number, number, number]
  /** rotation (Euler, radians) */
  rotation?: readonly [number, number, number]
  /** uniform scale multiplier */
  scale?: number
}

/** Normalize a loaded scene to a known viewing size — the
 *  autoFitToHeight law, verbatim port: center X/Z, scale the largest
 *  dimension to targetHeight, feet on y=0. Mutates the root in place.
 *  (Meshes arrive at wildly different scales; this is the ONE place
 *  that reconciles them so every viewport frames identically.) */
export function autoFitToHeight(root: THREE.Object3D, targetHeight = 1.6): { box: THREE.Box3; height: number } {
  const box = new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  box.getSize(size)
  const largest = Math.max(size.x, size.y, size.z)
  if (largest > 0) root.scale.multiplyScalar(targetHeight / largest)
  root.updateMatrixWorld(true)
  const box2 = new THREE.Box3().setFromObject(root)
  const center = new THREE.Vector3()
  box2.getCenter(center)
  root.position.x -= center.x
  root.position.z -= center.z
  root.position.y -= box2.min.y
  root.updateMatrixWorld(true)
  const box3 = new THREE.Box3().setFromObject(root)
  const size3 = new THREE.Vector3()
  box3.getSize(size3)
  return { box: box3, height: size3.y }
}

/** The imperative three scene — BUILT ON THE SHARED STAGE CORE
 *  (stage3d.ts): the core owns renderer/camera/controls/rAF/resize/picking;
 *  this adds the glb-stage's own light rig + floor grid and maps the core's
 *  pick semantics onto the stage-asset id (group.userData.pick → clickSink,
 *  empty click → clickSink(null)). A drag-orbit never reads as a click. */
function mountScene(canvas: HTMLCanvasElement, onFail: (msg: string) => void): {
  scene: THREE.Scene
  setClickSink: (fn: (id: string | null) => void) => void
  addTick: (fn: (delta: number) => void) => () => void
  dispose: () => void
} | null {
  let clickSink: (id: string | null) => void = () => {}
  const stage = mountStage3D(canvas, {
    fov: 40,
    camera: [2.2, 1.6, 2.6],
    target: [0, 0.8, 0],
    // the old private mountScene's raw renderer default — NoToneMapping.
    // (The core's ACESFilmic default mirrors r3f Canvases; this stage
    // was never an r3f Canvas, so it pins its historical look.)
    toneMapping: THREE.NoToneMapping,
    onContextFailure: onFail,
    onEmptyClick: () => clickSink(null),
  })
  if (stage === null) return null
  const scene = stage.scene
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.4))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(3, 5, 2)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.6)
  fill.position.set(-3, 2, -2)
  scene.add(fill)
  // the ground grid — the old Stage's floor line, three's own helper
  const grid = new THREE.GridHelper(6, 24, 0xbbbbbb, 0xdddddd)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.35
  scene.add(grid)
  return {
    scene,
    setClickSink: (fn) => { clickSink = fn },
    addTick: stage.addTick,
    dispose: () => {
      grid.geometry.dispose()
      stage.dispose()
    },
  }
}

/** The selection tint — emissive lift on the selected group's meshes
 *  (the old Stage's highlight, the DOM-free way; lifted meshes read
 *  at any theme because emissive adds, never replaces). */
function tint(root: THREE.Object3D, on: boolean): void {
  // (the material-ARRAY arm was deleted: the sole caller feeds
  // GLTFLoader-produced scenes, and three r184's loadMesh builds one
  // Mesh per primitive with a SINGLE material each — arrays never
  // reach this walk. Behavior is identical for every reachable input.)
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material
    if (m !== undefined && m !== null && 'emissive' in m) {
      (m as THREE.MeshStandardMaterial).emissive.setHex(on ? 0x30364a : 0x000000)
    }
  })
}

/** THE STAGE'S LAYER MODEL (primitive ②, first slice 2026-09-21,
 *  skeleton second, weights fourth): shaded vs wireframe + the
 *  skeleton and weights overlays. CALLER state — studios persist
 *  layer choices exactly like selection: `layers` reads, `onLayers`
 *  writes. Omit both for the plain shaded stage (no chips, no new
 *  chrome); omit only `onLayers` for a read-only layer (no write
 *  channel, no chips). Shaded/Wireframe are the surface MODE;
 *  skeleton and weights are OVERLAYS (they compose with either and
 *  with each other). `weights` is OPTIONAL: absent = off, and a
 *  stage that seats no weights lane (motion's pose stage) never
 *  votes it — the base's other stages always vote it explicitly. */
export interface StageLayers {
  wireframe: boolean
  skeleton: boolean
  weights?: boolean
}

/** Flip the wireframe flag on every wireframe-capable material under
 *  the root (mesh materials; points/lines have no such flag and are
 *  left alone). Idempotent — loads mint fresh materials, so no
 *  original-flag bookkeeping is owed. */
export function applyWireframe(root: THREE.Object3D, on: boolean): void {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material
    if (m !== undefined && m !== null && 'wireframe' in m) {
      (m as THREE.MeshStandardMaterial).wireframe = on
    }
  })
}

/** A bone-visualization overlay for one loaded group — null when
 *  the group carries no bones (unrigged meshes seat no overlay, the
 *  honest absence). The caller adds the helper to the scene and owns
 *  its visibility + disposal. */
export function skeletonHelperFor(group: THREE.Group): THREE.SkeletonHelper | null {
  const bones: THREE.Bone[] = []
  group.traverse((o) => {
    if ((o as THREE.Bone).isBone === true) bones.push(o as THREE.Bone)
  })
  if (bones.length === 0) return null
  return new THREE.SkeletonHelper(group)
}

/** THE TURNTABLE SPEED (radians/sec) — one revolution every ~12.5s,
 *  the gentle review idle; fast enough to read as motion in a
 *  glance, slow enough to inspect. */
export const TURNTABLE_SPEED = 0.5

/** One turntable frame: rotate every group about its OWN Y axis
 *  (each spins in place — the row layout's positions stand). Pure —
 *  the stage's tick seam calls it with the rAF delta; a 0 delta is
 *  a no-op. Declared per-asset rotation rides along (the spin adds
 *  to the current angle, never resets it). */
export function turntableTick(groups: readonly THREE.Object3D[], delta: number): void {
  if (delta === 0) return
  const d = TURNTABLE_SPEED * delta
  for (const g of groups) g.rotation.y += d
}

/** ── THE WEIGHTS HEAT OVERLAY (primitive ②, fourth slice) ───────────
 *
 * Per-vertex skin-weight heat: a skinned mesh's dominant-bone weight
 * (the max of its skinWeight components, ∈ [0.25,1] under 4
 * influences) paints a blue→red ramp through vertex colors. Unskinned
 * meshes are untouched (no skinWeight attribute — no lane, no paint).
 * OFF restores each geometry's ORIGINAL color attribute (cached the
 * first time we touch it — absent means we delete ours) and the
 * material's vertexColors flag. Idempotent both ways. */

/** The heat ramp — 5 stops (blue→cyan→green→yellow→red), t clamped.
 *  Pure: the same ramp every stage paints, the wall pins the stops. */
export function heatColor(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t))
  const stops: ReadonlyArray<readonly [number, number, number]> = [
    [0, 0, 1], [0, 1, 1], [0, 1, 0], [1, 1, 0], [1, 0, 0],
  ]
  const s = x * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(s))
  const f = s - i
  const a = stops[i]!, b = stops[i + 1]!
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

const weightColorCache = new WeakMap<THREE.BufferGeometry, THREE.BufferAttribute | null>()

export function applyWeightsHeat(root: THREE.Object3D, on: boolean): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    const geo = mesh.geometry as THREE.BufferGeometry | undefined
    if (geo === undefined) return
    const mat = mesh.material
    if (mat === undefined || mat === null || Array.isArray(mat)) return
    const sw = geo.getAttribute('skinWeight') as THREE.BufferAttribute | undefined
    if (sw === undefined) return
    const pos = geo.getAttribute('position')
    if (pos === undefined) return
    const sm = mat as THREE.MeshStandardMaterial
    if (on) {
      if (!weightColorCache.has(geo)) {
        weightColorCache.set(geo, (geo.getAttribute('color') as THREE.BufferAttribute | undefined) ?? null)
      }
      const colors = new Float32Array(pos.count * 3)
      const comps = Math.min(4, sw.itemSize)
      for (let i = 0; i < pos.count; i++) {
        let w = sw.getX(i)
        for (let c = 1; c < comps; c++) {
          const v = c === 1 ? sw.getY(i) : c === 2 ? sw.getZ(i) : sw.getW(i)
          if (v > w) w = v
        }
        const [r, g, b] = heatColor(w)
        colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      sm.vertexColors = true
      sm.needsUpdate = true
    } else {
      const orig = weightColorCache.get(geo)
      if (orig === null) geo.deleteAttribute('color')
      else if (orig !== undefined) geo.setAttribute('color', orig)
      if (sm.vertexColors === true) {
        sm.vertexColors = false
        sm.needsUpdate = true
      }
    }
  })
}

/** ── NAMED MESH SLOTS (primitive ②, third slice) ────────────────────
 * A comparison seat: assets may declare a SLOT (`slot: 'source'` /
 * `'result'`, body/garment, donor/target, LOD names) — the stage
 * paints the slot's label above the asset (a billboard sprite, the
 * stage3d makeLabelSprite). Unslotted assets seat unlabeled, as
 * ever. Pure derivation, mount-side paint (the WebGL-exempt arm). */
export function slotLabelOf(asset: StageAsset): string | null {
  return typeof asset.slot === 'string' && asset.slot !== '' ? asset.slot : null
}

interface LoadedAsset { asset: StageAsset; group: THREE.Group }

/** THE MESH STAGE PREVIEW — the multi-asset GLB viewport (assets in a
 *  row, click to select, per-asset load failures reported upward).
 *  No assets → the honest empty state; the canvas mounts when the
 *  first asset lands. */
export function GlbStagePreview({ assets, selectedId, onSelect, onAssetError, emptyHint, label, layers, onLayers, turntable }: {
  assets: readonly StageAsset[]
  /** selection is CALLER state (studios persist selections) */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** per-asset load failure (the loud-errors law: the message rides
   *  the caller's DOM, never a red wireframe box; null = settled OK
   *  and any prior error for it clears). STABLE per asset id. */
  onAssetError?: (id: string, message: string | null) => void
  /** the empty state's line (default: the run hint) */
  emptyHint?: string
  label?: string
  /** the layer model (primitive ②): reads the caller's layer state;
   *  the wireframe flag applies to every loaded asset. Omit for
   *  plain shaded (the default face). */
  layers?: StageLayers
  /** the layer write channel: when provided with assets, the
   *  Shaded/Wireframe chips render and vote here. Omit for no
   *  layer chrome (read-only or plain). */
  onLayers?: (layers: StageLayers) => void
  /** THE TURNTABLE (primitive ②, third slice): true spins every
   *  loaded asset about its own Y axis on the stage's tick seam
   *  (the review idle). The flag rides a ref — flipping it NEVER
   *  remounts the scene (same law as the layer flags). */
  turntable?: boolean
}): ReturnType<typeof h> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<{ setClickSink: (fn: (id: string | null) => void) => void } | null>(null)
  const skeletonHelpers = useRef<THREE.SkeletonHelper[]>([])
  const slotLabels = useRef<THREE.Sprite[]>([])
  const [loaded, setLoaded] = useState<LoadedAsset[]>([])
  const [failed, setFailed] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  // stable callback refs — the scene mounts once; sinks rebind
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  // the load set tracks the assets prop by id+url identity
  const key = assets.map((a) => a.id + '@' + a.url).join('|')
  const errRef = useRef(onAssetError)
  errRef.current = onAssetError
  // the turntable's own refs (the never-remount law): the tick reads
  // the CURRENT groups + flag every frame; prop flips cost nothing
  const groupsRef = useRef<readonly THREE.Object3D[]>([])
  groupsRef.current = loaded.map((l) => l.group)
  const turntableRef = useRef(turntable === true)
  turntableRef.current = turntable === true
  useEffect(() => {
    setLoaded([])
    setFailed(null)
    setReady(false)
    if (assets.length === 0) return
    let alive = true
    let pending = assets.length
    const settle = (): void => { if (alive && pending === 0) setReady(true) }
    for (const a of assets) {
      loader().load(a.url,
        (g) => {
          if (!alive) return
          autoFitToHeight(g.scene)
          const group = new THREE.Group()
          group.userData.stageId = a.id
          // the shared core's pick seam (replaces the old parentward
          // stageId walk): click → the caller's selection state
          group.userData.pick = { click: () => selectRef.current?.(a.id) }
          group.add(g.scene)
          if (a.scale !== undefined) group.scale.multiplyScalar(a.scale)
          if (a.rotation !== undefined) group.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2])
          if (a.position !== undefined) group.position.set(a.position[0], a.position[1], a.position[2])
          setLoaded((prev) => [...prev, { asset: a, group }])
          errRef.current?.(a.id, null)
          pending -= 1; settle()
        },
        undefined,
        (e: unknown) => {
          if (!alive) return
          errRef.current?.(a.id, e instanceof Error ? e.message : 'glb load failed')
          pending -= 1; settle()
        })
    }
    return () => { alive = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  // the scene mounts once the first asset is ready (the canvas only
  // exists then); the row layout rides the same effect
  useEffect(() => {
    if (!ready || loaded.length === 0) return
    // (the canvas-null guard was deleted: this body runs only when
    // ready && loaded-nonempty, and every such commit renders the
    // canvas face — ready flips true only in settle(), while the key
    // change (the sole ready-clearer) always precedes it with
    // setFailed(null) + setReady(false) in one batch; the canvas is
    // therefore always committed before this effect can observe ready.)
    const canvas = canvasRef.current!
    const mounted = mountScene(canvas, (m) => setFailed(m))
    if (mounted === null) return
    sceneRef.current = mounted
    mounted.setClickSink((id) => selectRef.current?.(id))
    // ROW LAYOUT: unpositioned assets line up on x by cumulative bbox
    // width (0.4 gap); positioned assets keep their declared spot.
    let x = 0
    for (const { asset, group } of loaded) {
      mounted.scene.add(group)
      if (asset.position === undefined) {
        const box = new THREE.Box3().setFromObject(group)
        const size = new THREE.Vector3(); box.getSize(size)
        group.position.x += x + size.x / 2
        x += size.x + 0.4
      }
    }
    // THE SKELETON OVERLAYS (primitive ②, second slice): one helper
    // per rigged group, visibility owned by the caller flag (the
    // visibility effect below corrects it in the same commit; the
    // flag never remounts the scene — GPU contexts are not churn).
    // Unrigged groups seat no helper (the honest absence).
    const helpers: THREE.SkeletonHelper[] = []
    for (const { group } of loaded) {
      const helper = skeletonHelperFor(group)
      if (helper !== null) {
        helper.visible = false
        mounted.scene.add(helper)
        helpers.push(helper)
      }
    }
    skeletonHelpers.current = helpers
    // THE SLOT LABELS (primitive ②, third slice): one billboard
    // sprite per SLOTTED group, seated above its bounding box — the
    // comparison seat's own name (source/result, body/garment…).
    // Unslotted groups seat unlabeled, as ever.
    const labels: THREE.Sprite[] = []
    for (const { asset, group } of loaded) {
      const text = slotLabelOf(asset)
      if (text === null) continue
      const sprite = makeLabelSprite(text, '#1c1f26', 0.05)
      const box = new THREE.Box3().setFromObject(group)
      sprite.position.set(group.position.x, box.max.y + 0.06, 0)
      mounted.scene.add(sprite)
      labels.push(sprite)
    }
    slotLabels.current = labels
    // THE TURNTABLE (primitive ②, third slice): one tick per mount,
    // gated by the ref — the flag flips inside the running frame,
    // never by remounting the scene. The tick dies with the stage's
    // own dispose (the rAF loop cancels).
    mounted.addTick((dt) => {
      if (!turntableRef.current) return
      turntableTick(groupsRef.current, dt)
    })
    return () => {
      for (const helper of skeletonHelpers.current) {
        mounted.scene.remove(helper)
        helper.dispose()
      }
      skeletonHelpers.current = []
      for (const sprite of slotLabels.current) {
        mounted.scene.remove(sprite)
        const mat = sprite.material as THREE.SpriteMaterial
        mat.map?.dispose()
        mat.dispose()
      }
      slotLabels.current = []
      sceneRef.current = null
      mounted.dispose()
    }
  }, [ready, loaded])
  // selection tint — re-runs when the selection or the load set moves
  useEffect(() => {
    for (const { asset, group } of loaded) tint(group, asset.id === selectedId)
  }, [loaded, selectedId])
  // THE LAYER ARM (primitive ②): the caller's wireframe flag rides
  // every loaded asset, re-applied when the load set moves (fresh
  // materials mint unflagged — the flag is caller state, the walk
  // re-asserts it).
  const wireframe = layers?.wireframe ?? false
  useEffect(() => {
    for (const { group } of loaded) applyWireframe(group, wireframe)
  }, [loaded, wireframe])
  // THE SKELETON FLAG (primitive ②, second slice): the caller's
  // overlay flag rides the mounted helpers, re-asserted when the
  // load set moves (fresh helpers mint hidden — the flag is caller
  // state, this walk re-asserts it, same commit as the mount).
  const skeleton = layers?.skeleton ?? false
  useEffect(() => {
    for (const helper of skeletonHelpers.current) helper.visible = skeleton
  }, [loaded, skeleton])
  // THE WEIGHTS FLAG (primitive ②, fourth slice): the heat overlay
  // rides the loaded assets the same way — re-asserted when the load
  // set moves (fresh geometries paint on the flag they arrive under).
  const weights = layers?.weights === true
  useEffect(() => {
    for (const { group } of loaded) applyWeightsHeat(group, weights)
  }, [loaded, weights])
  return h('div', { className: s.stagePreview, 'data-viewport': label ?? 'glb-stage' },
    assets.length === 0
      ? h('div', { className: s.empty }, emptyHint ?? 'Run the card to see the mesh')
      : failed !== null
        ? h('div', { className: s.empty }, 'viewport failed: ' + failed)
        : !ready
          ? h('div', { className: s.empty }, 'loading mesh…')
          : h('canvas', { ref: canvasRef, className: s.stageCanvas, 'data-testid': 'stage-preview-glb' }),
    onLayers !== undefined && assets.length > 0
      ? h('div', { className: s.layerRow, role: 'group', 'aria-label': 'mesh layers' },
          h('button', {
            type: 'button', className: s.layerChip,
            'aria-pressed': !wireframe,
            onClick: () => { onLayers({ wireframe: false, skeleton, weights }) },
          }, 'Shaded'),
          h('button', {
            type: 'button', className: s.layerChip,
            'aria-pressed': wireframe,
            onClick: () => { onLayers({ wireframe: true, skeleton, weights }) },
          }, 'Wireframe'),
          h('button', {
            type: 'button', className: s.layerChip,
            'aria-pressed': skeleton,
            onClick: () => { onLayers({ wireframe, skeleton: !skeleton, weights }) },
          }, 'Skeleton'),
          h('button', {
            type: 'button', className: s.layerChip,
            'aria-pressed': weights,
            onClick: () => { onLayers({ wireframe, skeleton, weights: !weights }) },
          }, 'Weights'))
      : null,
  )
}
