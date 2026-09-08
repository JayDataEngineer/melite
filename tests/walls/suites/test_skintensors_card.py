"""test_skintensors_card.py — walls for the auto-rig lane
(packages/engines/cpp/skintokens).

Design record: docs/design/auto-rig-skintokens.md (2026-09-06,
operator order: "Does this have a place in our workflow?" then
"Okay. write a document to the docs/design/ and then implmenet what
is useful").

What these walls pin:
- the lane's STRUCTURE (plugin declaration, weightless tool row,
  card_knobs SSOT rows naming the CLI surface live-probed from
  skintokens-cli's own usage text)
- the compose doors' refusal matrix (QUEUE LANE LAW: ghost meshes,
  data: URLs, unknown knobs, open-set devices, wrong extensions all
  4xx BEFORE any run registers)
- the missing-runtime refusal (QUEUE LANE LAW: no silent fallback —
  the error names the env knobs and the build/provision recipe)
- the argv truth (renderer owns it; execute never rebuilds it)

The LIVE green run (statue → rigged GLB through the REAL queue) is
the gpu-marked probe at the bottom — opt in with -m gpu.
"""

import importlib
import json
import os
import sys
import unittest
from types import ModuleType

import pytest

# Card params are JSON (no future-import here — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "python"))
sys.path.insert(0, os.path.join(HERE, "_anchor"))

from _anchor import REPO  # noqa: E402

LANE = os.path.join(REPO, "packages", "engines", "cpp", "skintokens")
CARD = os.path.join(LANE, "action_cards", "3d", "auto-rig")


def _read(rel: str) -> str:
    with open(os.path.join(LANE, rel), encoding="utf-8") as f:
        return f.read()


def _compose() -> ModuleType:
    import plugins as P
    return P.load_compose("skintokens")


class TestLaneStructure(unittest.TestCase):

    def test_plugin_declares_the_cpp_lane(self) -> None:
        import plugins as P
        refs = P.scan_engines()
        self.assertIn("skintokens", refs,
                      "the skintokens engine did not mount — the "
                      "plugin scan must find packages/engines/cpp/"
                      "skintokens (plugin.py marker)")
        src = _read("plugin.py")
        self.assertIn('engines = ("skintokens",)', src)
        self.assertIn('genres = ("3d",)', src)

    def test_model_row_is_the_knob_ssot(self) -> None:
        from melite_models import load_model_py
        cls = load_model_py(
            os.path.join(LANE, "models", "3d", "skintokens",
                         "model.py"), "skintokens")
        self.assertEqual(cls.id, "skintokens")
        self.assertEqual(cls.card, "auto-rig")
        self.assertEqual(cls.engine, "skintokens")
        # the CLI surface rows — live-probed from skintokens-cli's
        # usage text, never README memory
        knobs = {(k.card, k.inject) for k in cls.card_knobs}
        self.assertEqual(knobs, {
            ("input", "cli:positional:mesh"),
            ("device", "cli:--device"),
            ("postprocess", "cli:--postprocess"),
        })
        self.assertEqual(cls.defaults.get("device"), "cpu",
                         "the lane default is cpu — the boarding "
                         "decision (never contend with the GPU)")
        self.assertEqual(cls.defaults.get("postprocess"), False,
                         "postprocess is opt-in (upstream demo "
                         "default: raw learned weights)")

    def test_card_declares_the_boarded_family(self) -> None:
        src = _read(os.path.join("action_cards", "3d", "auto-rig",
                                 "py", "card.py"))
        self.assertIn('"default_family": \'skintokens\'', src)
        self.assertIn("models = (SkinTokens,)", src)

    def test_default_output_kind_is_mesh(self) -> None:
        from flow import Kind
        comp = _compose()
        self.assertEqual(comp.DEFAULT_OUTPUT, Kind.mesh,
                         "a rigged GLB is a mesh asset — the "
                         "flow-typed-edges default output")


