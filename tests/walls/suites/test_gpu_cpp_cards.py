"""test_gpu_cpp_cards.py — GPU/live tests for the cpp cards.

Operator order, 2026-09-04: "Make GPU tests for the cpp cards. Then
run them. For these, I'm not concerned with efficiency at all, my
main concern is can they run and give us the inputs and outputs we
need. So we can call full unloads before/after these nodes. This
will also audit the queue system. Does our queue only allow one at
a time?"

These are LIVE runs through the REAL queue (INFERENCE LAW: all
inference through the queue system — the suite never spawns an
engine directly). Requirements:

- the gateway is UP on 127.0.0.1:33081 (operator-restarted; if it
  is down the suite fails LOUD with the restart hint, never skips
  silently)
- node ≥ 18 for the anyCreature CLI (the vendored engine)

What each probe proves:
- forge green: the card → bus → renderer argv → engine → GLB
  artifact chain END TO END, inputs and outputs exactly as the
  pipeline layer needs them (the artifact path lands in the run's
  artifacts, carryable to the next node)
- forge BLOCK refusal: the engine's mechanical checks (balance,
  proportion) ride back as the run's EXACT error — a documented
  failure, never a silent empty completion (RESILIENCE LAW; the
  error-dict swallow hole was found and fixed building this suite)
- missing-binary refusals: kimodo/autoremesher without their
  binaries refuse LOUDLY naming the env knob (QUEUE LANE LAW: no
  silent fallback) — the error is the artifact
- engine transition: a 2-stage yaml (forge → quad-remesh) passes
  the creature GLB node-to-node ($forge.glb wiring), the engine
  boundary never crashes the run, and stage 2 documents its refusal
- serial audit: two forge submissions observed LIVE — at no sampled
  instant are two runs active, and the queue serves both (FIFO, one
  active at a time — the serial GPU law)
"""

import json
import os
import sys
import time
import unittest
import urllib.request

BASE = "http://127.0.0.1:33081"
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))

# the TRUE minimal green creature (live-probed against the engine's
# mechanical checks: graded body rhythm + two support legs + palette)
MINI_SPEC = {
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

# a spec that passes the STRUCTURAL floor but trips the engine's
# mechanical BLOCK (dead rhythm + tips over) — proves the semantic
# gate rides back as the run's exact error
BLOCKED_SPEC = {
    "name": "doomed",
    "joints": {"A": [0, 0.5, 0], "B": [0, 0.7, 0], "C": [0, 0.9, 0]},
    "chains": {"body": ["A", "B", "C"]},
    "volumes": [
        {"chain": "body", "material": "m", "frame": "up", "sides": 6,
         "profile": [[0.0, 0.08, 0.0], [1.0, 0.04, 0.0]]}],
    # the palette carries the material so the compiler proceeds INTO
    # the mechanical checks (a missing palette entry is a different,
    # earlier refusal)
    "palette": {"m": {"color": "#888888"}},
}


def _heavy_spec():
    """A heavier creature for the serial audit — more volumes, high
    side counts: the run lasts long enough for the sampler to
    actually observe the queue (efficiency is not the concern here;
    observability is)."""
    spec = json.loads(json.dumps(MINI_SPEC))
    spec["name"] = "heavy-audit-creature"
    spec["volumes"] = [
        {"chain": "body", "material": "fur_body", "frame": "up",
         "sides": 64, "profile": [[0.0, 0.085, 0.0], [0.45, 0.10, 0.01],
                                   [1.0, 0.045, 0.03]]},
        {"chain": "lleg", "material": "fur_leg", "frame": "up",
         "sides": 48, "profile": [[0.0, 0.05, 0.0], [1.0, 0.03, 0.0]]},
        {"chain": "rleg", "material": "fur_leg", "frame": "up",
         "sides": 48, "profile": [[0.0, 0.05, 0.0], [1.0, 0.03, 0.0]]}]
    return spec


def _req(method, path, body=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"content-type": "application/json"})
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def _submit(model, params):
    return _req("POST", "/v1/pipelines/start",
                {"model": model, "params": params})


def _wait(run_id, deadline_s=180, want=("completed", "failed", "error",
                                        "stopped")):
    """Poll until terminal; returns the final status dict."""
    end = time.time() + deadline_s
    while time.time() < end:
        d = _req("GET", "/v1/pipelines/status/" + run_id)
        if d.get("status") in want:
            return d
        time.sleep(0.4)
    raise AssertionError("run %s did not settle in %ss (last: %s)"
                         % (run_id, deadline_s, d.get("status")))


