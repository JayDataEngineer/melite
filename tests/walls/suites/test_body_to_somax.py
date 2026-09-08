"""body-to-somax — the anny → kimodo bridge (operator order, 2026-09-06,
verbatim: "once we get anny output, can it go right into Kimido (with
the auto conversion of ANNY -> Soma happening behind the scenes?)" +
"the conversion is BAKED into the kimido / somax library, you just
have to use the python function. Kimido does motion.").

The anny bake exports a BARE MESH (no skeleton); the motion studio's
skin path requires SOMAX (SOMA-Mixamo, 77 joints). The bridge is ONE
queue flow wrapping the autorig pack's baked standalone-rig mode —
and the studio posts it behind the scenes on NotSomaxGlbError.

ORACLE DEATH 2026-09-08: the py-runner absolutize leg died with the
oracle (see the cause note in TestTheLiveBridge); all other legs are
keeper-impl-agnostic and stay.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

import os
import unittest

from _anchor import REPO

import flow as flow_mod

MOTION_TSX = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards", "motion",
    "motion-studio", "ui", "studio", "component.tsx")
FLOW_PY = os.path.join(REPO, "flows", "body-to-somax", "flow.py")


def _flow() -> flow_mod.Flow:
    import sys

    if str(REPO / "python") not in sys.path:
        sys.path.insert(0, str(REPO / "python"))
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

    def test_expected_kinds_ride_the_node_row(self) -> None:
        """The 2026-09-06 live incident: Stage.expected existed but
        to_graph dropped it — the runs-relative glb rode the workflow
        verbatim and the node refused "source_glb not found". The
        runner's absolutize seam reads NodeRow.expected; the carry is
        the bridge's load-bearing wire."""
        (node,) = _flow().to_graph().nodes
        self.assertEqual(node.expected, {"glb": "mesh"})

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


class TestTheLiveBridge(unittest.TestCase):
    """The three defects the first LIVE conversion exposed (2026-09-06)
    — each fixed at its SSOT, each pinned here so the bridge can never
    silently regress to a shape that only fails at runtime."""

    def _nodes_src(self) -> str:
        p = os.path.join(
            REPO, "vendor", "comfyui_extensions", "melite-autorig-nodes",
            "nodes.py")
        with open(p, encoding="utf-8") as f:
            return f.read()

    def test_mesh_rides_the_upload_walk(self) -> None:
        """compose/artifact._EXTS carries MESH — without the row a
        .glb rides the workflow untouched and the node refuses
        "source_glb not found" (never staged to input/)."""
        import sys
        if str(REPO / "python") not in sys.path:
            sys.path.insert(0, str(REPO / "python"))
        sys.path.insert(
            0, str(REPO / "packages" / "engines" / "comfyui" / "compose"))
        import artifact as _art
        self.assertTrue(_art.uploads(_art.Kind.MESH))
        self.assertIn(".glb", _art.upload_extensions())

    def test_blender_resolves_lazily(self) -> None:
        """The standalone-rig path (source_glb + glb) is pure
        python+torch; the export node must not demand a Blender binary
        before branching (the headless estate refusal,
        "Blender binary not found"). The lazy sites resolve at use."""
        src = self._nodes_src()
        # no UNCONDITIONAL resolve ahead of the action dispatch —
        # the lazy form (underscore) is the only spelling inside export
        self.assertNotIn(
            "        blender_bin = _resolve_blender_binary()",
            src,
            "blender must resolve at its use sites, never upfront")
        self.assertIn("_blender_bin = _resolve_blender_binary()", src)

    # ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not
    # need parity, we need to migrate, not keep the old machinery"):
    # test_runner_absolutizes_file_kind_refs DELETED WITH CAUSE — the
    # leg unit-called the py serving oracle's runner seam
    # (gateway.absolutize_artifact_refs, the NodeRow.expected
    # absolutize walk). No TS executor equivalent exists as a unit
    # (the TS door owns the artifact-ref sweep instead:
    # doors/flowsValidate.ts resolveArtifactFile + findDanglingRefs;
    # the engine-side upload walk reads compose/artifact.py _EXTS,
    # pinned by the leg above). The seam died with the py runner;
    # the bridge surface stays walled by the flow/studio/vendor/verb
    # legs here. Date: 2026-09-08. Status: landed (oracle-death
    # re-derivation).




class TestTheAnnyVerb(unittest.TestCase):
    """Pipeline step c (operator musing, 2026-09-06): the conversion as
    an ANNY-card option — RigSomaxVerb posts body-to-somax behind the
    scenes. KNOBLESS: no knobs to drop; the chip feeds the stage Body
    into the flow glb initial. The global subaction wall sweeps
    writes/requires/knobs-home/TSX; this pins the verb→flow address.
    """

    def test_verb_posts_the_bridge_flow(self) -> None:
        import sys
        sys.path.insert(0, str(REPO / "python"))
        from melite_cards import SubActionMod
        import importlib.util as _ilu
        path = (REPO / "packages" / "engines" / "comfyui" / "models"
                / "3d" / "anny" / "mods" / "verbs.py")
        spec = _ilu.spec_from_file_location(
            "somax_verb_w", str(path),
            submodule_search_locations=[str(path.parent)])
        mod = _ilu.module_from_spec(spec)
        sys.modules["somax_verb_w"] = mod
        spec.loader.exec_module(mod)
        verb = next(v for v in vars(mod).values()
                    if isinstance(v, type) and issubclass(v, SubActionMod)
                    and getattr(v, "id", None) == "rig-somax")
        self.assertEqual(verb.writes, ("body_glb",))
        self.assertEqual(verb.requires, ("melite-autorig-nodes",))
        self.assertEqual(len(verb.engines), 1)
        self.assertEqual(verb.engines[0].flow, "body-to-somax")
        # card_outputs: the P03 OUTPUT CONTRACT declaration row,
        # not a knob (walled in test_output_contract.py).
        knobs = {k for k in vars(verb) if not k.startswith("_")
                 and k not in ("id", "label", "engines", "writes",
                               "requires", "card_outputs")}
        self.assertEqual(knobs, set())
        self.assertIn("glb", set(_flow().stages[0].inputs))


if __name__ == "__main__":
    unittest.main()