class TestComposeDoors(unittest.TestCase):
    """Phase-1 (run_id='') refusals — everything that can 4xx dies
    BEFORE any run registers."""

    def _refusal(self, params: dict[str, JsonValue]) -> str:
        comp = _compose()
        rc, _g, _extra, err = comp.card_compose(
            {"params": params}, "skintokens", "", None)
        self.assertEqual(rc, -3, "expected a refusal, got %s %s"
                         % (rc, err))
        return err or ""

    def test_ghost_mesh_refuses_before_registration(self) -> None:
        err = self._refusal({"input": "data/input/ghost.glb"})
        self.assertIn("input mesh not found", err)
        self.assertIn("ghost.glb", err)

    def test_data_url_refuses_browser_local_bytes(self) -> None:
        err = self._refusal(
            {"input": "data:image/png;base64,AAAA"})
        self.assertIn("data: URL", err)
        self.assertIn("never compose", err)

    def test_empty_input_refuses(self) -> None:
        err = self._refusal({"input": "  "})
        self.assertIn("required param 'input' missing", err)

    def test_unknown_knob_refuses(self) -> None:
        err = self._refusal({"input": "x.glb", "beams": 4})
        self.assertIn("beams", err)
        self.assertIn("not permitted", err)

    def test_open_set_device_refuses(self) -> None:
        err = self._refusal({"input": "x.glb", "device": "gpu"})
        self.assertIn("'cpu', 'auto' or 'vulkan'", err)

    def test_wrong_extension_refuses_loudly(self) -> None:
        import tempfile
        from pathlib import Path
        obj = Path(tempfile.mkdtemp()) / "mesh.obj"
        obj.write_bytes(b"x")
        err = self._refusal({"input": str(obj)})
        self.assertIn(".glb or .t2mesh", err)

    def test_happy_phase1_and_phase2_skeleton(self) -> None:
        import tempfile
        from pathlib import Path
        glb = Path(tempfile.mkdtemp()) / "body.glb"
        glb.write_bytes(b"x")
        comp = _compose()
        rc, g, _extra, err = comp.card_compose(
            {"params": {"input": str(glb)}}, "skintokens", "", None)
        self.assertEqual((rc, err), (0, None), "phase 1 must pass")
        rc, g, _extra, err = comp.card_compose(
            {"params": {"input": str(glb), "device": "cpu",
                        "postprocess": True}},
            "skintokens", "run-x", None)
        self.assertEqual(rc, 0, err)
        self.assertEqual(g.engine_type, "skintokens")
        row = g.nodes[0]
        self.assertEqual(row.node_type, "skintokens")
        # THE ACTION CARD LAW: the input ref rides params.workflow
        self.assertEqual(row.params["workflow"]["input"], str(glb))
        self.assertEqual(row.params["device"], "cpu")
        self.assertEqual(row.params["postprocess"], True)


class TestRendererArgv(unittest.TestCase):
    """The argv truth lives in renderer.py (PYTHON SHAPE rung 8);
    the surface was live-probed from skintokens-cli's own usage
    text: rig MODEL_DIR MESH OUTPUT.glb [--device ...]
    [--postprocess]."""

    def _renderer(self) -> ModuleType:
        comp_mod = _compose()
        return sys.modules["skintokens_auto_rig"].renderer

    def test_build_argv_shape(self) -> None:
        from pathlib import Path
        r = self._renderer()
        cmd, out = r.build_argv(
            Path("/bin/cli"), Path("/models/F16"), "/run/dir",
            {"workflow": {"input": "/in/body.glb"},
             "device": "cpu", "postprocess": False})
        self.assertEqual(cmd, [
            "/bin/cli", "rig", "/models/F16", "/in/body.glb",
            "/run/dir/rigged.glb", "--device", "cpu",
        ])
        self.assertEqual(out, "/run/dir/rigged.glb")

    def test_postprocess_flag_is_opt_in(self) -> None:
        from pathlib import Path
        r = self._renderer()
        cmd, _ = r.build_argv(
            Path("/bin/cli"), Path("/m"), "/r",
            {"workflow": {"input": "a.glb"}, "device": "auto",
             "postprocess": True})
        self.assertIn("--postprocess", cmd)
        self.assertEqual(cmd[cmd.index("--device") + 1], "auto")


class TestMissingRuntimeRefusal(unittest.TestCase):
    """QUEUE LANE LAW: a missing binary or weights bundle refuses
    LOUDLY naming the env knobs — never a silent fallback."""

    def test_execute_refuses_naming_the_knobs(self) -> None:
        import asyncio
        import tempfile
        comp_mod = _compose()
        r = sys.modules["skintokens_auto_rig"].renderer
        empty = tempfile.mkdtemp()
        # point every candidate at an empty dir + scrub the env
        from pathlib import Path as _P
        r._CLI_CANDIDATES = (_P(os.path.join(empty, "nope")),)
        r._MODEL_CANDIDATES = (_P(os.path.join(empty, "none")),)
        for var in ("SKINTOKENS_BIN", "SKINTOKENS_MODEL_DIR"):
            os.environ.pop(var, None)
        out = asyncio.run(comp_mod.execute(
            type("N", (), {"params": {"workflow": {"input": "x.glb"},
                                      "device": "cpu"}})(),
            empty, {}, asyncio.Event()))
        err = out["error"]
        self.assertIn("not found", err)
        self.assertIn("SKINTOKENS_BIN", err)
        self.assertIn("SKINTOKENS_MODEL_DIR", err)
        self.assertIn("no silent fallback", err)
        self.assertEqual(out["artifacts"], [])


