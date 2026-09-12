/**
 * GlbViewport — the shared 3D space for card studios, ported from the
 * old Stage law ("TRELLIS GLB props + Anny rigged avatars + Kimodo
 * skeletal motion, one lightweight viewer — never embedded Blender")
 * at the LEAN first cut: see and orbit the generated mesh. The old
 * Stage's placement gizmos / mixers / rig chips promote here when
 * their consumers port (the promotion law — no speculative chrome).
 *
 * SUBSTRATE LAW (2026-09-12, the boot-crash lesson): RAW three.js —
 * imperative scene in a useEffect, no @react-three. r3f's bundled
 * react-reconciler reads the seeded React 19 internals by minified
 * single-letter fields and a version-skew throws at boot ("reading
 * 'S' of undefined") — a duplicate-React-instance hazard the client
 * preset's purity gate exists to prevent. three is a pure leaf
 * library: no React entanglement, no reconciler, mounts like any
 * imperative canvas lib (the DSH pattern for chart/DOM libs).
 *
 * The artifact channel: the RUN is the SSOT (readRun rewrites bare
 * names onto /melite-media/runs/<id>/<rel>) — the studio polls
 * runs/status until the stage's url lands (the old pollFlowRun law).
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import css from './client.module.css'

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

/** Normalize a loaded scene to a known viewing size — the old
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
 *  resize observation, and full disposal on unmount. */
function mountScene(canvas: HTMLCanvasElement, onFail: (msg: string) => void): {
  scene: THREE.Scene
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
  // the ground grid — the old Stage's floor line, three's own helper
  const grid = new THREE.GridHelper(6, 24, 0xbbbbbb, 0xdddddd)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.35
  scene.add(grid)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.8, 0)
  controls.enableDamping = true
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
    dispose: () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
    },
  }
}

/** The viewport. url null → the empty state (the honest pre-run face);
 *  a load failure is LOUD (the old studio law — never a silent blank). */
export function GlbViewport({ url, label }: { url: string | null; label?: string }): ReturnType<typeof h> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  // the model loads per-url; failures are loud
  useEffect(() => {
    setGltf(null)
    setError(null)
    setLoaded(false)
    if (url === null) return
    let alive = true
    loader().load(url,
      (g) => { if (alive) { autoFitToHeight(g.scene); setGltf(g); setLoaded(true) } },
      undefined,
      (e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'glb load failed') })
    return () => { alive = false }
  }, [url])
  // the scene mounts once the model is ready (the canvas only exists then)
  useEffect(() => {
    if (url === null || error !== null || !loaded) return
    const canvas = canvasRef.current
    if (canvas === null) return
    const mounted = mountScene(canvas, setError)
    if (mounted === null) return
    if (gltf !== null) mounted.scene.add(gltf.scene)
    return () => { mounted.dispose() }
  }, [url, error, loaded, gltf])
  return h('div', { className: css.viewport, 'data-viewport': label ?? 'glb' },
    url === null
      ? h('p', { className: css.viewportEmpty }, 'Run the card to see the mesh')
      : error !== null
        ? h('p', { className: css.runError }, 'mesh failed to load: ' + error)
        : !loaded
          ? h('p', { className: css.viewportEmpty }, 'loading mesh…')
          : h('canvas', { ref: canvasRef, className: css.viewportCanvas }),
  )
}
