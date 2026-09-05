"""test_gpu_smoke.py — one light GPU probe per action card + the coverage wall.

Operator order, 2026-09-06: "get a set of these [GPU] tests for
every action card ... set the inputs to something very small and
light so they're just like a better version of a smoke test" — plus
a meta test proving every card is covered.

TWO halves, ONE file:

- TestGpuSmokeCoverage (FAST, no marker): the meta test. The api
  cards from scan_engine_cards must each EITHER own a SMOKE probe
  below OR carry a documented EXCLUDED reason. A new card with
  neither fails HERE on every runner — coverage can only shrink
  deliberately, never by landing a card and forgetting the probe.
- TestGpuSmoke (pytest.mark.gpu, opt in with `pytest -m gpu`): the
  live probes. Each submits {model, params} through the REAL queue
  (INFERENCE LAW — never an engine directly), waits for terminal,
  and asserts completed + a real artifact on disk. Inputs are the
  smallest the validators accept (1 step, tiny frames, short
  seconds, the 12-tri cube): a better smoke test, not a quality
  gate. Serial by construction (pytest runs file order; force with
  `pytest -m gpu -n 1` under xdist — the serial GPU law).

Requirements (live half only): the gateway UP on 127.0.0.1:33081
(operator-restarted; down fails LOUD with the restart hint, never
skips silently — the test_gpu_cpp_cards.py shape), node >= 18 for
the anyCreature CLI, provisioned checkpoints for the ComfyUI lanes.

First-GPU-run calibration (2026-09-06, no GPU on the dev box): the
light values below are validator-sane by static inspection, NOT
live-probed. A loud construction refusal on the GPU box names the
knob — adjust the value, never the assertion shape.
"""

import json
import os
import time
import unittest
import urllib.request

import pytest
from _anchor import REPO
from melite_cards import scan_engine_cards
from test_gpu_cpp_cards import MINI_SPEC

BASE = "http://127.0.0.1:33081"
FIXTURE_PNG = "tests/integration/assets/source.png"
CUBE_OBJ = "tests/walls/suites/assets/smoke_cube.obj"

# card -> live probe. model = the card's default family (the
# capabilities resolved row); params = the lightest validator-sane
# body; deadline_s = the wait cap (heavy lanes get room).
SMOKE: dict[str, dict] = {
    "anny": {"model": "anny", "deadline_s": 1500,
             "params": {"source_image": FIXTURE_PNG,
                        "resolution": 256, "samples": 1}},
    "forge": {"model": "anycreature", "deadline_s": 600,
              "params": {"spec": MINI_SPEC}},
    "h3-timeline": {"model": "h3-timeline", "deadline_s": 1500,
                    "params": {"prompt": "a cube rotating on a table",
                               "width": 256, "height": 160, "length": 9,
                               "steps": 4, "seed": 42}},
    "ideogram4": {"model": "ideogram", "deadline_s": 1200,
                  "params": {"prompt": "a small red cube",
                             "width": 512, "height": 512,
                             "steps": 1, "seed": 7}},
    "image-edit": {"model": "qwen-img-edit-2511", "deadline_s": 1200,
                   "params": {"input_image": FIXTURE_PNG,
                              "prompt": "turn the subject blue",
                              "width": 256, "height": 256,
                              "steps": 1, "seed": 7}},
    "image-gen": {"model": "krea-2", "deadline_s": 1200,
                  "params": {"prompt": "a small red cube on a table",
                             "width": 256, "height": 256,
                             "steps": 1, "seed": 7}},
    "img-to-mesh": {"model": "trellis2-native", "deadline_s": 1800,
                    "params": {"input_image": FIXTURE_PNG,
                               "resolution": "512", "steps": 1,
                               "shape_steps": 1, "tex1_steps": 1,
                               "tex2_steps": 1, "remesh_resolution": 256,
                               "decimate_faces": 10000,
                               "atlas_size": "2048", "ao_size": "512",
                               "normal_size": "1024", "seed": 7}},
    "input-prep": {"model": "input", "deadline_s": 600,
                   "params": {"source": FIXTURE_PNG}},
    "mask-studio": {"model": "mask-studio", "deadline_s": 900,
                    "params": {"input_image": FIXTURE_PNG}},
    "motion": {"model": "kimodo", "deadline_s": 1500,
               "params": {"prompt": "a person takes one step forward",
                          "duration_sec": 2, "diffusion_steps": 2,
                          "num_transition_frames": 2, "num_samples": 1,
                          "seed": 42}},
    "music": {"model": "music3", "deadline_s": 1500,
              "params": {"prompt": "soft lofi loop", "duration": 10,
                         "n_diffusion_steps": 4, "seed": 7}},
    "music-native": {"model": "ace-step-xl", "deadline_s": 900,
                     "params": {}},
    "quad-remesh": {"model": "autoremesher", "deadline_s": 600,
                    "params": {"input": CUBE_OBJ, "target_quads": 500}},
    "sfx": {"model": "moss-sfx", "deadline_s": 1200,
            "params": {"prompt": "a wooden door knock", "duration": 3,
                       "n_diffusion_steps": 4, "seed": 7}},
    "text-to-motion": {"model": "soma", "deadline_s": 900,
                       "params": {"prompt": "a person takes one step",
                                  "steps": 2, "seed": 7}},
    "tts": {"model": "qwen3-tts", "deadline_s": 900,
            "params": {"text": "Smoke test one two three."}},
    "upscale-tools": {"model": "seedvr2_ema", "deadline_s": 1200,
                      "params": {"input_image": FIXTURE_PNG,
                                 "resolution": 256}},
    "video-gen": {"model": "wan-vace", "deadline_s": 1800,
                  "params": {"prompt": "a cube rotating on a table",
                             "width": 256, "height": 160, "length": 9,
                             "steps": 1, "seed": 7}},
    "voice-lock": {"model": "qwen3-tts-voicedesign", "deadline_s": 900,
                   "params": {"voice_name": "smoke",
                              "style_instruction":
                              "calm neutral narration"}},
}

