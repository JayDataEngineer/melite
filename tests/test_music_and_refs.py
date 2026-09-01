#!/usr/bin/env python3
"""MUSIC LANE + REF SPLICE suite (2026-08-31 session).

Pins the session's compose-door laws end-to-end against a scratch
gateway + fake comfy (no GPU). Every check guards a REAL bug found and
fixed this session:

MUSIC LANE (music3 card → song):
  M1  card-kind dispatch: {model: music3} + params{prompt,lyrics,
      duration,seed} registers a ONE-node run (id: music, workflow_file
      = the lane's music_t1.json). Guards the kbuf-256 regression —
      `card: music` sits past byte 255 of model.yaml and a 256-byte
      scan silently fell through to the timeline path.
  M2  the inject law: TextEncode.0 caption/lyrics/max_duration,
      EmptyLatent.0.seconds, KSampler.0.seed, SaveAudio.0
      .filename_prefix=<run>/music — the exact splices the live
      verified run carried.
  M3  required-prompt rejection is a NAMED 400 (rc -3 band), never a
      500 and never a silent timeline run.
  M4  duration clamps to [5, 360] on both ends.
  M5  the DynamicCombo FLAT-KEY law: music_t1.json carries
      format:"mp3" + "format.quality":"V0" — never a dict and never the
      "mp3/V0" string (both shapes die at SaveAudioAdvanced.execute with
      `missing 1 required positional argument: 'format'`).

REF SPLICE (calls[i].image → the _t4r visual-reconstruction door):
  R1  a call carrying image flips ITS window to window{n}_t4r.json and
      injects LoadImage.0.image with the staged input name; the staged
      file physically lands in the lane's input dir.
  R2  mixed cards: only the image-carrying call flips; every other
      window stays _t4 with NO LoadImage inject.
  R3  no images → the yaml never mentions _t4r (byte-identical legacy
      path).
  R4  the template law: window1_t4r.json wires LoadImage.0 into
      MiniMaxH3ReferenceToVideo.0 ref_images.ref_image_0 (his
      keyframe-at-frame-1 door).

Harness: the test_v7_knobs pattern (scratch gateway port, fake comfy
that accepts /prompt and serves object_info off the real templates).
"""
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
BUILD = os.path.join(REPO, "build")
sys.path.insert(0, os.path.join(REPO, "tests"))
from test_card_lifecycle import free_port, wait_for  # noqa: E402


