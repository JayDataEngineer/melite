// Stage — the multi-asset scene viewport for the 3D flow
// (2026-09-04, operator architecture order: "TRELLIS GLB props +
// Anny rigged avatars + Kimodo skeletal motion, one lightweight
// viewer — never embedded Blender").
//
// THE FLOW STAGE: this ONE shared component covers every 3d
// card's output coexisting in one scene —
//   • TRELLIS (img-to-mesh): static GLB props with PBR materials
//   • Anny (anny card): rigged composite avatars (bind pose or baked
//     clips)
//   • Kimodo (motion lanes): skeletal clips bound onto the SOMA-77
//     skeletons via AnimationMixer (the hierarchy matches 1:1 — no
//     retargeting; the poster flow's law)
//
// INTERACTION (the operator's spec, verbatim capabilities):
//   • drag-and-drop placement: drop events on the canvas raycast to
//     the ground plane and instantiate the asset AT that XZ point
//   • click-select + TransformControls: translate / rotate / scale
//     gizmos on the selected object (standard three.js handles)
//   • per-asset motion: each asset's clips play through its own
//     AnimationMixer; pause/play rides the same prop
//   • rig inspection: the Rig chip per selected skinned asset (the
//     SkeletonHelper overlay — transfer_rig outputs are rig claims
//     and must be inspectable)
//
// Footprint: three.js (~600 KB) over the estate's existing R3F
// stack — no 1 GB Blender, no licensing hazard, no native build.
//
// STABILITY LAW (2026-09-05, the effect-loop fix): every callback
// Stage hands StageModel is STABLE PER ASSET ID — minted once, cached
// in a ref-map, pruned when the asset leaves. A fresh function
// identity per render (the objectRef={fn(id)} inline form) plus the
// mount-effect's dep on it ping-ponged forever: effect → setObjs →
// re-render → new identity → effect… (~2.8k mount cycles/sec, every
// cycle rebuilding the auto-fit and a fresh AnimationMixer — baked
// motion frozen at t=0). The probe test
// (stage-loop-probe.test.tsx) pins the settled behavior.

import { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { ViewportOverlays } from "@melite/ui"
import type { ViewportOverlay } from "@melite/ui"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, TransformControls, Grid, ContactShadows, Environment, Lightformer } from "@react-three/drei"
import * as THREE from "three"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import { Button } from "@melite/ui/button"
import { Loader2 } from "lucide-react"
import { loadGLB, autoFitToHeight } from "@melite/formats/glbLoad"

// GLB loading + normalization ride the estate's shared kernel
// (@melite/formats glbLoad): one DRACO-configured loader — LOCAL
// decoder files, no CDN — identical parse behavior in every viewer.

// ── the stage asset record (one row per placed artifact) ────────────

export interface StageAsset {
  /** unique id (caller-supplied — run id + artifact name is fine) */
  id: string
  /** the GLB url */
  url: string
  /** display name (chips / selection list) */
  name?: string
  /** world position at placement (drop raycast fills this) */
  position?: [number, number, number]
  /** rotation (Euler, radians) */
  rotation?: [number, number, number]
  /** uniform scale multiplier */
  scale?: number
  /** auto-play the first clip (Kimodo/Anny baked motion) */
  playing?: boolean
  /** rig overlay on load (transfer_rig inspection) */
  showRig?: boolean
}

// ── one placed model (inside Canvas) ────────────────────────────────

