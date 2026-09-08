"""test_cpp_engines.py — the native-engine category's gates.

The category (operator order, 2026-10-02): packages/engines/cpp/ —
vendored native engines as submodules, compose-first plugins on top.
(anyCreature moved to packages/engines/node/ 2026-09-06 — a node.js
CLI, never C++; its rows stay in this suite via the CARDS table's
category column until a node suite earns them.)

THE CARD PATTERN alignment (2026-10-02, second pass): the compose
gates drive the BUS (plugins.compose) — the exact call path the
gateway walks. The first pass tested the arms directly with a 5-arg
signature the bus never speaks, and a fatal arity mismatch rode
through green. Never again: the bus IS the gate.

Covers:
- discovery: all six engine types (depth-2 + the cpp depth-3 category)
- the bus contract: card_compose(body, model, run_id, graph) -> the
  arm's (rc, Skeleton, extra, error); phase 1 refuses with rc=-3 +
  the exact message; phase 2 emits a one-node skeleton whose params
  carry the workflow dict (THE ACTION CARD LAW)
- the card pattern: python/compose.py + python/schema.py + python/renderer.py in
  every card tree; the plugin compose/ is a pure dispatcher
- renderer argv: the CLI truth lives in the card's renderer.py
- model rows: variants/cells/artifacts (sha256+bytes), gated smplx
  ships NO cells; card_knobs tuples are the knob SSOT (LAYER AUDIT:
  every card field has a knob row on every model it boards)
- vendor law: submodule pins in .gitmodules, the vendored trees carry
  the engines
"""

import os
import re
import sys
import unittest
from types import ModuleType
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from melite_models import Model

from _anchor import REPO

import flow_graph
import plugins


def _seed_graph(engine: str) -> flow_graph.Skeleton:
    """A legal one-node skeleton seed for the bus call (the caller's
    own graph object — the bus replaces it in phase 2)."""
    row = flow_graph.NodeRow(
        node_id="seed", node_type=engine, input_from=(),
        params={"workflow": {"seed": True}})
    return flow_graph.Skeleton(name="seed", engine_type=engine,
                                   nodes=(row,))


def _bus(body: dict[str, dict[str, str | int | float | bool | list[str] | dict[str, str | int | float | bool | list[str]]]], model: str, run_id: str, engine: str) -> tuple[flow_graph.FlowGraph, dict[str, str | int | dict[str, str | int | float | bool]] | None]:
    """The gateway's exact hop: card_hooks.compose -> plugins.compose."""
    return plugins.compose(body, model, run_id, _seed_graph(engine),
                           [engine])


class TestDiscovery(unittest.TestCase):
    def test_five_engine_types_discover(self) -> None:
        """Five live engine types. ffmpeg_concat retired 2026-09-04:
        concat rides comfyui's VHS / melite-audio-nodes; the
        CLI-wrapper engine plugin and its dedicated type are gone."""
        engines = plugins.scan_engines()
        # (kimodo RETIRED 2026-09-06 — the NVIDIA-package wrap on
        # the comfyui lane is THE kimodo; ONE-implementation rule)
        # (autoremesher RETIRED 2026-09-07 — the node-pack wrap on
        # the comfyui lane is THE remesher; ONE-implementation rule)
        for etype in ("anycreature", "audio_cpp", "comfyui"):
            self.assertIn(etype, engines, "engine %r missing" % etype)
        self.assertNotIn("autoremesher", engines)
        self.assertNotIn("ffmpeg_concat", engines)

    def test_cpp_category_dir_is_not_a_plugin(self) -> None:
        """packages/engines/cpp/ has no plugin markers — a category
        container, never discovered as an engine owner itself."""
        cpp = os.path.join(REPO, "packages", "engines", "cpp")
        self.assertFalse(os.path.isfile(os.path.join(cpp, "plugin.py")))
        self.assertFalse(os.path.isfile(os.path.join(cpp, "plugin.yaml")))
        self.assertFalse(os.path.isdir(os.path.join(cpp, "engines")))


