/**
 * mesh-view — THE 3D VIEWPORT for the media plane (the operator's
 * 2026-09-26 order: "the 3d [REDACTED 2026-11-05] needs to be hooked into the media
 * [REDACTED 2026-11-05], visual door"). A `.glb` artifact opens HERE, in the drilldown,
 * orbitable — not as a download link with a sidebar hand-off.
 *
 * WHY IT LIVES IN THE GALLERY (and not as another viewer): a 3D run's
 * artifact is a MEDIA artifact, and the media drilldown is the one face
 * every surface already shares (the gallery tiles AND the cards' stage
 * zoom both route through `MediaDrilldown`). The 3D case was the only
 * kind that did not render — it degraded to a link, so a mesh artifact
 * was reachable but never VIEWABLE in the product.
 *
 * SUBSTRATE LAW (verbatim from card-base/glb-stage.tsx): RAW three.js,
 * an imperative scene in an effect, NO @react-three — r3f's bundled
 * react-reconciler version-skews against the seeded React internals and
 * crashes at boot. And ONE substrate: this mounts the estate's shared
 * stage core (`@melite/card-base/stage3d`, the same module every card
 * viewport mounts) and loads through the estate's ONE GLB parse policy
 * (`@melite/formats/glbLoad` — the single DRACO-configured GLTFLoader
 * and the single autoFit normalization). It is a VIEWER, not a second
 * loader: no GLTFLoader, no DRACOLoader, no autoFit copy here.
 *
 * THE HONEST-FAILURE LAW: a viewer that cannot show the mesh says so
 * in words. WebGL refusal (no context), a decode failure, and an
 * unsupported extension each render their own copy — the artifact stays
 * downloadable either way, because "we could not render it" must never
 * become "we lost it".
 */
import * as React from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { mountStage3D, type Stage3D } from '@melite/card-base/stage3d'
import { autoFitToHeight, loadGLB } from '@melite/formats/glbLoad'

import { artifactNameOf, artifactPathOfUrl } from './artifact-ops.ts'
import { bgBase1, stateWarnPrimary1, textTertiary3 } from './ui.tokens'

/** THE ARTIFACT-NAME LAW (the operator's 2026-09-26 report:
 *  "3D view unavailable — \"artifact\" is not a .glb/.gltf artifact" on a
 *  real .glb): the media plane serves an artifact at
 *  `/infer-gallery/artifact?path=<run>/<file>` — the URL's last path
 *  segment is the ROUTE's word, and the artifact's real name lives in
 *  the `?path=` query. Judging the artifact by the URL path therefore
 *  saw "artifact" for EVERY mesh the studio can open, and refused the
 *  whole 3D plane with a name that was never a file. The name comes
 *  from the SAME resolver the rename/delete doors use
 *  (`artifactPathOfUrl`), with the plain URL path as the fallback for
 *  directly-served files. */
export const artifactNameFor = artifactNameOf

/** Extensions the shared loader can parse. `.gltf` is accepted by the
 *  loader but a bare `.gltf` usually references sidecar buffers the
 *  artifact route does not serve next to it — so the copy below names
 *  the case rather than letting the fetch fail as a decode error. */
export function unsupportedCopy(url: string): string | null {
  const fromQuery = artifactPathOfUrl(url)
  const path = fromQuery ?? url.split('?')[0] ?? ''
  if (/\.gltf$/i.test(path)) {
    return '3D view unavailable — this .gltf references external buffers the media route does not serve. Download it to open it in a 3D tool.'
  }
  if (!/\.(glb|gltf)$/i.test(path)) {
    return `3D view unavailable — "${path.split('/').pop() ?? url}" is not a .glb/.gltf artifact.`
  }
  return null
}

/** Frame the camera on the loaded root: target the box centre, pull
 *  back by its bounding sphere. A fixed camera seat (the card stage's
 *  [2.2,1.6,2.6]) frames a 1.6m creature and crops a 40m prop; the
 *  drilldown shows every model's extents, so the framing is derived. */
function frameCamera(stage: Stage3D, root: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(root)
  if (box.isEmpty()) return
  const center = box.getCenter(new THREE.Vector3())
  const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 1e-3)
  stage.controls.target.copy(center)
  stage.camera.position.set(
    center.x + radius * 1.4,
    center.y + radius * 0.9,
    center.z + radius * 1.7,
  )
  stage.camera.near = Math.max(radius / 1000, 1e-4)
  stage.camera.far = radius * 100
  stage.camera.updateProjectionMatrix()
  stage.controls.update()
}

/** Dispose a loaded glTF subtree (geometries + materials + textures).
 *  The modal mounts and unmounts on every artifact walk; without this
 *  each open leaks a 33MB mesh's GPU buffers. */
