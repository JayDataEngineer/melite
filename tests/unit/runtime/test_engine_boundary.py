"""test_engine_boundary.py — the ENGINE TRANSITION rule's gates.

Operator order, 2026-10-02: flows may switch engines —
"comfyui calls unload all models to be safe" at the handoff.
Operator order, 2026-09-04 (the VRAM-release audit): the boundary
is GATEWAY-LEVEL — a switch between two queued RUNS fires exactly
like a switch between two stages of one run (otherwise comfyui's
cached models stay resident in VRAM while another engine's
subprocess runs alongside them).

Three layers, no GPU and no network beyond localhost:

- the RULE      — _engine_boundary_unload directly (stub engines):
                  absent / no-transition / error:<msg> outcomes
- the LOOP      — the REAL Gateway.execute stage walk with stub
                  engines: within-run boundaries, the sidecar's
                  stages[].boundary_unload field, and CROSS-RUN
                  boundaries through gateway-level engine tracking
- the ENGINE    — the REAL comfyui unload() against a mock HTTP
                  server: the /free payload pinned, non-2xx raises
                  (a failed unload is loud, never silent)

This suite is pytest-collected (tests/unit/ — it is NOT a
check()-style script wall). Historically it lived uncollected at
tests/walls/suites/ (outside the WALLS list, inside
collect_ignore) — the 2026-09-04 audit's orphaned-suite finding;
pytest collects it here so the boundary contract can never silently
drop out of the run set.
"""

import asyncio
import importlib
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_REPO / "py"))

import gateway  # noqa: E402


class _StubEngine:
    """A stub engine; exports unload() only when asked to."""
    def __init__(self, with_unload=True, fails=False):
        self.calls = 0
        self.execs = 0
        self._with_unload = with_unload
        self._fails = fails
        if with_unload:
            async def _unload():
                self.calls += 1
                if self._fails:
                    raise RuntimeError("ComfyUI /free status 500")
            self.unload = _unload

    async def execute(self, node, run_dir, inputs, stop_event,
                      report=None):
        self.execs += 1
        return {"outputs": {"ok": 1}, "artifacts": []}


class _Registry(dict):
    """load_engine stand-in keyed by engine type."""
    def __call__(self, engine_type):
        return self[engine_type]


class TestBoundaryRule(unittest.TestCase):
    """_engine_boundary_unload's own outcome vocabulary."""

    def setUp(self):
        self._orig = gateway.load_engine
        self.reg = _Registry()
        gateway.load_engine = self.reg

    def tearDown(self):
        gateway.load_engine = self._orig

    def test_engine_without_unload_transitions_cleanly(self):
        """Subprocess engines (no unload ABI) — absent, never an error."""
        subprocess_engine = _StubEngine(with_unload=False)
        comfy = _StubEngine()
        self.reg["anycreature"] = subprocess_engine
        self.reg["comfyui"] = comfy
        outcome = asyncio.run(
            gateway._engine_boundary_unload("anycreature", "comfyui"))
        self.assertEqual(outcome, "absent")

    def test_first_stage_never_unloads(self):
        """No previous engine → no-transition."""
        comfy = _StubEngine()
        self.reg["comfyui"] = comfy
        outcome = asyncio.run(
            gateway._engine_boundary_unload(None, "comfyui"))
        self.assertEqual(outcome, "no-transition")

    def test_same_engine_is_no_transition(self):
        comfy = _StubEngine()
        self.reg["comfyui"] = comfy
        outcome = asyncio.run(
            gateway._engine_boundary_unload("comfyui", "comfyui"))
        self.assertEqual(outcome, "no-transition")
        self.assertEqual(comfy.calls, 0)

    def test_failing_unload_documented_not_raised(self):
        """RESILIENCE LAW: the exact message returns, nothing raises."""
        failing = _StubEngine(fails=True)
        auto = _StubEngine()
        self.reg["comfyui"] = failing
        self.reg["autoremesher"] = auto
        outcome = asyncio.run(
            gateway._engine_boundary_unload("comfyui", "autoremesher"))
        self.assertTrue(outcome.startswith("error:"))
        self.assertIn("status 500", outcome)
        self.assertEqual(failing.calls, 1, "the unload was attempted")