function StageModel({
  asset,
  onSelect,
  showRig,
  playing,
  objectRef,
  onRigAuto,
  onLoadingChange,
  onError,
}: {
  asset: StageAsset
  onSelect: (id: string) => void
  showRig: boolean
  playing: boolean
  /** the parent hands a ref-map so TransformControls can attach */
  objectRef: (obj: THREE.Group | null) => void
  /** auto rig-inspect when the artifact is skinned WITHOUT clips
   * (the transfer_rig law: a rig artifact must be inspectable
   * without asking) — Stage's per-id stable callback */
  onRigAuto: (v: boolean) => void
  /** loading badge accounting — Stage's per-id stable callback */
  onLoadingChange: (v: boolean) => void
  /** load-failure surfacing — Stage's per-id stable callback (null =
   *  settled OK; the caller renders the message, never a mystery box) */
  onError: (message: string | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [error, setError] = useState<string | null>(null)

  // per-model loading latch: the badge counter must see true→false
  // exactly once per load — the cancel path and the settle path can
  // both fire, a bare counter would double-decrement.
  const loadingRef = useRef(false)
  const setLoading = (v: boolean) => {
    if (loadingRef.current === v) return
    loadingRef.current = v
    onLoadingChange(v)
  }

  // load lifecycle (url changes): fetch → gltf state; rig auto-detect
  // rides the SAME parse (no second loadGLB — the drop-path
  // double-load died with the 2026-09-05 stability fix).
  useEffect(() => {
    let cancelled = false
    setGltf(null)
    setError(null)
    setLoading(true)
    loadGLB(asset.url)
      .then((g) => {
        if (cancelled) return
        setGltf(g)
        onError(null)
        let skinned = false
        g.scene.traverse((o) => {
          if (o instanceof THREE.SkinnedMesh) skinned = true
        })
        const hasClips = !!(g.animations && g.animations.length > 0)
        if (skinned && !hasClips) onRigAuto(true)
      })
      .catch((e) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        onError(msg)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      setLoading(false)
    }
    // onLoadingChange/onRigAuto/onError are STABLE per id (Stage's ref-map) —
    // they cannot retrigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.url])

  // mount the loaded scene + auto-fit + mixer (the AnimatedGLBViewer
  // laws, unchanged — different sources use wildly different scales).
  // Deps are [gltf, objectRef] ONLY: `playing` toggling must pause the
  // action, never rebuild the scene (the old dep re-created the mixer
  // on every play/pause).
  useEffect(() => {
    if (!gltf || !groupRef.current) return
    const g = groupRef.current
    g.clear()
    g.add(gltf.scene)

    autoFitToHeight(gltf.scene, 1.8)

    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(gltf.scene)
      const action = mixer.clipAction(gltf.animations[0])
      action.reset()
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.play()
      mixerRef.current = mixer
      actionRef.current = action
    }
    objectRef(g)
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        mixerRef.current.uncacheRoot(gltf.scene)
        mixerRef.current = null
      }
      actionRef.current = null
      objectRef(null)
    }
  }, [gltf, objectRef])

  // rig overlay: the SkeletonHelper through the mesh (transfer_rig /
  // anny outputs are RIG claims — inspectable in the stage too)
  useEffect(() => {
    if (!gltf || !groupRef.current) return
    if (!showRig) return
    const helper = new THREE.SkeletonHelper(gltf.scene)
    ;(helper.material as THREE.LineBasicMaterial).depthTest = false
    helper.renderOrder = 999
    ;(helper.material as THREE.LineBasicMaterial).transparent = true
    groupRef.current.add(helper)
    return () => {
      groupRef.current?.remove(helper)
      helper.geometry.dispose()
      ;(helper.material as THREE.Material).dispose()
    }
  }, [gltf, showRig])

  // play/pause: flips the LIVE action — never remounts the scene.
  // Also runs on gltf changes so a fresh mixer inherits the current
  // playing state (a fresh action always starts unpaused).
  useEffect(() => {
    if (actionRef.current) actionRef.current.paused = !playing
  }, [playing, gltf])

  useFrame((_, delta) => {
    if (mixerRef.current && playing) mixerRef.current.update(delta)
  })

  return (
    <group
      ref={groupRef}
      position={asset.position ?? [0, 0, 0]}
      rotation={asset.rotation ?? [0, 0, 0]}
      scale={asset.scale ?? 1}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(asset.id)
      }}
    >
      {error && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#ef4444" wireframe
            emissive="#ef4444" emissiveIntensity={0.4} />
        </mesh>
      )}
    </group>
  )
}

// ── the drop raycast: ground-plane placement (operator spec §1) ──────

