"""kimodo-native — text-to-motion gate (ComfyUI Kimodo lane).

(2026-09-04 flows rework) Converted from flow.yaml. Inline
params.workflow (typed-step-docs rung 3, 2026-09-02): the
workflow_file+inject legacy channel was already retired for this
lane. $prompt resolves through the gateway's inline deep-walk;
seed/duration/steps bake as literals."""

from flow import Flow, Stage, FromInitial

FLOW = Flow(
    id="kimodo-native",
    description=(
        "Text-to-motion gate — ComfyUI Kimodo lane (island nodes, raw "
        "PyTorch kimodo package, local SOMA-RP-v1.1 weights + local "
        "LLM2Vec encoder)."),
    stages=(
        Stage(
            id="t2m",
            engine="comfyui",
            description="Kimodo text-to-pose via live ComfyUI nodes",
            inputs={"prompt": FromInitial(key="prompt")},
            params={
                "out_dir": "./output",
                "timeout_s": 1800,
                "workflow": {
                    "1": {
                        "class_type": "KimodoLoader",
                        "inputs": {"model_name": "Kimodo-SOMA-RP-v1.1"},
                    },
                    "2": {
                        "class_type": "KimodoTextToPose",
                        "inputs": {
                            "model": ["1", 0],
                            "prompt": "$prompt",
                            "seed": 42,
                            "duration_sec": 3,
                            "diffusion_steps": 25,
                            "num_samples": 1,
                        },
                    },
                },
            },
        ),
    ),
)
