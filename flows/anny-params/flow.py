"""anny-params — preset params → grounded Anny body GLB (stroke 3).

Date: 2026-09-06 · Status: landed (design record
docs/design/anny-evolution.md §2 + §5 stroke 3 — the preset-load
verb's flow template).

ONE comfyui stage: AnnyParamsToGlb($params_json) — the estimator
pack instantiates the canonical node dialect (CharacterPreset.
canonical_json) out-of-process in the provisioned anny-commercial
runtime (the Sam3dBodyImageToAnny pattern) and emits the GLB on the
three_model ui surface (harvested as a run artifact; the verb
hydrates body_glb from artifacts via writes).

params_json arrives on the $params_json engine-ABI channel (gateway
deep-walk) — the studio POSTs the presets-door row VERBATIM (the
wall pins the construction); preset_id rides the start body unwired
(run-doc provenance, never a second params source). The GLB arrives
GROUNDED already (bind-pose body, Y-up, feet on the ground,
origin-centered — baked from anny's native Z-up), so no
AnnyGroundBody stage.
"""

from flow import Flow, Stage, FromInitial, Kind
from melite_models import AnnyBakeParams

FLOW = Flow(
    id="anny-params",
    description=(
        "Stroke 3 (docs/design/anny-evolution.md §2): preset params "
        "→ grounded Anny body GLB (authored 11-dim rows + verbatim "
        "estimated runs re-instantiate bit-exact) — the preset-load "
        "verb's flow template; the anny card's preset picker runs "
        "this through the queue and hydrates body_glb from its "
        "artifacts."),
    stages=(
        Stage(
            id="instantiate",
            engine="comfyui",
            description="Preset params → grounded anny GLB",
            inputs={"params_json": FromInitial(key="params_json")},
            expected={"params_json": Kind.text},
            outputs={"body": Kind.mesh},
            params={
                "out_dir": "./output",
                "timeout_s": 600,
                "workflow": {
                    "bake": {
                        "class_type": "AnnyParamsToGlb",
                        "inputs": {"params_json": "$params_json"},
                    },
                },
            },
        ),
    ),
    # THE COMPILE-TIME DIALECT DOOR (operator order, 2026-09-06:
    # "Where is MY GOD DAMNED COMPILE TIME VALIDATION?" — the child
    # preset's list-shaped local_changes reached the NODE and died on
    # the GPU with a traceback). The gateway validates params_json
    # against AnnyBakeParams at the start/validate doors — BEFORE any
    # run registers — so a bad dialect 4xxes with a field-clean
    # message. The node keeps its guard (belt).
    initial_validators={"params_json": AnnyBakeParams},
)