class TestRealLoop(unittest.TestCase):
    """The REAL Gateway.execute stage walk — stub engines, real loop,
    real sidecar writes (tmp out_root). A regression that drops the
    boundary call from execute() FAILS here (the audit found the old
    suite re-simulating the walk — this is the fix)."""

    def setUp(self):
        self._orig = gateway.load_engine
        self.reg = _Registry()
        gateway.load_engine = self.reg
        self.tmp = tempfile.TemporaryDirectory()
        self.gw = gateway.Gateway()
        self._seq = 0

    def tearDown(self):
        gateway.load_engine = self._orig
        self.tmp.cleanup()

    def _run(self, *node_types):
        """A real Run over a graph of the given node types, with the
        stage rows shaped exactly like submit() shapes them."""
        import flow_graph
        self._seq += 1
        g = flow_graph.FlowGraph(
            name="t%d" % self._seq,
            nodes=[flow_graph.NodeRow(node_id="n%d" % i,
                                          node_type=t)
                   for i, t in enumerate(node_types)])
        run = gateway.Run(run_id="run-bnd-%d" % self._seq,
                          graph=g, request={})
        run.out_root = Path(self.tmp.name)
        run.stages = [{"id": n.node_id, "name": n.node_id,
                       "index": i, "status": "pending"}
                      for i, n in enumerate(g.nodes)]
        run.dir.mkdir(parents=True, exist_ok=True)
        return run

    def _execute(self, run):
        asyncio.run(self.gw.execute(run))

    def test_same_engine_stages_never_unload(self):
        comfy = _StubEngine()
        self.reg["comfyui"] = comfy
        run = self._run("comfyui", "comfyui", "comfyui")
        self._execute(run)
        self.assertEqual(comfy.calls, 0)
        self.assertEqual(comfy.execs, 3)
        self.assertEqual([s["status"] for s in run.stages],
                         ["completed"] * 3)
        self.assertNotIn("boundary_unload", run.stages[1])

    def test_transition_fires_once_and_documents_sidecar(self):
        comfy = _StubEngine()
        auto = _StubEngine()
        self.reg["comfyui"] = comfy
        self.reg["autoremesher"] = auto
        run = self._run("comfyui", "comfyui", "autoremesher")
        self._execute(run)
        self.assertEqual(comfy.calls, 1, "outgoing engine unloads once")
        self.assertEqual(auto.calls, 0, "incoming engine never unloads")
        self.assertEqual(run.stages[2].get("boundary_unload"), "fired")
        self.assertNotIn("boundary_unload", run.stages[1])
        # the sidecar on disk carries the outcome (survives restarts)
        sc = json.loads((run.dir / "_flow.json").read_text())
        self.assertEqual(sc["stages"][2].get("boundary_unload"),
                         "fired")

    def test_back_and_forward_fires_each_boundary(self):
        a = _StubEngine()
        b = _StubEngine()
        self.reg["a"] = a
        self.reg["b"] = b
        run = self._run("a", "b", "a", "b")
        self._execute(run)
        self.assertEqual(a.calls, 2)
        self.assertEqual(b.calls, 1)
        self.assertEqual(run.stages[1].get("boundary_unload"), "fired")
        self.assertEqual(run.stages[2].get("boundary_unload"), "fired")
        self.assertEqual(run.stages[3].get("boundary_unload"), "fired")

    def test_subprocess_boundary_recorded_as_absent(self):
        """Subprocess engines release VRAM by process exit — the
        boundary still leaves its trace in the sidecar (the audit's
        observability gap: 'absent' used to be indistinguishable
        from 'no boundary at all')."""
        proc = _StubEngine(with_unload=False)
        comfy = _StubEngine()
        self.reg["anycreature"] = proc
        self.reg["comfyui"] = comfy
        run = self._run("anycreature", "comfyui")
        self._execute(run)
        self.assertEqual(run.stages[1].get("boundary_unload"), "absent")

    def test_failing_unload_documented_run_continues(self):
        failing = _StubEngine(fails=True)
        auto = _StubEngine()
        self.reg["comfyui"] = failing
        self.reg["autoremesher"] = auto
        run = self._run("comfyui", "autoremesher")
        self._execute(run)
        self.assertTrue(run.stages[1].get("boundary_unload", "")
                        .startswith("error:"))
        self.assertEqual(run.stages[1]["status"], "completed",
                         "an unload failure never kills the run")

    def test_cross_run_boundary_fires(self):
        """THE 2026-09-04 FIX: two SEPARATE runs, different engines —
        the second run's first stage fires the unload of the first
        run's engine (gateway-level engine tracking). Before the fix
        prev_type was a per-run local: comfyui's cached models stayed
        resident while the next run's subprocess engine ran."""
        comfy = _StubEngine()
        proc = _StubEngine(with_unload=False)
        self.reg["comfyui"] = comfy
        self.reg["kimodo"] = proc
        run1 = self._run("comfyui")
        self._execute(run1)
        self.assertEqual(comfy.calls, 0,
                         "the first run after boot never unloads")
        run2 = self._run("kimodo")
        self._execute(run2)
        self.assertEqual(comfy.calls, 1,
                         "the engine switch between RUNS must unload")
        self.assertEqual(run2.stages[0].get("boundary_unload"), "fired")

    def test_cross_run_same_engine_keeps_cache(self):
        comfy = _StubEngine()
        self.reg["comfyui"] = comfy
        self._execute(self._run("comfyui"))
        self._execute(self._run("comfyui"))
        self.assertEqual(comfy.calls, 0,
                         "consecutive same-engine runs keep the cache")

    def test_failed_stage_still_transitions_the_next_run(self):
        """A failing comfyui stage leaves the engine resident — the
        next different-engine run still fires the unload."""
        class _Boom(_StubEngine):
            async def execute(self, *a, **kw):
                raise RuntimeError("engine exploded")
        comfy = _Boom()
        auto = _StubEngine()
        self.reg["comfyui"] = comfy
        self.reg["autoremesher"] = auto
        run1 = self._run("comfyui")
        with self.assertRaises(RuntimeError):
            self._execute(run1)
        run2 = self._run("autoremesher")
        self._execute(run2)
        self.assertEqual(comfy.calls, 1)
        self.assertEqual(run2.stages[0].get("boundary_unload"), "fired")


