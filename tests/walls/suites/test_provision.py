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

import inspect
import json
import os
import subprocess
import sys
import tomllib
from pathlib import Path

import pytest

from _anchor import REPO
CONFIG = REPO / "plugins" / "engines" / "comfyui" / "data" / "comfyui_endpoint.json"
PROVISION = REPO / "tools" / "provision.py"
COMFY_PROJECT = REPO / "infra" / "comfyui"


# ── 1. the endpoint config ────────────────────────────────────────────

def test_provision_mode_declared() -> None:
    cfg = json.loads(CONFIG.read_text())
    assert cfg.get("provision") in ("byo", "managed"), repr(cfg.get("provision"))


def test_model_storage_keys_valid() -> None:
    cfg = json.loads(CONFIG.read_text())
    assert all(str(cfg.get(k, "")).strip()
               for k in ("model_base_path", "model_download_path")
               if cfg.get(k) is not None)


def test_url_declared() -> None:
    cfg = json.loads(CONFIG.read_text())
    assert bool(cfg.get("url", "").strip())


# ── 2. the estate env ────────────────────────────────────────────────

def test_gateway_env_exists() -> None:
    gw = tomllib.loads((REPO / "pyproject.toml").read_text())
    deps = gw["project"]["dependencies"]
    assert bool(deps)


def test_base_env_carrying_management_plane() -> None:
    gw = tomllib.loads((REPO / "pyproject.toml").read_text())
    deps = gw["project"]["dependencies"]
    _plane = ("pydantic", "comfy-script", "comfy-mcp", "comfyui-manager",
              "comfy-cli", "fastmcp", "starlette", "pyyaml")
    missing = [p for p in _plane
               if not any(d.startswith(p) for d in deps)]
    assert not missing, "missing: %s" % missing


def test_dependency_groups_dev_only() -> None:
    gw = tomllib.loads((REPO / "pyproject.toml").read_text())
    _mgmt = ("comfy-mcp", "comfyui-manager", "comfy-cli")
    _groups = gw.get("dependency-groups") or {}
    _bad_groups = sorted(set(_groups) - {"dev"})
    _dev_rows = [str(x) for x in _groups.get("dev", [])]
    _mgmt_leak = [d for d in _dev_rows
                  if any(m in d for m in _mgmt)]
    assert not _bad_groups and not _mgmt_leak, (
        "groups %s / mgmt leak %s" % (_bad_groups, _mgmt_leak))


def test_management_plane_stays_base() -> None:
    gw = tomllib.loads((REPO / "pyproject.toml").read_text())
    _mgmt = ("comfy-mcp", "comfyui-manager", "comfy-cli")
    base_deps = "\n".join(gw["project"]["dependencies"])
    assert all(m in base_deps for m in _mgmt)


def test_gateway_lock_tracked() -> None:
    assert (REPO / "uv.lock").is_file()


# ── 3. the managed runtime ───────────────────────────────────────────

def test_managed_core_pin_tracked() -> None:
    cj = tomllib.loads((COMFY_PROJECT / "pyproject.toml").read_text())
    _pin = next(ln.strip() for ln in
                 (COMFY_PROJECT / "core.pin").read_text().splitlines()
                 if ln.strip() and not ln.strip().startswith("#"))
    assert (COMFY_PROJECT / "core.pin").is_file() and len(_pin) >= 40


def test_core_requirements_locked() -> None:
    cj = tomllib.loads((COMFY_PROJECT / "pyproject.toml").read_text())
    mdeps = cj["project"]["dependencies"]
    assert any("comfy-kitchen" in d for d in mdeps)
    assert any("comfyui-workflow-templates" in d for d in mdeps)


def test_managed_lock_tracked() -> None:
    assert (COMFY_PROJECT / "uv.lock").is_file()


