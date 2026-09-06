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

Live-probed 2026-09-06 on the RTX 4090 box through the operator
queue (15/19 green). Four loud reds are RECORDED lane findings,
not smoke bugs — see docs/design/gpu-smoke-per-card.md (h3 arm
phase-1/phase-2 shape asymmetry; trellis dino checkpoint gap;
audiocpp_cli unbuilt; tts speaker-ref gap). A loud refusal names
the knob — adjust the value, never the assertion shape.
"""

import json
import os
import time
import unittest
import urllib.error
import urllib.request

import pytest
from _anchor import REPO
from melite_cards import scan_engine_cards

# Card params ride JSON (no future-import here — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None
from test_gpu_cpp_cards import MINI_SPEC

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

BASE = "http://127.0.0.1:33081"
OUT_ROOT = REPO / "data" / "runs" / "output"


def _rm_run(run_id: str) -> None:
    """Best-effort delete of one live run directory."""
    import shutil
    try:
        shutil.rmtree(OUT_ROOT / run_id, ignore_errors=True)
    except OSError:
        pass
# ABSOLUTE (live-probed 2026-09-06): artifact-ref gates (image-edit)
# resolve runs-relative refs under the output pool — a repo-relative
# photo reads as "upstream output of run ?" and 400s. Absolute disk
# paths pass every gate (plain-existence and artifact-ref alike).
FIXTURE_PNG = os.path.join(str(REPO), "tests/integration/assets/source.png")
CUBE_OBJ = os.path.join(str(REPO), "tests/walls/suites/assets/smoke_cube.obj")

# card -> live probe. model = the card's default family (the
# capabilities resolved row); params = the lightest validator-sane
# body; deadline_s = the wait cap (heavy lanes get room).
SMOKE: dict[str, dict] = {
    "anny": {"model": "anny", "deadline_s": 1500,
             "params": {"source_image": FIXTURE_PNG,
                        "resolution": 256, "samples": 1}},
    "forge": {"model": "anycreature", "deadline_s": 600,
              "params": {"spec": MINI_SPEC}},
    # DOC shape (live-probed 2026-09-06): h3 nests its params
    # stanza (H3Params: calls/width/height — steps/length are NOT doc
    # keys, lane defaults apply); every call needs start_frame.
    "h3-timeline": {"model": "h3-timeline", "deadline_s": 1500,
                    "params": {"prompt": "a cube rotating on a table",
                               "seed": 42,
                               "params": {"calls": [{"text": "a cube",
                                                     "start_frame": 0,
                                                     "end_frame": 8}],
                                          "width": 256,
                                          "height": 160}}},
    "ideogram4": {"model": "ideogram", "deadline_s": 1200,
                  "params": {"prompt": "a small red cube",
                             "width": 512, "height": 512,
                             "steps": 1, "seed": 7}},
    # NO width/height (live-probed 2026-09-06): the plain path
    # outputs input size and refuses explicit resize instead of
    # silently ignoring it. @upload: stages the fixture through the
    # browser upload door (POST /v1/uploads — the editor path) so
    # the artifact-ref gate sees an input-dir name, not a repo path.
    "image-edit": {"model": "qwen-img-edit-2511", "deadline_s": 1200,
                   "params": {"image1": "@upload:" + FIXTURE_PNG,
                              "prompt": "turn the subject blue",
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
    # prompt rides explicitly (live-probed 2026-09-06): the card
    # declares no fields but the schema requires prompt — a
    # card/schema gap the audio lane owns.
    "music-native": {"model": "ace-step-xl", "deadline_s": 900,
                     "params": {"prompt": "soft piano loop",
                                "duration": 10, "seed": 7}},
    "quad-remesh": {"model": "autoremesher", "deadline_s": 600,
                    "params": {"input": CUBE_OBJ, "target_quads": 500}},
    "sfx": {"model": "moss-sfx", "deadline_s": 1200,
            "params": {"prompt": "a wooden door knock", "duration": 3,
                       "n_diffusion_steps": 4, "seed": 7}},
    # tagger canary (2026-09-06): light ONNX lane; first run downloads
    # the WD14 weights, after that seconds per image.
    "tagger": {"model": "wd14", "deadline_s": 900,
               "params": {"input_image": FIXTURE_PNG}},
    # (the cpp ggml text-to-motion smoke RETIRED 2026-09-06 with the
    # lane — motion rides the comfyui kimodo card; its GPU path is
    # pinned by the kimodo-native flow run, not a per-card smoke)
    "tts": {"model": "qwen3-tts", "deadline_s": 900,
            "params": {"text": "Smoke test one two three."}},
    "upscale-tools": {"model": "seedvr2_ema", "deadline_s": 1200,
                      "params": {"input_image": FIXTURE_PNG,
                                 "resolution": 256}},
    # wan-vace is reference-guided (VACE consumes reference_image —
    # the lane refuses prompt-only); the fixture doubles as ref.
    "video-gen": {"model": "wan-vace", "deadline_s": 1800,
                  "params": {"prompt": "a cube rotating on a table",
                             "reference_image": FIXTURE_PNG,
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
                disk = (v[len("@upload:"):] if isinstance(v, str)
                        and v.startswith("@upload:") else v)
                if isinstance(disk, str) and (
                        disk.endswith(".png") or disk.endswith(".obj")):
                    assert os.path.isfile(disk), \
                        "%s param %s refs missing fixture %s" % (cid, k, v)

    def test_exclusions_cite_lane_reality(self) -> None:
        for cid, reason in EXCLUDED.items():
            assert len(reason) >= 20, \
                "%s exclusion names no lane reality: %r" % (cid, reason)


def _req(method: str, path: str,
         body: dict[str, JsonValue] | None = None,
         timeout: int = 30) -> dict[str, JsonValue]:
    # refusal bodies ride IN the failure (INFERENCE LAW: probe the
    # queue door only — no side-channel POST scripts to read them).
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise AssertionError(
            "%s %s refused %s: %s"
            % (method, path, e.code, e.read().decode()[:600]))


@pytest.mark.gpu
class TestGpuSmoke(unittest.TestCase):
    def tearDown(self) -> None:
        for run_id in getattr(self, "_runs", []):
            _rm_run(run_id)
        self._runs = []

    @classmethod
    def setUpClass(cls) -> None:
        try:
            _req("GET", "/v1/health", timeout=5)
        except Exception as e:
            raise AssertionError(
                "gateway not reachable on %s — restart it first: "
                "setsid .venv/bin/python py/gateway.py 33081 "
                "(%s)" % (BASE, e))

    def _upload(self, path: str) -> str:
        import base64
        with open(path, "rb") as fh:
            data_url = ("data:image/png;base64," +
                        base64.b64encode(fh.read()).decode())
        d = _req("POST", "/v1/uploads",
                 {"filename": os.path.basename(path), "data": data_url})
        return os.path.basename(d["path"])

    def _smoke(self, cid: str, model: str | None = None,
               params: dict[str, JsonValue] | None = None,
               deadline_s: int | None = None) -> None:
        # model/params/deadline_s override the SMOKE row: second-family
        # arm probes (tagger-joytag) ride the card's harness without a
        # second registry row (the coverage wall keys SMOKE by card).
        probe = SMOKE[cid]
        model = model or probe["model"]
        params = dict(probe["params"] if params is None else params)
        deadline_s = deadline_s or probe["deadline_s"]
        for k, v in list(params.items()):
            params[k] = (self._upload(v[len("@upload:"):])
                         if isinstance(v, str) and
                         v.startswith("@upload:") else v)
        # FLAT body (the start-door contract — flows rework 2026-09-05:
        # {model} + card params at top level; the gateway wraps into
        # {params:} for the arm. A nested "params" key double-wraps
        # and 400s at phase 1 — live-probed 2026-09-06. (h3-timeline
        # is the deliberate exception: its DOC nests params.)
        # CARD BIRTH LAW (operator order 2026-09-06): the start door
        # 4xxes a start without a doc-backed draft_id — the card is
        # composed FIRST (one draft-door call), then the run links
        # to it.
        start = {"model": model, **params}
        draft = _req("POST", "/v1/flows/drafts", start)
        assert isinstance(draft.get("draftId"), str) and draft["draftId"], \
            "%s card compose refused: %s" % (cid, draft)
        start["draft_id"] = draft["draftId"]
        d = _req("POST", "/v1/flows/start", start)
        self.assertEqual(d.get("status"), "queued",
                         "%s submission refused: %s" % (cid, d))
        run_id = d["run_id"]
        # HYGIENE: the live run is tracked for tearDown deletion even
        # when a later assert fails — the output pool stays clean.
        self._runs = getattr(self, "_runs", []) + [run_id]
        end = time.time() + deadline_s
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

    def test_tagger_smoke(self) -> None:
        self._smoke("tagger")

    def test_tagger_joytag_arm_smoke(self) -> None:
        # second-family arm probe (2026-09-06): same card harness,
        # joytag arm (CXH_JoyTag torch lane, pack-local checkpoint).
        self._smoke("tagger", model="joytag",
                    params={"input_image": FIXTURE_PNG,
                            "threshold": 0.3,
                            "add_tag": "smoke",
                            "remove_tag": "blurry"},
                    deadline_s=1200)

    def test_tagger_florence2_arm_smoke(self) -> None:
        # third-family arm probe (2026-09-06): Florence-2 captioning
        # (loader + run nodes; first run self-downloads the checkpoint
        # to ComfyUI/models/LLM — the long deadline covers it).
        self._smoke("tagger", model="florence2",
                    params={"input_image": FIXTURE_PNG},
                    deadline_s=1800)

    def test_tagger_joycaption_arm_smoke(self) -> None:
        # fourth-family arm probe (2026-09-06): JoyCaption beta-one VLM
        # (8B bf16; first run self-downloads ~16GB — the long deadline
        # covers it).
        self._smoke("tagger", model="joycaption",
                    params={"input_image": FIXTURE_PNG},
                    deadline_s=2400)

    def test_tts_smoke(self) -> None:
        self._smoke("tts")

    def test_upscale_tools_smoke(self) -> None:
        self._smoke("upscale-tools")

    def test_video_gen_smoke(self) -> None:
        self._smoke("video-gen")

    def test_voice_lock_smoke(self) -> None:
        self._smoke("voice-lock")