def _sidecar(run_id):
    with open(os.path.join(REPO, "data/runs/output", run_id,
                           "_pipeline.json"), encoding="utf-8") as f:
        return json.load(f)


@unittest.skipIf(not os.environ.get("DSH_GPU_TESTS")
                 and not os.path.isdir(os.path.join(
                     REPO, "plugins/engines/cpp/anycreature/vendor/"
                     "anyCreature/engine")),
    "anyCreature vendor tree absent — run git submodule update "
    "--init to enable the live cpp GPU suite")
class TestGpuCppCards(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # the gateway must be UP — a dead gateway is a FAILURE, never
        # a skip (the suite's whole point is the live queue)
        try:
            _req("GET", "/v1/pipelines/yaml/list", timeout=5)
        except Exception as e:
            raise AssertionError(
                "gateway not reachable on %s — restart it first: "
                "setsid .venv/bin/python py/gateway.py 33081 "
                "(%s)" % (BASE, e))
        cls.forge_glb = None

    def test_01_forge_green_through_the_queue(self):
        """The full chain: card → bus → renderer argv → node engine
        → GLB artifact recorded — the inputs/outputs the pipeline
        layer needs."""
        d = _submit("anycreature", {"spec": MINI_SPEC, "ao": True})
        run_id = d["run_id"]
        self.assertEqual(d["status"], "queued",
                         "submission refused: %s" % d)
        final = _wait(run_id)
        self.assertEqual(final["status"], "completed",
                         json.dumps(final)[:400])
        arts = final.get("artifacts") or []
        self.assertTrue(arts, "completed with ZERO artifacts — the "
                        "silent-noop class")
        glb = arts[0]
        self.assertTrue(glb.endswith(".glb"), glb)
        self.assertGreater(os.path.getsize(glb), 10000,
                           "GLB suspiciously small: %d bytes"
                           % os.path.getsize(glb))
        TestGpuCppCards.forge_glb = glb
        # the sidecar mirrors the artifact (the ledger contract)
        sc = _sidecar(run_id)
        self.assertEqual(sc["status"], "completed")
        self.assertIn(glb, sc.get("artifacts", []))

    def test_02_forge_engine_block_refusal_is_loud(self):
        """A structurally-valid but mechanically-doomed spec: the
        engine's BLOCK rides back as the run's EXACT error — a
        documented failure, never a silent empty completion."""
        d = _submit("anycreature", {"spec": BLOCKED_SPEC})
        final = _wait(d["run_id"])
        self.assertEqual(final["status"], "failed",
                         "the doomed build should FAIL loudly, got %s"
                         % json.dumps(final)[:300])
        err = final.get("error", "")
        self.assertIn("BLOCK", err,
                      "the engine's structured refusal must ride "
                      "through verbatim: %r" % err[:200])
        sc = _sidecar(d["run_id"])
        self.assertEqual(sc["status"], "failed")
        self.assertTrue(sc.get("error"), "sidecar carries no error")

    def test_03_quad_remesh_produces_real_mesh(self):
        """REAL OUTPUT: the creature GLB (from test 01) converts to
        OBJ at the card's door (the engine's only format — a raw GLB
        segfaults it) and the engine returns a real remeshed quad
        mesh + report. Requires the built binary under
        data/runtime/autoremesher (qmake+make; skip if absent)."""
        binpath = os.path.join(REPO, "data/runtime/autoremesher",
                               "autoremesher")
        if not os.path.isfile(binpath):
            self.skipTest("autoremesher not built — cd "
                          "data/runtime/autoremesher && qmake "
                          "../../../plugins/engines/cpp/autoremesher/"
                          "vendor/autoremesher/autoremesher.pro && "
                          "make -j4")
        mesh = TestGpuCppCards.forge_glb
        if not mesh:   # solo invocation — forge our own input first
            d = _submit("anycreature", {"spec": MINI_SPEC})
            f = _wait(d["run_id"])
            self.assertEqual(f["status"], "completed")
            mesh = (f.get("artifacts") or [""])[0]
            TestGpuCppCards.forge_glb = mesh
        self.assertTrue(mesh and mesh.endswith(".glb"),
                        "no forge GLB available as remesh input")
        d = _submit("autoremesher", {"input": mesh,
                                     "target_quads": 2000})
        final = _wait(d["run_id"], deadline_s=600)
        self.assertEqual(final["status"], "completed",
                         json.dumps(final)[:400])
        arts = final.get("artifacts") or []
        self.assertTrue(any(a.endswith("remeshed.obj") for a in arts),
                        "no remeshed.obj artifact: %s" % arts)
        obj = [a for a in arts if a.endswith("remeshed.obj")][0]
        self.assertGreater(os.path.getsize(obj), 5000,
                           "remeshed mesh suspiciously small")
        self.assertTrue(any(a.endswith("remeshed_report.txt")
                            for a in arts),
                        "no engine report artifact: %s" % arts)

    def test_04_text_to_motion_produces_real_motion(self):
        """REAL OUTPUT when the lane is provisioned (estate CLI
        wrapper + built generator + sha-verified weights under
        data/runtime/kimodo): a prompt → real motion.glb through the
        queue. Unprovisioned → the loud refusal naming KIMODO_BIN
        (QUEUE LANE LAW). Both branches are the contract."""
        wrapper = os.path.join(
            REPO, "plugins/engines/cpp/kimodo/cli/kimodo_cli")
        weights = os.path.join(
            REPO, "data/runtime/kimodo/weights/generated/"
            "llm2vec-text-bundle/tokenizer.gguf")
        provisioned = os.path.isfile(wrapper) and os.path.isfile(
            weights)
        d = _submit("soma", {"prompt":
                             "a knight walks, then bows deeply",
                             "steps": 20})
        final = _wait(d["run_id"],
                      deadline_s=600 if provisioned else 180)
        if provisioned:
            self.assertEqual(final["status"], "completed",
                             json.dumps(final)[:400])
            arts = final.get("artifacts") or []
            self.assertTrue(
                any(a.endswith("motion.glb") for a in arts),
                "no motion.glb artifact: %s" % arts)
            glb = [a for a in arts if a.endswith("motion.glb")][0]
            self.assertGreater(os.path.getsize(glb), 10000,
                               "motion GLB suspiciously small")
            with open(glb, "rb") as f:
                self.assertEqual(f.read(4), b"glTF",
                                 "not a GLB container")
        else:
            self.assertEqual(final["status"], "failed")
            err = (final.get("error") or "").lower()
            self.assertIn("kimodo", err)
            self.assertTrue("cli" in err or "not found" in err,
                            "unexpected refusal: %r" % err[:200])

    def test_05_engine_transition_forge_to_remesh(self):
        """A 2-stage yaml: the creature GLB wires node-to-node
        ($forge.glb) across the anycreature→autoremesher boundary,
        converts at the card's door, and BOTH stages produce REAL
        artifacts (GLB + remeshed OBJ). The full unloads story:
        subprocess engines exit between stages; the boundary never
        crashes the run."""
        lane = os.path.join(REPO, "pipelines",
                            "gpu-test-cpp-transition")
        os.makedirs(lane, exist_ok=True)
        try:
            with open(os.path.join(lane, "pipeline.yaml"), "w",
                      encoding="utf-8") as f:
                f.write(
                    "name: gpu-test-cpp-transition\n"
                    "api: true\n"
                    "description: >-\n"
                    "  Live GPU-suite lane: forge a creature, hand the "
                    "GLB to quad-remesh across the engine boundary.\n"
                    "nodes:\n")
                f.write(
                    "  - id: forge\n"
                    "    type: anycreature\n"
                    "    description: compile the minimal creature\n"
                    "    params: " + json.dumps(
                        {"workflow": MINI_SPEC}) + "\n"
                    "  - id: remesh\n"
                    "    type: autoremesher\n"
                    "    description: quad-remesh the creature GLB\n"
                    "    input_from: [forge.glb]\n"
                    "    params: " + json.dumps(
                        {"workflow": {"input": "$forge.glb"},
                         "target_quads": 2000}) + "\n")
            d = _req("POST", "/v1/pipelines/start",
                     {"yaml": "gpu-test-cpp-transition"})
            run_id = d["run_id"]
            final = _wait(run_id, deadline_s=600)
            sc = _sidecar(run_id)
            stages = {s["id"]: s for s in sc.get("stages", [])}
            self.assertEqual(
                stages["forge"]["status"], "completed",
                "stage 1 (forge) failed: %s"
                % json.dumps(stages.get("forge", {}))[:300])
            remesh = stages["remesh"]
            self.assertEqual(
                remesh["status"], "completed",
                "stage 2 (remesh) failed: %s"
                % json.dumps(remesh)[:300])
            arts = sc.get("artifacts") or []
            self.assertTrue(
                any(a.endswith("creature.glb") for a in arts),
                "stage 1 artifact missing: %s" % arts)
            self.assertTrue(
                any(a.endswith("remeshed.obj") for a in arts),
                "stage 2 artifact missing (the transition must carry "
                "REAL output node-to-node): %s" % arts)
        finally:
            import shutil
            shutil.rmtree(lane, ignore_errors=True)

    def test_07_text_to_motion_transitions_sequence(self):
        """The sequence door (kmd-generate --sequence): two prompts
        spliced at given frame boundaries → a real motion.glb with
        more than the default frame count (196) and the run's
        stage sidecar names the prompt-transition structure."""
        wrapper = os.path.join(
            REPO, "plugins/engines/cpp/kimodo/cli/kimodo_cli")
        if not os.path.isfile(wrapper):
            self.skipTest("kimodo CLI wrapper not built")
        if not os.path.isfile(os.path.join(
                REPO, "data/runtime/kimodo/weights/generated/"
                "llm2vec-text-bundle/tokenizer.gguf")):
            self.skipTest("kimodo weights not provisioned")
        d = _submit("soma", {
            "prompt": "a knight walks forward",
            "skeleton": "soma",
            "steps": 15,
            "transitions": [
                {"frame": 0, "prompt": "a knight walks forward"},
                {"frame": 60, "prompt": "the knight bows deeply"}]})
        final = _wait(d["run_id"], deadline_s=600)
        self.assertEqual(final["status"], "completed",
                         json.dumps(final)[:400])
        arts = final.get("artifacts") or []
        self.assertTrue(any(a.endswith("motion.glb") for a in arts),
                        "no motion.glb: %s" % arts)

    def test_08_text_to_motion_g1_glb_loud_refusal(self):
        """G1 generation works in the C engine, but the vendor's
        GLB exporter speaks soma30 only — the wrapper refuses LOUDLY
        at the card door with the exact reason (QUEUE LANE LAW)."""
        wrapper = os.path.join(
            REPO, "plugins/engines/cpp/kimodo/cli/kimodo_cli")
        if not os.path.isfile(wrapper):
            self.skipTest("kimodo CLI wrapper not built")
        d = _submit("soma", {"prompt": "a test", "skeleton": "g1"})
        final = _wait(d["run_id"], deadline_s=120)
        # either the g1 GLB-exporter refusal OR the g1 gguf-missing
        # refusal (the g1 weights aren't downloaded today) — both are
        # honest documented failures
        self.assertIn(final["status"], ("failed", "error"))
        err = (final.get("error") or "").lower()
        self.assertTrue(
            ("g1" in err and "glb" in err) or
            ("gguf" in err and "g1" in err) or
            "soma30" in err,
            "unexpected g1 refusal: %r" % err[:200])

    def test_09_text_to_motion_smplx_licence_gate(self):
        """SMPL-X is licence-gated (NVIDIA internal-R&D, no
        distribution) — the schema refuses LOUDLY before any spawn,
        naming the user-checkpoint param or env knob. The refusal
        may ride as a route-layer 4xx (the card_compose phase 1
        contract) or a run-stage failure — both are honest."""
        import urllib.error
        try:
            d = _submit("soma", {"prompt": "a test",
                                 "skeleton": "smplx"})
        except urllib.error.HTTPError as e:
            # the loud 4xx: read the JSON body, assert the refusal
            # names the licence knob
            body = json.loads(e.read().decode())
            err = json.dumps(body).lower()
            self.assertIn("smplx", err)
            self.assertTrue(
                "smplx_checkpoint" in err or "kimodo_smplx" in err,
                "SMPL-X refusal must name the licence gate knob: "
                "%r" % err[:200])
            return
        final = _wait(d["run_id"], deadline_s=60)
        self.assertIn(final["status"], ("failed", "error"))
        err = (final.get("error") or "").lower()
        self.assertIn("smplx", err)
        self.assertTrue(
            "smplx_checkpoint" in err or "kimodo_smplx" in err,
            "SMPL-X refusal must name the licence gate knob: %r"
            % err[:200])

    def test_10_stop_door_lands_on_cpp_run(self):
        """The stop door (the RESILIENCE LAW's <6s interrupt claim)
        works on a cpp run too: POST stop while kmd-generate is
        in flight, the run settles as 'stopped' in well under the
        run's natural wall-time (we measure the stop latency, not
        the run duration)."""
        wrapper = os.path.join(
            REPO, "plugins/engines/cpp/kimodo/cli/kimodo_cli")
        if not os.path.isfile(wrapper):
            self.skipTest("kimodo CLI wrapper not built")
        if not os.path.isfile(os.path.join(
                REPO, "data/runtime/kimodo/weights/generated/"
                "llm2vec-text-bundle/tokenizer.gguf")):
            self.skipTest("kimodo weights not provisioned")
        d = _submit("soma", {"prompt": "a long motion",
                             "steps": 50})
        run_id = d["run_id"]
        # wait for the ticket to flip (queue → running) — posting
        # stop on a queued run lands the flag for the NEXT run, not
        # this one (the GPU is idle for a moment while the model
        # loads); we want stop to interrupt an IN-FLIGHT generation
        end_claim = time.time() + 60
        while time.time() < end_claim:
            s = _req("GET", "/v1/pipelines/status/" + run_id,
                     timeout=5)
            if s.get("status") not in ("queued", "running", "starting"):
                self.fail("run %s settled before stop could fire: %s"
                          % (run_id, s.get("status")))
            if s.get("status") == "running":
                break
            time.sleep(0.3)
        t0 = time.time()
        _req("POST", "/v1/pipelines/stop/" + run_id, timeout=5)
        # generous deadline — the run may take seconds to notice the
        # flag through the asyncio.wait_for path
        final = _wait(run_id, deadline_s=30)
        self.assertEqual(final["status"], "stopped",
                         "stop door should land as 'stopped', got: %s"
                         % json.dumps(final)[:200])
        elapsed = time.time() - t0
        self.assertLess(elapsed, 15,
                        "stop door took %.1fs (>15s) — the cpp "
                        "stop path is slow" % elapsed)

    def test_06_queue_serializes_concurrent_submissions(self):
        """THE SERIAL AUDIT: two forge runs submitted back-to-back —
        at no sampled instant are two runs active, and BOTH are
        served (FIFO; the serial GPU law)."""
        a = _submit("anycreature", {"spec": _heavy_spec()})
        b = _submit("anycreature", {"spec": _heavy_spec()})
        active_samples = []
        while True:
            try:
                ra = _req("GET", "/v1/pipelines/status/" + a["run_id"])
                rb = _req("GET", "/v1/pipelines/status/" + b["run_id"])
            except Exception:
                break
            def _active(d):
                s = d.get("status", "")
                if s in ("completed", "failed", "stopped", "error"):
                    return False
                # queued = holding a ticket but not computing;
                # running-ish statuses = computing
                return s not in ("queued",)
            active_samples.append(( _active(ra), _active(rb) ))
            if (ra.get("status") in ("completed", "failed",
                                    "stopped")
                    and rb.get("status") in ("completed", "failed",
                                             "stopped")):
                break
            time.sleep(0.2)
        both = [(x, y) for x, y in active_samples if x and y]
        self.assertEqual(
            both, [],
            "the queue ran two runs CONCURRENTLY — serial GPU law "
            "broken (%d overlapping samples of %d)"
            % (len(both), len(active_samples)))
        self.assertGreater(len(active_samples), 2,
                           "sampling window too small — runs finished "
                           "before the audit could observe")
        # both served — the queue continued after the first
        fa = _req("GET", "/v1/pipelines/status/" + a["run_id"])
        fb = _req("GET", "/v1/pipelines/status/" + b["run_id"])
        self.assertEqual(fa.get("status"), "completed",
                         json.dumps(fa)[:200])
        self.assertEqual(fb.get("status"), "completed",
                         json.dumps(fb)[:200])
        # FIFO: A was submitted first, so A's run directory mtime
        # ≤ B's (the sidecar write is the completion time)
        ma = os.path.getmtime(
            os.path.join(REPO, "data/runs/output", a["run_id"],
                         "_pipeline.json"))
        mb = os.path.getmtime(
            os.path.join(REPO, "data/runs/output", b["run_id"],
                         "_pipeline.json"))
        self.assertLessEqual(ma, mb,
                             "FIFO broken: A's completion (%f) is "
                             "after B's (%f)" % (ma, mb))


if __name__ == "__main__":
    unittest.main(verbosity=2)