function DropPlane({
  onDropAt,
}: {
  onDropAt: (point: THREE.Vector3, files: File[]) => void
}): null {
  const { camera, raycaster, gl } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const point = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const el = gl.domElement
    const over = (e: DragEvent) => {
      e.preventDefault() // allow the drop
    }
    const drop = (e: DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (!files.length) return
      const r = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      if (raycaster.ray.intersectPlane(plane, point)) {
        onDropAt(point.clone(), files)
      }
    }
    el.addEventListener("dragover", over)
    el.addEventListener("drop", drop)
    return () => {
      el.removeEventListener("dragover", over)
      el.removeEventListener("drop", drop)
    }
  }, [camera, raycaster, gl, plane, point, onDropAt])

  return null
}

// ── the gizmo anchor (operator spec §2: TransformControls) ──────────

function Gizmo({
  target,
  mode,
  dragging,
}: {
  target: THREE.Object3D | null
  mode: "translate" | "rotate" | "scale"
  dragging: (v: boolean) => void
}) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  if (!target) return <OrbitControls ref={controls} makeDefault />
  return (
    <>
      {/* the gizmo detaches orbit while dragging — the standard
          TransformControls+OrbitControls interlock */}
      <TransformControls
        object={target}
        mode={mode}
        size={0.8}
        onMouseDown={() => dragging(true)}
        onMouseUp={() => dragging(false)}
      />
      <OrbitControls ref={controls} makeDefault />
    </>
  )
}

// ── Stage (the exported shared component) ───────────────────────────

export interface StageProps {
  assets: StageAsset[]
  /** selection is CALLER state (studios persist selections) */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** drop handler: resolve dropped files to urls, return new rows */
  onDropFiles?: (point: [number, number, number], files: File[]) => StageAsset[]
  /** per-asset load failure (the loud-errors law: StageModel's old red
   *  wireframe box told the user nothing — the message rides here so
   *  the caller renders it as DOM text; null = that asset settled OK
   *  and any prior error for it clears). STABLE per asset id like the
   *  other callbacks (the stability law — never a fresh identity). */
  onAssetError?: (id: string, message: string | null) => void
  gizmoMode?: "translate" | "rotate" | "scale"
  playing?: boolean
  className?: string
  /** DECLARED viewport overlays (§2.5, row 5 stroke 6): docked chip
   *  rows the shared renderer positions inside this wrapper. */
  overlays?: readonly ViewportOverlay[]
}

