"""test_engine_boundary.py — the ENGINE TRANSITION rule's gates.

Operator order, 2026-10-02: pipelines may switch engines —
"comfyui calls unload all models to be safe" at the handoff.

Covers:
- same-engine consecutive stages NEVER unload (cache stays — why
  trellis-after-image is fast)
- an engine transition fires the outgoing engine's unload() exactly
  once, awaited, before the next stage
- engines WITHOUT unload() (subprocess engines) transition cleanly
- a failing unload is documented (error:<msg>) and never raises —
  the run continues (RESILIENCE LAW)
- the comfyui engine exports unload() alongside execute()/stop()
"""

import asyncio
import os
import sys
import unittest

_REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
sys.path.insert(0, os.path.join(_REPO, "py"))

import gateway


class _StubEngine:
    """A stub engine; exports unload() only when asked to."""
    def __init__(self, with_unload=True, fails=False):
        self.calls = 0
        self._with_unload = with_unload
        self._fails = fails
        if with_unload:
            async def _unload():
                self.calls += 1
                if self._fails:
                    raise RuntimeError("ComfyUI /free status 500")
            self.unload = _unload


class _Registry(dict):
    """load_engine stand-in keyed by engine type."""
    def __call__(self, engine_type):
        return self[engine_type]


class TestBoundaryRule(unittest.TestCase):
    def setUp(self):
        self._orig = gateway.load_engine
        self.reg = _Registry()
        gateway.load_engine = self.reg

    def tearDown(self):
        gateway.load_engine = self._orig

    def _walk(self, node_types):
        """Simulate the gateway stage walk: apply the boundary rule at
        every stage transition exactly as the loop does."""
        prev_type = None
        for nt in node_types:
            if prev_type is not None and prev_type != nt:
                outcome = asyncio.run(
                    gateway._engine_boundary_unload(prev_type, nt))
            prev_type = nt

    def test_same_engine_never_unloads(self):
        comfy = _StubEngine()
        self.reg["comfyui"] = comfy
        self._walk(["comfyui", "comfyui", "comfyui"])
        self.assertEqual(comfy.calls, 0)

    def test_transition_fires_exactly_once(self):
        comfy = _StubEngine()
        auto = _StubEngine()
        self.reg["comfyui"] = comfy
        self.reg["autoremesher"] = auto
        self._walk(["comfyui", "comfyui", "autoremesher"])
        self.assertEqual(comfy.calls, 1, "outgoing engine unloads once")
        self.assertEqual(auto.calls, 0, "incoming engine never unloads")

    def test_back_and_forward_fires_each_boundary(self):
        a = _StubEngine()
        b = _StubEngine()
        self.reg["a"] = a
        self.reg["b"] = b
        self._walk(["a", "b", "a", "b"])
        self.assertEqual(a.calls, 2)
        self.assertEqual(b.calls, 1)

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
        """No previous stage → no-transition."""
        comfy = _StubEngine()
        self.reg["comfyui"] = comfy
        outcome = asyncio.run(
            gateway._engine_boundary_unload(None, "comfyui"))
        self.assertEqual(outcome, "no-transition")

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


class TestComfyuiUnloadExported(unittest.TestCase):
    """The comfyui engine owns the real unload(): POST /free."""

    def test_comfyui_compose_exports_unload(self):
        compose_dir = os.path.join(
            _REPO, "plugins/engines/comfyui/compose")
        sys.path.insert(0, compose_dir)
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "comfyui_compose_check", os.path.join(compose_dir, "__init__.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        self.assertTrue(callable(getattr(mod, "unload", None)),
                        "comfyui compose must export unload()")
        self.assertTrue(asyncio.iscoroutinefunction(mod.unload),
                        "unload() must be async (awaited by the gateway)")


if __name__ == "__main__":
    unittest.main()
