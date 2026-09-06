"""body-to-somax — the anny → kimodo bridge (operator order, 2026-09-06,
verbatim: "once we get anny output, can it go right into Kimido (with
the auto conversion of ANNY -> Soma happening behind the scenes?)" +
"the conversion is BAKED into the kimido / somax library, you just
have to use the python function. Kimido does motion.").

The anny bake exports a BARE MESH (no skeleton); the motion studio's
skin path requires SOMAX (SOMA-Mixamo, 77 joints). The bridge is ONE
queue flow wrapping the autorig pack's baked standalone-rig mode —
and the studio posts it behind the scenes on NotSomaxGlbError.
"""

import os
import unittest

from _anchor import REPO

import flow as flow_mod

MOTION_TSX = os.path.join(
    REPO, "plugins", "engines", "comfyui", "action_cards", "motion",
    "motion-studio", "ui", "studio", "component.tsx")
FLOW_PY = os.path.join(REPO, "flows", "body-to-somax", "flow.py")


def _flow() -> flow_mod.Flow:
    import sys

    if str(REPO / "py") not in sys.path:
        sys.path.insert(0, str(REPO / "py"))
    return flow_mod.load_flow("body-to-somax")


class TestTheFlow(unittest.TestCase):
    """One stage, the baked node in standalone-rig mode, mesh→mesh."""

    def test_flow_constructs_with_one_stage(self) -> None:
        f = _flow()
        self.assertEqual(f.id, "body-to-somax")
        self.assertEqual([s.id for s in f.stages], ["rig"])

    def test_the_baked_node_in_standalone_rig_mode(self) -> None:
        f = _flow()
        wf = f.stages[0].params["workflow"]
        self.assertIn("rig", wf)
        rig = wf["rig"]
        self.assertEqual(rig["class_type"], "KimodoExportFBX")
        inputs = rig["inputs"]
        # standalone-rig branch: empty rigged_path + source_glb
        self.assertEqual(inputs["rigged_path"], "")
        self.assertEqual(inputs["source_glb"], "$glb")
        # glb + no npz = the no-Blender path (pure transfer + return)
        self.assertEqual(inputs["file_format"], "glb")
        self.assertEqual(inputs["npz_path"], "")
        # decimation sheds skin weights at the seams — never here
        self.assertEqual(inputs["decimate_ratio"], 0.0)

    def test_typed_edges_mesh_to_mesh(self) -> None:
        f = _flow()
        stage = f.stages[0]
        self.assertIn("glb", stage.inputs)
        self.assertEqual(stage.expected["glb"], flow_mod.Kind.mesh)
        self.assertEqual(stage.outputs["body"], flow_mod.Kind.mesh)

    def test_the_flow_names_its_pipeline_explicitly(self) -> None:
        """QUEUE LANE LAW: a named flow dir + FLOW id — no fallback
        composition, no hardcoded engine endpoints."""
        self.assertTrue(
            os.path.isfile(FLOW_PY),
            "flows/body-to-somax/flow.py is the SSOT of this bridge",
        )
        src = open(FLOW_PY, encoding="utf-8").read()
        self.assertNotIn("33081", src, "no hardcoded endpoints in a flow")
        self.assertNotIn("http://", src, "no urls in a flow")


class TestTheStudioSeam(unittest.TestCase):
    """The motion studio converts BEHIND THE SCENES on
    NotSomaxGlbError — through the queue door, once (no retry)."""

    def setUp(self) -> None:
        self.src = open(MOTION_TSX, encoding="utf-8").read()

    def test_not_somax_triggers_the_queue_convert(self) -> None:
        self.assertIn(
            "e instanceof NotSomaxGlbError",
            self.src,
            "the NotSomaxGlbError branch is the convert seam",
        )
        self.assertIn(
            '"body-to-somax"',
            self.src,
            "the studio posts the named flow — never an engine demand",
        )
        self.assertIn(
            '"/v1/flows/start"',
            self.src,
            "through the queue door (INFERENCE LAW)",
        )

    def test_converted_glb_skins_not_fallback_only(self) -> None:
        self.assertRegex(
            self.src,
            r"loadGlbSkin\(rigged\)",
            "the converted GLB must actually skin (the success path)",
        )

    def test_failure_keeps_the_mannequin_fallback(self) -> None:
        self.assertIn(
            "auto-convert failed",
            self.src,
            "a failed convert surfaces loudly and falls back — never a "
            "dead viewport",
        )


if __name__ == "__main__":
    unittest.main()