# card -> WHY it has no live probe. Empty today (all 19 boarded);
# an entry must name the lane reality (unprovisioned checkpoint,
# remote-money lane, binary without a box build), never "later".
EXCLUDED: dict[str, str] = {}


class TestGpuSmokeCoverage:
    """The meta test — runs on EVERY runner, no GPU needed."""

    def test_every_api_card_is_probed_or_excluded(self) -> None:
        cards = scan_engine_cards(str(REPO))
        api = sorted(cid for cid, (path, cls) in cards.items()
                     if cls.api)
        missing = [c for c in api
                   if c not in SMOKE and c not in EXCLUDED]
        assert not missing, \
            "action cards with NO gpu smoke probe and NO exclusion: %s " \
            "— add a SMOKE entry (light params) or an EXCLUDED reason " \
            "(test_gpu_smoke.py)" % missing
        stale = ([c for c in SMOKE if c not in api] +
                 [c for c in EXCLUDED if c not in api])
        assert not stale, \
            "smoke registry names cards that no longer serve: %s — " \
            "retire the entry with the card" % stale

    def test_probe_shapes_are_sane(self) -> None:
        for cid, probe in SMOKE.items():
            assert isinstance(probe["model"], str) and probe["model"], cid
            assert isinstance(probe["params"], dict), cid
            assert probe["deadline_s"] > 0, cid
            for k, v in probe["params"].items():
                if isinstance(v, str) and (
                        v.endswith(".png") or v.endswith(".obj")):
                    assert os.path.isfile(os.path.join(str(REPO), v)), \
                        "%s param %s refs missing fixture %s" % (cid, k, v)

    def test_exclusions_cite_lane_reality(self) -> None:
        for cid, reason in EXCLUDED.items():
            assert len(reason) >= 20, \
                "%s exclusion names no lane reality: %r" % (cid, reason)


def _req(method: str, path: str,
         body: dict | None = None, timeout: int = 30) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"content-type": "application/json"})
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


@pytest.mark.gpu
class TestGpuSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        try:
            _req("GET", "/v1/health", timeout=5)
        except Exception as e:
            raise AssertionError(
                "gateway not reachable on %s — restart it first: "
                "setsid .venv/bin/python py/gateway.py 33081 "
                "(%s)" % (BASE, e))

    def _smoke(self, cid: str) -> None:
        probe = SMOKE[cid]
        # FLAT body (the start-door contract — flows rework 2026-09-05:
        # {model} + card params at top level; the gateway wraps into
        # {params:} for the arm. A nested "params" key double-wraps
        # and 400s at phase 1 — live-probed 2026-09-06.)
        d = _req("POST", "/v1/flows/start",
                 {"model": probe["model"], **probe["params"]})
        self.assertEqual(d.get("status"), "queued",
                         "%s submission refused: %s" % (cid, d))
        run_id = d["run_id"]
        end = time.time() + probe["deadline_s"]
        final: dict = {}
        while time.time() < end:
            final = _req("GET", "/v1/flows/status/" + run_id)
            if final.get("status") in ("completed", "failed", "error",
                                       "stopped"):
                break
            time.sleep(2)
        self.assertEqual(final.get("status"), "completed",
                         "%s run did not complete: %s"
                         % (cid, json.dumps(final)[:400]))
        arts = [a for a in (final.get("artifacts") or [])
                if os.path.isfile(a)]
        self.assertTrue(arts,
                        "%s completed with ZERO artifacts on disk — "
                        "the silent-noop class" % cid)

    def test_anny_smoke(self) -> None:
        self._smoke("anny")

    def test_forge_smoke(self) -> None:
        self._smoke("forge")

    def test_h3_timeline_smoke(self) -> None:
        self._smoke("h3-timeline")

    def test_ideogram4_smoke(self) -> None:
        self._smoke("ideogram4")

    def test_image_edit_smoke(self) -> None:
        self._smoke("image-edit")

    def test_image_gen_smoke(self) -> None:
        self._smoke("image-gen")

    def test_img_to_mesh_smoke(self) -> None:
        self._smoke("img-to-mesh")

    def test_input_prep_smoke(self) -> None:
        self._smoke("input-prep")

    def test_mask_studio_smoke(self) -> None:
        self._smoke("mask-studio")

    def test_motion_smoke(self) -> None:
        self._smoke("motion")

    def test_music_smoke(self) -> None:
        self._smoke("music")

    def test_music_native_smoke(self) -> None:
        self._smoke("music-native")

    def test_quad_remesh_smoke(self) -> None:
        self._smoke("quad-remesh")

    def test_sfx_smoke(self) -> None:
        self._smoke("sfx")

    def test_text_to_motion_smoke(self) -> None:
        self._smoke("text-to-motion")

    def test_tts_smoke(self) -> None:
        self._smoke("tts")

    def test_upscale_tools_smoke(self) -> None:
        self._smoke("upscale-tools")

    def test_video_gen_smoke(self) -> None:
        self._smoke("video-gen")

    def test_voice_lock_smoke(self) -> None:
        self._smoke("voice-lock")