export function Stage({
  assets,
  selectedId = null,
  onSelect,
  onDropFiles,
  onAssetError,
  gizmoMode = "translate",
  playing = true,
  className = "",
  overlays,
}: StageProps) {
  const [objs, setObjs] = useState<Record<string, THREE.Group | null>>({})
  const [dragging, setDragging] = useState(false)
  const [rigOn, setRigOn] = useState<Record<string, boolean>>({})
  const [loadingCount, setLoadingCount] = useState(0)

  // ── STABLE PER-ID CALLBACKS (the stability law) ───────────────────
  // Minted once per asset id, cached in a ref-map: objectRef /
  // onRigAuto / onLoadingChange / onError keep ONE identity for the
  // asset's whole lifetime, so StageModel's effect deps can never
  // ping-pong. The error row closes over the onAssetError PROP — a
  // changed prop identity is fine (it is read at CALL time, never a
  // dep); only the per-id wrapper identity must stay stable.
  const cbsRef = useRef<Map<string, {
    object: (o: THREE.Group | null) => void
    rig: (v: boolean) => void
    loading: (v: boolean) => void
    error: (msg: string | null) => void
  }>>(new Map())
  const cbsFor = (id: string) => {
    let cbs = cbsRef.current.get(id)
    if (!cbs) {
      cbs = {
        object: (o) => setObjs((prev) => ({ ...prev, [id]: o })),
        rig: (v) => { if (v) setRigOn((prev) => (prev[id] ? prev : { ...prev, [id]: true })) },
        loading: (v) => setLoadingCount((n) => Math.max(0, n + (v ? 1 : -1))),
        error: (msg) => onAssetError?.(id, msg),
      }
      cbsRef.current.set(id, cbs)
    }
    return cbs
  }

  // Prune departed assets (their groups, chips, callbacks, badge
  // slots). Keyed on the id LIST (a stable signature), not the assets
  // array identity — caller re-renders churn the array, never the
  // membership.
  const idSig = useMemo(() => assets.map((a) => a.id).join("\n"), [assets])
  useEffect(() => {
    const live = new Set(idSig ? idSig.split("\n") : [])
    for (const [id] of cbsRef.current) {
      if (!live.has(id)) cbsRef.current.delete(id)
    }
    setObjs((prev) => {
      let changed = false
      const next: Record<string, THREE.Group | null> = {}
      for (const k of Object.keys(prev)) {
        if (live.has(k)) next[k] = prev[k]
        else changed = true
      }
      return changed ? next : prev
    })
    setRigOn((prev) => {
      let changed = false
      const next: Record<string, boolean> = {}
      for (const k of Object.keys(prev)) {
        if (live.has(k)) next[k] = prev[k]
        else changed = true
      }
      return changed ? next : prev
    })
  }, [idSig])

  const handleDrop = useCallback(
    (point: THREE.Vector3, files: File[]) => {
      if (!onDropFiles) return
      onDropFiles([point.x, point.y, point.z], files)
    },
    [onDropFiles],
  )

  const selected = selectedId ? objs[selectedId] : null

  return (
    <div className={`relative w-full ${className || "h-full"}`}>
      <ViewportOverlays overlays={overlays ?? []} />
      <Canvas
        shadows
        camera={{ fov: 35, near: 0.1, far: 100, position: [3, 2.2, 4.5] }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => onSelect?.(null)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[4, 6, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={25}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <directionalLight position={[-4, 4, -3]} intensity={0.3} />

        {assets.map((a) => {
          const cbs = cbsFor(a.id)
          return (
            <StageModel
              key={a.id}
              asset={a}
              onSelect={(id) => onSelect?.(id)}
              showRig={!!rigOn[a.id] || !!a.showRig}
              playing={playing}
              objectRef={cbs.object}
              onRigAuto={cbs.rig}
              onLoadingChange={cbs.loading}
              onError={cbs.error}
            />
          )
        })}

        {onDropFiles && <DropPlane onDropAt={handleDrop} />}

        <Gizmo target={selected} mode={gizmoMode} dragging={setDragging} />

        {/* the workbench floor: a 10m grid — placement reads against
            it, props rest on it */}
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#3f3f46"
          sectionSize={2}
          sectionThickness={1.1}
          sectionColor="#52525b"
          fadeDistance={30}
          infiniteGrid
        />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.5}
          scale={12}
          blur={2.5}
          far={4}
          resolution={1024}
          color="#000000"
        />
        {/* The environment is PROCEDURAL (Lightformers rendered into a small
            env map at runtime) — the preset form fetched an HDR from a
            CDN: an offline SPOF and a hardcoded asset path. This rig
            approximates the studio preset (key + fill + rim + ground
            bounce) with zero network. Identical in Stage and
            AnimatedGLBViewer — the "render the same" order. */}
        <Environment resolution={64} frames={1}>
          <color attach="background" args={["#0a0a0f"]} />
          <Lightformer form="rect" intensity={4} position={[0, 5, -9]} scale={[10, 10, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2} position={[10, 4, 1]} rotation-y={-Math.PI / 2} scale={[16, 4, 1]} target={[0, 0, 0]} />
          <Lightformer form="circle" intensity={2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.5} position={[0, -1, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} target={[0, 0, 0]} />
        </Environment>
      </Canvas>

      {/* selection chip rail: per-asset Rig toggles (skinned only) +
          the loading badge */}
      {assets.length > 0 && (
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
          {assets.map((a) => (
            <Button variant="ghost"
              key={a.id}
              type="button"
              onClick={() => onSelect?.(a.id === selectedId ? null : a.id)}
              className={`rounded-md border px-2 py-1 text-[10px] font-medium backdrop-blur transition-colors ${
                a.id === selectedId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-black/50 text-muted-foreground hover:text-foreground"
              }`}
              title={a.url}
            >
              {a.name ?? a.id}
              {rigOn[a.id] && <span className="ml-1 text-[9px]">·rig</span>}
            </Button>
          ))}
        </div>
      )}
      {loadingCount > 0 && (
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" />
          {loadingCount} loading…
        </div>
      )}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 border-2 border-primary/40" />
      )}
    </div>
  )
}
