#!/usr/bin/env python3
"""THE ROOT CONFIG TEST SUITE (operator order 2026-09-04).
Tests the ONE parser (py/estate_config.py) and the endpoint sync
(provision paths) — the two layers that make inference.config.json
the SSOT for the whole estate.

Run: .venv/bin/python tests/test_estate_config.py
"""

import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CONFIG = REPO / "inference.config.json"
ENDPOINT = REPO / "plugins" / "engines" / "comfyui" / "data" / "comfyui_endpoint.json"
sys.path.insert(0, str(REPO / "py"))
import estate_config  # noqa: E402

FAILS = 0


def check(ok, label, detail=""):
    global FAILS
    tag = " ok " if ok else "FAIL"
    d = str(detail) if detail else ""
    print("  %s  %s%s" % (tag, label, (" — " + d) if d else ""))
    if not ok:
        FAILS += 1


# ── 1. root config shape ─────────────────────────────────────────────
print("\n── root config shape")
check(CONFIG.is_file(), "inference.config.json exists")
cfg = json.loads(CONFIG.read_text()) if CONFIG.is_file() else {}
check(isinstance(cfg.get("models"), dict), "models is a dict",
      repr(type(cfg.get("models"))))
models = cfg.get("models", {})
check(bool(models.get("read_root")), "models.read_root declared",
      repr(models.get("read_root")))
check(bool(models.get("download_root")), "models.download_root declared",
      repr(models.get("download_root")))
check(os.path.isabs(models.get("read_root", "")), "read_root is absolute")
check(os.path.isabs(models.get("download_root", "")), "download_root is absolute")
check(isinstance(cfg.get("engines"), dict), "engines is a dict")
engines = cfg.get("engines", {})
check("comfyui" in engines, "engines.comfyui declared")
check("kimodo" in engines, "engines.kimodo declared")
cu = engines.get("comfyui", {})
check(bool(cu.get("url")), "engines.comfyui.url declared", repr(cu.get("url")))
check(bool(cu.get("base")), "engines.comfyui.base declared", repr(cu.get("base")))

# ── 2. model_paths resolution ────────────────────────────────────────
print("\n── model_paths resolution")
p = estate_config.model_paths("comfyui")
check(p["read_root"].startswith("/mnt/"), "comfyui read_root under /mnt",
      p["read_root"])
check(p["download_root"].startswith("/mnt/"), "comfyui download_root under /mnt",
      p["download_root"])
check(p["read_root"].endswith("image-gen/comfyui"), "comfyui base subdir applied",
      p["read_root"])

p2 = estate_config.model_paths("kimodo")
check(p2["read_root"].endswith("motion/kimodo"), "kimodo base subdir applied",
      p2["read_root"])

# engine with no entry (audio-cpp has only a comment)
p3 = estate_config.model_paths("ffmpeg")
check(p3["read_root"] == models["read_root"],
      "engine with no entry sits under the global root directly",
      p3["read_root"])

# override wins when set
p4 = estate_config.model_paths("comfyui",
                               endpoint_overrides={"model_base_path": "/override"})
check(p4["read_root"] == "/override", "endpoint override wins",
      p4["read_root"])

# empty override string is ignored (unset → inherit)
p5 = estate_config.model_paths("comfyui",
                               endpoint_overrides={"model_base_path": ""})
check(p5["read_root"] == p["read_root"],
      "empty override is ignored (inherits root)",
      p5["read_root"])

# ── 3. engine_url resolution ─────────────────────────────────────────
print("\n── engine_url resolution")
u = estate_config.engine_url("comfyui")
check(u.startswith("http"), "comfyui url from root", repr(u))
check(u == cu.get("url"), "url matches root config", u)

u2 = estate_config.engine_url("comfyui", endpoint_override="http://override:9999")
check(u2 == "http://override:9999", "endpoint url override wins", u2)

u3 = estate_config.engine_url("comfyui", endpoint_override="")
check(u3 == u, "empty endpoint override inherits root", u3)

u4 = estate_config.engine_url("kimodo")
check(u4 == "", "engine without url returns empty", repr(u4))

# ── 4. engine_field resolution ───────────────────────────────────────
print("\n── engine_field resolution")
f = estate_config.engine_field("comfyui", "input_dir")
check(bool(f), "comfyui input_dir from root", repr(f))
check(os.path.isabs(f), "input_dir is absolute", f)

f2 = estate_config.engine_field("comfyui", "input_dir",
                                endpoint_override="/override/input")
check(f2 == "/override/input", "endpoint field override wins", f2)

f3 = estate_config.engine_field("kimodo", "generator")
check(bool(f3), "kimodo generator from root", repr(f3))
check(f3.endswith("kmd-generate"), "generator ends with kmd-generate", f3)

f4 = estate_config.engine_field("kimodo", "exporter")
check(f4.endswith("export_glb.py"), "exporter ends with export_glb.py", f4)

# ── 5. engine_port resolution ────────────────────────────────────────
print("\n── engine_port resolution")
port = estate_config.engine_port("comfyui")
check(port == 18466, "port from root config url", port)

port2 = estate_config.engine_port("comfyui", endpoint_override="9999")
check(port2 == 9999, "endpoint port override wins", port2)

port3 = estate_config.engine_port("comfyui", endpoint_override="")
check(port3 == port, "empty override inherits root", port3)

port4 = estate_config.engine_port("kimodo")
check(port4 == 0, "engine without port returns 0", port4)

# ── 6. error paths ───────────────────────────────────────────────────
print("\n── error paths")
check(issubclass(estate_config.RootConfigError, Exception),
      "RootConfigError is an Exception subclass")

# relative read_root raises
try:
    estate_config._abs_root("relative/path", "test_key")
    check(False, "relative root should raise")
except estate_config.RootConfigError:
    check(True, "relative root raises RootConfigError")

# empty root raises
try:
    estate_config._abs_root("", "test_key")
    check(False, "empty root should raise")
except estate_config.RootConfigError:
    check(True, "empty root raises RootConfigError")

# ── 7. endpoint sync (provision paths) ───────────────────────────────
print("\n── endpoint sync via provision paths")
ep_before = json.loads(ENDPOINT.read_text()) if ENDPOINT.is_file() else {}
r = subprocess.run(
    [sys.executable, str(REPO / "tools" / "provision.py"), "paths"],
    capture_output=True, text=True, cwd=str(REPO))
check(r.returncode == 0, "provision paths exits 0", r.stderr[:120] if r.returncode else "")
ep_after = json.loads(ENDPOINT.read_text()) if ENDPOINT.is_file() else {}

for k in ("url", "model_base_path", "model_download_path",
          "input_dir", "output_dir", "boot_cmd"):
    root_val = estate_config.engine_field("comfyui", k)
    if not root_val:
        root_val = estate_config.engine_url("comfyui") if k == "url" else ""
    ep_val = ep_after.get(k, "")
    check(bool(ep_val), "endpoint.%s is set after sync" % k, repr(ep_val[:60]))
    if root_val:
        check(ep_val == root_val or k == "boot_cmd",
              "endpoint.%s matches root" % k,
              "ep=%s root=%s" % (repr(ep_val[:50]), repr(root_val[:50])))

# boot_cmd port matches url port
boot = ep_after.get("boot_cmd", "")
check("--port 18466" in boot, "boot_cmd port matches url (18466)",
      boot[:80])

# ── result ────────────────────────────────────────────────────────────
print("\n%s %d" % ("PASS" if FAILS == 0 else "FAIL %d" % FAILS, FAILS))
sys.exit(1 if FAILS else 0)
