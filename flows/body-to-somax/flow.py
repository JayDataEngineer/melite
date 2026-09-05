"""body-to-somax — bare body GLB → SOMAX-rigged GLB (the anny → kimodo
bridge, 2026-09-06).

Operator order, verbatim: "once we get anny output, can it go right
into Kimido (with the auto conversion of ANNY -> Soma happening behind
the scenes?)" + "the conversion is BAKED into the kimido / somax
library, you just have to use the python function. Kimido does motion."

The anny card bakes a BARE MESH (flows/anny-params/bake_params.py:
trimesh export — vertices + faces, no skeleton, no weights — its
runtime has anny but not SOMA rigging). The motion studio's skin path
requires SOMAX (skin.name === "SOMA-Mixamo", 77 joints —
melite-poser-nodes/somax_bake.is_somax_glb). The bridge is the
autorig pack's BAKED function — transfer_soma_weights_and_write_glb
(SOMA-77 template hand-painted LBS weights, barycentric transfer,
no Blender) — exposed by its own node in standalone-rig mode:
KimodoExportFBX(rigged_path="", source_glb=<glb>, file_format="glb")
runs the transfer and returns the rigged GLB (Blender is only in the
fbx/retarget branches — the glb + no-npz path is pure python+torch).

Laws this shape keeps:
  • INFERENCE LAW — the conversion rides the QUEUE as a named flow;
    the studio posts /v1/flows/start, never a straight engine demand.
  • QUEUE LANE LAW — the flow names its pipeline EXPLICITLY; the node
    is declared (plugins/engines/comfyui/models/3d/transfer_rig/
    nodes.yaml + live object_info: KimodoExportFBX carries source_glb).
  • PLUGIN ARCHITECTURE LAW — the rig math lives in the autorig pack
    (its SSOT); this file only wires the node into a one-stage flow.
  • The template asset is the pack's own (skin_standard.npz under
    /opt/kimodo/... — live-probed 2026-09-06), never copied here.

The $glb engine-ABI channel (gateway deep-walk) stages the artifact —
the same channel anny-hmr's $photo uses; the run's three_model
harvest lands the rigged GLB as a mesh artifact the studio skins.
"""

from flow import Flow, Stage, FromInitial, Kind

FLOW = Flow(
    id="body-to-somax",
    description=(
        "Bare body GLB → SOMAX-rigged GLB: the anny→kimodo bridge "
        "(the baked SOMA-77 template weight transfer, standalone-rig "
        "mode — no Blender). The motion studio posts this behind the "
        "scenes when a wired body isn't SOMAX; any bare human mesh "
        "(anny bake, TRELLIS, upload) rides the same door."),
    stages=(
        Stage(
            id="rig",
            engine="comfyui",
            description=(
                "SOMA-77 template weight transfer (barycentric, the "
                "autorig pack's baked function via KimodoExportFBX "
                "standalone-rig mode)"),
            inputs={"glb": FromInitial(key="glb")},
            # mesh in, mesh out — the typed-edges contract
            expected={"glb": Kind.mesh},
            outputs={"body": Kind.mesh},
            params={
                "out_dir": "./output",
                "timeout_s": 600,
                "workflow": {
                    "rig": {
                        "class_type": "KimodoExportFBX",
                        "inputs": {
                            # empty rigged_path + source_glb = the
                            # standalone-rig branch (template weights)
                            "rigged_path": "",
                            "source_glb": "$glb",
                            "file_format": "glb",
                            "npz_path": "",
                            "fps": 30,
                            "in_place": True,
                            # decimation would shed skin weights at
                            # the seams — the preview wants the mesh
                            # intact; export-time decimation is a
                            # deliberate later choice, never here
                            "decimate_ratio": 0.0,
                            "preserve_texture": True,
                        },
                    },
                },
            },
        ),
    ),
)