MINI_SPEC = {
    # the TRUE minimal green creature (live-probed against the
    # vendored engine's mechanical checks 2026-09-04): graded body
    # rhythm + two support legs + palette the compiler indexes
    "name": "minicreature",
    "joints": {
        "Hips": [0, 0.46, 0], "Spine": [0, 0.60, 0.01],
        "Chest": [0, 0.86, 0.02], "Neck": [0, 0.93, 0.03],
        "Head": [0, 1.05, 0.10],
        "LHip": [-0.09, 0.42, 0], "LKnee": [-0.09, 0.24, 0.01],
        "LFoot": [-0.09, 0.0, 0.02],
        "RHip": [0.09, 0.42, 0], "RKnee": [0.09, 0.24, 0.01],
        "RFoot": [0.09, 0.0, 0.02]},
    "chains": {
        "body": ["Hips", "Spine", "Chest", "Neck", "Head"],
        "lleg": ["LHip", "LKnee", "LFoot"],
        "rleg": ["RHip", "RKnee", "RFoot"]},
    "volumes": [
        {"chain": "body", "material": "fur_body", "frame": "up",
         "sides": 8, "profile": [[0.0, 0.085, 0.0], [0.45, 0.10, 0.01],
                                  [1.0, 0.045, 0.03]]},
        {"chain": "lleg", "material": "fur_leg", "frame": "up",
         "sides": 6, "profile": [[0.0, 0.05, 0.0], [1.0, 0.03, 0.0]]},
        {"chain": "rleg", "material": "fur_leg", "frame": "up",
         "sides": 6, "profile": [[0.0, 0.05, 0.0], [1.0, 0.03, 0.0]]}],
    "palette": {"fur_body": {"color": "#8a6d3b"},
                "fur_leg": {"color": "#6b5433"}},
}


class TestForgeBusContract(unittest.TestCase):
    OK = {"params": {"spec": MINI_SPEC}}

    def test_phase1_missing_spec_refused_before_registration(self) -> None:
        with self.assertRaises(Exception) as cm:
            _bus({"params": {}}, "anycreature", "", "anycreature")
        self.assertIn("rc=-3", str(cm.exception))
        self.assertIn("spec", str(cm.exception))

    def test_phase1_structural_floor_refused(self) -> None:
        bad = {"params": {"spec": {"joints": {"H": [0, 0, 0]}}}}
        with self.assertRaises(Exception) as cm:
            _bus(bad, "anycreature", "", "anycreature")
        self.assertIn("chains", str(cm.exception))

    def test_phase1_ok_returns_extra_no_graph(self) -> None:
        g, extra = _bus(self.OK, "anycreature", "", "anycreature")
        self.assertEqual(sorted(extra.keys()), ["spec"])
        self.assertIsInstance(g, flow_graph.FlowGraph)

    def test_phase2_emits_skeleton_with_workflow_spec(self) -> None:
        g, _extra = _bus(self.OK, "anycreature", "run-1", "anycreature")
        self.assertIsInstance(g, flow_graph.FlowGraph)
        self.assertEqual(len(g.nodes), 1)
        node = g.nodes[0]
        self.assertEqual(node.node_type, "anycreature")
        wf = node.params.get("workflow")   # THE ACTION CARD LAW
        self.assertIsInstance(wf, dict)
        self.assertIn("joints", wf)
        self.assertIn("smooth_angle", wf)  # knobs spliced as spec fields


