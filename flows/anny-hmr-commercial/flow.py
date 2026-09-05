"""anny-hmr-commercial — the COMMERCIAL photo→Anny chain (SAM 3D Body).

Date: 2026-09-05 · Status: landed (design record
docs/design/commercial-estimator-chain.md — operator orders
"COMMERCIAL. CHAIN." + the licensing acceptance, verbatim there)

License lanes (NEVER crossed — QUEUE LANE LAW: explicit doors, no
fallbacks): this flow rides SAM 3D Body (Meta SAM License,
operator-accepted for commercial games use) → MHR params (Apache
2.0) → mhr2soma (NVlabs SOMA-X, Apache 2.0) →
convert_identity_backend --target-backend anny (Apache 2.0) → fitted
bind-pose GLB. The RESEARCH lane stays anny-hmr (MultiHMR2, NAVER
non-commercial). This flow never imports multihmr2/AnnyFit.

ONE comfyui stage: LoadImage($photo) → Sam3dBodyImageToAnny. The
node spawns the provisioned anny-commercial runtime out-of-process
(torch cu130 + detectron2 — the system nvcc 13.x cannot build
against the serving venv's cu128 stack; the AnnyFitOptimize
subprocess pattern), streams PROGRESS, and emits its GLB on the
three_model ui surface (the harvest downloads it as a run artifact;
the verb hydrates body_glb from artifacts via writes).

The GLB arrives GROUNDED already (bind-pose body, Y-up, feet on the
ground, origin-centered — baked in the worker from anny's native
Z-up), so no AnnyGroundBody stage: nothing in this lane is ever
camera-space. Artifacts: commercial_body.glb + anny_params.npz
(phenotype + local-change rows — the card/slider vocabulary; the
research lane's .pkl is NOT interchangeable: different
parameterization, world vs bind pose).
"""

from flow import Flow, Stage, FromInitial, Kind
from melite_models import EstatePhotoRef

FLOW = Flow(
    id="anny-hmr-commercial",
    description=(
        "The commercial photo→Anny chain (docs/design/"
        "commercial-estimator-chain.md): SAM 3D Body → MHR → SOMA → "
        "anny — every link license-cleared for sale (SAM License "
        "operator-accepted; the rest Apache 2.0). Emits a grounded "
        "bind-pose body GLB + anny phenotype/local-change params."),
    stages=(
        Stage(
            id="estimate",
            engine="comfyui",
            description="SAM 3D Body commercial chain → grounded anny GLB",
            inputs={"photo": FromInitial(key="photo")},
            expected={"photo": Kind.image},
            outputs={"body": Kind.mesh},
            params={
                "out_dir": "./output",
                "timeout_s": 3600,
                "workflow": {
                    "load": {
                        "class_type": "LoadImage",
                        "inputs": {"image": "$photo"},
                    },
                    "s3db": {
                        "class_type": "Sam3dBodyImageToAnny",
                        "inputs": {
                            "image": ["load", 0],
                            "person_index": 0,
                        },
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