def test_comfyui_manager_as_install_rail() -> None:
    cj = tomllib.loads((COMFY_PROJECT / "pyproject.toml").read_text())
    mdeps = cj["project"]["dependencies"]
    assert any(d.startswith("comfyui-manager>=4") for d in mdeps)


def test_managed_python_pin_is_range() -> None:
    cj = tomllib.loads((COMFY_PROJECT / "pyproject.toml").read_text())
    assert "<" in cj["project"]["requires-python"]


# ── 4. management plane: packages in-process ──────────────────────────

def test_no_comfy_shell_wrapping() -> None:
    prov_src = PROVISION.read_text()
    assert '"node", "install"' not in prov_src
    assert '"model", "download"' not in prov_src
    assert '"comfy-cli"' not in prov_src


def test_provision_calls_comfy_mcp_in_process() -> None:
    prov_src = PROVISION.read_text()
    assert "comfy_mcp" in prov_src and "install_node" in prov_src
    assert "download_model" in prov_src


def test_bootstrap_py_deleted() -> None:
    assert not (REPO / "bootstrap.py").exists()


def test_setup_sh_routes_through_base_env() -> None:
    setup = (REPO / "setup.sh").read_text()
    assert "--group management" not in setup
    assert "provision.py" in setup


def test_declaration_manifest_non_empty() -> None:
    r = subprocess.run([sys.executable, str(REPO / "infra" / "extension_lane.py"),
                        "--repo", str(REPO), "--format", "json"],
                       capture_output=True, text=True, cwd=str(REPO))
    try:
        exts = json.loads(r.stdout)
    except Exception:
        exts = []
    assert r.returncode == 0 and len(exts) > 0, "%d entries" % len(exts)


# ── 5. behavior: BYO never installs; dead instances refuse ────────────

def test_sync_refuses_in_byo_mode() -> None:
    byo = Path("/tmp/_provision_byo.json")
    byo.write_text(json.dumps(
        {"provision": "byo", "url": "http://127.0.0.1:8188",
         "model_base_path": "/x",
         "boot_cmd": "systemctl --user start comfyui"}))
    r = subprocess.run([sys.executable, str(PROVISION), "sync", str(byo)],
                       capture_output=True, text=True, cwd=str(REPO))
    assert r.returncode == 2 and "never install" in r.stdout, "rc=%d" % r.returncode


def test_verify_refuses_dead_instance() -> None:
    dead = Path("/tmp/_provision_dead.json")
    dead.write_text(json.dumps(
        {"provision": "byo", "url": "http://127.0.0.1:1",
         "model_base_path": "/x"}))
    r = subprocess.run([sys.executable, str(PROVISION), "verify", str(dead)],
                       capture_output=True, text=True, cwd=str(REPO))
    assert r.returncode == 1 and "instance live" in r.stdout, "rc=%d" % r.returncode


def test_byo_boot_cmd() -> None:
    byo = Path("/tmp/_provision_byo.json")
    byo.write_text(json.dumps(
        {"provision": "byo", "url": "http://127.0.0.1:8188",
         "model_base_path": "/x",
         "boot_cmd": "systemctl --user start comfyui"}))
    r = subprocess.run([sys.executable, str(PROVISION), "boot-cmd", str(byo)],
                       capture_output=True, text=True, cwd=str(REPO))
    assert r.returncode == 0 and "systemctl --user start comfyui" in r.stdout


# ── 6. agent harness mount ───────────────────────────────────────────

def test_provisioner_bundle_tracked() -> None:
    PROV = REPO / "plugins" / "harness" / "dsh" / "provisioner"
    ppkg = json.loads((PROV / "package.json").read_text())
    assert (PROV / "cordis.patch.yml").is_file()
    assert ppkg.get("dsh", {}).get("bundle", {}).get("patch") == "./cordis.patch.yml"


def test_provisioner_deps_relative_link() -> None:
    PROV = REPO / "plugins" / "harness" / "dsh" / "provisioner"
    ppkg = json.loads((PROV / "package.json").read_text())
    assert all(str(v).startswith("link:../") for v in ppkg["dependencies"].values())


