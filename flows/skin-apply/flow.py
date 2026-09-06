"""skin-apply — the verb-called skinning flow (skin-card stroke 3).

Apply-skin verbs (anny) post THIS template through the queue door:
SkinPack generates the seeded detail maps -> SkinSidecar assembles the
controller sidecar from THESE knobs -> SkinApply grafts both onto the
body -> the turnaround proves. The initial names ARE the verb knob
names (the handshake — a rename here silently drops the knob, pinned by
the stroke-3 wall, never trusted).

Laws this shape keeps:
  - QUEUE LANE LAW — no hardcoded rows: kind/size/seed ride initials
    ($channel); the template carries zero kind facts (the combo options
    live in-pack, the fit-row precedent).
  - INFERENCE LAW — the verbs post {flow: skin-apply} to the queue door,
    never ComfyUI directly; validate-first, verbatim errors.
  - The compile-time door (initial_validators): ghost body files 4xx
    BEFORE registration (EstateGlbRef). Knob SHAPE (bad kind, bad size)
    refuses in-engine via the SkinSidecar gate — loud RuntimeError into
    the error sidecar.
  - PLUGIN ARCHITECTURE LAW — sidecar math lives in the poser pack
    (SkinSidecar node); this file only wires nodes into a one-stage flow.
"""

from flow import Flow, Stage, FromInitial, Kind
from melite_models import EstateGlbRef

FLOW = Flow(
    id="skin-apply",
    description=("Deterministic skin detail maps onto a SOMAX body under "
                 "the meld skin laws (the apply-skin verb engine): knob "
                 "initials assemble the controller sidecar in-pack, "
                 "SkinApply grafts, the turnaround proves."),
    stages=(
        Stage(
            id="coat",
            engine="comfyui",
            description="SkinPack (maps) -> SkinSidecar (sidecar) -> SkinApply (graft) -> proof views",
            inputs={
                "body": FromInitial(key="body"),
                "kind": FromInitial(key="kind"),
                "map_size": FromInitial(key="map_size"),
                "seed": FromInitial(key="seed"),
            },
            expected={"body": Kind.mesh, "kind": Kind.text,
                      "map_size": Kind.num, "seed": Kind.num},
            outputs={"skin": Kind.mesh},
            params={
                "out_dir": "./output",
                "timeout_s": 1800,
                "workflow": {
                    "pack": {
                        "class_type": "SkinPack",
                        "inputs": {
                            "size": "$map_size",
                            "seed": "$seed",
                        },
                    },
                    "scar": {
                        "class_type": "SkinSidecar",
                        "inputs": {
                            "kind": "$kind",
                            "size": "$map_size",
                            "seed": "$seed",
                        },
                    },
                    "save_albedo": {
                        "class_type": "SaveImage",
                        "inputs": {
                            "images": ["pack", 0],
                            "filename_prefix": "skin_apply/out_albedo",
                        },
                    },
                    "save_normal": {
                        "class_type": "SaveImage",
                        "inputs": {
                            "images": ["pack", 1],
                            "filename_prefix": "skin_apply/out_normal",
                        },
                    },
                    "save_sidecar": {
                        "class_type": "SaveText",
                        "inputs": {
                            "text": ["scar", 0],
                            "filename_prefix": "skin_apply/out_kind",
                            "format": "json",
                        },
                    },
                    "apply": {
                        "class_type": "SkinApply",
                        "inputs": {
                            "body_glb_path": "$body",
                            "albedo": ["pack", 0],
                            "normal": ["pack", 1],
                        },
                    },
                    "views": {
                        "class_type": "RayRenderGLBViews",
                        "inputs": {
                            "glb_path": ["apply", 0],
                            "resolution": 768,
                            "framing": 1.2,
                            "focal_length": 50,
                            "samples": 64,
                            "transparent": True,
                        },
                    },
                },
            },
        ),
    ),
    initial_validators={"body": EstateGlbRef},
)
