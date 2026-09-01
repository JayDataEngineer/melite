#!/usr/bin/env python3
"""T4 KNOB LAW suite (PlagueKind translation, 2026-08-31; t4-only since
the node-migration move B deleted the v7 family 2026-09-02).

Pins the Layer A/B knob splice end-to-end at the compose door:

  V1  a wire body (no preset) registers with the _t4 template family
      in the REGISTERED run graph (workflow_file carries
      window*_t4.json); a guide image flips its window to _t4r.
  V2  Layer A globals land as literal inject keys on EVERY window
      (SLASwitch.0.switch from h3_attention=sla, sparsity from
      h3_sla_sparsity, sharpen/interp switches).
  V3  Layer B per-call overrides ride the SAME splice and WIN over
      Layer A for that window only (call 2's knobs.h3_sla_sparsity
      0.95 vs Layer A 0.85 -> window1 injects 0.85, window2 0.95).
  V4  the clean path (no h3_attention) injects NO SLA switch.
  V5  length/carry splice still rides ahead of the knobs (the chain
      law math is untouched by the knob fragment).
  V6  (move C) the bundle bus: a guide run injects
      PlagueKindBundleIn.0.input_1 <- LoadImage.0 AND the staged
      filename; a h3_ref_audios body with a missing file is a NAMED
      4xx (the staging path is live, no silent drop).

Boots a scratch gateway + fake comfy (object_info auto-built from the
REAL window templates). No GPU. Registered-run graph is asserted from
the run sidecar's yaml field — the exact bytes the plugin would
execute.
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

TL_DIR = os.path.join(REPO, "plugins", "comfyui", "models", "video",
                      "h3-timeline")


class FakeComfy(BaseHTTPRequestHandler):
    """Accepts any /prompt, completes immediately, serves object_info
    built from every window template in the lane (t4 + t4r)."""

    OBJ = {}

    def _reply(self, code, body=b"{}", ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("X-Melite-Test-Fake", "1")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == "/prompt":
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
            self._reply(200, json.dumps({pid: {"status": {"status_str": "success"}}}).encode())
            return
        if self.path.startswith("/view"):
            self._reply(200, b"\x00" * 64, ctype="application/octet-stream")
            return
        self._reply(404)

    def log_message(self, *a):
        pass


def build_obj():
    """object_info from the LIVE template dir (t4/t4r family — the v7
    lineage was deleted; pipelines/ provisioning was never real)."""
    obj = {}
    for wf in sorted(os.listdir(TL_DIR)):
        if not (wf.startswith("window") and wf.endswith(".json")):
            continue
        try:
            g = json.load(open(os.path.join(TL_DIR, wf)))
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
                if st in ("done", "error", "stopped"):
                    return y or None
            except Exception:
                pass
        time.sleep(0.25)
    return None


def main():
    FakeComfy.OBJ = build_obj()
    cf = ThreadingHTTPServer(("127.0.0.1", free_port()), FakeComfy)
    threading.Thread(target=cf.serve_forever, daemon=True).start()

    port = free_port()
    log = "/tmp/t4knobs_srv.log"
    # (leak gate) the gateway's endpoint is this suite's OWN fake —
    # the on-disk default (the REAL ComfyUI) is refused by the sandbox.
    ind = "/tmp/t4knobs_input_%d" % port
    shutil.rmtree(ind, ignore_errors=True)
    os.makedirs(ind, exist_ok=True)
    vcfg = "/tmp/t4knobs_endpoint_%d.json" % port
    with open(vcfg, "w") as f:
        json.dump({"url": "http://127.0.0.1:%d" % cf.server_address[1],
                   "input_dir": ind,
                   "input_dir_container": "/test/input"}, f)
    venv = dict(os.environ)
    venv["COMFYUI_ENDPOINT_CONFIG"] = vcfg
    venv["INFERENCE_TEST_SANDBOX"] = "1"
    srv = subprocess.Popen(
        [os.path.join(BUILD, "inference_cli"), "serve",
         "--port", str(port), "--plugin-dir", BUILD, "--catalog-dir", ".."],
        cwd=BUILD, stdout=subprocess.DEVNULL, stderr=open(log, "ab"),
        env=venv)
    api = Api("http://127.0.0.1:%d" % port)
    rid = rid2 = rid3 = None
    fails = []
    n = [0]

    def check(cond, label):
        print(("  PASS  " if cond else "  FAIL  ") + label)
        n[0] += 1
        if not cond:
            fails.append(label)

    try:
        wait_for(lambda: api.get("/v1/health")[0] == 200, 20, "boot")

        calls = [
            {"text": "window one text", "start_frame": 0, "end_frame": 56},
            {"text": "window two text", "start_frame": 56, "end_frame": 145,
             "knobs": {"h3_sla_sparsity": 0.95}},
        ]
        sla_body = {"model": "h3-timeline", "prompt": "t4 knob law probe",
                    "params": {
                        "seed": 7, "fps": 24,
                        "h3_attention": "sla", "h3_sla_sparsity": 0.85,
                        "sharpen_enabled": False,
                        "interpolate_enabled": True,
                        "interpolate_multiplier": 2,
                        "shift_video": 9,
                        "calls": calls}}
        code, body = api.post("/v1/pipelines/start", sla_body)
        rid = None
        try:
            rid = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid), "V1a: t4 run registered (%d %s)"
              % (code, body[:80]))

        y = sidecar_yaml(rid) if rid else None
        check(y is not None, "V1b: sidecar yaml readable")
        if y:
            check("window1_t4.json" in y and "window2_t4.json" in y,
                  "V1c: t4 templates present (no refs -> plain family)")
            check('"SLASwitch.0.switch":true' in y,
                  "V2a: Layer A sla_enabled -> SLASwitch true")
            check('"H3SLAAttention.0.sparsity_ratio":0.85' in y,
                  "V2b: Layer A sparsity 0.85 lands")
            check('"SharpenSwitch.0.switch":false' in y,
                  "V2c: Layer A sharpen off")
            check('"InterpSwitch.0.switch":true' in y
                  and '"FILMVFI.0.multiplier":2' in y,
                  "V2d: Layer A interpolation on, x2")
            # V3: per-window values — window1 keeps 0.85, window2 has 0.95
            w1 = y.split("- id: window1")[1].split("- id: window2")[0]
            w2 = y.split("- id: window2")[1].split("- id: stitch")[0]
            check('"H3SLAAttention.0.sparsity_ratio":0.85' in w1,
                  "V3a: window1 keeps Layer A 0.85")
            check('"H3SLAAttention.0.sparsity_ratio":0.95' in w2,
                  "V3b: window2 Layer B override 0.95 WINS")
            check('"MiniMaxH3ReferenceToVideo.0.length":' in w1,
                  "V5: length/carry splice intact (R2V node)")

        v4_params = {k: v for k, v in sla_body["params"].items()
                     if k not in ("h3_attention", "h3_sla_sparsity",
                                  "sharpen_enabled",
                                  "interpolate_enabled",
                                  "interpolate_multiplier")}
        v4_body = {"model": "h3-timeline",
                   "prompt": sla_body["prompt"],
                   "params": v4_params}
        code, body = api.post("/v1/pipelines/start", v4_body)
        rid2 = None
        try:
            rid2 = json.loads(body).get("run_id")
        except ValueError:
            pass
        y2 = sidecar_yaml(rid2) if rid2 else None
        check(y2 is not None and "window1_t4.json" in y2,
              "V4: t4 templates on clean path")
        check(y2 is None or '"SLASwitch.0.switch":true' not in y2,
              "V4: no SLA switch injected on clean path")

        # V6a: bundle bus — guide image flips window1 to t4r with
        # BundleIn.input_1 + the staged LoadImage.0 filename.
        gfile = os.path.join(BUILD, "guide_probe.png")
        with open(gfile, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n" + b"\x00" * 64)
        g_body = {"model": "h3-timeline", "prompt": "guide probe",
                  "params": {"calls": [
                      {"text": "guide probe", "start_frame": 0,
                       "end_frame": 48, "image": gfile}],
                      "fps": 24, "seed": 11}}
        code, body = api.post("/v1/pipelines/start", g_body)
        rid3 = None
        try:
            rid3 = json.loads(body).get("run_id")
        except ValueError:
            pass
        y3 = sidecar_yaml(rid3) if rid3 else None
        check(y3 is not None and "window1_t4r.json" in y3,
              "V6a1: guide flips window1 to _t4r")
        if y3:
            check('"PlagueKindBundleIn.0.input_1":["LoadImage.0",0]' in y3,
                  "V6a2: guide rides bundle slot 1")
            check('"LoadImage.0.image":"ref1_' in y3,
                  "V6a3: staged guide filename injected")

        # V6b: h3_ref_audios with a missing file = NAMED 4xx (the
        # staging path is live; nothing silently drops).
        a_body = {"model": "h3-timeline", "prompt": "audio ref probe",
                  "params": {"calls": [
                      {"text": "audio ref probe", "start_frame": 0,
                       "end_frame": 48}],
                      "fps": 24, "seed": 12,
                      "h3_ref_audios": "missing_voice.flac"}}
        code, body = api.post("/v1/pipelines/start", a_body)
        check(400 <= code < 500 and "h3_ref_audios[0]" in body,
              "V6b: missing ref audio = named 4xx, no run registered "
              "(%d %s)" % (code, body[:90]))

        # V7a: h3_ref_videos — one staged video flips window1 to t4r and
        # wires the PAIRED bundle slots: frames input_10 -> ref_video_0,
        # soundtrack input_11 -> ref_video_audio_0 (VHS_LoadVideoPath
        # outputs 0 and 2), gap-fix 2026-09-02.
        vfile = os.path.join(BUILD, "vid_probe.mp4")
        with open(vfile, "wb") as f:
            f.write(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 48)
        v_body = {"model": "h3-timeline", "prompt": "video ref probe",
                  "params": {"calls": [
                      {"text": "video ref probe", "start_frame": 0,
                       "end_frame": 48}],
                      "fps": 24, "seed": 13,
                      "h3_ref_videos": vfile}}
        code, body = api.post("/v1/pipelines/start", v_body)
        rid4 = None
        try:
            rid4 = json.loads(body).get("run_id")
        except ValueError:
            pass
        y4 = sidecar_yaml(rid4) if rid4 else None
        check(y4 is not None and "window1_t4r.json" in y4,
              "V7a1: ref video flips window1 to _t4r")
        if y4:
            check('"VHS_LoadVideoPath.0.video":"/test/input/idvid0_' in y4,
                  "V7a2: staged video injected at the EXECUTOR-side path")
            check('"PlagueKindBundleIn.0.input_10":["VHS_LoadVideoPath.0",0]'
                  in y4 and
                  '"MiniMaxH3ReferenceToVideo.0.ref_videos.ref_video_0":'
                  '["PlagueKindBundleOut.0",9]' in y4,
                  "V7a3: frames ride slot 10 -> ref_video_0")
            check('"PlagueKindBundleIn.0.input_11":["VHS_LoadVideoPath.0",2]'
                  in y4 and
                  '"MiniMaxH3ReferenceToVideo.0.ref_video_audios.'
                  'ref_video_audio_0":["PlagueKindBundleOut.0",10]' in y4,
                  "V7a4: soundtrack rides slot 11 -> ref_video_audio_0")

        # V7b: h3_ref_videos with a missing file = NAMED 4xx (same
        # staging law as audios/images; nothing silently drops).
        vb_body = {"model": "h3-timeline", "prompt": "video ref bad",
                   "params": {"calls": [
                       {"text": "video ref bad", "start_frame": 0,
                        "end_frame": 48}],
                       "fps": 24, "seed": 14,
                       "h3_ref_videos": "missing_clip.mp4"}}
        code, body = api.post("/v1/pipelines/start", vb_body)
        check(400 <= code < 500 and "h3_ref_videos[0]" in body,
              "V7b: missing ref video = named 4xx, no run registered "
              "(%d %s)" % (code, body[:90]))

        # V8: SeedVR2 super-res knobs ride the map (SRSwitch +
        # loader + resolution), and the POST CHAIN IS LIVE — the mux
        # reads SRSwitch, so enabled sharpen/interp/superres actually
        # reach the delivered frames (dead-wire regression 2026-09-02).
        sr_body = {"model": "h3-timeline", "prompt": "sr probe",
                   "params": {"calls": [
                       {"text": "sr probe", "start_frame": 0,
                        "end_frame": 48}],
                       "fps": 24, "seed": 15,
                       "superres_enabled": True,
                       "superres_resolution": 1536}}
        code, body = api.post("/v1/pipelines/start", sr_body)
        rid5 = None
        try:
            rid5 = json.loads(body).get("run_id")
        except ValueError:
            pass
        y5 = sidecar_yaml(rid5) if rid5 else None
        check(y5 is not None and '"SRSwitch.0.switch":true' in y5,
              "V8a: superres_enabled flips SRSwitch on")
        check(y5 is not None and
              '"SeedVR2VideoUpscaler.0.resolution":1536' in y5,
              "V8b: superres_resolution reaches the upscaler")
        check(y5 is not None and "window1_t4.json" in y5,
              "V8c: superres alone keeps plain t4 family")

    finally:
        srv.terminate()
        try:
            srv.wait(timeout=8)
        except subprocess.TimeoutExpired:
            srv.kill()
        cf.shutdown()
        outd = os.path.join(BUILD, "output")
        if os.path.isdir(outd):
            for r in (rid, rid2, rid3, rid4, rid5):
                if r:
                    shutil.rmtree(os.path.join(outd, r),
                                  ignore_errors=True)
        for p in (os.path.join(BUILD, "guide_probe.png"),
                  os.path.join(BUILD, "vid_probe.mp4")):
            try:
                os.remove(p)
            except OSError:
                pass
        shutil.rmtree(ind, ignore_errors=True)

    print("\n%d checks, %d failures" % (n[0], len(fails)))
    for f in fails:
        print("  FAILED:", f)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