class TestComfyuiUnloadExported(unittest.TestCase):
    """The comfyui engine owns the real unload(): POST /free."""

    def test_comfyui_compose_exports_unload(self):
        compose_dir = _REPO / "plugins" / "engines" / "comfyui" / "compose"
        sys.path.insert(0, str(compose_dir))
        try:
            spec = importlib.util.spec_from_file_location(
                "comfyui_compose_check",
                str(compose_dir / "__init__.py"))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            self.assertTrue(callable(getattr(mod, "unload", None)),
                            "comfyui compose must export unload()")
            self.assertTrue(asyncio.iscoroutinefunction(mod.unload),
                            "unload() must be async (awaited by the gateway)")
        finally:
            sys.path.remove(str(compose_dir))


class _FreeRecorder(BaseHTTPRequestHandler):
    """Mock ComfyUI: records every POST (path, body)."""
    records = []
    status = 200

    def do_POST(self):
        n = int(self.headers.get("content-length", 0))
        body = self.rfile.read(n)
        type(self).records.append((self.path, body))
        self.send_response(type(self).status)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(b"{}")

    def log_message(self, *a):
        pass


class TestComfyuiUnloadHTTP(unittest.TestCase):
    """The ENGINE side of the ABI against a mock ComfyUI server: the
    exact /free payload, and a non-2xx that raises (a failed unload
    is LOUD — the gateway documents it, never trusts it)."""

    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), _FreeRecorder)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever,
                         daemon=True).start()
        compose_dir = _REPO / "plugins" / "engines" / "comfyui" / "compose"
        sys.path.insert(0, str(compose_dir))
        cls.native = importlib.import_module("native")

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        sys.path.remove(str(_REPO / "plugins" / "engines" /
                            "comfyui" / "compose"))

    def setUp(self):
        _FreeRecorder.records = []
        _FreeRecorder.status = 200
        os.environ["COMFYUI_URL"] = "http://127.0.0.1:%d" % self.port

    def tearDown(self):
        os.environ.pop("COMFYUI_URL", None)

    def test_free_payload_is_unload_all(self):
        asyncio.run(self.native.unload())
        self.assertEqual(
            [(p, json.loads(b)) for p, b in _FreeRecorder.records],
            [("/free", {"unload_models": True, "free_memory": True})],
            "the boundary unload must drop every cached model AND the "
            "execution cache — anything less leaves VRAM resident")

    def test_non_2xx_raises_loud(self):
        _FreeRecorder.status = 500
        with self.assertRaises(self.native.ComfyError) as ctx:
            asyncio.run(self.native.unload())
        self.assertIn("500", str(ctx.exception))
        self.assertIn("resident", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