class TestQuadRemeshBusContract(unittest.TestCase):
    """THE BUS CONTRACT for the remesh lane — post-cutover shape.

    (2026-09-07, the cpp→node cutover, ONE-implementation rule: the
    cpp arm retired with the lane, so the bus hop the gateway walks
    is plugins.compose(..., engine ["comfyui"]) — the comfyui rim
    shelling the Cordis door. The phase-2 graph is the rim's wrap:
    ONE stage row id'd by the card-declared skeleton carrying the
    full node map as its workflow. The retired legs below name
    where their behavior moved — no silent coverage loss.)
    """

    def _lane(self, body: dict, run_id: str) -> tuple:
        # the gateway's exact hop for the remesh lane: the MODEL id
        # survives (params.model / stage_params), the ENGINE is the
        # lane that owns the body now.
        return _bus(body, "autoremesher", run_id, "comfyui")

    def test_phase1_missing_input_refused(self) -> None:
        with self.assertRaises(Exception) as cm:
            self._lane({"params": {}}, "")
        self.assertIn("rc=1", str(cm.exception))
        self.assertIn("input", str(cm.exception))

    def test_phase1_smooth_normal_refused(self) -> None:
        # the node hardcodes --smooth-normal 0.0 (nodes.py) — a
        # nonzero card value is a lie the door refuses LOUD.
        bad = {"params": {"input": "x.obj", "smooth_normal": 0.5}}
        with self.assertRaises(Exception) as cm:
            self._lane(bad, "")
        self.assertIn("rc=1", str(cm.exception))
        self.assertIn("smooth_normal", str(cm.exception))

    # (RETIRED with the cpp arm: "dead input refused with exact
    # path" — the arm admitted the file; the TS door (the
    # transfer_rig precedent) passes the path string through and the
    # NODE refuses a dead ref LOUD at prompt time, never silently.
    # "bad knob range refused" — the schema.py floors retired with
    # the arm; numerics ride per the img-to-mesh precedent and the
    # node budget law owns them.)

    def test_phase2_emits_skeleton_row_with_node_workflow(self) -> None:
        ok = {"params": {"input": "x.obj", "target_quads": 10000}}
        g, extra = self._lane(ok, "run-3")
        self.assertEqual(len(g.nodes), 1)
        node = g.nodes[0]
        # the row id is the card-declared skeleton (the rim's wrap
        # contract), never the model name.
        self.assertEqual(node.node_id, "quad-remesh")
        self.assertEqual(extra.get("skeleton"), "quad-remesh")
        wf = node.params["workflow"]
        self.assertEqual(sorted(wf.keys()), ["AutoRemesher.0"])
        self.assertEqual(wf["AutoRemesher.0"]["inputs"]["glb_path"],
                         "x.obj")
        self.assertEqual(
            wf["AutoRemesher.0"]["inputs"]["target_quads"], 10000)


class TestCardPattern(unittest.TestCase):
    """THE CARD PATTERN (golden base: h3-timeline): every card owns
    python/compose.py + python/schema.py + python/renderer.py; the plugin's
    compose/ package dispatches — never owns the arm."""

    CARDS = [
        ("node", "anycreature", "action_cards/3d/forge"),
        ("cpp", "audio-cpp", "action_cards/audio/music"),
        # (the ("cpp", "autoremesher", "action_cards/3d/quad-remesh")
        # row RETIRED 2026-09-07 with the lane — the cpp→node
        # cutover, ONE-implementation rule: the card moved
        # comfyui-side (declarations stream) and the render arm is
        # the Cordis TS card. The comfyui lane's contract is pinned
        # by the drift walls (decl_schema_parity 19×4, card_decls
        # parity) + the cordis compose wall, not by this file.)
    ]

    def test_every_card_owns_the_pattern_files(self) -> None:
        for cat, plugin, card in self.CARDS:
            root = os.path.join(REPO, "packages", "engines", cat,
                                plugin, card, "python")
            for fname in ("__init__.py", "card.py", "compose.py",
                          "schema.py", "renderer.py"):
                self.assertTrue(
                    os.path.isfile(os.path.join(root, fname)),
                    "%s/%s/python/%s missing (THE CARD PATTERN)" % (
                        plugin, card, fname))

    def test_plugin_compose_is_a_dispatcher(self) -> None:
        """The plugin compose/__init__ carries the bus-arity door and
        NO inline arm logic: the arm files live in the card trees."""
        for cat, plugin, _card in self.CARDS:
            init = os.path.join(REPO, "packages", "engines", cat,
                                plugin, "compose", "__init__.py")
            with open(init, encoding="utf-8") as f:
                text = f.read()
            # the bus contract: annotated since the annotation hunt
            # (annotations are the law) — names + order + arity, any
            # annotation spelling, possibly across lines.
            self.assertRegex(
                text,
                r"def card_compose\(\s*body\s*:[\s\S]*?,\s*model\s*:"
                r"[\s\S]*?,\s*run_id\s*:[\s\S]*?,\s*graph\s*:",
                "%s compose/ must speak the bus contract" % plugin)
            self.assertNotIn(
                "NodeRow(", text,
                "%s compose/ must dispatch, not emit nodes" % plugin)


