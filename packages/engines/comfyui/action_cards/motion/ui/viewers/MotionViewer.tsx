/**
 * MotionViewer — renders a Kimodo motion NPZ on the NEUTRAL SOMAX bind mesh.
 *
 * This is a faithful client-side port of the kimodo demo's
 * vendor/kimodo/kimodo/viz/soma_skin.py SOMASkin.skin()+lbs(). The demo is
 * the reference renderer for Kimodo motions, and it skins on a NEUTRAL mesh
 * (skin_standard.npz: bind vertices + LBS weights for the SOMA-77 skeleton),
 * NOT a parametric body. That neutral mesh is the "base SOMAX mesh" that
 * actually deforms — distinct from the poser backend's `soma` engine (static,
 * no LBS weights, can't deform) and from `anny`/`mhr` (parametric bodies with
 * their own proportions).
 *
 * Flow (all client-side, no backend round-trip):
 *   1. Fetch the motion NPZ → posed_joints (T, 77, 3) + global_rot_mats
 *      (T, 77, 3, 3), both in METERS (Kimodo's native unit).
 *   2. Load the neutral skin (the kimodo provision door
 *      /v1/models/kimodo/provisions/skin_standard.npz — declared row,
 *      mount-streamed or on-demand acquired; module-cached) → bind
 *      vertices, faces, LBS indices/weights, inverse bind rig.
 *   3. For each frame, run LBS: affine[j] = (fk[j] · bindRigInv[j])[:3, :],
 *      v' = Σ_w weights[v,w] · (affine[indices[v,w]] · [bindV, 1]).
 *   4. Build a BufferGeometry from the neutral bind mesh; drive the position
 *      attribute per-frame from the deformed verts (already meters).
 *
 * Units: meters throughout. No cm↔m conversion — that was a poser-route
 * artifact. Floor lift + camera framing adapt to the figure's real bounds.
 *
 * Distinct from AnimatedGLBViewer (baked GLB clips) and PoseViewer3D (the
 * pose-editing scene). This is a lightweight autoplay preview for the assets
 * gallery: Kimodo motions carry no mesh, so we drape them over the neutral
 * SOMAX mesh exactly as the kimodo demo does.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, ContactShadows } from "@react-three/drei"
import * as THREE from "three"
import { Play, Pause, AlertTriangle } from "../../../ui-icons"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { ScrubInput, Tip } from "../../../form-fields"
import { Skeleton } from "../../../skeleton"
import { loadSomaSkin, type SomaSkin } from "@melite/formats"
import { loadMotionNpz, precomputeDeformedVerts } from "@melite/formats"
import styles from "./MotionViewer.module.css"

const FLOOR_LIFT_Y = 0.02

// ── Geometry: neutral bind mesh, meters ────────────────────────────────────

function buildSkinGeometry(skin: SomaSkin): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(skin.bindVertices.slice(), 3))
  // faces arrive as a Uint32Array (converted from int64 at load). Three.js
  // wants a typed index; Uint32 covers the 18056-vert topology.
  geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(skin.faces), 1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

function computeFloorLift(deformedFlat: Float32Array): number {
  let minY = Infinity
  for (let i = 1; i < deformedFlat.length; i += 3) {
    if (deformedFlat[i] < minY) minY = deformedFlat[i]
  }
  return isFinite(minY) ? FLOOR_LIFT_Y - minY : FLOOR_LIFT_Y
}

// ── Animated mesh ──────────────────────────────────────────────────────────

function AnimatedMesh({
  skin,
  deformedFlat,
  frameIdxRef,
  liftY,
}: {
  skin: SomaSkin
  deformedFlat: Float32Array
  frameIdxRef: React.MutableRefObject<number>
  liftY: number
}) {
  const geo = useMemo(() => buildSkinGeometry(skin), [skin])
  const numVerts = skin.vertexCount
  const lastUploaded = useRef(-1)

  const uploadFrame = useCallback(
    (idx: number) => {
      const pos = geo.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      const stride = numVerts * 3
      const frameCount = deformedFlat.length / stride
      if (frameCount < 1) return
      const clamped = Math.max(0, Math.min(idx, Math.floor(frameCount) - 1))
      const base = clamped * stride
      // Already meters — copy straight in.
      arr.set(deformedFlat.subarray(base, base + stride), 0)
      pos.needsUpdate = true
      geo.computeVertexNormals()
      geo.computeBoundingSphere()
      lastUploaded.current = clamped
    },
    [geo, deformedFlat, numVerts],
  )

  useFrame(() => {
    const target = frameIdxRef.current
    if (target !== lastUploaded.current) uploadFrame(target)
  })

  useEffect(() => {
    uploadFrame(frameIdxRef.current)
  }, [uploadFrame, frameIdxRef])

  return (
    <group position={[0, liftY, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#9bd0f7"
          roughness={0.55}
          metalness={0.05}
          flatShading={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// ── Playback clock ─────────────────────────────────────────────────────────

function PlaybackClock({
  frameCount,
  fps,
  playingRef,
  frameIdxRef,
  playGenRef,
}: {
  frameCount: number
  fps: number
  playingRef: React.MutableRefObject<boolean>
  frameIdxRef: React.MutableRefObject<number>
  playGenRef: React.MutableRefObject<number>
}): null {
  const timeRef = useRef(0)
  const lastGen = useRef(-1)
  useFrame((_, delta) => {
    if (frameCount < 1) return
    if (playingRef.current && playGenRef.current !== lastGen.current) {
      lastGen.current = playGenRef.current
      timeRef.current = (frameIdxRef.current / fps) || 0
    }
    if (!playingRef.current) return
    timeRef.current += Math.min(delta, 0.1)
    const frameDuration = 1 / fps
    frameIdxRef.current = Math.floor(timeRef.current / frameDuration) % frameCount
  })
  return null
}

// ── Adaptive camera framing ────────────────────────────────────────────────

function CameraRig({ framing }: { framing: { centerY: number; height: number } | null }): null {
  const controls = useThree((s) => s.controls) as unknown as
    { target: THREE.Vector3; update: () => void } | null
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    if (!framing) return
    const dist = Math.max(1.6, framing.height * 2.4)
    camera.position.set(0, framing.centerY + framing.height * 0.15, dist)
    if (controls) {
      controls.target.set(0, framing.centerY, 0)
      controls.update()
    } else {
      camera.lookAt(0, framing.centerY, 0)
    }
  }, [framing, camera, controls])
  return null
}

// ── Scene ──────────────────────────────────────────────────────────────────

function Scene({
  skin,
  deformedFlat,
  frameCount,
  fps,
  liftY,
  framing,
  playingRef,
  frameIdxRef,
  playGenRef,
}: {
  skin: SomaSkin
  deformedFlat: Float32Array
  frameCount: number
  fps: number
  liftY: number
  framing: { centerY: number; height: number } | null
  playingRef: React.MutableRefObject<boolean>
  frameIdxRef: React.MutableRefObject<number>
  playGenRef: React.MutableRefObject<number>
}) {
  return (
    <>
      <OrbitControls
        makeDefault
        target={[0, 0.9, 0]}
        enableDamping
        dampingFactor={0.1}
        minDistance={0.6}
        maxDistance={12}
        maxPolarAngle={Math.PI / 1.85}
      />
      <CameraRig framing={framing} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.3} />
      <hemisphereLight args={["#cdd6f4", "#1a1a2e", 0.35]} />

      <AnimatedMesh
        skin={skin}
        deformedFlat={deformedFlat}
        frameIdxRef={frameIdxRef}
        liftY={liftY}
      />
      <PlaybackClock
        frameCount={frameCount}
        fps={fps}
        playingRef={playingRef}
        frameIdxRef={frameIdxRef}
        playGenRef={playGenRef}
      />

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.5}
        scale={6}
        blur={2.5}
        far={4}
        resolution={1024}
        color="#000000"
      />
      <gridHelper args={[10, 40, "#3a3a4a", "#22222e"]} position={[0, 0, 0]} />
    </>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

interface MotionViewerProps {
  url: string
  className?: string
}

export default function MotionViewer({ url, className }: MotionViewerProps) {
  const [skin, setSkin] = useState<SomaSkin | null>(null)
  const [deformedFlat, setDeformedFlat] = useState<Float32Array | null>(null)
  const [frameCount, setFrameCount] = useState(0)
  const [fps, setFps] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [playing, setPlaying] = useState(true)
  const playingRef = useRef(true)
  const frameIdxRef = useRef(0)
  const playGenRef = useRef(0)
  const [displayFrame, setDisplayFrame] = useState(0)

  useEffect(() => {
    playingRef.current = playing
    if (playing) playGenRef.current += 1
  }, [playing])

  // ── Load NPZ → neutral skin → client-side LBS for all frames ────────────
  // The load + precompute live in lib/motionNpz (single source of truth —
  // the Motion Card editor consumes the same functions).
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)

        const motion = await loadMotionNpz(url)
        if (cancelled) return

        // Neutral SOMA skin (cached). Mirrors the kimodo demo's soma_skin path.
        const somaSkin = await loadSomaSkin()
        if (cancelled) return

        // Run LBS for every frame (meters, exactly as the demo does).
        const allVerts = precomputeDeformedVerts(motion, somaSkin)
        if (cancelled) return

        setSkin(somaSkin)
        setDeformedFlat(allVerts)
        setFrameCount(motion.T)
        setFps(motion.fps)
        setLoading(false)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load motion")
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [url])

  const liftY = useMemo(
    () => (deformedFlat ? computeFloorLift(deformedFlat) : 0),
    [deformedFlat],
  )

  const framing = useMemo(() => {
    if (!deformedFlat) return null
    let minY = Infinity, maxY = -Infinity
    for (let i = 1; i < deformedFlat.length; i += 3) {
      const y = deformedFlat[i]
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    if (!isFinite(minY)) return null
    return { centerY: (minY + maxY) / 2 + liftY, height: maxY - minY }
  }, [deformedFlat, liftY])

  useEffect(() => {
    if (loading || error || frameCount < 1) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName) || el?.isContentEditable) return
      if (e.code === "Space") {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [loading, error, frameCount])

  useEffect(() => {
    if (loading || error || frameCount < 1) return
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      if (t - last > 66) {
        setDisplayFrame(frameIdxRef.current)
        last = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [loading, error, frameCount])

  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  const seek = useCallback(
    (frac: number) => {
      if (frameCount < 1) return
      const frame = Math.max(0, Math.min(frameCount - 1, Math.round(frac * (frameCount - 1))))
      frameIdxRef.current = frame
      setDisplayFrame(frame)
      setPlaying(false)
    },
    [frameCount],
  )

  const totalSec = frameCount > 0 && fps > 0 ? frameCount / fps : 0
  const curSec = fps > 0 ? displayFrame / fps : 0
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s - m * 60
    return `${m}:${r.toFixed(1).padStart(4, "0")}`
  }

  if (error) {
    return (
      <div className={className ? `${styles.stateBox} ${className}` : styles.stateBox}>
        <AlertTriangle className={styles.stateIcon} />
        <div className={styles.stateTitle}>Motion preview unavailable</div>
        <div className={styles.stateDetail}>{error}</div>
      </div>
    )
  }

  if (loading || !skin || !deformedFlat) {
    // Skeleton fills the viewer box while the motion data loads — reads
    // as "filling in" instead of a spinning dot.
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading motion"
        className={className ? `${styles.loadingBox} ${className}` : styles.loadingBox}
      >
        <Skeleton className={styles.loadingSkeleton} />
      </div>
    )
  }

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <Canvas
        shadows
        camera={{ position: [0, 1.2, 3.5], fov: 40, near: 0.05, far: 50 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0a0a0f")
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.0
        }}
      >
        <Scene
          skin={skin}
          deformedFlat={deformedFlat}
          frameCount={frameCount}
          fps={fps}
          liftY={liftY}
          framing={framing}
          playingRef={playingRef}
          frameIdxRef={frameIdxRef}
          playGenRef={playGenRef}
        />
      </Canvas>

      {frameCount > 0 && (
        <div className={styles.transport}>
          <Tip tip={playing ? "Pause (Space)" : "Play (Space)"}>
            <Button variant="ghost"
              onClick={togglePlay}
              className={styles.playBtn}
              aria-label={playing ? "Pause (Space)" : "Play (Space)"}
            >
              {playing ? <Pause className={styles.playIcon} /> : <Play className={`${styles.playIcon} ${styles.playIconNudge}`} />}
            </Button>
          </Tip>

          <div className={styles.scrubWrap}>
            <div className={styles.scrubTrack} />
            <div
              className={styles.scrubPlayed}
              style={{ width: `${frameCount > 1 ? (displayFrame / (frameCount - 1)) * 100 : 0}%` }}
            />
            <ScrubInput
              min={0}
              max={Math.max(0, frameCount - 1)}
              value={displayFrame}
              onChange={(e) => seek(Number(e.target.value) / Math.max(1, frameCount - 1))}
              aria-label="Seek"
            />
            <div
              className={styles.scrubKnob}
              style={{ left: `${frameCount > 1 ? (displayFrame / (frameCount - 1)) * 100 : 0}%` }}
            />
          </div>

          <div className={styles.timeLabel}>
            {fmt(curSec)} / {fmt(totalSec)}
          </div>
          <div className={styles.fpsBadge}>
            {fps.toFixed(0)} fps · {frameCount}f
          </div>
        </div>
      )}
    </div>
  )
}
