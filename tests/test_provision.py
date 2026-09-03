#!/usr/bin/env python3
"""test_provision.py — PROVISIONING LAW wall.

The provisioning shape is a contract, not a convenience:

  - one interface, two modes (byo default / managed opt-in), the
    code never knows the difference;
  - BYO never installs (sync REFUSES);
  - managed is lockfile-pinned (comfyui @ exact git ref; version
    hops are deliberate lock bumps);
  - the gateway's third-party surface stays pydantic-only (resilience
    law: it must survive comfy torch chaos — dep creep here is drift).
"""

import json
import subprocess
import sys
import tomllib
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CONFIG = REPO / "plugins" / "engines" / "comfyui" / "data" / "comfyui_endpoint.json"
PROVISION = REPO / "tools" / "provision.py"
COMFY_PROJECT = REPO / "infra" / "comfyui"

PASS = FAIL = 0


def check(name, ok, note=""):
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if note and not ok else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


cfg = json.loads(CONFIG.read_text())

# ── 1. the endpoint config: deployment truth, explicit ────────────────
check("provision mode declared and valid",
      cfg.get("provision") in ("byo", "managed"), repr(cfg.get("provision")))
check("model_base_path declared (weights are deployment config)",
      bool(cfg.get("model_base_path", "").strip()))
check("url declared", bool(cfg.get("url", "").strip()))

# ── 2. the estate env: surface stays pydantic-only ────────────────────
gw = tomllib.loads((REPO / "pyproject.toml").read_text())
deps = gw["project"]["dependencies"]
check("gateway env exists (root pyproject)", bool(deps))
check("gateway third-party surface is pydantic-only",
      deps == ["pydantic>=2.13"], repr(deps))
check("gateway lock tracked", (REPO / "uv.lock").is_file())

# ── 3. the managed runtime: pinned, locked, manager-free ──────────────
cj = tomllib.loads((COMFY_PROJECT / "pyproject.toml").read_text())
mdeps = cj["project"]["dependencies"]
pinned = [d for d in mdeps if d.startswith("comfyui @ git+")]
check("managed project pins comfyui at an exact git ref",
      len(pinned) == 1 and "@" in pinned[0].split("git+")[-1], repr(mdeps))
check("managed lock tracked", (COMFY_PROJECT / "uv.lock").is_file())
check("no comfyui-manager (comfy-mcp is the ONE management plane)",
      not any("manager" in d.lower() for d in mdeps))
check("managed python pin is a range (not the gateway's)",
      "<" in cj["project"]["requires-python"])

# ── 4. behavior: BYO never installs; dead instances refuse ────────────
r = subprocess.run([sys.executable, str(PROVISION), "sync"],
                   capture_output=True, text=True, cwd=str(REPO))
check("sync REFUSES in byo mode",
      r.returncode == 2 and "never install" in r.stdout,
      "rc=%d" % r.returncode)
dead = Path("/tmp/_provision_dead.json")
dead.write_text(json.dumps(
    {"provision": "byo", "url": "http://127.0.0.1:1",
     "model_base_path": "/x"}))
r = subprocess.run([sys.executable, str(PROVISION), "verify", str(dead)],
                   capture_output=True, text=True, cwd=str(REPO))
check("verify REFUSES on a dead instance",
      r.returncode == 1 and "instance live" in r.stdout,
      "rc=%d" % r.returncode)
r = subprocess.run([sys.executable, str(PROVISION), "boot-cmd"],
                   capture_output=True, text=True, cwd=str(REPO))
check("byo boot-cmd prints the config's boot_cmd",
      r.returncode == 0 and cfg["boot_cmd"] in r.stdout)

print()
print("PASS %d / FAIL %d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