class FakeComfy(BaseHTTPRequestHandler):
    """Accepts any /prompt, completes immediately; object_info is built
    from the REAL templates (window t4/t4r + music_t1)."""

    OBJ = {}
    """Every /prompt body the fake received, in order — the exact bytes
    the engine would submit (stronger than the yaml: injects RESOLVED)."""
    PROMPTS = []

    def _reply(self, code, body=b"{}", ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == "/prompt":
            body = int(self.headers.get("Content-Length") or 0)
            try:
                FakeComfy.PROMPTS.append(json.loads(
                    self.rfile.read(body) or b"{}"))
            except Exception:
                FakeComfy.PROMPTS.append(None)
            pid = "p%d" % int(time.time() * 1000 % 10**9)
            self._reply(200, json.dumps({"prompt_id": pid}).encode())
            return
        self._reply(404)

    def do_GET(self):
        if self.path == "/object_info":
            self._reply(200, json.dumps(self.OBJ).encode())
            return
        if self.path.startswith("/history/"):
            pid = self.path.split("/history/", 1)[-1]
            # success + completed + one named output, so the engine's
            # poll exits AND its artifact extractor finds a file to
            # fetch via /view (an outputs-less history drains nothing
            # and the stage can sit in the poll loop).
            self._reply(200, json.dumps(
                {pid: {"status": {"status_str": "success",
                                  "completed": True},
                       "outputs": {"SaveAudio.0": {"audio": [{
                           "filename": "music.mp3", "subfolder": "",
                           "type": "output"}]}}}}).encode())
            return
        if self.path.startswith("/view"):
            self._reply(200, b"\x00" * 64, ctype="application/octet-stream")
            return
        self._reply(404)

    def log_message(self, *a):
        pass


def build_obj():
    """object_info skeleton: every class_type in the real templates +
    the music nodes, with permissive inputs (compose validates against
    the TEMPLATES' own links — this only satisfies the engine's
    object_info fetch)."""
    obj = {}
    dirs = [
        os.path.join(REPO, "plugins", "comfyui", "models", "video", "h3-timeline"),
        os.path.join(REPO, "plugins", "comfyui", "models", "audio", "music3"),
    ]
    for d in dirs:
        if not os.path.isdir(d):
            continue
        for wf in sorted(os.listdir(d)):
            if not wf.endswith(".json"):
                continue
            try:
                g = json.load(open(os.path.join(d, wf)))
            except Exception:
                continue
            for n in g.values():
                if isinstance(n, dict) and "class_type" in n:
                    obj.setdefault(n["class_type"], {})
    return obj


class Api:
    def __init__(self, base):
        self.base = base

    def post(self, path, obj):
        req = urllib.request.Request(
            self.base + path, data=json.dumps(obj).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()

    def get(self, path):
        try:
            with urllib.request.urlopen(self.base + path, timeout=10) as r:
                return r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()
        except Exception:
            return 0, ""


def sidecar_yaml(rid):
    p = os.path.join(BUILD, "output", rid, "_pipeline.json")
    for _ in range(120):
        if os.path.exists(p):
            try:
                d = json.load(open(p))
                y = d.get("yaml", "")
                if y and len(y) > 50:
                    return y
                st = d.get("status", "")
                if st in ("done", "error", "stopped", "completed", "failed"):
                    return y or None
            except Exception:
                pass
        time.sleep(0.25)
    return None


def main():
    FakeComfy.OBJ = build_obj()
    cf = ThreadingHTTPServer(("127.0.0.1", free_port()), FakeComfy)
    threading.Thread(target=cf.serve_forever, daemon=True).start()

    # the timeline lane is MODEL-resolved (the card path reads
    # plugins/comfyui/models/video/h3-timeline) — no pipelines copy.
    # The comfy endpoint the compose splices comes from the gateway's
    # own config; the fake comfy satisfies every /prompt it submits.

    port = free_port()
    log = "/tmp/musrefs_srv.log"
    # (QUEUE LAW) the gateway MUST NOT touch the real ComfyUI: every
    # engine submit goes to the fake via the sanctioned env override
    # (COMFYUI_ENDPOINT_CONFIG), and staging lands in a scratch input
    # dir. The first draft of this suite leaked one music render to the
    # live server (18465) — this override is the fix and the guarantee.
    scratch = "/tmp/musrefs_home"
    shutil.rmtree(scratch, ignore_errors=True)
    os.makedirs(os.path.join(scratch, "data"), exist_ok=True)
    scratch_in = os.path.join(scratch, "input")
    os.makedirs(scratch_in, exist_ok=True)
    with open(os.path.join(scratch, "data", "comfyui_endpoint.json"), "w") as f:
        json.dump({"url": "http://127.0.0.1:%d" % cf.server_address[1],
                   "input_dir": scratch_in}, f)
    env = dict(os.environ)
    env["COMFYUI_ENDPOINT_CONFIG"] = os.path.join(
        scratch, "data", "comfyui_endpoint.json")
    srv = subprocess.Popen(
        [os.path.join(BUILD, "inference_cli"), "serve",
         "--port", str(port), "--plugin-dir", BUILD, "--catalog-dir", ".."],
        cwd=BUILD, env=env,
        stdout=subprocess.DEVNULL, stderr=open(log, "ab"))
    api = Api("http://127.0.0.1:%d" % port)
    fails = []
    n = [0]
    rids = []

    def check(cond, label):
        print(("  PASS  " if cond else "  FAIL  ") + label)
        n[0] += 1
        if not cond:
            fails.append(label)

    # a real image file for the ref staging law
    ref_png = "/tmp/musrefs_ref.png"
    # 1x1 PNG (valid header bytes — staging copies bytes, ComfyUI never
    # runs: the fake accepts every /prompt)
    with open(ref_png, "wb") as f:
        f.write(bytes.fromhex(
            "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
            "1f15c4890000000a49444154789c6300010000050001od".replace("od", "")))

    try:
        wait_for(lambda: api.get("/v1/health")[0] == 200, 20, "boot")

        # ── MUSIC LANE ────────────────────────────────────────────────
        music_body = {
            "model": "music3",
            "prompt": "neon rain stall theme",
            "params": {
                "prompt": "Moody neon-noir lo-fi ballad, brushed drums 72 BPM",
                "lyrics": "[verse] steam on the glass",
                "duration": 30,
                "seed": 42,
            },
        }
        code, body = api.post("/v1/pipelines/start", music_body)
        rid = None
        try:
            rid = json.loads(body).get("run_id")
        except ValueError:
            pass
        rids.append(rid)
        check(bool(rid), "M1a: music card registered (%d %s)" % (code, body[:70]))

        my = sidecar_yaml(rid) if rid else None
        check(my is not None, "M1b: music run graph readable")
        if my:
            check("- id: music" in my, "M1c: ONE music node (card-kind dispatch fired)")
            check("music_t1.json" in my, "M1d: workflow_file = the lane's music_t1.json")
            check("- id: window1" not in my, "M1e: no timeline windows (dispatch, not fallback)")
            check('"TextEncode.0.caption"' in my and "$prompt" in my,
                  "M2a: caption inject registered")
            check('"TextEncode.0.lyrics"' in my, "M2b: lyrics inject registered")
            check('"TextEncode.0.seed"' in my, "M2c: seed inject registered")
            check('"TextEncode.0.max_duration"' in my, "M2d: max_duration inject registered")
            check('"EmptyLatent.0.seconds"' in my, "M2e: latent seconds registered")
            check('"KSampler.0.seed"' in my, "M2f: sampler seed registered")
            check(rid and ("%s/music" % rid) in my,
                  "M2g: SaveAudio prefix = <run>/music")

        # M3: required prompt missing → NAMED 400
        bad = json.loads(json.dumps(music_body))
        del bad["params"]["prompt"]
        code, body = api.post("/v1/pipelines/start", bad)
        check(code == 400 and "prompt" in body,
              "M3: no-prompt card → named 400 (%d %s)" % (code, body[:70]))

        # M4: duration clamps both ends — asserted from the SUBMITTED
        # prompt (the inject resolved: EmptyLatent.0.seconds = clamped)
        for dur, want in ((999, 360), (1, 5)):
            b4 = json.loads(json.dumps(music_body))
            b4["params"]["duration"] = dur
            code, body = api.post("/v1/pipelines/start", b4)
            r4 = None
            try:
                r4 = json.loads(body).get("run_id")
            except ValueError:
                pass
            rids.append(r4)
            # (serial GPU law) the run queues behind every prior test
            # run — drain budget must cover the whole queue. Match the
            # SUBMITTED seconds BY VALUE (clear() races the queue: the
            # prior run's prompt can land after any reset), and also
            # prove the raw value never rides.
            got = None
            for _ in range(240):
                for raw in FakeComfy.PROMPTS:
                    if not raw:
                        continue
                    # the submit body nests the graph under "prompt"
                    pr = raw.get("prompt", raw)
                    sec = (pr.get("EmptyLatent.0", {}).get("inputs", {})
                             .get("seconds"))
                    if sec is not None and str(sec) == str(want):
                        got = sec
                        break
                if got is not None:
                    break
                time.sleep(0.25)
            raws = set()
            for raw in FakeComfy.PROMPTS:
                if not raw:
                    continue
                sec = (raw.get("prompt", raw).get("EmptyLatent.0", {})
                         .get("inputs", {}).get("seconds"))
                if sec is not None:
                    raws.add(str(sec))
            check(got is not None and str(dur) not in raws,
                  "M4: duration %d clamps to %d (submitted=%s, raw never rides: %s)"
                  % (dur, want, sorted(raws), str(dur) not in raws))

        # M5: the DynamicCombo flat-key template law (data regression)
        mt = os.path.join(REPO, "plugins", "comfyui", "models", "audio",
                          "music3", "music_t1.json")
        t = json.load(open(mt))
        ins = t.get("SaveAudio.0", {}).get("inputs", {})
        check(ins.get("format") == "mp3" and ins.get("format.quality") == "V0",
              "M5a: flat format keys (format:mp3 + format.quality:V0)")
        check(not isinstance(ins.get("format"), (dict, list)),
              "M5b: format is NOT a dict (the execute-missing-arg shape)")

        # ── REF SPLICE ────────────────────────────────────────────────
        def tl_body(with_images):
            calls = [
                {"text": "window one", "start_frame": 0, "end_frame": 48,
                 **({"image": ref_png} if with_images and 0 in with_images else {})},
                {"text": "window two", "start_frame": 48, "end_frame": 96,
                 **({"image": ref_png} if with_images and 1 in with_images else {})},
            ]
            return {"model": "h3-timeline", "prompt": "ref splice probe",
                    "params": {"seed": 9, "fps": 24, "calls": calls,
                               "intent": "film", "continuity": "chain"}}

        # R1: window1 carries the image
        code, body = api.post("/v1/pipelines/start", tl_body({0}))
        r1 = None
        try:
            r1 = json.loads(body).get("run_id")
        except ValueError:
            pass
        rids.append(r1)
        check(bool(r1), "R1a: ref card registered (%d %s)" % (code, body[:70]))
        y1 = sidecar_yaml(r1) if r1 else None
        if y1:
            check("window1_t4r.json" in y1, "R1b: window1 flips to the _t4r family")
            check('"LoadImage.0.image":"ref1_' in y1,
                  "R1c: LoadImage.0.image inject carries the staged name")
            check("window2_t4.json" in y1, "R2a: window2 (no image) stays _t4")
            w2 = y1.split("- id: window2", 1)[-1].split("- id:", 1)[0]
            check("LoadImage" not in w2, "R2b: window2 has NO LoadImage inject")
            # R1-physical: the staged file exists in the SCRATCH input
            # dir the endpoint config names (the queue-law isolation dir)
            staged = [seg.split('"')[0] for seg in y1.split('ref1_')[1:]]
            found_file = bool(staged) and os.path.exists(
                os.path.join(scratch_in, "ref1_" + staged[0]))
            check(found_file, "R1d: staged ref file on disk in the input dir")

        # R3: no images → no _t4r anywhere
        code, body = api.post("/v1/pipelines/start", tl_body(set()))
        r3 = None
        try:
            r3 = json.loads(body).get("run_id")
        except ValueError:
            pass
        rids.append(r3)
        y3 = sidecar_yaml(r3) if r3 else None
        check(y3 is not None and "_t4r" not in y3 and "LoadImage" not in y3,
              "R3: imageless card is byte-law _t4 (no _t4r, no LoadImage)")

        # R4: the template wiring law
        tr = json.load(open(os.path.join(
            REPO, "plugins", "comfyui", "models", "video", "h3-timeline",
            "window1_t4r.json")))
        r2v = tr.get("MiniMaxH3ReferenceToVideo.0", {}).get("inputs", {})
        # the template carries the FLAT combo key (ComfyUI V3 dynamic
        # input naming): "ref_images.ref_image_0" -> ["LoadImage.0", 0]
        check(r2v.get("ref_images.ref_image_0") == ["LoadImage.0", 0],
              "R4: _t4r wires LoadImage.0 -> R2V ref_images.ref_image_0")

        # ── AUDIO CLIPS (Layer A overlay feature) ─────────────────────
        # A dummy audio file for artifact-resolution tests
        dummy_audio = "/tmp/musrefs_dummy.mp3"
        with open(dummy_audio, "wb") as f:
            f.write(b"\xff\xfb\x90\x00" + b"\x00" * 100)  # fake MP3 header

        def tl_body_audio(clips):
            """Build a timeline body with audio_clips in params."""
            calls = [
                {"text": "window one", "start_frame": 0, "end_frame": 48},
                {"text": "window two", "start_frame": 48, "end_frame": 96},
            ]
            body = {"model": "h3-timeline", "prompt": "audio clips probe",
                    "params": {"seed": 9, "fps": 24, "calls": calls,
                               "intent": "film", "continuity": "chain"}}
            if clips is not None:
                body["params"]["audio_clips"] = clips
            return body

        # A1: audio_clips present → stitch node carries overlays with
        # correct start_sec, gain, and staged paths; staged files exist
        audio_clips_data = [
            {"id": "clip1", "name": "sfx_boom", "src": dummy_audio,
             "start_frame": 24, "dur_frames": 48, "gain": 0.8},
            {"id": "clip2", "name": "sfx_click", "src": dummy_audio,
             "start_frame": 72, "dur_frames": 24},  # gain defaults to 1.0
        ]
        code, body = api.post("/v1/pipelines/start",
                              tl_body_audio(audio_clips_data))
        ra = None
        try:
            ra = json.loads(body).get("run_id")
        except ValueError:
            pass
        rids.append(ra)
        check(bool(ra), "A1a: audio clips card registered (%d %s)"
              % (code, body[:70]))
        ya = sidecar_yaml(ra) if ra else None
        if ya:
            # stitch node should have overlays array
            check('"overlays"' in ya,
                  "A1b: stitch node contains overlays key")
            # check start_sec = 24/24 = 1.0 and gain = 0.8
            check('"start_sec":1.0' in ya or '"start_sec":1.000000' in ya,
                  "A1c: first clip start_sec = 1.0 (24 frames / 24 fps)")
            check('"gain":0.8' in ya or '"gain":0.8000' in ya,
                  "A1d: first clip gain = 0.8")
            # second clip: start_sec = 72/24 = 3.0, gain defaults 1.0
            check('"start_sec":3.0' in ya or '"start_sec":3.000000' in ya,
                  "A1e: second clip start_sec = 3.0 (72 frames / 24 fps)")
            # check staged files exist in input dir
            aclip_files = [f for f in os.listdir(scratch_in)
                           if f.startswith("aclip_")]
            check(len(aclip_files) >= 2,
                  "A1f: staged audio clip files exist on disk (%d found)"
                  % len(aclip_files))

        # A2: audio_clips absent → yaml contains NO overlays (byte-law)
        code, body = api.post("/v1/pipelines/start", tl_body_audio(None))
        r2a = None
        try:
            r2a = json.loads(body).get("run_id")
        except ValueError:
            pass
        rids.append(r2a)
        y2a = sidecar_yaml(r2a) if r2a else None
        check(y2a is not None and '"overlays"' not in y2a,
              "A2: no audio_clips → no overlays in yaml (byte-law)")

        # A3: a clip with empty src → named error (rc -20 maps to 500
        # in the server's status range check; the message is correct)
        bad_clips = [{"id": "bad", "name": "empty_src", "src": "",
                      "start_frame": 0, "dur_frames": 10}]
        code, body = api.post("/v1/pipelines/start",
                              tl_body_audio(bad_clips))
        check(code in (400, 422, 500) and "src" in body.lower(),
              "A3: empty src → named error (%d %s)" % (code, body[:80]))

    finally:
        try:
            srv.terminate()
            srv.wait(timeout=5)
        except Exception:
            srv.kill()
        shutil.rmtree(scratch, ignore_errors=True)

    print("\n%d checks, %d failed" % (n[0], len(fails)))
    if fails:
        for f in fails:
            print("  FAILED: " + f)
        sys.exit(1)


if __name__ == "__main__":
    main()
