"""anny-hmr — photo → Anny body GLB via the estimator pack (pilot stroke 1).

Date: 2026-09-05 · Status: landed (pilot record docs/plans/anny-pilot.md
§4 stroke 1 — HMR as the first SUB-ACTION verb; pattern doctrine
docs/design/anny-evolution.md §3, verb UX docs/design/studio-shell.md §4).

ONE comfyui stage, inline params.workflow (the kimodo-native shape):
LoadImage($photo) → MultiHMR2ImageToAnny (regression) →
AnnySelectPerson (loud single-person lock, index 0). The HMR node
emits its meshes on the `three_model` ui surface (pack nodes.py
estimate() returns {"ui": {"three_model": [...]}}), which the comfyui
engine's harvest already downloads as run artifacts (compose/native.py
_fetch_outputs "three_model" kind) — the verb hydrates body_glb from
those artifacts via writes.

Node signatures are verbatim from the LIVE pin
(plugins/engines/comfyui/data/object_info.json — MultiHMR2ImageToAnny,
AnnySelectPerson; NEVER retyped from memory): required knobs baked as
literals (conf_thresh 0.4, dist_thresh_nms 0.25, save_anny_params /
save_mesh true, render false, filename_prefix anny/multihmr2). The
photo arrives on the $photo engine-ABI channel (gateway deep-walk),
never retyped beside the edge.

SINGLE STAGE ON PURPOSE: a multi-stage comfyui→comfyui file handoff
does not resolve — the engine returns {prompt_id} into carry, never
upstream file paths, so a FromStage mesh wire would refuse at
resolve_inputs (runtime), not construction. The pack chain is designed
in-graph (SelectPerson's tooltip: "wire
MultiHMR2ImageToAnny.mesh_paths").

CARD STATUS 2026-09-06: the anny card offers the COMMERCIAL flow
only (operator order "I ONLY WANT HTE COMMERICAL FLOW. I DON't WANT
A DROPDOWN DUDE") — this research lane stays a runnable flow in the
tree but the chip no longer posts it, and the refine refusal button
is gone with it (no dead buttons). No server_url fossil (QUEUE LANE
LAW: the engine's config/env seam owns the endpoint).
"""

from flow import Flow, Stage, FromInitial, Kind
from melite_models import EstatePhotoRef

FLOW = Flow(
    id="anny-hmr",
    description=(
        "Pilot stroke 1 (docs/plans/anny-pilot.md §4): photo → Anny "
        "body GLB via the estimator pack (MultiHMR2 regression + "
        "loud single-person lock) — the first SUB-ACTION verb's flow "
        "template; the anny card's HMR chip runs this through the "
        "queue and hydrates body_glb from its artifacts."),
    stages=(
        Stage(
            id="estimate",
            engine="comfyui",
            description="MultiHMR2 regression + loud single-person lock",
            inputs={"photo": FromInitial(key="photo")},
            # the flow-typed-edges contract: estimate wants an image,
            # produces a mesh (the three_model harvest). A wire feeding
            # image into a mesh input (or vice versa) refuses AT
            # CONSTRUCTION — pinned by the anny-hmr wall.
            expected={"photo": Kind.image},
            outputs={"body": Kind.mesh},
            params={
                "out_dir": "./output",
                "timeout_s": 1800,
                "workflow": {
                    "load": {
                        "class_type": "LoadImage",
                        "inputs": {"image": "$photo"},
                    },
                    "hmr": {
                        "class_type": "MultiHMR2ImageToAnny",
                        "inputs": {
                            "image": ["load", 0],
                            "conf_thresh": 0.4,
                            "dist_thresh_nms": 0.25,
                            "lowres": False,
                            "save_anny_params": True,
                            "save_mesh": True,
                            "render": False,
                            "filename_prefix": "anny/multihmr2",
                        },
                    },
                    "select": {
                        "class_type": "AnnySelectPerson",
                        "inputs": {
                            "mesh_paths": ["hmr", 2],
                            "index": 0,
                        },
                    },
                    # camera-space mesh -> WORLD body (Y-up, feet
                    # grounded, origin-centered) — the estimator's
                    # GLBs float at camera distance (live-probed:
                    # centered z≈1.85); hydrating them raw into the
                    # card's body_glb would misplace the turnaround.
                    # AnnyGroundBody is the estimator→card bridge.
                    "ground": {
                        "class_type": "AnnyGroundBody",
                        "inputs": {"glb_path": ["select", 0]},
                    },
                },
            },
        ),
    ),
    # THE compile-time door (operator order, 2026-09-06:
    # "WHERE THE [REDACTED 2026-11-05] IS COMPILE TIME ERRORS"): a photo that
    # is browser-local or points at nothing on disk 4xxes at
    # the start/validate doors — BEFORE any run registers —
    # never a queued run dying in the engine with a node
    # traceback.
    initial_validators={"photo": EstatePhotoRef},
)