class TestRendererArgv(unittest.TestCase):
    """rung 8 — the renderer owns the argv; execute never rebuilds."""

    def _renderer(self, cat: str, plugin: str,
                    card_dir: str, alias: str) -> ModuleType:
        import importlib.util
        pkg = os.path.join(REPO, "packages", "engines", cat, plugin,
                           "action_cards", card_dir, "python")
        spec = importlib.util.spec_from_file_location(
            alias, os.path.join(pkg, "renderer.py"),
            submodule_search_locations=[pkg])
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    # (test_quad_remesh_argv_is_the_eight_knob_cli RETIRED
    # 2026-09-07 with the lane — it drove the deleted renderer.py's
    # build_argv. The eight-knob CLI truth it pinned now lives in the
    # node pack (vendor/.../melite-autoremesher-nodes/nodes.py) +
    # the Cordis literal (cordis/src/cards/quad-remesh.ts) + the
    # golden (tests/golden_cordis/mesh_quad-remesh_default.json).
    # The surviving argv parity lives in test_kernel_manifest_audio
    # / test_kernel_manifest_forge.)

    # (the soma/smplx/g1 model-row tests RETIRED 2026-09-06 with the
    # cpp ggml lane — the comfyui kimodo row carries the family now)


class TestKnobSSOT(unittest.TestCase):
    """RETIRED 2026-09-07 with the python render plane (commit
    b324c480): this class read every comfyui arm's fields from the
    deleted python/{renderer,schema}.py to audit card_knobs coverage.
    Knob truth now lives in the TS card schemas + facts lane_inputs,
    pinned wire-stable by tests/golden_cordis/ (a dropped knob
    changes the graph → wall red). The cpp/node-native knobs below
    were never in this class's scope; TestVendorLaw still guards
    their lanes."""


class TestVendorLaw(unittest.TestCase):
    def _module_paths(self) -> dict[str, str]:
        import configparser
        # strict=False: git tolerates duplicate keys (last wins)
        cp = configparser.ConfigParser(strict=False)
        cp.read(os.path.join(REPO, ".gitmodules"))
        return {cp.get(s, "path"): cp.get(s, "url") for s in
                cp.sections() if cp.has_option(s, "path")}

    def test_submodule_pins_declared(self) -> None:
        paths = self._module_paths()
        # vendor dir names carry the upstream repo's casing
        for pin, repo in (
                ("packages/engines/node/anycreature/vendor/anyCreature",
                 "Ariescar/anyCreature"),
                ("packages/engines/cpp/autoremesher/vendor/autoremesher",
                 "huxingyi/autoremesher")):
            self.assertIn(pin, paths,
                          "%s vendor pin missing from .gitmodules" % pin)
            self.assertIn(repo, paths[pin])

    def test_vendored_engines_present(self) -> None:
        cli = os.path.join(REPO, "packages/engines/node/anycreature",
                           "vendor/anyCreature/engine/cli.js")
        self.assertTrue(os.path.isfile(cli), "vendored cli.js missing")


if __name__ == "__main__":
    unittest.main()