function disposeRoot(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as unknown as THREE.Mesh
    if (mesh.geometry !== undefined && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose()
    }
    const material = mesh.material
    if (material === undefined) return
    for (const m of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(m as unknown as Record<string, unknown>)) {
        if (value !== null && typeof value === 'object' && typeof (value as THREE.Texture).isTexture === 'boolean'
          && (value as THREE.Texture).isTexture) {
          ;(value as THREE.Texture).dispose()
        }
      }
      ;(m as THREE.Material).dispose()
    }
  })
}

export interface MeshViewProps {
  /** The artifact url (same-origin media route). */
  url: string
  /** Display name — the caption under failures. */
  file: string
  /** Height of the canvas seat (the lightbox letterboxes the rest);
   *  a CSS length string or a pixel count. */
  height?: number | string
}

/** The 3D face. Renders a canvas, a loading line, or an honest
 *  failure line — never a blank box. */
export function MeshView({ url, file, height = '52vh' }: MeshViewProps): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [failure, setFailure] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsupported = unsupportedCopy(url)
    if (unsupported !== null) {
      setFailure(unsupported)
      setLoading(false)
      return
    }
    const canvas = canvasRef.current
    if (canvas === null) return
    let stage: Stage3D | null = null
    let root: THREE.Object3D | null = null
    let cancelled = false
    let disposeEnv: (() => void) | null = null

    stage = mountStage3D(canvas, {
      fov: 40,
      toneMapping: THREE.NoToneMapping,
      onContextFailure: (msg) => {
        if (!cancelled) setFailure(`3D view unavailable — WebGL refused the canvas (${msg}).`)
      },
    })
    if (stage === null) {
      setLoading(false)
      return
    }
    // A light rig the mesh can actually be read by: the modal has no
    // studio chrome around it, so the stage core's bare scene would
    // render the mesh black. Same two lights the card stage mounts.
    stage.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.4))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 5, 2)
    stage.scene.add(key)

    // THE ENVIRONMENT (2026-09-26, the browser wall's receipt): the 3D
    // lane's own artifacts are `metallic: 1.0, roughness: 1.0` with a
    // baseColorTexture and NO environment anywhere in the estate — a
    // fully metallic surface has no diffuse term, so two lights alone
    // render it flatter than it is. (Honest correction: the first frame
    // of the real 33MB artifact proved the img-to-mesh output's own
    // albedo is a grey/cream atlas, so the env map is NOT what makes
    // that mesh look grey — this is about metals reading correctly in
    // general, not about that frame.) Scene content is the consumer's
    // own — the substrate law says so — so the room probe lives here,
    // not in the shared core.
    //
    // IT IS AN ENHANCEMENT, NOT A DEPENDENCY: a PMREM probe can fail on
    // a constrained or flaky WebGL implementation, and it must never
    // take the viewer down with it. A refused probe means "no
    // environment" — flatter metals, still a working door. (The jsdom
    // wall proved this the hard way: an unguarded probe crashed the
    // effect and took the canvas with it.)
    try {
      const pmrem = new THREE.PMREMGenerator(stage.renderer)
      const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
      stage.scene.environment = envRT.texture
      stage.scene.environmentIntensity = 0.85
      disposeEnv = () => {
        if (stage !== null) stage.scene.environment = null
        envRT.dispose()
        pmrem.dispose()
      }
    } catch {
      disposeEnv = null
    }

    loadGLB(url).then(
      (gltf) => {
        if (cancelled) {
          disposeRoot(gltf.scene)
          return
        }
        root = gltf.scene
        // The estate's ONE normalization (shared with the poster tiles
        // and the card stage): centre X/Z, feet on y=0, largest axis to
        // the target height — so every viewer frames a mesh identically.
        autoFitToHeight(gltf.scene, 1.6)
        stage?.scene.add(gltf.scene)
        if (stage !== null) frameCamera(stage, gltf.scene)
        setLoading(false)
      },
      (e: unknown) => {
        if (cancelled) return
        setLoading(false)
        setFailure(`3D view unavailable — ${file} failed to load (${e instanceof Error ? e.message : String(e)}).`)
      },
    )

    return () => {
      cancelled = true
      if (root !== null) {
        stage?.scene.remove(root)
        disposeRoot(root)
      }
      disposeEnv?.()
      stage?.dispose()
    }
  }, [url, file])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', width: '100%' }}>
      {failure === null
        ? (
            <canvas
              ref={canvasRef}
              data-testid="mesh-view-canvas"
              aria-label={`3D view of ${file}`}
              style={{ width: '100%', height, maxHeight: '72vh', display: 'block', borderRadius: 8, background: bgBase1, touchAction: 'none' }}
            />
          )
        : null}
      {failure !== null
        ? (
            <div data-testid="mesh-view-failure" style={{ width: '100%', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16, borderRadius: 8, background: bgBase1, color: stateWarnPrimary1, fontSize: 13, lineHeight: 1.5 }}>
              {failure}
            </div>
          )
        : null}
      {failure === null && loading
        ? (
            <span data-testid="mesh-view-loading" style={{ color: textTertiary3, fontSize: 12 }}>
              loading {file}…
            </span>
          )
        : null}
    </div>
  )
}
