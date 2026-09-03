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
_pin = next(ln.strip() for ln in
             (COMFY_PROJECT / "core.pin").read_text().splitlines()
             if ln.strip() and not ln.strip().startswith("#"))
check("managed core pin tracked (core.pin — source checkout, not pip)",
      (COMFY_PROJECT / "core.pin").is_file() and len(_pin) >= 40)
check("core requirements locked as wheels (frontend/comfy-kitchen present)",
      any("comfy-kitchen" in d for d in mdeps)
      and any("comfyui-workflow-templates" in d for d in mdeps))
check("managed lock tracked", (COMFY_PROJECT / "uv.lock").is_file())
check("comfyui-manager >=4 ships as the install rail (install_node "
      "drives its cm_cli; the plane stays comfy-mcp)",
      any(d.startswith("comfyui-manager>=4") for d in mdeps))
check("managed python pin is a range (not the gateway's)",
      "<" in cj["project"]["requires-python"])

# ── 4. management plane: packages in-process, never shell scripts ────
groups = gw.get("dependency-groups", {})
mgmt = groups.get("management", [])
check("management group exists (comfy-mcp + pyyaml)",
      "comfy-mcp" in " ".join(mgmt) and "pyyaml" in " ".join(mgmt), repr(mgmt))
check("default env untouched by the management group",
      gw["project"]["dependencies"] == ["pydantic>=2.13"])

prov_src = PROVISION.read_text()
check("no comfy-shell-wrapping in provision.py",
      '"node", "install"' not in prov_src
      and '"model", "download"' not in prov_src
      and '"comfy-cli"' not in prov_src)
check("provision.py calls comfy-mcp in-process",
      "comfy_mcp" in prov_src and "install_node" in prov_src
      and "download_model" in prov_src)
check("bootstrap.py is deleted (one orchestrator)",
      not (REPO / "bootstrap.py").exists())
setup = (REPO / "setup.sh").read_text()
check("setup.sh routes through the management env",
      "--group management" in setup and "provision.py" in setup)

# the manifest merger sees the REAL plugin layouts (fossil-glob wall)
r = subprocess.run([sys.executable, str(REPO / "infra" / "extension_lane.py"),
                    "--repo", str(REPO), "--format", "json"],
                   capture_output=True, text=True, cwd=str(REPO))
try:
    exts = json.loads(r.stdout)
except Exception:
    exts = []
check("declaration manifest non-empty (merger sees plugin layouts)",
      r.returncode == 0 and len(exts) > 0, "%d entries" % len(exts))

# ── 5. behavior: BYO never installs; dead instances refuse ────────────
byo = Path("/tmp/_provision_byo.json")
byo.write_text(json.dumps(
    {"provision": "byo", "url": "http://127.0.0.1:8188",
     "model_base_path": "/x",
     "boot_cmd": "systemctl --user start comfyui"}))
r = subprocess.run([sys.executable, str(PROVISION), "sync", str(byo)],
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
r = subprocess.run([sys.executable, str(PROVISION), "boot-cmd", str(byo)],
                   capture_output=True, text=True, cwd=str(REPO))
check("byo boot-cmd prints the config's boot_cmd",
      r.returncode == 0 and "systemctl --user start comfyui" in r.stdout)

print()
print("PASS %d / FAIL %d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
