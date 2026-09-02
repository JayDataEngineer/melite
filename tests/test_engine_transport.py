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
ENGINE_DIR = REPO / "plugins/comfyui/engines/comfyui"

# TEST SANDBOX: the engine's config must refuse all on-disk endpoint
# fallbacks (they point at the real ComfyUI — never silently submit
# real GPU renders from a test).
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

# T5: port boundary — a stub transport drives execute() end to end:
# workflow loaded+spliced, artifacts staged+classified, outputs keyed.
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
engine.TRANSPORTS["stub"] = lambda: stub  # registered backend (test-only)

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

# T6: stop door reaches THROUGH the port — interrupt lands on the
# backend, run fails as stopped (resilience law: documented, not crash).
class NeverDone:
    kind = "stub"
    def submit(self, workflow):
        return "x"
    def poll(self, pid):
        return None
    def interrupt(self):
        self.hit = True
never = NeverDone()
engine.TRANSPORTS["stub"] = lambda: never
stop = asyncio.Event()
stop.set()
ok, detail = loud(lambda: asyncio.run(engine.execute(
    {"id": "n2", "params": {"workflow_file": wf.name, "transport": "stub"}},
    run_dir, {}, stop)), "stopped by stop door")
check("T6 stop door loud", ok, detail)
check("T6 stop interrupt reached backend", getattr(never, "hit", False), "no interrupt")

print("PASS %d / FAIL %d" % (len(PASS), len(FAIL)))
for f in FAIL:
    print("  FAIL:", f)
sys.exit(1 if FAIL else 0)
