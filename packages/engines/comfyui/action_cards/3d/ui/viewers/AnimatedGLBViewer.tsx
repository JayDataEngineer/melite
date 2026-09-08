// AnimatedGLBViewer — displays a baked animated GLB in a Three.js canvas.
//
// This is the final stage of the Pose Studio baking flow:
//   1. User drops a SOMAX GLB into Pose Studio (TRELLIS → SOMAX output)
//   2. User generates SOMA-77 motion via Kimodo text-to-pose
//   3. /poser/somax/bake writes the motion as glTF animation channels onto
//      the SOMAX-77 skeleton (skin.name === "SOMA-Mixamo") — no Blender,
//      no retargeting, the joint hierarchy already matches one-to-one
//   4. THIS component displays the result — the user's character with
//      original textures moving with the generated motion
//
// Uses GLTFLoader to parse the GLB (preserving materials, textures, skeleton,
// skin weights) and AnimationMixer to play the embedded animation clip.

import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Environment, Lightformer } from "@react-three/drei"
import * as THREE from "three"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import { Button } from "@melite/ui/button"
import { Loader2 } from "lucide-react"
import { loadGLB } from "@melite/formats/glbLoad"

// GLB loading rides the estate's shared kernel (@melite/formats
// glbLoad): one DRACO-configured loader — LOCAL decoder files, no CDN —
// identical parse behavior in every viewer (the 2026-09-05 audit order:
// "they should all render the same, and share most render code").

// ── AnimatedModel (inside Canvas) ─────────────────────────────────────────

function AnimatedModel({
  gltf,
  playing,
  playbackSpeed = 1,
  showRig = false,
}: {
  gltf: GLTF
  playing: boolean
  playbackSpeed?: number
  showRig?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)

  useEffect(() => {
    if (!groupRef.current) return

    // Add the loaded scene to our group.
    groupRef.current.clear()
    groupRef.current.add(gltf.scene)

    // Auto-scale: compute bounding box and center+scale the model to fit
    // a ~2m tall viewing volume. Different sources (TRELLIS, SkinToken,
    // AniGen) use wildly different scales — this normalizes them.
    const box = new THREE.Box3().setFromObject(gltf.scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = maxDim > 0 ? 2.0 / maxDim : 1
    groupRef.current.scale.setScalar(scale)
    // Re-center horizontally, place feet at y=0.
    groupRef.current.position.x = -center.x * scale
    groupRef.current.position.z = -center.z * scale
    groupRef.current.position.y = -box.min.y * scale

    // Enable shadows on all meshes.
    gltf.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })

    // Set up the AnimationMixer for baked motion playback.
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(gltf.scene)
      const clip = gltf.animations[0]
      const action = mixer.clipAction(clip)
      action.reset()
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.play()
      mixerRef.current = mixer
      actionRef.current = action
    }

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        mixerRef.current.uncacheRoot(gltf.scene)
        mixerRef.current = null
      }
      actionRef.current = null
    }
  }, [gltf])

  // Play/pause control.
  useEffect(() => {
    if (actionRef.current) {
      actionRef.current.paused = !playing
    }
  }, [playing])

  // Rig overlay (2026-09-04): SkeletonHelper through the mesh, for the
  // RIGGED-no-clips outputs — transfer_rig's copied weights/joints and
  // anny's composite render in bind pose; the skeleton is the
  // artifact's whole point and must be inspectable in THIS shared
  // viewer (all three 3d cards land here: trellis static lift, anny
  // composite, transfer_rig rig copy).
  useEffect(() => {
    if (!groupRef.current) return
    if (!showRig) return
    const helper = new THREE.SkeletonHelper(gltf.scene)
    // Draw through the mesh, on top: the rig is inspection data, not
    // scene decoration.
    ;(helper.material as THREE.LineBasicMaterial).depthTest = false
    helper.renderOrder = 999
    ;(helper.material as THREE.LineBasicMaterial).transparent = true
    groupRef.current.add(helper)
    return () => {
      groupRef.current?.remove(helper)
      // dispose the helper's geometry/material (unique to it)
      helper.geometry.dispose()
      ;(helper.material as THREE.Material).dispose()
    }
  }, [gltf, showRig])

  // Advance the mixer each frame.
  useFrame((_, delta) => {
    if (mixerRef.current && playing) {
      mixerRef.current.update(delta * playbackSpeed)
    }
  })

  return <group ref={groupRef} />
}

