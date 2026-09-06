"""fit-seat — the verb-called seating flow (fit-card stroke 3).

Dress + prop verbs (anny) post THIS template through the queue door:
FitRow assembles the meld row from knob initials -> FitProp seats the
prop -> RayRenderGLBViews renders the 8 proof views. The initial names
ARE the verb knob names (the handshake — a mismatch silently drops the
knob, pinned by the stroke-3 wall, never trusted).

Laws this shape keeps:
  - QUEUE LANE LAW — no hardcoded rows: every FitRow input rides an
    initial ($channel); the template carries zero prop/bone facts.
  - INFERENCE LAW — the verbs post {flow: fit-seat} to the queue door,
    never ComfyUI directly; validate-first, verbatim errors.
  - The compile-time door (initial_validators): ghost body/prop files
    4xx BEFORE registration (EstateGlbRef — the photo-ref precedent).
    Knob SHAPE (bad align, conflict rows) refuses in-engine via the
    FitRow gate — loud RuntimeError into the error sidecar (the fit
    CARD stays the fully phase-1-gated door; this split is deliberate:
    duplicating FitParams here would be a second derivation).
  - PLUGIN ARCHITECTURE LAW — row math lives in the poser pack
    (FitRow node); this file only wires nodes into a one-stage flow.
"""

from flow import Flow, Stage, FromInitial, Kind
from melite_models import EstateGlbRef

FLOW = Flow(
    id="fit-seat",
    description=("Seat a static prop onto a SOMAX body under the meld fit "
                 "laws (the dress/prop verb engine): knob initials assemble "
                 "the meld row in-pack, FitProp grafts, the turnaround proves."),
    stages=(
        Stage(
            id="seat",
            engine="comfyui",
            description="FitRow (knobs -> meld row) -> FitProp (graft) -> proof views",
            inputs={
                "body": FromInitial(key="body"),
                "prop": FromInitial(key="prop"),
                "model_name": FromInitial(key="model_name"),
                "bone": FromInitial(key="bone"),
                "align": FromInitial(key="align"),
                "position": FromInitial(key="position"),
                "rotation": FromInitial(key="rotation"),
                "fit_ratio": FromInitial(key="fit_ratio"),
                "fit_ref_bone": FromInitial(key="fit_ref_bone"),
                "fit_ref_bone2": FromInitial(key="fit_ref_bone2"),
                "seat_ratio": FromInitial(key="seat_ratio"),
                "finger_bone": FromInitial(key="finger_bone"),
                "thumb_bone": FromInitial(key="thumb_bone"),
                "target_width": FromInitial(key="target_width"),
            },
            expected={"body": Kind.mesh, "prop": Kind.mesh,
                      "model_name": Kind.text, "bone": Kind.text,
                      "align": Kind.text, "position": Kind.text,
                      "rotation": Kind.text, "fit_ratio": Kind.num,
                      "fit_ref_bone": Kind.text,
                      "fit_ref_bone2": Kind.text,
                      "seat_ratio": Kind.num, "finger_bone": Kind.text,
                      "thumb_bone": Kind.text, "target_width": Kind.num},
            outputs={"seat": Kind.mesh},
            params={
                "out_dir": "./output",
                "timeout_s": 1800,
                "workflow": {
                    "row": {
                        "class_type": "FitRow",
                        "inputs": {
                            "model_name": "$model_name",
                            "bone": "$bone",
                            "align": "$align",
                            "position": "$position",
                            "rotation": "$rotation",
                            "fit_ratio": "$fit_ratio",
                            "fit_ref_bone": "$fit_ref_bone",
                            "fit_ref_bone2": "$fit_ref_bone2",
                            "seat_ratio": "$seat_ratio",
                            "finger_bone": "$finger_bone",
                            "thumb_bone": "$thumb_bone",
                            "target_width": "$target_width",
                        },
                    },
                    "seat": {
                        "class_type": "FitProp",
                        "inputs": {
                            "body_glb_path": "$body",
                            "prop_glb_path": "$prop",
                            "row_json": ["row", 0],
                        },
                    },
                    "views": {
                        "class_type": "RayRenderGLBViews",
                        "inputs": {
                            "glb_path": ["seat", 0],
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
    initial_validators={"body": EstateGlbRef, "prop": EstateGlbRef},
)
