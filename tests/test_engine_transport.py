"""Transport-port regression for the comfyui engine (TRANSPORT LAW,
design doc §4b). Run: python3 tests/test_engine_transport.py — exits
non-zero on any violation. No GPU, no network: loud-refusal shapes,
port-boundary execution via a stub transport, and leak-gate behavior."""

import asyncio
import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ENGINE_DIR = REPO / "plugins/engines/comfyui/engines/comfyui"

os.environ["INFERENCE_TEST_SANDBOX"] = "1"
sys.path.insert(0, str(ENGINE_DIR))

spec = importlib.util.spec_from_file_location("engine", ENGINE_DIR / "engine.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)

PASS, FAIL = [], []


def check(name, cond, detail=""):
    if cond:
        PASS.append(name)
    else:
        FAIL.append("%s: %s" % (name, detail))


def loud(fn, needle):
    try:
        fn()
        return False, "(no raise)"
    except engine.EngineError as e:
        return (needle in str(e)), str(e)[:120]
    except Exception as e:
        return False, "wrong-type: %r" % e


def _write_stub(path, body):
    with open(path, "w") as f:
        f.write("#!/usr/bin/env python3\n")
        f.write(body)
    os.chmod(path, 0o755)


# T1: local transport without server_url anywhere (sandbox gates the
# on-disk config) must fail LOUD with the config pointer.
ok, detail = loud(lambda: engine._resolve_transport({}), "server_url is required")
check("T1 local-no-url loud", ok, detail)

# T2: local transport with explicit server_url resolves.
t = engine._resolve_transport({"server_url": "http://127.0.0.1:19999"})
check("T2 local resolves", t.kind == "local", repr(t))

# T3: cloud transport without registration fails LOUD with §4b pointer.
ok, detail = loud(lambda: engine._resolve_transport({"transport": "cloud"}), "cloud")
check("T3 cloud-no-reg loud", ok, detail)

# T4: unknown transport name fails LOUD, listing known transports.
ok, detail = loud(lambda: engine._resolve_transport({"transport": "rail"}), "unknown transport")
check("T4 unknown loud", ok, detail)

# T5: port boundary — a stub transport drives execute() end to end.
class StubTransport:
    kind = "stub"
    def __init__(self):
        self.submitted = None
        self.interrupted = 0
    def submit(self, workflow):
        self.submitted = workflow
        return "stub-prompt-1"
    def poll(self, pid):
        return {"status": {"status_str": "success"}, "outputs": {}}
    def interrupt(self):
        self.interrupted += 1
    def artifacts(self, entry):
        return [("shot.mp4", b"FAKEVIDEO"), ("frame.png", b"FAKEPNG")]

stub = StubTransport()
engine.TRANSPORTS["stub"] = lambda cfg=None: stub

wf = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
json.dump({"N1": {"inputs": {"text": "seed"}, "class_type": "T"}}, wf)
wf.close()

run_dir = tempfile.mkdtemp()
node = {"id": "n1", "params": {
    "workflow_file": wf.name,
    "transport": "stub",
    "inject": {"N1.text": "injected"},
}}
res = asyncio.run(engine.execute(node, run_dir, {}, asyncio.Event()))
check("T5 splice reached stub", stub.submitted["N1"]["inputs"]["text"] == "injected",
      json.dumps(stub.submitted)[:120])
check("T5 artifacts staged", len(res["artifacts"]) == 2, repr(res["artifacts"])[:120])
check("T5 outputs classified", res["outputs"].get("video_0", "").endswith("shot.mp4"),
      repr(res["outputs"]))
check("T5 no interrupt on success", stub.interrupted == 0, str(stub.interrupted))

# T6: stop door reaches THROUGH the port.
class NeverDone:
    kind = "stub"
    def submit(self, workflow):
        return "x"
    def poll(self, pid):
        return None
    def interrupt(self):
        self.hit = True
never = NeverDone()
engine.TRANSPORTS["stub"] = lambda cfg=None: never
stop = asyncio.Event()
stop.set()
ok, detail = loud(lambda: asyncio.run(engine.execute(
    {"id": "n2", "params": {"workflow_file": wf.name, "transport": "stub"}},
    run_dir, {}, stop)), "stopped by stop door")
check("T6 stop door loud", ok, detail)
check("T6 stop interrupt reached backend", getattr(never, "hit", False), "no interrupt")

# T7: CloudTransport with no cloud_cfg — loud refusal.
ok, detail = loud(lambda: engine.CloudTransport(None), "no cloud registration")
check("T7 cloud-no-cfg loud", ok, detail)

# T8: CloudTransport with empty dict — loud refusal.
ok, detail = loud(lambda: engine.CloudTransport({}), "no cloud registration")
check("T8 cloud-empty-cfg loud", ok, detail)

# T9: _resolve_transport with cloud and no config — loud (via _cfg_cloud).
ok, detail = loud(lambda: engine._resolve_transport({"transport": "cloud"}), "cloud")
check("T9 resolve-cloud-no-cfg loud", ok, detail)

# T10: CloudTransport submit with a stub comfy binary that refuses
# (not-logged-in path) — loud with the CLI error message.
stub_bin = os.path.join(tempfile.mkdtemp(), "comfy")
_write_stub(stub_bin, """import sys, json
args = sys.argv[1:]
if "--version" in args or "-V" in args:
    print(json.dumps({"schema":"envelope/1","ok":True,"data":{"version":"test"}}))
    sys.exit(0)
if "run" in args and "--where" in args and "cloud" in args:
    print(json.dumps({"schema":"envelope/1","ok":False,
        "error":{"code":"not_signed_in","message":"comfy cloud login required"}}))
    sys.exit(1)
print(json.dumps({"schema":"envelope/1","ok":True,"data":{}}))
""")
cloud_t = engine.CloudTransport({"comfy_bin": stub_bin})
ok, detail = loud(lambda: cloud_t.submit({"N1":{"inputs":{}}}), "not_signed_in")
check("T10 cloud-submit-refused loud", ok, detail)

# T11: Full cloud loop through engine.execute() with a stub comfy binary
# that simulates submit → poll(status=completed) → download.
stub_bin2 = os.path.join(tempfile.mkdtemp(), "comfy")
_write_stub(stub_bin2, """import sys, json, os
args = sys.argv[1:]
if "run" in args and "--json" in args:
    print(json.dumps({"schema":"envelope/1","ok":True,
        "data":{"prompt_id":"cloud-abc-123"}}))
    sys.exit(0)
if "jobs" in args and "status" in args:
    print(json.dumps({"schema":"envelope/1","ok":True,
        "data":{"status":"completed","prompt_id":"cloud-abc-123",
            "outputs":{"video_0":[{"filename":"clip.mp4"}]}}}))
    sys.exit(0)
if "download" in args:
    idx = args.index("--out-dir") if "--out-dir" in args else -1
    d = args[idx+1] if idx >= 0 else "."
    with open(os.path.join(d, "clip.mp4"), "wb") as out:
        out.write(b"CLOUDVIDEO")
    sys.exit(0)
print(json.dumps({"schema":"envelope/1","ok":True,"data":{}}))
""")
engine.TRANSPORTS["cloud"] = lambda cfg=None: engine.CloudTransport({"comfy_bin": stub_bin2})

run_dir2 = tempfile.mkdtemp()
node_cloud = {"id": "n3", "params": {
    "workflow_file": wf.name,
    "transport": "cloud",
    "inject": {"N1.text": "cloud-injected"},
}}
res2 = asyncio.run(engine.execute(node_cloud, run_dir2, {}, asyncio.Event()))
check("T11 cloud submit ok", res2 is not None, repr(res2)[:120])
check("T11 cloud artifacts staged", len(res2["artifacts"]) >= 1,
      repr(res2["artifacts"])[:120])
check("T11 cloud outputs classified", res2["outputs"].get("video_0", "").endswith("clip.mp4"),
      repr(res2["outputs"]))

# T12: CloudTransport interrupt via stub binary — fire-and-forget.
stub_bin3 = os.path.join(tempfile.mkdtemp(), "comfy")
_write_stub(stub_bin3, """import sys, json
args = sys.argv[1:]
if "jobs" in args and "cancel" in args:
    print(json.dumps({"schema":"envelope/1","ok":True,"data":{"cancelled":True}}))
    sys.exit(0)
print(json.dumps({"schema":"envelope/1","ok":True,"data":{}}))
""")
cloud_cancel = engine.CloudTransport({"comfy_bin": stub_bin3})
try:
    cloud_cancel.interrupt("some-pid")
    check("T12 cloud interrupt no-crash", True)
except Exception as e:
    check("T12 cloud interrupt no-crash", False, str(e)[:120])

print("PASS %d / FAIL %d" % (len(PASS), len(FAIL)))
for f in FAIL:
    print("  FAIL:", f)
sys.exit(1 if FAIL else 0)