// ── Loading overlay ──────────────────────────────────────────────────────

function LoadingOverlay({ label = "Loading character…" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-2 text-muted-foreground bg-black/60 backdrop-blur px-6 py-4 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-[10px]">{label}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export function AnimatedGLBViewer({
  glbUrl,
  playing = true,
  playbackSpeed = 1,
  darkMode = true,
  className = "",
}: {
  // Optional at the type level too — the no-URL guard renders the explicit
  // fallback affordance (every current caller passes it; the component
  // defends against absence rather than rendering blank).
  glbUrl?: string
  playing?: boolean
  playbackSpeed?: number
  darkMode?: boolean
  className?: string
}) {
  // Load the GLB outside the Canvas so we can manage loading/error state
  // cleanly without R3F Suspense complications.
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Rig inspection (2026-09-04): auto-ON when the artifact is a
  // skinned mesh WITHOUT animation clips (the transfer_rig / anny
  // shape — bind pose would otherwise hide the rig entirely); manual
  // chip toggle when clips exist (inspect the skeleton under motion).
  const [rigAvailable, setRigAvailable] = useState(false)
  const [showRig, setShowRig] = useState(false)

  useEffect(() => {
    // No URL → nothing to load; the render guard below carries the
    // affordance. (Keeps loader.load(undefined) from rejecting noisily.)
    if (!glbUrl) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setGltf(null)
    setRigAvailable(false)
    setShowRig(false)

    loadGLB(glbUrl)
      .then((g) => {
        if (cancelled) return
        setGltf(g)
        setLoading(false)
        let skinned = false
        g.scene.traverse((obj) => {
          if (obj instanceof THREE.SkinnedMesh) skinned = true
        })
        setRigAvailable(skinned)
        const hasClips = !!(g.animations && g.animations.length > 0)
        // no clips + rig → show the skeleton (bind pose is otherwise
        // indistinguishable from a static mesh — the transfer claim
        // would be unverifiable in the UI)
        setShowRig(skinned && !hasClips)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [glbUrl])

  // No URL at all — the explicit affordance, never a blank viewport (the
  // 2026-08-12 stub-returning-null contract). After the hooks so their
  // order stays stable between the two branches.
  if (!glbUrl) {
    return (
      <div className={`relative flex w-full items-center justify-center ${className || "h-full"}`}>
        <span className="text-[10px] text-muted-foreground">No 3D asset URL</span>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className || "h-full"}`}>
      <Canvas
        shadows
        camera={{ fov: 35, near: 0.1, far: 100, position: [0, 1.2, 4.0] }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: darkMode ? "var(--background)" : "#f0f0f0" }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[3, 5, 2]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={20}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />
        <directionalLight position={[-3, 3, -2]} intensity={0.3} />

        {/* The animated model */}
        {gltf && (
          <AnimatedModel
            gltf={gltf}
            playing={playing}
            playbackSpeed={playbackSpeed}
            showRig={showRig}
          />
        )}

        {/* Environment for PBR materials (image-based lighting) */}
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

        {/* Ground contact shadows */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.5}
          scale={6}
          blur={2.5}
          far={4}
          resolution={1024}
          color={darkMode ? "#000000" : "#888888"}
        />

        <OrbitControls
          target={[0, 1, 0]}
          enablePan={true}
          minDistance={1}
          maxDistance={10}
          maxPolarAngle={Math.PI * 0.95}
        />
      </Canvas>

      {/* Loading overlay while GLB is being fetched/parsed */}
      {loading && <LoadingOverlay />}
      {/* Rig inspection chip — present when the artifact carries a
          skeleton (all three 3d cards' rigged outputs); toggles the
          SkeletonHelper overlay. Auto-on for rigged-no-clips outputs. */}
      {rigAvailable && !loading && !error && (
        <Button
          type="button"
          onClick={() => setShowRig((v) => !v)}
          className={`absolute top-2 right-2 z-10 rounded-md border px-2 py-1 text-[10px] font-medium backdrop-blur transition-colors ${
            showRig
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-black/50 text-muted-foreground hover:text-foreground"
          }`}
          title="Toggle skeleton overlay (the rig this artifact carries)"
        >
          Rig
        </Button>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-1 text-destructive bg-black/80 backdrop-blur px-6 py-4 rounded-lg max-w-xs text-center">
            <span className="text-[10px] font-medium">Failed to load character</span>
            <span className="text-[9px] text-muted-foreground">{error.slice(0, 120)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
