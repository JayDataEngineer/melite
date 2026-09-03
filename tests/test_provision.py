#!/usr/bin/env python3
"""test_provision.py — PROVISIONING LAW wall.

The provisioning shape is a contract, not a convenience:

  - one interface, two modes (byo default / managed opt-in), the
    code never knows the difference;
  - BYO never installs (sync REFUSES);
  - managed is lockfile-pinned (comfyui @ exact git ref; version
    hops are deliberate lock bumps);
  - ONE base env (operator order 2026-09-03): the base env IS the
    comfyui management plane — pydantic + comfy-script + comfy-mcp +
    comfyui-manager + comfy-cli + fastmcp + starlette + pyyaml.
    No opt-in group; the system does not run without comfy-mcp.
"""

import json
import os
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

# ── 2. the estate env: ONE base env, the full management plane ────────
gw = tomllib.loads((REPO / "pyproject.toml").read_text())
deps = gw["project"]["dependencies"]
_plane = ("pydantic", "comfy-script", "comfy-mcp", "comfyui-manager",
          "comfy-cli", "fastmcp", "starlette", "pyyaml")
check("gateway env exists (root pyproject)", bool(deps))
check("base env carries the FULL comfyui management plane",
      all(any(d.startswith(p) for d in deps) for p in _plane),
      "missing: %s" % [p for p in _plane
                       if not any(d.startswith(p) for d in deps)])
# ONE FLOW, refined 2026-09-04 (operator order: "to pyproject, we
# need to add the pytest dev dependency"): the MANAGEMENT plane can
# never be an opt-in group — but dev/test tooling may group. The
# invariant: only a "dev" group exists, and it carries NO management
# packages (comfy-mcp / comfyui-manager / comfy-cli stay base or the
# system does not run).
_mgmt = ("comfy-mcp", "comfyui-manager", "comfy-cli")
_groups = gw.get("dependency-groups") or {}
_bad_groups = sorted(set(_groups) - {"dev"})
_dev_rows = [str(x) for x in _groups.get("dev", [])]
_mgmt_leak = [d for d in _dev_rows
              if any(m in d for m in _mgmt)]
check("dependency groups: dev-only, never management",
      not _bad_groups and not _mgmt_leak,
      "groups %s / mgmt leak %s" % (_bad_groups, _mgmt_leak))
base_deps = "\n".join(gw["project"]["dependencies"])
check("management plane stays base (never a group)",
      all(m in base_deps for m in _mgmt), _mgmt)
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
check("setup.sh routes through the ONE base env",
      "--group management" not in setup and "provision.py" in setup)

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

# ── 6. agent harness mount: recipe → materialized home ──────────────
PROV = REPO / "plugins" / "harness" / "dsh" / "provisioner"
ppkg = json.loads((PROV / "package.json").read_text())
check("provisioner bundle tracked (dsh.bundle.patch declared)",
      (PROV / "cordis.patch.yml").is_file()
      and ppkg.get("dsh", {}).get("bundle", {}).get("patch") == "./cordis.patch.yml")
check("provisioner deps are relative link: rows (machine-neutral)",
      all(str(v).startswith("link:../") for v in ppkg["dependencies"].values()))
sculpt = (PROV / "cordis.patch.yml").read_text()
check("bundle patch machine-neutral (no absolute paths, no secrets)",
      "/home/" not in sculpt and "sk-" not in sculpt)
check("base env carries the agent SDK pin (server mount)",
      any(d.startswith("deepseek-harness-sdk==") for d in deps))
check("profile recipe composes base + sdk-app + provisioner",
      '"@deepseek-ai/dsh-base"' in prov_src
      and '"@deepseek-ai/dsh-sdk-app"' in prov_src
      and '"@infer/dsh-provisioner"' in prov_src)
check("GUI-home isolation guard present",
      "must differ from the GUI home" in prov_src)
tmp_home = Path("/tmp/_provision_dsh_home")
subprocess.run(["rm", "-rf", str(tmp_home)], check=True)
r = subprocess.run([sys.executable, str(PROVISION), "dsh"],
                   capture_output=True, text=True, cwd=str(REPO),
                   env={**os.environ, "MELITE_DSH_HOME": str(tmp_home)})
ok_dsh = r.returncode == 0
check("provision dsh materializes + verifies the harness home", ok_dsh,
      ((r.stdout or "") + (r.stderr or ""))[-200:] if not ok_dsh else "")