def test_bundle_patch_machine_neutral() -> None:
    PROV = REPO / "plugins" / "harness" / "dsh" / "provisioner"
    sculpt = (PROV / "cordis.patch.yml").read_text()
    assert "/home/" not in sculpt and "sk-" not in sculpt


def test_agent_sdk_pin_in_base() -> None:
    gw = tomllib.loads((REPO / "pyproject.toml").read_text())
    deps = gw["project"]["dependencies"]
    assert any(d.startswith("deepseek-harness-sdk==") for d in deps)


def test_profile_recipe_composes() -> None:
    prov_src = PROVISION.read_text()
    assert '"@deepseek-ai/dsh-base"' in prov_src
    assert '"@deepseek-ai/dsh-sdk-app"' in prov_src
    assert '"@infer/dsh-provisioner"' in prov_src


def test_gui_home_isolation_guard() -> None:
    prov_src = PROVISION.read_text()
    assert "must differ from the GUI home" in prov_src


# ── DECLARED AUTODOWNLOAD ─────────────────────────────────────────────

def test_root_config_derivation() -> None:
    sys.path.insert(0, str(REPO / "py"))
    import estate_config as _ec
    _cfg = json.loads((REPO / "plugins" / "engines" / "comfyui" /
                       "data" / "comfyui_endpoint.json").read_text())
    _ec_paths = _ec.model_paths(
        "comfyui", endpoint_overrides={
            k: v for k, v in _cfg.items()
            if k in ("model_base_path", "model_download_path")
            and str(v).strip()})
    assert _ec.ROOT_CONFIG.is_file()
    assert _ec_paths["read_root"].startswith("/mnt/")
    assert _ec_paths["download_root"].startswith("/mnt/")


def test_bound_model_folders() -> None:
    sys.path.insert(0, str(REPO / "py"))
    sys.path.insert(0, str(REPO / "tools"))
    import provision as _pv
    import estate_config as _ec
    _cfg = json.loads((REPO / "plugins" / "engines" / "comfyui" /
                       "data" / "comfyui_endpoint.json").read_text())
    _ec_paths = _ec.model_paths(
        "comfyui", endpoint_overrides={
            k: v for k, v in _cfg.items()
            if k in ("model_base_path", "model_download_path")
            and str(v).strip()})
    _bound = _pv.bound_model_folders(_cfg)
    assert _bound["folders"].get("vae") == "vae"
    assert _bound["folders"].get("text_encoders") == "text_encoders"
    assert _bound["folders"].get("frame_interpolation") == "frame_interpolation"
    assert _bound["base_path"] == _ec_paths["read_root"]


def test_cmd_paths_consuming_bound_model_folders() -> None:
    sys.path.insert(0, str(REPO / "tools"))
    import provision as _pv
    assert "bound_model_folders(cfg)" in inspect.getsource(_pv.cmd_paths)


def test_manage_consumes_derivation() -> None:
    sys.path.insert(0, str(REPO / "py"))
    import manage as _mg
    assert "bound_model_folders" in inspect.getsource(_mg._model_present)
    assert "safe_load" not in inspect.getsource(_mg._model_present)


def test_h3_declares_full_weight_set() -> None:
    sys.path.insert(0, str(REPO))
    from melite_models import load_model_py
    _h3 = load_model_py(
        str(REPO / "plugins/engines/comfyui/models/video/h3-timeline/model.py"),
        "comfyui")
    _declared = {p.name for p in _h3.provisions}
    for _need_w in ("qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
                    "minimax_h3_video_vae_int8_convrot.safetensors",
                    "minimax_h3_audio_vae_fp32.safetensors",
                    "film_net_fp16.safetensors"):
        assert _need_w in _declared, "lane weight missing from provisions"
