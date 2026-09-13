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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
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

/** The imperative three scene (a pure leaf library — the substrate
 *  law above). Owns renderer/camera/controls, the rAF loop, the
 *  resize observation, the click→asset resolution, and full disposal
 *  on unmount. Clicks resolve to the stage asset id under the cursor
 *  (group.userData.stageId, walked parentward) or null on empty
 *  space; a drag-orbit never reads as a click (the 350ms threshold). */
function mountScene(canvas: HTMLCanvasElement, onFail: (msg: string) => void): {
  scene: THREE.Scene
  setClickSink: (fn: (id: string | null) => void) => void
  dispose: () => void
} | null {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  } catch (e: unknown) {
    onFail(e instanceof Error ? e.message : 'WebGL unavailable')
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new THREE.Scene()
  scene.background = null
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60)
  camera.position.set(2.2, 1.6, 2.6)
  camera.lookAt(0, 0.8, 0)
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
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.8, 0)
  controls.enableDamping = true
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let clickSink: (id: string | null) => void = () => {}
  let downAt = 0
  const onPointerDown = (e: PointerEvent): void => { downAt = e.timeStamp }
  const onClick = (e: MouseEvent): void => {
    if (e.timeStamp - downAt > 350) return // a drag, not a click
    const r = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(scene.children, true)
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object
      while (o !== null && o.userData.stageId === undefined) o = o.parent
      if (o !== null) { clickSink(o.userData.stageId as string); return }
    }
    clickSink(null)
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('click', onClick)
  let raf = 0
  const render = (): void => {
    raf = requestAnimationFrame(render)
    controls.update()
    renderer.render(scene, camera)
  }
  render()
  const fit = (): void => {
    const w = canvas.clientWidth, hh = canvas.clientHeight
    if (w === 0 || hh === 0) return
    renderer.setSize(w, hh, false)
    camera.aspect = w / hh
    camera.updateProjectionMatrix()
  }
  fit()
  const ro = new ResizeObserver(fit)
  ro.observe(canvas)
  return {
    scene,
    setClickSink: (fn) => { clickSink = fn },
    dispose: () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('click', onClick)
      controls.dispose()
      renderer.dispose()
    },
  }
}

/** The selection tint — emissive lift on the selected group's meshes
 *  (the old Stage's highlight, the DOM-free way; lifted meshes read
 *  at any theme because emissive adds, never replaces). */
function tint(root: THREE.Object3D, on: boolean): void {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material
    if (Array.isArray(m)) {
      for (const mm of m) if ('emissive' in mm) (mm as THREE.MeshStandardMaterial).emissive.setHex(on ? 0x30364a : 0x000000)
    } else if (m !== undefined && m !== null && 'emissive' in m) {
      (m as THREE.MeshStandardMaterial).emissive.setHex(on ? 0x30364a : 0x000000)
    }
  })
}

interface LoadedAsset { asset: StageAsset; group: THREE.Group }

/** THE MESH STAGE PREVIEW — the multi-asset GLB viewport (assets in a
 *  row, click to select, per-asset load failures reported upward).
 *  No assets → the honest empty state; the canvas mounts when the
 *  first asset lands. */
export function GlbStagePreview({ assets, selectedId, onSelect, onAssetError, emptyHint, label }: {
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
}): ReturnType<typeof h> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<{ setClickSink: (fn: (id: string | null) => void) => void } | null>(null)
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
    const canvas = canvasRef.current
    if (canvas === null) return
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
    return () => {
      sceneRef.current = null
      mounted.dispose()
    }
  }, [ready, loaded])
  // selection tint — re-runs when the selection or the load set moves
  useEffect(() => {
    for (const { asset, group } of loaded) tint(group, asset.id === selectedId)
  }, [loaded, selectedId])
  return h('div', { className: s.stagePreview, 'data-viewport': label ?? 'glb-stage' },
    assets.length === 0
      ? h('div', { className: s.empty }, emptyHint ?? 'Run the card to see the mesh')
      : failed !== null
        ? h('div', { className: s.empty }, 'viewport failed: ' + failed)
        : !ready
          ? h('div', { className: s.empty }, 'loading mesh…')
          : h('canvas', { ref: canvasRef, className: s.stageCanvas, 'data-testid': 'stage-preview-glb' }),
  )
}
