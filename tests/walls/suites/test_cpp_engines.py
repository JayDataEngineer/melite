"""test_cpp_engines.py — the cpp native-engine category's gates.

The category (operator order, 2026-10-02): plugins/engines/cpp/ —
vendored native engines as submodules, compose-first plugins on top.

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
- the card pattern: py/compose.py + py/schema.py + py/renderer.py in
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
        for etype in ("anycreature", "audio_cpp", "autoremesher",
                      "comfyui", "kimodo"):
            self.assertIn(etype, engines, "engine %r missing" % etype)
        self.assertNotIn("ffmpeg_concat", engines)

    def test_cpp_category_dir_is_not_a_plugin(self) -> None:
        """plugins/engines/cpp/ has no plugin markers — a category
        container, never discovered as an engine owner itself."""
        cpp = os.path.join(REPO, "plugins", "engines", "cpp")
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


class TestTextToMotionBusContract(unittest.TestCase):
    OK = {"params": {"prompt": "a knight walks forward, then bows",
                     "skeleton": "soma"}}

    def test_phase1_missing_prompt_refused(self) -> None:
        with self.assertRaises(Exception) as cm:
            _bus({"params": {}}, "soma", "", "kimodo")
        self.assertIn("rc=-3", str(cm.exception))
        self.assertIn("prompt", str(cm.exception))

    def test_phase1_bad_skeleton_refused(self) -> None:
        bad = {"params": {"prompt": "walk", "skeleton": "trex"}}
        with self.assertRaises(Exception) as cm:
            _bus(bad, "soma", "", "kimodo")
        self.assertIn("skeleton", str(cm.exception))

    def test_phase1_smplx_gate_refused_without_checkpoint(self) -> None:
        os.environ.pop("KIMODO_SMPLX_CHECKPOINT", None)
        gated = {"params": {"prompt": "wave", "skeleton": "smplx"}}
        with self.assertRaises(Exception) as cm:
            _bus(gated, "smplx", "", "kimodo")
        self.assertIn("licence", str(cm.exception).lower())

    def test_phase1_smplx_gate_passes_with_checkpoint(self) -> None:
        gated = {"params": {"prompt": "wave", "skeleton": "smplx",
                            "smplx_checkpoint": "/data/smplx.gguf"}}
        g, _extra = _bus(gated, "smplx", "", "kimodo")
        self.assertIsInstance(g, flow_graph.FlowGraph)

    def test_phase2_emits_skeleton_with_prompt_workflow(self) -> None:
        g, _extra = _bus(self.OK, "soma", "run-2", "kimodo")
        self.assertEqual(len(g.nodes), 1)
        node = g.nodes[0]
        self.assertEqual(node.node_type, "kimodo")
        wf = node.params["workflow"]
        self.assertEqual(wf["prompt"], self.OK["params"]["prompt"])
        self.assertEqual(wf["skeleton"], "soma")
        self.assertIn("seed", node.params)


class TestQuadRemeshBusContract(unittest.TestCase):
    def _tmp_mesh(self) -> str:
        import tempfile
        fd, path = tempfile.mkstemp(suffix=".obj")
        with os.fdopen(fd, "w") as f:
            f.write("# stub obj\n")
        self.addCleanup(os.unlink, path)
        return path

    def test_phase1_missing_input_refused(self) -> None:
        with self.assertRaises(Exception) as cm:
            _bus({"params": {}}, "autoremesher", "", "autoremesher")
        self.assertIn("rc=-3", str(cm.exception))
        self.assertIn("input", str(cm.exception))

    def test_phase1_dead_input_refused_with_exact_path(self) -> None:
        bad = {"params": {"input": "/nonexistent/mesh.obj"}}
        with self.assertRaises(Exception) as cm:
            _bus(bad, "autoremesher", "", "autoremesher")
        self.assertIn("/nonexistent/mesh.obj", str(cm.exception))

    def test_phase1_bad_knob_range_refused(self) -> None:
        bad = {"params": {"input": self._tmp_mesh(),
                          "target_quads": 10}}
        with self.assertRaises(Exception) as cm:
            _bus(bad, "autoremesher", "", "autoremesher")
        self.assertIn("target_quads", str(cm.exception))

    def test_phase2_emits_skeleton_with_input_workflow(self) -> None:
        mesh = self._tmp_mesh()
        ok = {"params": {"input": mesh, "target_quads": 10000}}
        g, _extra = _bus(ok, "autoremesher", "run-3", "autoremesher")
        node = g.nodes[0]
        self.assertEqual(node.node_type, "autoremesher")
        self.assertEqual(node.params["workflow"]["input"], mesh)
        self.assertEqual(node.params["target_quads"], 10000)


class TestCardPattern(unittest.TestCase):
    """THE CARD PATTERN (golden base: h3-timeline): every card owns
    py/compose.py + py/schema.py + py/renderer.py; the plugin's
    compose/ package dispatches — never owns the arm."""

    CARDS = [
        ("anycreature", "action_cards/3d/forge"),
        ("kimodo", "action_cards/motion/text-to-motion"),
        ("autoremesher", "action_cards/3d/quad-remesh"),
        ("audio-cpp", "action_cards/audio/music"),
    ]

    def test_every_card_owns_the_pattern_files(self) -> None:
        for plugin, card in self.CARDS:
            root = os.path.join(REPO, "plugins", "engines", "cpp",
                                plugin, card, "py")
            for fname in ("__init__.py", "card.py", "compose.py",
                          "schema.py", "renderer.py"):
                self.assertTrue(
                    os.path.isfile(os.path.join(root, fname)),
                    "%s/%s/py/%s missing (THE CARD PATTERN)" % (
                        plugin, card, fname))

    def test_plugin_compose_is_a_dispatcher(self) -> None:
        """The plugin compose/__init__ carries the bus-arity door and
        NO inline arm logic: the arm files live in the card trees."""
        for plugin, _card in self.CARDS:
            init = os.path.join(REPO, "plugins", "engines", "cpp",
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

    def _renderer(self, plugin: str, card_dir: str, alias: str) -> ModuleType:
        import importlib.util
        pkg = os.path.join(REPO, "plugins", "engines", "cpp", plugin,
                           "action_cards", card_dir, "py")
        spec = importlib.util.spec_from_file_location(
            alias, os.path.join(pkg, "renderer.py"),
            submodule_search_locations=[pkg])
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_quad_remesh_argv_is_the_eight_knob_cli(self) -> None:
        r = self._renderer("autoremesher", "3d/quad-remesh",
                           "qr_renderer_check")
        cmd, out, report = r.build_argv(
            __import__("pathlib").Path("/bin/autoremesher"), "/tmp/run",
            {"workflow": {"input": "in.obj"}, "target_quads": 1234,
             "edge_scaling": 1.5, "sharp_edge": 45.0,
             "smooth_normal": 0.2, "adaptivity": 1.2,
             "anisotropy": 1.0})
        for flag in ("--input", "--output", "--report", "--target-quads",
                     "--edge-scaling", "--sharp-edge", "--smooth-normal",
                     "--adaptivity", "--anisotropy"):
            self.assertIn(flag, cmd)
        self.assertTrue(out.endswith("remeshed.obj"))
        self.assertTrue(report.endswith("remeshed_report.txt"))

    def test_motion_argv_carries_prompt_and_skeleton(self) -> None:
        r = self._renderer("kimodo", "motion/text-to-motion",
                           "tm_renderer_check")
        cmd = r.build_argv(
            __import__("pathlib").Path("/bin/kimodo_cli"), "/tmp/run",
            {"workflow": {"prompt": "bow", "skeleton": "g1"},
             "seed": 7, "steps": 60, "backend": "vulkan"})
        joined = " ".join(cmd)
        self.assertIn("--prompt bow", joined)
        self.assertIn("--skeleton g1", joined)
        self.assertIn("--backend vulkan", joined)


class TestKimodoModelRows(unittest.TestCase):
    def _load(self, family: str) -> "dict[str, type[Model]]":
        import importlib.util
        path = os.path.join(REPO, "plugins/engines/cpp/kimodo/models",
                            "motion", family, "model.py")
        spec = importlib.util.spec_from_file_location(
            "kimodo_%s_check" % family, path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return {c.__name__: c for c in mod.__dict__.values()
                if isinstance(c, type)}

    def test_soma_two_variants_two_cells_with_sha256(self) -> None:
        cls = self._load("soma")["Soma"]
        self.assertEqual(len(cls.variants), 2)
        cells = [c for v in cls.variants for c in v.cells]
        self.assertEqual(len(cells), 2)
        for cell in cells:
            self.assertEqual(cell.quant.value, "f32")
            self.assertTrue(cell.artifact.sha256)
            self.assertTrue(cell.artifact.size_bytes > 0)
            self.assertEqual(cell.artifact.dest_root.value,
                             "KIMODO_ROOT")

    def test_smplx_gated_ships_no_cells(self) -> None:
        cls = self._load("smplx")["Smplx"]
        for v in cls.variants:
            self.assertEqual(v.cells, (),
                             "gated licence — no downloadable artifact")


class TestKnobSSOT(unittest.TestCase):
    """LAYER AUDIT: every card field has a card_knobs row on every
    model it boards (the music3 pattern; yaml is extinct)."""

    def _fields(self, plugin: str, card_dir: str, alias: str) -> ModuleType:
        import importlib.util
        pkg = os.path.join(REPO, "plugins", "engines", "cpp", plugin,
                           "action_cards", card_dir, "py")
        spec = importlib.util.spec_from_file_location(
            alias, os.path.join(pkg, "card.py"),
            submodule_search_locations=[pkg])
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_forge_fields_all_in_knob_rows(self) -> None:
        from melite_models import load_model_py
        mod = self._fields("anycreature", "3d/forge",
                           "forge_card_check")
        card_fields = {f.name for f in mod.ForgeCard._fields_}
        mpath = os.path.join(REPO, "plugins/engines/cpp/anycreature",
                             "models/3d/anycreature/model.py")
        cls = load_model_py(mpath, "anycreature")
        knob_fields = {row["card"] for row in cls.card_knobs}
        self.assertTrue(card_fields <= knob_fields,
                        "card fields missing knob rows: %s"
                        % (card_fields - knob_fields))

    def test_quad_remesh_fields_all_in_knob_rows(self) -> None:
        from melite_models import load_model_py
        mod = self._fields("autoremesher", "3d/quad-remesh",
                           "qr_card_check")
        card_fields = {f.name for f in mod.QuadRemeshCard._fields_}
        mpath = os.path.join(REPO, "plugins/engines/cpp/autoremesher",
                             "models/3d/autoremesher/model.py")
        cls = load_model_py(mpath, "autoremesher")
        knob_fields = {row["card"] for row in cls.card_knobs}
        self.assertTrue(card_fields <= knob_fields)

    def test_no_card_knobs_yaml_survives(self) -> None:
        """The yaml knob era is extinct tree-wide — rows live on the
        model class (the music3 pattern)."""
        import glob
        hits = glob.glob(os.path.join(REPO, "plugins/engines/cpp",
                                      "**/card_knobs.yaml"),
                         recursive=True)
        self.assertEqual(hits, [])


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
                ("plugins/engines/cpp/anycreature/vendor/anyCreature",
                 "Ariescar/anyCreature"),
                ("plugins/engines/cpp/kimodo/vendor/kimodo",
                 "localai-org/kimodo.cpp"),
                ("plugins/engines/cpp/autoremesher/vendor/autoremesher",
                 "huxingyi/autoremesher")):
            self.assertIn(pin, paths,
                          "%s vendor pin missing from .gitmodules" % pin)
            self.assertIn(repo, paths[pin])

    def test_vendored_engines_present(self) -> None:
        cli = os.path.join(REPO, "plugins/engines/cpp/anycreature",
                           "vendor/anyCreature/engine/cli.js")
        self.assertTrue(os.path.isfile(cli), "vendored cli.js missing")
        capi = os.path.join(REPO, "plugins/engines/cpp/kimodo",
                            "vendor/kimodo/include/kimodo/kimodo_capi.h")
        self.assertTrue(os.path.isfile(capi),
                        "vendored kimodo C API header missing")

    def test_vendored_engines_present(self) -> None:
        cli = os.path.join(REPO, "plugins/engines/cpp/anycreature",
                           "vendor/anyCreature/engine/cli.js")
        self.assertTrue(os.path.isfile(cli), "vendored cli.js missing")
        capi = os.path.join(REPO, "plugins/engines/cpp/kimodo",
                            "vendor/kimodo/include/kimodo/kimodo_capi.h")
        self.assertTrue(os.path.isfile(capi),
                        "vendored kimodo C API header missing")


if __name__ == "__main__":
    unittest.main()
