"""trellis2-gate — krea concept image in, TRELLIS textured mesh out.

(2026-09-04 flows rework) Converted from flow.yaml; the hardcoded
server_url fossil DROPPED (the engine's _server_url() config/env
seam owns the endpoint)."""

from flow import Flow, Stage, FromInitial, Kind

FLOW = Flow(
    id="trellis2-gate",
    description=(
        "Phase 2 gate: krea concept image in, TRELLIS textured mesh "
        "out — the lane that retires the gateway-side trellis2 C "
        "engine (pixal3d successor proves itself through the queue)."),
    stages=(
        Stage(
            id="img2mesh",
            engine="comfyui",
            description="krea concept -> TRELLIS mesh via live nodes",
            inputs={"prompt": FromInitial(key="prompt")},
            # the flow-typed-edges contract: img2mesh wants text
            # (the krea prompt), produces mesh (the TRELLIS GLB)
            expected={"prompt": Kind.text},
            outputs={"glb": Kind.mesh},
            params={
                "workflow_file": "/home/user/Documents/programs/active/"
                                 "inference.cpp/plugins/engines/comfyui/"
                                 "models/3d/trellis2_gate/img2mesh.json",
                "inject": {
                    "CLIPTextEncode.0.text": "$prompt",
                    "KSampler.0.seed": 42,
                },
                "out_dir": "./output",
                "timeout_s": 2400,
            },
        ),
    ),
)
