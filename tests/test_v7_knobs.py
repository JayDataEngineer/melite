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
    rid = rid2 = rid3 = rid4 = rid5 = rid6 = rid7 = None
    rid8 = rid9 = rid10 = rid11 = None
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
            # (2026-09-01 resize-chain parity) the guide rides HIS ref
            # path: LoadImage -> UnifiedResizeImageMask.R (his 5613,
            # Shorter-Side scalars) -> BundleIn.input_1 — not the old
            # bare LoadImage link.
            check('"PlagueKindBundleIn.0.input_1":'
                  '["UnifiedResizeImageMask.R",0]' in y3,
                  "V6a2: guide rides his resize chain (bundle slot 1)")
            check('"UnifiedResizeImageMask.R.image":'
                  '["LoadImage.0",0]' in y3,
                  "V6a2b: resize R fed by the staged LoadImage")
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

        # V9 (UI↔AI parity, 2026-09-02): calls[i].transition is the
        # studio's seam-mode vocabulary — the gate ACCEPTS it and
        # cc_compile_calls translates: "cut" == seam_carry 0 (standalone
        # window: snap-up grid length, NO carried head), absent/extend
        # == the latent chain (carried-prefix overhead in the length).
        # Regression shape: the pre-parity gate REFUSED "transition" by
        # name — this whole submission 4xx'd.
        tr_body = {"model": "h3-timeline", "prompt": "transition probe",
                   "params": {"calls": [
                       {"text": "open shot", "start_frame": 0,
                        "end_frame": 73},
                       {"text": "hard cut here", "start_frame": 73,
                        "end_frame": 141, "transition": "cut"},
                       {"text": "chained shot", "start_frame": 141,
                        "end_frame": 209, "transition": "extend"}],
                       "fps": 24, "seed": 16}}
        code, body = api.post("/v1/pipelines/start", tr_body)
        rid6 = None
        try:
            rid6 = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid6), "V9a: calls[].transition accepted by the gate "
              "(%d %s)" % (code, body[:90]))
        y6 = sidecar_yaml(rid6) if rid6 else None
        if y6:
            import re as _re

            def wlen(wid):
                m = _re.search(r"- id: " + wid + r".*?"
                               r'"MiniMaxH3ReferenceToVideo\.0\.length":(\d+)',
                               y6, _re.S)
                return int(m.group(1)) if m else -1
            # cut (span 68) -> standalone: snap_grid(68,5) = 73 exactly
            check(wlen("window2") == 73,
                  "V9b: transition cut -> standalone snap-up length 73 "
                  "(got %d)" % wlen("window2"))
            # extend (span 68) -> chain: carried-prefix overhead pushes
            # the render length strictly above the standalone 73
            check(wlen("window3") > 73,
                  "V9c: transition extend -> chain overhead (got %d)"
                  % wlen("window3"))
        # V9d: per-call h3_attention still REFUSED by name (Layer A
        # only — the parity law cuts both ways).
        bad_body = {"model": "h3-timeline", "prompt": "bad knob probe",
                    "params": {"calls": [
                        {"text": "x", "start_frame": 0, "end_frame": 73,
                         "knobs": {"h3_attention": "sla"}}],
                        "fps": 24, "seed": 17}}
        code, body = api.post("/v1/pipelines/start", bad_body)
        check(400 <= code < 500 and "h3_attention" in body,
              "V9d: per-call h3_attention refused by name (%d %s)"
              % (code, body[:90]))

        # V10 (uploads parity, 2026-09-02): a data: URL ref — the
        # studio's upload buttons ride inline — stages (base64 decode
        # into the input dir, mime-derived extension) and wires the
        # identity-ref bundle slots. Pre-parity this 4xx'd "file not
        # found: data:image/png;...".
        import base64 as _b64
        tiny_png = _b64.b64encode(bytes.fromhex(
            "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
            "1f15c4890000000d49444154789c626001000000ffff030000060005"
            "57bfabd40000000049454e44ae426082")).decode()
        up_body = {"model": "h3-timeline", "prompt": "upload ref probe",
                   "params": {"calls": [
                       {"text": "upload ref probe", "start_frame": 0,
                        "end_frame": 48}],
                       "fps": 24, "seed": 18,
                       "h3_ref_images":
                           "data:image/png;base64," + tiny_png}}
        code, body = api.post("/v1/pipelines/start", up_body)
        rid7 = None
        try:
            rid7 = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid7), "V10a: data: URL ref accepted + staged "
              "(%d %s)" % (code, body[:90]))
        y7 = sidecar_yaml(rid7) if rid7 else None
        if y7:
            check('"LoadImage.2.image":"idref0_data' in y7,
                  "V10b: decoded upload wired at identity-ref slot "
                  "(LoadImage.2)")
            check('"PlagueKindBundleIn.0.input_3":["LoadImage.2",0]' in y7,
                  "V10c: upload rides bundle input_3 (slot law)")
        # V10d: per-call refs.videos is a DEAD key (the bundle video bus
        # is run-level) — refused by name, never a silent no-op.
        dv_body = {"model": "h3-timeline", "prompt": "dead refs probe",
                   "params": {"calls": [
                       {"text": "x", "start_frame": 0, "end_frame": 48,
                        "refs": {"videos": "clip.mp4"}}],
                       "fps": 24, "seed": 19}}
        code, body = api.post("/v1/pipelines/start", dv_body)
        check(400 <= code < 500 and "videos" in body,
              "V10d: per-call refs.videos refused as dead key (%d %s)"
              % (code, body[:90]))

        # V11 (dry-fire regression, 2026-09-01): per-call Layer B knobs
        # must land on EVERY window that carries them. Two GPU runs
        # burned because the knob walker counted a call's nested
        # "knobs":{...} object as the NEXT call — every window >= 3
        # then extracted the wrong span and its Layer B silently
        # vanished (window3 kept the 1344x768 template default while
        # the card said 832x1120 -> PlagueKind geometry refusal AFTER
        # windows 1-2 had already rendered). The old suite only ever
        # put knobs on the LAST call — the one shape where the buggy
        # walk accidentally worked. This block IS the dry fire: 4
        # calls, knobs on calls 2-4, a literal '{' inside prompt text
        # (the walker must be string-aware), and per-window landing
        # asserted from the compose sidecar BEFORE any GPU exists.
        kb_body = {"model": "h3-timeline",
                   "prompt": "per-call knob landing dry-fire",
                   "params": {"calls": [
                       {"text": "w1 plain text", "start_frame": 0,
                        "end_frame": 90},
                       {"text": "w2 text { brace inside", "start_frame": 90,
                        "end_frame": 179,
                        "knobs": {"width": 832, "height": 1120}},
                       {"text": "w3 text", "start_frame": 179,
                        "end_frame": 268,
                        "knobs": {"width": 832, "height": 1120}},
                       {"text": "w4 text", "start_frame": 268,
                        "end_frame": 357,
                        "knobs": {"width": 832, "height": 1120}}],
                       "fps": 24, "seed": 20}}
        code, body = api.post("/v1/pipelines/start", kb_body)
        rid8 = None
        try:
            rid8 = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid8), "V11a: 4-call knob card accepted (%d %s)"
              % (code, body[:90]))
        y8 = sidecar_yaml(rid8) if rid8 else None
        if y8:
            def wsec(wid, nxt):
                a = "- id: " + wid
                if a not in y8:
                    return ""
                s = y8.split(a)[1]
                return s.split("- id: " + nxt)[0] if nxt else s
            w1s = wsec("window1", "window2")
            w2s = wsec("window2", "window3")
            w3s = wsec("window3", "window4")
            w4s = wsec("window4", "stitch")
            for wid, sec in (("window2", w2s), ("window3", w3s),
                             ("window4", w4s)):
                check('"MiniMaxH3ReferenceToVideo.0.width":832' in sec
                      and '"MiniMaxH3ReferenceToVideo.0.height":1120'
                      in sec,
                      "V11b: %s Layer B width/height 832x1120 lands "
                      "(%s)" % (wid, "yes" if (
                          '"MiniMaxH3ReferenceToVideo.0.width":832'
                          in sec) else "MISSING"))
            check('"MiniMaxH3ReferenceToVideo.0.width":832' in w1s
                  and '"MiniMaxH3ReferenceToVideo.0.height":1120' in w1s,
                  "V11c: imageless window1 inherits the film geometry "
                  "832x1120 (broadcast law)")

        # V12 (film-geometry law, 2026-09-01 — "how is it going to work
        # when we start to have 15+ clips?"): geometry stated ONCE at
        # the ROOT propagates to EVERY chained window (his chain node
        # refuses per-window divergence at render time, after earlier
        # windows burned). Divergent declarations are a named 4xx at
        # compose. Window 1 opened from a guide IMAGE keeps his
        # UnifiedResizeImageMask chain as the geometry SSOT — the root
        # width inject is suppressed there, never overwriting his LINK.
        g2 = os.path.join(BUILD, "geom_probe.png")
        with open(g2, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n" + b"\x00" * 64)
        calls15 = []
        cur = 0
        for i in range(15):
            calls15.append({"text": "clip %d of the film" % i,
                            "start_frame": cur,
                            "end_frame": cur + 89})
            cur += 89
        calls15[0]["image"] = g2
        g15_body = {"model": "h3-timeline", "prompt": "15-clip geometry",
                    "params": {"calls": calls15, "fps": 24, "seed": 21,
                               "width": 832, "height": 1120}}
        code, body = api.post("/v1/pipelines/start", g15_body)
        rid9 = None
        try:
            rid9 = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid9), "V12a: 15-call root-geometry card accepted "
              "(%d %s)" % (code, body[:90]))
        y9 = sidecar_yaml(rid9) if rid9 else None
        if y9:
            miss = []
            for i in range(2, 16):   # window1 rides HIS resize chain
                                      # when a guide image opens the
                                      # film (asserted by V12c)
                a = "- id: window%d" % i
                if a not in y9:
                    miss.append("window%d(section)" % i)
                    continue
                tail = y9.split(a)[1]
                nxt = "- id: window%d" % (i + 1)
                sec = (tail.split(nxt)[0] if nxt in tail
                       else tail.split("- id: stitch")[0])
                if ('"MiniMaxH3ReferenceToVideo.0.width":832' not in sec
                        or '"MiniMaxH3ReferenceToVideo.0.height":1120'
                        not in sec):
                    miss.append("window%d" % i)
            check(not miss,
                  "V12b: root 832x1120 lands on ALL 15 windows (%s)"
                  % (",".join(miss) if miss else "all present"))
            w1s9 = y9.split("- id: window1")[1].split("- id: window2")[0]
            check('"MiniMaxH3ReferenceToVideo.0.width":' not in w1s9,
                  "V12c: window1 with guide image keeps HIS resize "
                  "chain (no width inject over the link)")
        # V12d: divergence is a named 4xx BEFORE registration
        div_calls = [dict(c) for c in calls15]
        div_calls[7] = dict(div_calls[7],
                            knobs={"width": 999, "height": 1120})
        div_body = {"model": "h3-timeline", "prompt": "divergent geom",
                    "params": {"calls": div_calls, "fps": 24, "seed": 22,
                               "width": 832, "height": 1120}}
        code, body = api.post("/v1/pipelines/start", div_body)
        check(400 <= code < 500 and "film-geometry" in body,
              "V12d: divergent width refused 4xx by name (%d %s)"
              % (code, body[:90]))
        # V12e: CONSISTENT repetition is legal (not falsely refused)
        rep_calls = [dict(c) for c in calls15[:4]]
        for c in rep_calls[1:]:
            c["knobs"] = {"width": 832, "height": 1120}
        rep_body = {"model": "h3-timeline", "prompt": "repeat geom",
                    "params": {"calls": rep_calls, "fps": 24, "seed": 23,
                               "width": 832, "height": 1120}}
        code, body = api.post("/v1/pipelines/start", rep_body)
        rid10 = None
        try:
            rid10 = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid10), "V12e: consistent repetition accepted (%d %s)"
              % (code, body[:90]))

        # V13 (tile-cover law, 2026-09-01 — run-6a976515): a 96f
        # authored span rounded DOWN to 90 (nearest), window 1
        # under-rendered 6f and the film's video shipped 0.25s short
        # while apad held audio at span. The snap is a CEIL: render
        # length must COVER the span; the stitch span-cut trims
        # overshoot. 3x4s chained card, song bed, his defaults.
        calls3 = [{"text": "sprint bursts from the line",
                   "start_frame": 0, "end_frame": 96},
                  {"text": "runner banks hard around the corner",
                   "start_frame": 96, "end_frame": 192},
                  {"text": "final stretch opens wide",
                   "start_frame": 192, "end_frame": 288}]
        body3 = {"model": "h3-timeline",
                 "prompt": "3x4s tile-cover regression",
                 "params": {"calls": calls3, "fps": 24, "seed": 24,
                            "audio_stem": "RANDOM-SONG.mp3"}}
        code, body = api.post("/v1/pipelines/start", body3)
        rid11 = None
        try:
            rid11 = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid11), "V13a: 3x4s card accepted (%d %s)"
              % (code, body[:90]))
        y11 = sidecar_yaml(rid11) if rid11 else None
        if y11:
            import re
            w1 = y11.split("- id: window1")[1].split("- id: window2")[0]
            m = re.search(r'"MiniMaxH3ReferenceToVideo.0.length":(\d+)', w1)
            lens1 = int(m.group(1)) if m else 0
            check(lens1 == 107,
                  "V13b: 96f span renders 107 (ceil snap covers; got %d)"
                  % lens1)
            st = y11.split("- id: stitch")[1]
            flat = st.replace(" ", "")
            check('"spans":[4.000000,4.000000,4.000000]' in flat,
                  "V13c: stitch spans exact 4.0x3")
            sc2 = re.search(r'clip_start_seconds\\?":([\d.]+)',
                            y11.split("- id: window2")[1]
                              .split("- id: window3")[0])
            check(sc2 and abs(float(sc2.group(1)) - 4.0) < 1e-6,
                  "V13d: w2 song in-point 4.0s (96f film position)")

    finally:
        srv.terminate()
        try:
            srv.wait(timeout=8)
        except subprocess.TimeoutExpired:
            srv.kill()
        cf.shutdown()
        outd = os.path.join(BUILD, "output")
        if os.path.isdir(outd):
            for r in (rid, rid2, rid3, rid4, rid5, rid6, rid7, rid8,
                      rid9, rid10, rid11):
                if r:
                    shutil.rmtree(os.path.join(outd, r),
                                  ignore_errors=True)
        for p in (os.path.join(BUILD, "guide_probe.png"),
                  os.path.join(BUILD, "geom_probe.png"),
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
