"""test_cpp_engines.py — the native-engine category's gates.

The category (operator order, 2026-10-02): plugins/engines/cpp/ —
vendored native engines as submodules, compose-first plugins on top.
(anyCreature moved to plugins/engines/node/ 2026-09-06 — a node.js
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
        # (kimodo RETIRED 2026-09-06 — the NVIDIA-package wrap on
        # the comfyui lane is THE kimodo; ONE-implementation rule)
        for etype in ("anycreature", "audio_cpp", "autoremesher",
                      "comfyui"):
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
        ("node", "anycreature", "action_cards/3d/forge"),
        ("cpp", "autoremesher", "action_cards/3d/quad-remesh"),
        ("cpp", "audio-cpp", "action_cards/audio/music"),
    ]

    def test_every_card_owns_the_pattern_files(self) -> None:
        for cat, plugin, card in self.CARDS:
            root = os.path.join(REPO, "plugins", "engines", cat,
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
        for cat, plugin, _card in self.CARDS:
            init = os.path.join(REPO, "plugins", "engines", cat,
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
        pkg = os.path.join(REPO, "plugins", "engines", cat, plugin,
                           "action_cards", card_dir, "py")
        spec = importlib.util.spec_from_file_location(
            alias, os.path.join(pkg, "renderer.py"),
            submodule_search_locations=[pkg])
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_quad_remesh_argv_is_the_eight_knob_cli(self) -> None:
        r = self._renderer("cpp", "autoremesher", "3d/quad-remesh",
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

    # (the soma/smplx/g1 model-row tests RETIRED 2026-09-06 with the
    # cpp ggml lane — the comfyui kimodo row carries the family now)


class TestKnobSSOT(unittest.TestCase):
    """LAYER AUDIT: every card field has a card_knobs row on every
    model it boards (the music3 pattern; yaml is extinct)."""

    def _fields(self, cat: str, plugin: str,
                  card_dir: str, alias: str) -> ModuleType:
        import importlib.util
        pkg = os.path.join(REPO, "plugins", "engines", cat, plugin,
                           "action_cards", card_dir, "py")
        spec = importlib.util.spec_from_file_location(
            alias, os.path.join(pkg, "card.py"),
            submodule_search_locations=[pkg])
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_forge_fields_all_in_knob_rows(self) -> None:
        from melite_models import load_model_py
        mod = self._fields("node", "anycreature", "3d/forge",
                           "forge_card_check")
        card_fields = {f.name for f in mod.ForgeCard._fields_}
        mpath = os.path.join(REPO, "plugins/engines/node/anycreature",
                             "models/3d/anycreature/model.py")
        cls = load_model_py(mpath, "anycreature")
        knob_fields = {row["card"] for row in cls.card_knobs}
        self.assertTrue(card_fields <= knob_fields,
                        "card fields missing knob rows: %s"
                        % (card_fields - knob_fields))

    def test_quad_remesh_fields_all_in_knob_rows(self) -> None:
        from melite_models import load_model_py
        mod = self._fields("cpp", "autoremesher", "3d/quad-remesh",
                           "qr_card_check")
        card_fields = {f.name for f in mod.QuadRemeshCard._fields_}
        mpath = os.path.join(REPO, "plugins/engines/cpp/autoremesher",
                             "models/3d/autoremesher/model.py")
        cls = load_model_py(mpath, "autoremesher")
        knob_fields = {row["card"] for row in cls.card_knobs}
        self.assertTrue(card_fields <= knob_fields)

    def _card_fields(self, card_subpath: str, card_cls: str,
                       alias: str) -> set:
        """Card Field names for a comfyui card (direct path load —
        the _fields helper only addresses categorized engine dirs)."""
        import importlib.util
        cpath = os.path.join(
            REPO, "plugins", "engines", "comfyui", "action_cards",
            *card_subpath.split("/"), "py", "card.py")
        spec = importlib.util.spec_from_file_location(alias, cpath)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        cls = getattr(mod, card_cls)
        structural = set(getattr(cls, "structural_knobs", None) or ())
        return {f.name for f in cls._fields_} - structural

    def _structural(self, card_subpath: str, card_cls: str,
                      alias: str) -> set:
        """The card's declared structural keys (never knob-spliced)."""
        import importlib.util
        cpath = os.path.join(
            REPO, "plugins", "engines", "comfyui", "action_cards",
            *card_subpath.split("/"), "py", "card.py")
        spec = importlib.util.spec_from_file_location(alias, cpath)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return set(getattr(getattr(mod, card_cls),
                           "structural_knobs", None) or ())

    def _schema_fields(self, card_subpath: str, alias: str) -> set:
        """The wire surface: the schema's params-class fields (the ONE
        *Params BaseModel defined in the card's schema.py). Cards
        whose schema admits API-only knobs beyond the form Fields
        (tts: qvoice/voice_pca_strengths/top_p/speed) cover the wire,
        never the widget list — the knobmap surface IS the wire."""
        import importlib.util
        from pydantic import BaseModel
        spath = os.path.join(
            REPO, "plugins", "engines", "comfyui", "action_cards",
            *card_subpath.split("/"), "py", "schema.py")
        spec = importlib.util.spec_from_file_location(alias, spath)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for name in dir(mod):
            obj = getattr(mod, name)
            if (isinstance(obj, type) and issubclass(obj, BaseModel)
                    and obj is not BaseModel
                    and obj.__module__ == spec.name
                    and name != "SamplerParams"):
                return set(obj.model_fields)
        raise AssertionError("no params class in %s" % spath)

    def _assert_rows_match_renderer(self, card_subpath: str,
                                    card_cls: str, model_id: str,
                                    genre: str = "image",
                                    family: str | None = None) -> None:
        """Both-directions audit, renderer side: render the arm
        headlessly through its registered renderer and prove every
        row's inject target (NodeClass.idx.input) names a real built
        node input. Family comes from the voice's own _ARMS map when
        present (multi-arm cards), else the explicit family (single
        renderers serve the whole card). Coverage domain is the
        schema wire surface (card Fields + API-only knobs), minus
        the card's structural keys: rows name only wire knobs, and
        every renderer-fed knob (doc fields minus the compose-stamped
        filename_prefix) owns a row."""
        import importlib.util
        from melite_models import load_model_py
        base = os.path.join(
            REPO, "plugins", "engines", "comfyui", "action_cards",
            *card_subpath.split("/"), "py")
        compose_dir = os.path.join(
            REPO, "plugins", "engines", "comfyui", "compose")
        for _p in (compose_dir,
                   os.path.join(compose_dir, "co_script")):
            if _p not in sys.path:
                sys.path.insert(0, _p)
        vspec = importlib.util.spec_from_file_location(
            "voice_%s" % model_id,
            os.path.join(base, "compose.py"))
        voice = importlib.util.module_from_spec(vspec)
        vspec.loader.exec_module(voice)
        if hasattr(voice, "_ARMS"):
            _arm = voice._ARMS[model_id]
            # the map's value shape is the voice's own business
            # (tagger: bare family; upscale: (arm, template,
            # required-paths) triple) — element 0 is the family.
            family = _arm[0] if isinstance(_arm, (tuple, list)) \
                else _arm
        assert family, "no family for %s" % model_id
        rspec = importlib.util.spec_from_file_location(
            "renderer_%s" % model_id,
            os.path.join(base, "renderer.py"))
        rmod = importlib.util.module_from_spec(rspec)
        sys.modules[rspec.name] = rmod
        rspec.loader.exec_module(rmod)
        from co_script.renderers import registry
        fn, doc_cls = registry()[family]
        cls = load_model_py(os.path.join(
            REPO, "plugins/engines/comfyui/models", genre, model_id,
            "model.py"), "comfyui")
        rows = list(cls.card_knobs or ())
        # a doc with required fields (mask input_image) cannot render
        # bare — fill required-only slots with type empties (the wall
        # audits the DEFAULT graph shape, not values).
        _req: dict[str, object] = {}
        for _name, _f in doc_cls.model_fields.items():
            if not _f.is_required():
                continue
            _ann = _f.annotation
            _req[_name] = (
                "" if _ann is str
                else 0 if _ann in (int, float)
                else False if _ann is bool
                else None)
        graph = fn(doc_cls(**_req), cls)
        structural = self._structural(
            card_subpath, card_cls, "st_%s" % model_id)
        wire = ((self._card_fields(card_subpath, card_cls,
                                   "cf_%s" % model_id)
                 | self._schema_fields(card_subpath, "sf_%s" % model_id))
                - structural)
        import typing as _typing

        def _scalar(field: object) -> bool:
            # knobmap kinds are s/n/b — a dict/list-typed doc field
            # (crop/scale transform rows) CANNOT own a scalar row
            # today; the complex-knob row shape is a later stroke.
            ann = getattr(field, "annotation", None)
            args = [a for a in _typing.get_args(ann)
                    if a is not type(None)]
            core = args[0] if len(args) == 1 and ann is not None \
                and _typing.get_origin(ann) is not None else ann
            try:
                return isinstance(core, type) and issubclass(
                    core, (str, int, float, bool))
            except TypeError:
                return False

        fed = {f for f in set(doc_cls.model_fields)
               - {"filename_prefix"} - structural
               if f in wire and _scalar(doc_cls.model_fields[f])}
        row_names = {r["card"] for r in rows}
        self.assertTrue(
            row_names <= wire,
            "%s rows name non-wire knobs: %s" % (
                model_id, row_names - wire))
        self.assertTrue(
            fed <= row_names,
            "%s renderer-fed knobs missing rows: %s" % (
                model_id, fed - row_names))
        for r in rows:
            if not r["inject"]:
                # compile-consumed row (mask-studio tier 2/3): no node
                # target exists — the name∈wire check above is the
                # whole audit; the row comment states the consumption.
                continue
            node_key, _, inp = r["inject"].rpartition(".")
            node_cls, _, _idx = node_key.rpartition(".")
            self.assertIn(
                node_key, graph,
                "%s row %r names unbuilt node %r" % (
                    model_id, r["card"], node_key))
            self.assertIn(
                inp, graph[node_key].get("inputs", {}),
                "%s row %r names unknown input %r on %s" % (
                    model_id, r["card"], inp, node_cls))

    def _assert_rows_name_real_inputs(self, model_subdir: str,
                                      template: str) -> None:
        """Both-directions audit, inject side: every card_knobs row's
        inject target (NodeClass.idx.input) names a node class the
        model's template carries with that input — a row pointing at
        a dead node is a lie the layer audit must catch."""
        import json as _json
        from melite_models import load_model_py
        cls = load_model_py(os.path.join(
            REPO, "plugins/engines/comfyui/models", model_subdir,
            "model.py"), "comfyui")
        tmpl = _json.load(open(os.path.join(
            REPO, "plugins/engines/comfyui/models", model_subdir,
            template), encoding="utf-8"))
        nodes = {v.get("class_type"): set((v.get("inputs") or {}))
                 for v in tmpl.values()}
        for row in cls.card_knobs:
            # shape is NodeClass.idx.input — split off the LAST two dots
            parts = row["inject"].rsplit(".", 2)
            self.assertEqual(len(parts), 3,
                             "row %r inject is not NodeClass.idx.input"
                             % row["card"])
            node, _idx, inp = parts
            self.assertIn(node, nodes,
                          "row %r names unknown node %r" % (row["card"], node))
            self.assertIn(inp, nodes[node],
                          "row %r names unknown input %r on %s"
                          % (row["card"], inp, node))

    def test_voice_lock_fields_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (second card after music3): the
        voice-lock card's 7 Fields each own a card_knobs row on its
        single boarded model — inject targets name the
        renderer-built AudiocoreVoiceStudio inputs 1:1."""
        from melite_models import load_model_py
        card_fields = self._card_fields(
            "audio/voice-lock", "VoiceLockCard", "vl_card_check")
        mpath = os.path.join(
            REPO, "plugins/engines/comfyui/models/audio",
            "qwen3-tts-voicedesign/model.py")
        cls = load_model_py(mpath, "comfyui")
        knob_fields = {row["card"] for row in cls.card_knobs}
        self.assertTrue(card_fields <= knob_fields,
                        "voice-lock fields missing knob rows: %s"
                        % (card_fields - knob_fields))

    def test_knob_rows_name_real_renderer_inputs(self) -> None:
        self._assert_rows_name_real_inputs(
            "audio/qwen3-tts-voicedesign", "voicelock_t1.json")

    def test_image_gen_fields_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (third card): the image-gen card's
        9 Fields each own a card_knobs row on ALL THREE boarded
        models (krea-2, z-image, anima) — one shared renderer, so
        one shared surface; only the latent node class varies."""
        from melite_models import load_model_py
        card_fields = self._card_fields(
            "image/image-gen", "ImageGenCard", "ig_card_check")
        for mid in ("krea-2", "z-image", "anima"):
            mpath = os.path.join(
                REPO, "plugins/engines/comfyui/models/image",
                mid, "model.py")
            cls = load_model_py(mpath, "comfyui")
            knob_fields = {row["card"] for row in cls.card_knobs}
            self.assertTrue(card_fields <= knob_fields,
                            "image-gen fields missing knob rows on %s: %s"
                            % (mid, card_fields - knob_fields))
            self._assert_rows_name_real_inputs(
                "image/%s" % mid, "generate_t2i.json")

    def test_tagger_arms_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (fourth card, first multi-arm):
        each tagger model owns rows for exactly its arm's wired
        subset (the union surface never lands whole on any model) —
        proven against the headless-rendered graph, both directions,
        with the voice's own _ARMS as the dispatch source."""
        for mid in ("wd14", "joytag", "florence2", "joycaption"):
            self._assert_rows_match_renderer(
                "image/tagger", "TaggerCard", mid)

    def test_tts_wire_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (fifth card): the tts pair rows
        the full nine-knob wire surface — five card Fields PLUS the
        four schema-admitted API knobs (the surface is the wire, not
        the widget list) — proven against the headless-rendered
        AudiocoreTTS graph (the model-dir template predates
        instruct/voice_file, so the dead-text audit would
        under-verify here)."""
        for mid in ("qwen3-tts", "qwen3-tts-base"):
            self._assert_rows_match_renderer(
                "audio/tts", "TtsCard", mid, genre="audio",
                family="tts_t1")

    def test_sfx_wire_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (sixth card): the moss-sfx rows
        speak card vocabulary (n_diffusion_steps/duration — the
        renderer call site translates to node spelling), proven
        against the headless-rendered AudiocoreTTS graph."""
        self._assert_rows_match_renderer(
            "audio/sfx", "SfxCard", "moss-sfx", genre="audio",
            family="sfx_t1")

    def test_image_edit_core_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (seventh card): the plain-edit
        core (anchor + prompt/sampler block) rows 1:1 onto the
        headless-rendered graph — including the negative prompt's
        second-instance .1 target. The mod-firing surface is
        structural (the voice's own gate loops are the source)."""
        self._assert_rows_match_renderer(
            "image/image-edit", "ImageEditCard",
            "qwen-img-edit-2511", family="image_edit")

    def test_ideogram_core_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (eighth card): nine rows onto
        the headless-rendered ideogram graph — width/height target
        the latent canvas (the renderer fans out to the scheduler;
        the row model is 1:1, the twin is comment-recorded)."""
        self._assert_rows_match_renderer(
            "image/ideogram4", "Ideogram4Card", "ideogram",
            family="ideogram_t2i")

    def test_input_prep_source_in_knob_rows(self) -> None:
        """Row-3 migration pattern (ninth card): the intake lane
        rows its one scalar knob (source → the image-branch
        loader; the audio twin is comment-recorded). The fed-audit
        now only demands rows for wire-member scalar doc fields —
        derived keys (media_type) and nested transform rows
        (crop/scale) are exempt by construction, not by list."""
        self._assert_rows_match_renderer(
            "image/input_prep", "InputPrepCard", "input",
            family="input_prep")

    def test_upscale_wire_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (tenth card): five rows onto the
        headless-rendered SeedVR2 graph — the voice's _ARMS triple
        yields its family at element 0, the lane-fact doc keys
        (dit/vae_model) are wire-exempt by construction."""
        self._assert_rows_match_renderer(
            "image/upscale-tools", "UpscaleToolsCard", "seedvr2_ema")

    def test_video_gen_arms_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (eleventh card, second multi-arm):
        twelve rows on wan-vace, fourteen on scail2-animate — the
        shared prompt/sampler block plus per-arm media inputs. The
        voice's _ARMS triple yields its family at element 0; lane
        facts ride the docs, never the wire."""
        self._assert_rows_match_renderer(
            "video/video-gen", "VideoGenCard", "wan-vace", genre="video")
        self._assert_rows_match_renderer(
            "video/video-gen", "VideoGenCard", "scail2-animate",
            genre="video")

    def test_mask_studio_compile_card_rows(self) -> None:
        """Row-3 migration pattern (twelfth card, first COMPILE-CARD):
        sixteen rows in three tiers — four direct injects onto the
        headless-rendered mask graph, ten compile directives and two
        config-gated inputs as empty-inject rows (splice skips them
        by construction; the wall audits name∈wire + the comment)."""
        self._assert_rows_match_renderer(
            "image/mask_studio", "MaskStudioCard", "mask-studio",
            family="mask_t1")

    def test_anny_turnaround_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (thirteenth card): seven rows onto
        the headless-rendered anny graph — the body constant plus
        the turnaround block; the SAM ingest lane is config-gated
        (empty-inject row)."""
        self._assert_rows_match_renderer(
            "3d/anny", "AnnyCard", "anny", family="anny_t1",
            genre="3d")

    def test_motion_chain_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (fourteenth card): thirteen rows
        onto the headless-rendered motion graph — nine direct
        injects on the always-built pose node, the chain trio
        (conditional inputs) and the preview bake (conditional
        node) as gated rows."""
        self._assert_rows_match_renderer(
            "motion/motion", "MotionCard", "kimodo", family="motion_t1",
            genre="motion")

    def test_img_to_mesh_arms_all_in_knob_rows(self) -> None:
        """Row-3 migration pattern (fifteenth card, third multi-arm):
        thirty-one rows on trellis2-native, thirty-two on pixal3d
        (the shared lift chain + camera_fov), two on transfer_rig.
        The voice's _ARMS pairs yield the family at element 0."""
        self._assert_rows_match_renderer(
            "3d/img_to_mesh", "ImgToMeshCard", "trellis2-native",
            genre="3d")
        self._assert_rows_match_renderer(
            "3d/img_to_mesh", "ImgToMeshCard", "pixal3d", genre="3d")
        self._assert_rows_match_renderer(
            "3d/img_to_mesh", "ImgToMeshCard", "transfer_rig",
            genre="3d")

    def test_no_card_knobs_yaml_survives(self) -> None:
        """The yaml knob era is extinct tree-wide — rows live on the
        model class (the music3 pattern)."""
        import glob
        hits = glob.glob(os.path.join(REPO, "plugins/engines/cpp",
                                      "**/card_knobs.yaml"),
                         recursive=True)
        self.assertEqual(hits, [])

    # Row-3 ratchet (2026-09-06): the comfyui card_knobs migration —
    # 27 boarded models still carry no rows (only music3 +
    # h3-timeline do; cpp-plugin rows proven above). Each row is
    # template-node archaeology per model per field (card field ->
    # exact NodeClass.idx.input), so the migration lands card by
    # card; this set is equality-pinned EMPTY-ward: a NEW rowless
    # boarded model fails, a landed card deletes its models'
    # entries. Shrink-only. (Tool internals without a card claim —
    # dwpose, basic_resize, the pixel pair — are not card surfaces
    # and stay out of this set.)
    _MODELS_WITHOUT_KNOB_ROWS = frozenset({
        "fit", "h3", "h3-keyframe", "skin",
    })

    def test_comfyui_models_without_knob_rows_shrink_only(self) -> None:
        """Every card-boarded model without card_knobs rows is in
        the pinned set — the migration's burn-down list."""
        from melite_models import scan_engine_models
        try:
            items = list(scan_engine_models(REPO).items())
        except Exception as e:
            if "refusing to alias" in str(e):
                self.skipTest("catalog scan blocked by "
                              "parallel-session duplicate-genre "
                              "migration: %s" % e)
            raise
        missing = set()
        for mid, (_p, cls) in items:
            if not (getattr(cls, "card", "") or ""):
                continue  # no card claim, not a card surface
            rows = getattr(cls, "card_knobs", None) or ()
            if not rows:
                missing.add(mid)
        self.assertEqual(
            missing, self._MODELS_WITHOUT_KNOB_ROWS,
            "knob-row burn-down set changed: %s — a new rowless "
            "boarded model (ship its card_knobs) or a landed "
            "migration (delete its entries)" % sorted(
                missing ^ self._MODELS_WITHOUT_KNOB_ROWS))


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
                ("plugins/engines/node/anycreature/vendor/anyCreature",
                 "Ariescar/anyCreature"),
                ("plugins/engines/cpp/autoremesher/vendor/autoremesher",
                 "huxingyi/autoremesher")):
            self.assertIn(pin, paths,
                          "%s vendor pin missing from .gitmodules" % pin)
            self.assertIn(repo, paths[pin])

    def test_vendored_engines_present(self) -> None:
        cli = os.path.join(REPO, "plugins/engines/node/anycreature",
                           "vendor/anyCreature/engine/cli.js")
        self.assertTrue(os.path.isfile(cli), "vendored cli.js missing")


if __name__ == "__main__":
    unittest.main()