# ---------------------------------------------------------------------------
# the LIVE green run — statue → rigged GLB through the REAL queue
# (INFERENCE LAW: the suite never spawns the engine directly). Opt-in
# like every gpu probe: pytest -m gpu.
# ---------------------------------------------------------------------------

pytestmark_gpu = pytest.mark.gpu


@pytest.mark.gpu
class TestAutoRigLiveThroughQueue(unittest.TestCase):
    """Requires: the gateway UP on 127.0.0.1:33081, the runtime
    under data/runtime/skintokens (cmake build + F16 GGUF), and a
    real GLB in data/runs/output to rig. CPU generation takes
    minutes (upstream: no KV cache) — the wait is 40 minutes."""

    @classmethod
    def setUpClass(cls) -> None:
        import urllib.request
        try:
            with urllib.request.urlopen(
                    "http://127.0.0.1:33081/v1/health", timeout=5) as r:
                assert r.status == 200
        except Exception as e:
            raise AssertionError(
                "gateway not reachable on 127.0.0.1:33081 — restart "
                "it first (setsid uv run python python/gateway.py 33081) "
                "(%s)" % e)
        cls.cli = os.path.join(REPO, "data/runtime/skintokens/bin",
                               "skintokens-cli")
        cls.model_dir = os.path.join(
            REPO, "data/runtime/skintokens/models/SkinTokens-GGUF/F16")
        if not (os.path.isfile(cls.cli)
                and os.path.isdir(cls.model_dir)):
            raise unittest.SkipTest(
                "skintokens runtime absent (build + hf download — "
                "see docs/design/auto-rig-skintokens.md)")

    def _cleanup_run(self) -> None:
        import shutil
        run_id = getattr(self, "_run_id", "")
        if run_id:
            try:
                shutil.rmtree(os.path.join(
                    REPO, "data/runs/output", run_id),
                    ignore_errors=True)
            except OSError:
                pass

    def test_statue_to_rigged_glb_through_the_queue(self) -> None:
        import glob
        import time
        import urllib.request
        # any real mesh artifact from the estate's runs — a creature
        # GLB from the forge lane is a fine statue to rig
        candidates = sorted(
            glob.glob(os.path.join(REPO, "data/runs/output/*",
                                   "creature.glb")),
            key=os.path.getmtime, reverse=True)
        if not candidates:
            self.skipTest("no creature.glb in data/runs/output — run "
                          "the forge lane first")
        mesh = candidates[0]
        # FLAT knobs, never nested: the gateway's card-envelope lift
        # restages every non-door top-level key as the ONE params
        # stanza (card_compose_body) — a nested {"params": {...}}
        # would double-wrap and refuse.
        # CARD BIRTH LAW (operator order 2026-09-06): the start door
        # 4xxes a start without a doc-backed draft_id — the card is
        # composed FIRST (one draft-door call), then the run links
        # to it.
        card = {
            "model": "skintokens",
            "input": mesh,
            "device": "cpu",
        }
        draft_req = urllib.request.Request(
            "http://127.0.0.1:33081/v1/flows/drafts",
            data=json.dumps(card).encode(), method="POST",
            headers={"content-type": "application/json"})
        with urllib.request.urlopen(draft_req, timeout=30) as r:
            card["draft_id"] = json.loads(r.read().decode())["draftId"]
        body = json.dumps(card).encode()
        req = urllib.request.Request(
            "http://127.0.0.1:33081/v1/flows/start", data=body,
            method="POST",
            headers={"content-type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            started = json.loads(r.read().decode())
        run_id = started.get("run_id") or started.get("id")
        self.assertTrue(run_id, started)
        # HYGIENE: the live run dir is deleted even when a later
        # assert fails — the output pool stays clean.
        self._run_id = run_id
        self.addCleanup(self._cleanup_run)
        deadline = time.time() + 2400
        status = None
        while time.time() < deadline:
            with urllib.request.urlopen(
                    "http://127.0.0.1:33081/v1/flows/status/"
                    + run_id, timeout=10) as r:
                status = json.loads(r.read().decode())
            if status.get("status") in ("completed", "failed",
                                        "error", "stopped"):
                break
            time.sleep(2)
        self.assertEqual(
            status.get("status"), "completed",
            "the rig run did not complete: %s" % status)
        sidecar = os.path.join(REPO, "data/runs/output", run_id,
                               "_flow.json")
        with open(sidecar, encoding="utf-8") as f:
            flow = json.load(f)
        artifacts = flow.get("artifacts") or []
        self.assertTrue(
            any(a.endswith("rigged.glb") for a in artifacts),
            "no rigged.glb artifact in %s" % artifacts)
        rigged = os.path.join(REPO, "data/runs/output", run_id,
                              "rigged.glb")
        self.assertGreater(os.path.getsize(rigged), 1000,
                           "the rigged GLB is suspiciously small")