if ok_dsh:
    prof = tmp_home / "profiles" / "estate"
    pk = json.loads((prof / "package.json").read_text())
    check("estate profile bundles = base + sdk-app + provisioner",
          pk["dsh"]["profile"]["bundles"] ==
          ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-sdk-app",
           "@infer/dsh-provisioner"])
    check("provisioner installed via the pnpm rail (link:)",
          (prof / "node_modules" / "@infer" / "dsh-provisioner"
           / "cordis.patch.yml").is_file())
    check("per-machine skill root rendered into the profile patch",
          str(REPO / ".dsh" / "skills")
          in (prof / "cordis.patch.yml").read_text())
    check("harness-home local layer written once (edit-owned)",
          (tmp_home / "cordis.patch.yml").is_file())
    check("generated home self-ignores (secrets can never be committed)",
          (tmp_home / ".gitignore").is_file()
          and (tmp_home / ".gitignore").read_text().strip() == "*")

# ── DECLARED AUTODOWNLOAD: the lane's full weight set + idempotent
# provisioning (operator order: "we manage the models through pip
# comfy-cli / comfy-mcp. We should autodownloads") ──────────────────
sys.path.insert(0, str(REPO / "py"))
sys.path.insert(0, str(REPO / "tools"))
import manage as _mg                                     # noqa: E402
import provision as _pv                                  # noqa: E402

_cfg = json.loads((REPO / "plugins" / "engines" / "comfyui" /
                   "data" / "comfyui_endpoint.json").read_text())
_bound = _pv.bound_model_folders(_cfg)

check("bound_model_folders: the ONE derivation (fixed + extras)",
      _bound["folders"].get("vae") == "vae"
      and _bound["folders"].get("text_encoders") == "text_encoders"
      and _bound["folders"].get("frame_interpolation") == "frame_interpolation"
      and _bound["base_path"] == _cfg["model_base_path"],
      "folder derivation drifted from the endpoint config")

check("cmd_paths renders FROM the one derivation (no restated list)",
      "bound_model_folders(cfg)" in
      __import__("inspect").getsource(_pv.cmd_paths),
      "cmd_paths stopped consuming bound_model_folders")

check("manage consumes the derivation, never a yaml re-parse",
      "bound_model_folders" in
      __import__("inspect").getsource(_mg._model_present)
      and "safe_load" not in
      __import__("inspect").getsource(_mg._model_present),
      "presence check regressed to yaml parsing")

_have = _mg._model_present(
    "models/text_encoders", "qwen3vl_32b_minimax_h3_int8_convrot.safetensors")
check("_model_present resolves the mount binding",
      _have is not None and str(_have).endswith(
          "text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors"),
      "presence check cannot see the bound mount: %r" % (_have,))
check("_model_present: missing stays missing",
      _mg._model_present("models/vae", "nope.safetensors") is None,
      "missing file reported present")

# the h3 lane declares its FULL weight set (clip + VAEs included —
# the render graph names them; an undeclared weight is a dead lane
# on a fresh mount)
sys.path.insert(0, str(REPO))
from melite_models import load_model_py                   # noqa: E402
_h3 = load_model_py(
    str(REPO / "plugins/engines/comfyui/models/video/h3-timeline/model.py"),
    "comfyui")
_declared = {p.name for p in _h3.provisions}
for _need_w in ("qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
                "minimax_h3_video_vae_int8_convrot.safetensors",
                "minimax_h3_audio_vae_fp32.safetensors",
                "film_net_fp16.safetensors"):
    check("h3 declares %s" % _need_w, _need_w in _declared,
          "lane weight missing from provisions")

# idempotence: every PRESENT row must never reach the download tool —
# a booby-trapped sms proves the short-circuit
def _boom(*a, **k):
    raise AssertionError("download executed for a present row")

class _Boom:
    def __getattr__(self, name):
        return _boom

_req = _mg.ManageRequest(action=_mg.Action.PROVISION_MODEL,
                         model="h3-timeline")
_code, _rep = _mg._h_provision_model(_req, _Boom())
check("provision-model is idempotent (present rows never download)",
      _rep.get("ok") and _rep["data"]["present"]
      and not _rep["data"]["files"],
      "idempotence broken: %s" % _rep.get("detail"))

print()
print("PASS %d / FAIL %d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
