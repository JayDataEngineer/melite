#!/usr/bin/env python3
"""provision.py — the ONE provisioning orchestrator.

Operator orders: PROVISIONING LAW (2026-09-03) + bootstrap retirement
(same day): "models, extensions, and comfyui management is done through
those python packages, not shell scripts" — this tool imports comfy-mcp
and calls its tools IN-PROCESS. There is no shelling out to a comfy CLI
here; comfy-mcp owns the binary routing (COMFY_BIN / PATH — deployment
config, portability law).

Instance provisioning — one interface, two modes, the estate code
never knows the difference:

  byo (default)  the user's own ComfyUI, anywhere. The estate
                 VERIFIES and never installs one.
  managed        uv materializes a lockfile-pinned ComfyUI from
                 infra/comfyui/ into data/runtime/comfyui/.

Declaration provisioning — through the python packages:

  extensions     comfy-mcp install_node for registry declarations
                 (bare ids — the tool REFUSES git URLs and @pins by
                 design, which is the estate's own never-git-clone
                 ruling made mechanical); vendor packs symlinked from
                 vendor/comfyui_extensions (ours, EXTENSION LAW);
                 url+ref declarations BLOCK loudly — convert them to
                 registry: or vendor them in-tree.
  models         comfy-mcp download_model per model.yaml provision,
                 polled to completion, sha256-verified after (ours).
  all            extensions + models.

ONE base environment (operator order 2026-09-03: the base env IS the
comfyui management plane — pydantic, comfy-script, comfy-mcp,
comfyui-manager, comfy-cli, fastmcp, starlette, pyyaml; no opt-in
group, one flow):

  uv run python tools/provision.py <command>

setup.sh wraps exactly that. Agent-driven interactive provisioning
stays with the comfy-mcp MCP server itself (docs/comfyui/comfy-mcp.md).

Commands:
  verify      health probe: config shape, live instance, routing
  paths       runtime layout + extra_model_paths.yaml (managed)
  sync        managed only: uv sync --frozen
  boot-cmd    print the exact launch for the configured mode
  extensions | models | all [--dry-run]
  dsh         materialize the agent harness home + estate server
              profile (recipe: plugins/harness/dsh/provisioner)
"""

from __future__ import annotations

import argparse
import asyncio
import glob
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = REPO / "plugins" / "engines" / "comfyui" / "data" / "comfyui_endpoint.json"
RUNTIME = REPO / "data" / "runtime" / "comfyui"
COMFY_PROJECT = REPO / "infra" / "comfyui"
LANE = REPO / "infra" / "extension_lane.py"
DRY = False
FAILS = []

# the ROOT config's ONE parser (inference.config.json — operator
# order 2026-09-04: model storage configured from the project root)
if str(REPO / "py") not in sys.path:
    sys.path.insert(0, str(REPO / "py"))
import estate_config  # noqa: E402

# ── agent harness mount (dsh) — recipe → materialized home ─────────
# The estate sculpt is @infer/dsh-provisioner (plugins/harness/dsh):
# app-agnostic + machine-neutral, rows by package name (its README
# owns the law). This step materializes the SERVER mount: a fresh
# harness home whose 'estate' profile composes dsh-base + dsh-sdk-app
# (the JSON-RPC server, shipped by the pip runtime's bundled wheel) +
# the provisioner. The GUI home (~/.dsh) is NEVER touched — isolation
# is the mount's whole point.
DSH_PROVISIONER = REPO / "plugins" / "harness" / "dsh" / "provisioner"
DSH_PROVISIONER_NAME = "@infer/dsh-provisioner"
DSH_HARNESS_HOME = REPO / "data" / "runtime" / "dsh-harness-home"
DSH_PROFILE = "estate"
DSH_PROFILE_BUNDLES = ("@deepseek-ai/dsh-base",
                       "@deepseek-ai/dsh-sdk-app",
                       DSH_PROVISIONER_NAME)


# ── output helpers ──────────────────────────────────────────────────

def info(msg: str) -> None:
    print("[provision] %s" % msg, flush=True)


def warn(msg: str) -> None:
    print("[provision] WARN: %s" % msg, flush=True)


def fail(msg: str) -> None:
    print("[provision] FATAL: %s" % msg, file=sys.stderr, flush=True)
    sys.exit(1)


def die(msg: str) -> None:
    print("REFUSED: %s" % msg)
    sys.exit(2)


def need_comfy_mcp():
    """Import the management plane — loudly, with the fix printed."""
    try:
        import comfy_mcp.server as sms  # noqa: F401
        return sms
    except ImportError:
        fail("comfy-mcp is not importable — the base env carries it "
             "(uv sync); run:\n"
             "  uv run python tools/provision.py <command>"
             "\n(or: pip install comfy-mcp)")


def tool(sms, name):
    """The @mcp.tool function, callable as a plain python function."""
    fn = getattr(sms, name)
    return getattr(fn, "fn", fn)


def call(fn, *a, **kw):
    """Invoke an @mcp.tool function — some are async, some sync."""
    r = fn(*a, **kw)
    import inspect
    return asyncio.run(r) if inspect.iscoroutine(r) else r


def _url_installed(url: str, workspace: Path) -> bool:
    """True if some custom_nodes clone's git remote IS this declaration's
    url. The Manager renames install dirs from its registry metadata
    (e.g. ComfyUI-SeedVR2_VideoUpscaler -> seedvr2_videoupscaler), so
    matching by name is hopeless; matching the remote is exact."""
    import configparser
    want = url.rstrip("/").lower().removesuffix(".git")
    for child in sorted((workspace / "custom_nodes").glob("*")):
        if not child.is_dir():
            continue
        cfg = child / ".git" / "config"
        if not cfg.is_file():
            continue
        try:
            cp = configparser.ConfigParser()
            cp.read(cfg)
            for sect in cp.sections():
                origin = cp.get(sect, "url", fallback="")
                if origin and origin.rstrip("/").lower().removesuffix(".git") == want:
                    return True
        except Exception:
            continue
    return False


def _runtime_python(workspace: Path) -> str:
    """The SERVING runtime's interpreter (where ComfyUI imports nodes).
    VIRTUAL_ENV is set by managed routing; COMFY_BIN's sibling python
    is the same env; the workspace .venv is the last resort."""
    venv = os.environ.get("VIRTUAL_ENV", "")
    if venv:
        py = Path(venv) / "bin" / "python"
        if py.is_file():
            return str(py)
    cb = os.environ.get("COMFY_BIN", "")
    if cb:
        py = Path(cb).with_name("python")
        if py.is_file():
            return str(py)
    return str(workspace / ".venv" / "bin" / "python")


def _pip_install(pkgs, workspace: Path) -> bool:
    """Install declared python deps into the SERVING runtime venv (where
    ComfyUI imports nodes). uv is the rail (the runtime venv ships no
    pip); satisfied pins are no-ops. Declared pins (pkg==x.y.z) are
    exact — the declaration is the contract."""
    import subprocess
    py = _runtime_python(workspace)
    cmd = ["uv", "pip", "install", "--python", py, *pkgs]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if r.returncode == 0:
        return True
    warn("  pip install failed (%s): %s" % (
        " ".join(pkgs), (r.stderr or r.stdout).strip()[:200]))
    return False


def _cm_cli_install(url: str, workspace: Path) -> dict:
    """Call cm_cli install directly (accepts git URLs; install_node wraps it but
    refuses them).  Uses the workspace .venv python for dependencies."""
    import subprocess
    # Use the VIRTUAL_ENV set by managed provisioning (line 649 in this file)
    venv = os.environ.get("VIRTUAL_ENV", "")
    if venv:
        py = Path(venv) / "bin" / "python"
    else:
        py = sys.executable
    env = {**os.environ, "COMFYUI_PATH": str(workspace)}
    result = subprocess.run(
        [str(py), "-m", "cm_cli", "install", url],
        capture_output=True, text=True, cwd=str(workspace), env=env, timeout=300,
    )
    # cm_cli exits 0 on success, non-zero on failure
    if result.returncode == 0:
        return {"installed": True, "restart_required": True, "result": result.stdout}
    # parse failure from stderr/stdout
    err = result.stderr or result.stdout
    return {"installed": False, "failed": True, "error": err[:500]}


# ── instance provisioning (byo verify / managed materialize) ────────

def check(name, ok, note=""):
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if note and not ok else ""))
    if not ok:
        FAILS.append(name)
    return ok


def load_config(path):
    cfg = json.loads(Path(path).read_text())
    cfg.setdefault("provision", "byo")   # absent = byo (the agnostic default)
    return cfg


def _probe(url, path, timeout=5):
    with urllib.request.urlopen(url.rstrip("/") + path, timeout=timeout) as r:
        return r.status, json.loads(r.read())


# the fixed folder set every ComfyUI install scans on a bound base
# (stock folder keys; order is the yaml's presentation order)
_FIXED_FOLDERS = (
    "checkpoints", "clip", "clip_vision", "controlnet",
    "diffusion_models", "loras", "unet", "vae", "upscale_models",
    "background_removal",
)


def bound_model_folders(cfg: dict) -> dict:
    """THE ONE derivation: ROOT config + endpoint overrides
    -> {folder: mount subdir}.

    The yaml generator (cmd_paths), the download-pointer layer and
    the provisioning presence check (manage._model_present) consume
    THIS — never a second parser of the generated yaml, never a
    restated folder list.
    Returns {"base_path": str, "download_path": str,
             "folders": {folder: subdir}} with the fixed set first,
    then pack-declared extras sorted; refuses an unconfigured root
    LOUD (QUEUE LANE LAW).

    Where models live and download to is configured FROM THE ROOT
    OF THE PROJECT (operator order 2026-09-04): inference.config.json
    owns the global roots + per-engine bases (py/estate_config.py is
    its ONE parser); the endpoint's model_base_path /
    model_download_path, when SET, override per-engine. Unset
    endpoint keys inherit the root config — a user configures the
    whole estate in one file at the repo root. Present-but-empty
    endpoint keys are a misconfig and die LOUD."""
    overrides = {
        k: v for k, v in (
            ("model_base_path", cfg.get("model_base_path")),
            ("model_download_path", cfg.get("model_download_path")),
        ) if v is not None
    }
    for k in ("model_base_path", "model_download_path"):
        raw = cfg.get(k)
        if raw is not None and not str(raw).strip():
            die("%s is EMPTY in the endpoint config — unset the key "
                "to inherit the root config (inference.config.json), "
                "or name it explicitly (never guessed)" % k)
    try:
        paths = estate_config.model_paths("comfyui",
                                          endpoint_overrides=overrides)
    except estate_config.RootConfigError as exc:
        die(str(exc))
    base, download = paths["read_root"], paths["download_root"]
    folders = {f: f for f in _FIXED_FOLDERS}
    # pack-declared categories (e.g. audiocpp) — the endpoint config
    # owns the mapping; the orchestrator stays generic (PLUGIN
    # ARCHITECTURE LAW: no pack names in the core)
    for cat, sub in sorted((cfg.get("extra_model_folders") or {}).items()):
        cat = str(cat).strip()
        sub = str(sub).strip("/")
        if cat and sub:
            folders[cat] = sub
    return {"base_path": base, "download_path": download,
            "folders": folders}


def cmd_paths(cfg):
    """Runtime layout + extra_model_paths.yaml (weights NEVER move:
    the yaml points at the deployment's persistent storage)."""
    bound = bound_model_folders(cfg)
    base, folders = bound["base_path"], bound["folders"]
    (RUNTIME / "custom_nodes").mkdir(parents=True, exist_ok=True)
    (RUNTIME / "user").mkdir(parents=True, exist_ok=True)
    lines = [
        "# generated by tools/provision.py paths — DO NOT hand-edit",
        "# (source of truth: inference.config.json at the repo root — "
        "endpoint storage keys override when set)",
        "melite_weights:",
        "  base_path: %s" % base,
    ]
    lines += ["  %s: %s" % (f, folders[f]) for f in _FIXED_FOLDERS]
    extras = [f for f in folders if f not in _FIXED_FOLDERS]
    if extras:
        lines.append("  # pack-declared categories (extra_model_folders)")
        lines += ["  %s: %s" % (f, folders[f]) for f in extras]
    (RUNTIME / "extra_model_paths.yaml").write_text(
        "\n".join(lines) + "\n")
    print("runtime layout + extra_model_paths.yaml → %s" % RUNTIME)
    _lay_download_pointers(bound["download_path"], folders)
    _sync_endpoint_from_root(cfg)


def _lay_download_pointers(download_base, folders):
    """THE DOWNLOAD DESTINATION IS CONFIG (operator order 2026-09-04:
    "configure where models download to — not an automatic spot").

    extra_model_paths maps every category to the read root, but the
    WRITERS hardcode ComfyUI's own tree: comfy-cli lands downloads at
    <workspace>/models/<category>, and packs cache to
    folder_paths.models_dir (the seedvr2 6.32 GB auto-download,
    caught 2026-09-04). The universal fix is POINTERS at the
    CONFIGURED destination (model_download_path, inherited from
    model_base_path when unset): each mapped category dir inside the
    runtime becomes a symlink to <download_base>/<sub>, so every
    writer — comfy-cli, pack auto-download, core — lands exactly
    where the endpoint config says.

    Self-healing: every `paths` run re-asserts the pointers against
    the CURRENT config; real content found in a category dir first
    MOVES to the configured destination, then the pointer is laid."""
    import shutil
    models_dir = RUNTIME / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    for cat, sub in sorted(folders.items()):
        local = models_dir / cat
        target = Path(download_base) / sub
        if local.is_symlink():
            if os.path.realpath(local) == str(target):
                continue          # already the right pointer
            local.unlink()
        if local.is_dir():
            # real content: move it to the configured destination,
            # then pointer it
            target.mkdir(parents=True, exist_ok=True)
            for f in sorted(local.iterdir()):
                dest_f = target / f.name
                if not dest_f.exists():
                    shutil.move(str(f), str(dest_f))
            shutil.rmtree(str(local))
        target.mkdir(parents=True, exist_ok=True)
        local.symlink_to(target)
    print("download pointers: %d categories → %s (configured "
          "model_download_path)" % (len(folders), download_base))


# endpoint fields derived from the ROOT config (operator order
# 2026-09-04: configure the whole estate from the project root;
# the root is the SSOT, the endpoint file is a generated surface
# for these fields — the same shape extra_model_paths.yaml plays).
_ENDPOINT_DERIVED = ("url", "model_base_path", "model_download_path")


def _sync_endpoint_from_root(cfg):
    """The comfyui endpoint's url + model_* keys are derived from
    the root config. The endpoint may still override url when set
    (back-compat for deployments that pass one in); for the model
    keys, the endpoint inherits — writes the root's value to the
    endpoint file so the gateway and the wall see the same root."""
    import collections
    try:
        path_urls = estate_config.model_paths("comfyui")
    except estate_config.RootConfigError:
        return
    derived = {
        "model_base_path": path_urls["read_root"],
        "model_download_path": path_urls["download_root"],
    }
    # url: root is the default; an explicit endpoint value wins
    derived["url"] = estate_config.engine_url("comfyui",
                                             endpoint_override=cfg.get("url"))
    changed = []
    for k, v in derived.items():
        cur = str(cfg.get(k) or "").strip()
        want = str(v or "").strip()
        if cur == want:
            continue
        changed.append(k)
        cfg[k] = want
    if not changed:
        return
    cfg_path = DEFAULT_CONFIG
    # write back preserving the file's order + comments where we can
    on_disk = json.loads(cfg_path.read_text())
    for k in _ENDPOINT_DERIVED:
        if k in derived:
            on_disk[k] = derived[k]
    cfg_path.write_text(json.dumps(on_disk, indent=2) + "\n")
    print("endpoint derived from root: %s" % ", ".join(changed))


def cmd_sync(cfg):
    if cfg.get("provision") != "managed":
        die("provision=%r — BYO deployments never install a ComfyUI "
            "(the estate sits on top; verify instead)" % cfg.get("provision"))
    lock = COMFY_PROJECT / "uv.lock"
    if not lock.is_file():
        die("no uv.lock in infra/comfyui — run `uv lock` there first "
            "(the lock is the pinned truth, tracked in git)")
    pin_f = COMFY_PROJECT / "core.pin"
    if not pin_f.is_file():
        die("no core.pin in infra/comfyui — the core source ref is "
            "deployment truth, never a floating clone")
    pin = next(ln.strip() for ln in pin_f.read_text().splitlines()
                if ln.strip() and not ln.strip().startswith("#"))
    cmd_paths(cfg)
    env = dict(os.environ)
    env["UV_PROJECT_ENVIRONMENT"] = str(RUNTIME / ".venv")
    r = subprocess.run(
        ["uv", "sync", "--frozen", "--project", str(COMFY_PROJECT)],
        cwd=str(REPO), env=env)
    if r.returncode != 0:
        sys.exit(r.returncode)
    # core: pinned checkout INTO the runtime (the workspace root —
    # ComfyUI resolves custom_nodes beside its own main.py). Core at
    # the audited ref is not a pip package (no build system upstream);
    # Comfy-Org ships core as a checkout, so we do too — PINNED.
    core_url = "https://github.com/comfyanonymous/ComfyUI.git"
    if (RUNTIME / "main.py").is_file():
        have = subprocess.run(["git", "-C", str(RUNTIME), "rev-parse",
                               "HEAD"], capture_output=True, text=True)
        if have.stdout.strip() == pin:
            info("core already at pin %s" % pin[:12])
            return
    info("fetching core at pin %s …" % pin[:12])
    RUNTIME.mkdir(parents=True, exist_ok=True)
    if not (RUNTIME / ".git").is_dir():
        # init, never clone: the runtime already carries generated
        # layout (custom_nodes/, user/, extra_model_paths.yaml)
        subprocess.run(["git", "init", "--quiet"], cwd=str(RUNTIME), check=True)
        subprocess.run(["git", "remote", "add", "origin", core_url],
                       cwd=str(RUNTIME), check=True)
    r = subprocess.run(["git", "-C", str(RUNTIME), "fetch", "--quiet",
                        "--depth", "1", "origin", pin])
    if r.returncode != 0:
        fail("core fetch of pin %s failed" % pin)
    r = subprocess.run(["git", "-C", str(RUNTIME), "checkout",
                        "--quiet", "FETCH_HEAD"])
    if r.returncode != 0:
        fail("core checkout of pin %s failed" % pin)
    info("core checked out at %s (workspace root: %s)" % (pin[:12], RUNTIME))


def cmd_boot_cmd(cfg):
    if cfg.get("provision") == "managed":
        port = cfg.get("url", "http://127.0.0.1:18465").rsplit(":", 1)[-1]
        print("# managed launch (cwd resolves custom_nodes; weights via "
              "extra_model_paths; estate streams for input/output):")
        print("cd %s && %s/bin/python main.py \\\n"
              "  --listen 127.0.0.1 --port %s \\\n"
              "  --extra-model-paths-config extra_model_paths.yaml \\\n"
              "  --input-directory %s \\\n"
              "  --output-directory %s \\\n"
              "  --user-directory user"
              % (RUNTIME, RUNTIME / ".venv", port,
                 REPO / "data" / "input", REPO / "data" / "temp"))
    else:
        boot = cfg.get("boot_cmd", "").strip()
        if not boot:
            die("byo mode with no boot_cmd in the endpoint config — the "
                "user's instance is theirs; we only point at it")
        print("# byo launch (the user's own instance):")
        print(boot)


def cmd_verify(cfg):
    print("config:", DEFAULT_CONFIG.name)
    check("provision mode declared", cfg.get("provision") in ("byo", "managed"),
          repr(cfg.get("provision")))
    # model storage resolves FROM THE ROOT OF THE PROJECT
    # (inference.config.json via py/estate_config.py; endpoint keys
    # override only when set). Empty endpoint keys are a misconfig
    # (dies LOUD in bound_model_folders; reported here too).
    for k in ("model_base_path", "model_download_path"):
        raw = cfg.get(k)
        check("%s valid (unset → root config; never empty)" % k,
              raw is None or bool(str(raw).strip()), repr(raw))
    try:
        paths = estate_config.model_paths(
            "comfyui",
            endpoint_overrides={k: v for k, v in cfg.items()
                                if k in ("model_base_path",
                                         "model_download_path")
                                and str(v).strip()})
        check("model roots resolve (root config + overrides)",
              True,
              "read=%s download=%s" % (paths["read_root"],
                                       paths["download_root"]))
    except estate_config.RootConfigError as exc:
        check("model roots resolve (root config + overrides)",
              False, str(exc))
    try:
        url = estate_config.engine_url("comfyui", endpoint_override=cfg.get("url"))
        check("url resolves (endpoint → root engines.comfyui.url)",
              bool(url), repr(url))
    except estate_config.RootConfigError as exc:
        check("url resolves (endpoint → root engines.comfyui.url)",
              False, str(exc))
    if cfg.get("provision") == "managed":
        check("managed lock present", (COMFY_PROJECT / "uv.lock").is_file())
        r = subprocess.run(["uv", "lock", "--check", "--project",
                            str(COMFY_PROJECT)], capture_output=True, text=True)
        check("managed lock fresh (uv lock --check)", r.returncode == 0,
              r.stdout.strip()[:120])
    url = cfg.get("url", "").strip()
    if url:
        try:
            st, stats = _probe(url, "/system_stats")
            ver = (stats.get("system") or {}).get("comfyui_version", "?")
            check("instance live (/system_stats)", st == 200, str(stats)[:80])
            print("       comfyui_version:", ver)
        except Exception as e:
            check("instance live (/system_stats)", False, str(e)[:120])
        try:
            st, oi = _probe(url, "/object_info", timeout=20)
            check("object_info served", st == 200 and len(oi) > 100,
                  "status %s" % st)
        except Exception as e:
            check("object_info served", False, str(e)[:120])
    # management plane (the packages, in-process) — routing first:
    # managed mode points the spawns at THIS runtime's comfy-cli
    try:
        _managed_routing()
    except SystemExit:
        raise
    try:
        import comfy_mcp  # noqa: F401
        check("comfy-mcp importable (management env)", True)
        sms = need_comfy_mcp()
        try:
            rep = call(tool(sms, "server_info"))
            ws = rep.get("workspace")
            wpath = ws.get("path") if isinstance(ws, dict) else ws
            check("comfy-cli routing answers (server_info)", True)
            print("       workspace:", wpath, "| running:", rep.get("running"))
        except Exception as e:
            check("comfy-cli routing answers (server_info)", False, str(e)[:100])
    except SystemExit:
        check("comfy-mcp importable (base env)", False,
              "run via: uv sync (the base env carries comfy-mcp)")
    print()
    if FAILS:
        print("VERIFY REFUSED: %d failure(s): %s" % (len(FAILS), ", ".join(FAILS)))
        sys.exit(1)
    print("verify: healthy (compose-time requires gate enforces extensions "
          "per the EXTENSION LAW — this probe does not duplicate it)")


# ── extensions via comfy-mcp (in-process) + our vendor symlinks ─────

def load_manifest():
    """infra/extension_lane.py merges all plugin declarations — the SSOT,
    imported, not shelled."""
    spec = importlib.util.spec_from_file_location("extension_lane", LANE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.merge_all(str(REPO))


def link_in_tree(name: str, workspace: Path) -> str:
    """Vendor pack: vendor/comfyui_extensions/<name> -> custom_nodes link.

    Our authored packs are submodules under vendor/comfyui_extensions
    (EXTENSION LAW). Symlink preferred; copytree fallback for Windows
    without Developer Mode. Returns installed|skipped|failed.
    """
    target = workspace / "custom_nodes" / name
    if (target / "__init__.py").exists():
        return "skipped"
    src = REPO / "vendor" / "comfyui_extensions" / name
    if not (src / "__init__.py").is_file():
        warn("  [%s] vendor pack not checked out under vendor/comfyui_extensions "
             "(git submodule update --init)" % name)
        return "failed"
    if DRY:
        print("[dry-run] link %s <- %s" % (target, src))
        return "installed"
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.symlink(src, target, target_is_directory=True)
        info("  [%s] symlinked -> %s" % (name, src))
        return "installed"
    except OSError:
        shutil.copytree(src, target)
        warn("  [%s] symlink unavailable (Windows?) — COPIED" % name)
        return "installed"


def workspace_from_server_info(sms):
    """The workspace comfy-cli reports it is driving (informational —
    it may live in ANOTHER world: a container path, a remote host)."""
    rep = call(tool(sms, "server_info"))
    ws = rep.get("workspace")
    path = ws.get("path") if isinstance(ws, dict) else ws
    if not path:
        fail("comfy-cli reports no workspace — management routing is "
             "deployment config (COMFY_BIN / comfy set-default); "
             "provision cannot guess one")
    return Path(path)


def _same_world(workspace: Path, duty: str) -> bool:
    """Duties that touch the workspace FILESYSTEM (vendor symlinks,
    sha-verified model files) require the workspace to be WRITABLE from
    HERE — a same-named read-only path is another world's shadow, not
    ours. A container/remote workspace is provisioned from INSIDE its
    world (infra/comfyui/entrypoint.sh) or by deployment binds — never
    by guessing."""
    cn = workspace / "custom_nodes"
    try:
        cn.mkdir(parents=True, exist_ok=True)
        if os.access(cn, os.W_OK):
            return True
    except OSError:
        pass
    warn("  workspace %s is not writable from here (another world: "
         "container/remote) — %s is done from inside that world "
         "(entrypoint) or by deployment binds; refusing to guess"
         % (workspace, duty))
    return False


def step_extensions() -> bool:
    sms = need_comfy_mcp()
    exts = load_manifest()
    info("%d extensions declared" % len(exts))
    workspace = workspace_from_server_info(sms)
    vendor_world = _same_world(workspace, "vendor symlinking")
    install_node = tool(sms, "install_node")
    counts = {"installed": 0, "skipped": 0, "failed": 0, "blocked": 0}
    restart = False

    for e in exts:
        name = (e.get("name") or "").strip()
        reg = (e.get("registry") or "").strip()
        url = (e.get("url") or "").strip()
        if not name:
            continue
        # python deps the card declares for this extension — they ride
        # the SERVING runtime venv (nodes import them at load). Runs
        # FIRST: an already-cloned pack with unsatisfied deps is a
        # half-install; satisfied pins are no-ops.
        pipdeps = [str(p).strip() for p in (e.get("pip") or []) if str(p).strip()]
        if pipdeps:
            if DRY:
                print("[dry-run] pip install [%s]: %s" % (name, pipdeps))
            elif not _pip_install(pipdeps, workspace):
                counts["failed"] += 1
                continue
        if not reg and not url:                       # vendor pack (ours)
            if not vendor_world:
                counts["failed"] += 1
                continue
            counts[link_in_tree(name, workspace)] += 1
            continue
        if url and not reg:
            # URL-form (GitHub): cm_cli install handles GitHub extensions
            # directly (install_node's registry-only guard is bypassed by
            # driving the same engine comfy-cli uses). The URL is the
            # declaration; ComfyUI Manager owns acquisition.
            # cm_cli clones to a dir the Manager's registry metadata picks,
            # not `name`; the git remote is the authoritative match.
            if _url_installed(url, workspace):
                counts["skipped"] += 1
                info("  [%s] already in custom_nodes — skipping" % name)
                continue
            if DRY:
                print("[dry-run] install_node [%s] from url %r"
                      % (name, url))
                counts["installed"] += 1
                continue
            try:
                # cm-cli (underlying comfy-cli) handles GitHub URLs directly.
                # The comfy-mcp `install_node` wrapper refuses URLs; we call
                # the engine directly so the declaration (url in nodes.yaml)
                # actually reaches the install.
                rep = _cm_cli_install(url, workspace)
            except Exception as exc:
                warn("  [%s] cm_cli install raised: %s"
                     % (name, str(exc)[:160]))
                counts["failed"] += 1
                continue
            if rep.get("unsupported"):
                warn("  [%s] install_node unsupported: %s"
                     % (name, str(rep.get("error"))[:160]))
                counts["failed"] += 1
                continue
            if rep.get("failed"):
                warn("  [%s] failed packs: %s"
                     % (name, rep["failed"]))
                counts["failed"] += 1
                continue
            counts["installed"] += 1
            if rep.get("restart_required"):
                restart = True
            ref = (e.get("ref") or "").strip()
            if ref:
                info("  [%s] installed from url (declared ref %s — "
                     "install_node may pull a different ref; audit the "
                     "drift deliberately)" % (name, ref))
            continue

        # registry form: bare id (install_node refuses @pins too; the
        # declared version stays the RECORDED expectation, audited below)
        if (workspace / "custom_nodes" / reg.lower()).exists():
            # idempotence: already materialized — cm-cli re-clones into
            # the existing dir and fails (live-probed flip day)
            counts["skipped"] += 1
            info("  [%s] already in custom_nodes — skipping" % name)
            continue
        if DRY:
            print("[dry-run] install_node [%s] registry id %r" % (name, reg))
            counts["installed"] += 1
            continue
        try:
            rep = call(install_node, [reg], confirm_install=True)
        except Exception as exc:
            warn("  [%s] install_node raised: %s" % (name, str(exc)[:160]))
            counts["failed"] += 1
            continue
        if rep.get("unsupported"):
            warn("  [%s] install_node unsupported: %s"
                 % (name, str(rep.get("error"))[:160]))
            counts["failed"] += 1
            continue
        if rep.get("failed"):
            warn("  [%s] failed packs: %s" % (name, rep["failed"]))
            counts["failed"] += 1
            continue
        counts["installed"] += 1
        if rep.get("restart_required"):
            restart = True
        ver = str(e.get("version") or "").strip().strip('"')
        if ver:
            info("  [%s] installed (declaration records version %s — "
                 "install_node installs latest; audit the drift "
                 "deliberately)" % (name, ver))

    info("extensions: %d installed, %d skipped, %d failed, %d blocked"
         % (counts["installed"], counts["skipped"],
            counts["failed"], counts["blocked"]))
    if restart:
        info("restart required for new nodes (restart_comfyui is "
             "operator-invoked: comfy restart, or the stop/boot doors)")
    return counts["failed"] == 0 and counts["blocked"] == 0


# ── models via comfy-mcp (in-process) + our sha256 gate ─────────────

def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _cell_rows():
    """Every downloadable cell artifact the estate declares — the REAL
    declarations (pydantic rows in model.py, PYTHON SHAPE LAW), via the
    catalog's own scanner. The model.yaml-glob era was a fossil that
    matched nothing after the root reorganization (same class as the
    extension_lane bug; walled by tests)."""
    sys.path.insert(0, str(REPO / "py"))
    from melite_models import scan_engine_models
    for mid, (_path, cls) in sorted(scan_engine_models(REPO).items()):
        for variant in getattr(cls, "variants", ()) or ():
            for cell in getattr(variant, "cells", ()) or ():
                art = getattr(cell, "artifact", None)
                if art is None or not getattr(art, "source_url", ""):
                    continue
                yield mid, variant.id, cell.quant, art


def step_models() -> bool:
    sms = need_comfy_mcp()
    workspace = workspace_from_server_info(sms)
    if not _same_world(workspace, "sha-verified model downloads"):
        return False
    download_model = tool(sms, "download_model")
    download = tool(sms, "download")

    rows = list(_cell_rows())
    if not rows:
        info("no model.py cell artifacts declared")
        return True
    cfg = load_config(DEFAULT_CONFIG)
    bound = bound_model_folders(cfg)   # THE ONE derivation
    store_root = Path(bound["download_path"])
    ok, bad, skipped = 0, 0, 0
    for mid, vid, quant, art in rows:
        url = str(art.source_url)
        name = url.rsplit("/", 1)[-1].split("?")[0] or "%s_%s.safetensors" % (mid, vid)
        sub = (art.dest_sub or "").strip("/")
        # RULING (operator 2026-09-21): provisioning goes through
        # comfy-mcp/comfy-cli; dest_sub names the models folder
        # CATEGORY — comfy-cli places under models/<category>, the
        # instance's folder_paths/extra_model_paths decide where that
        # category really lives.
        rel = "models/%s" % sub if sub else "models"
        dest = workspace / rel / name           # comfy-cli lands here
        store = store_root / sub / name if sub else store_root / name
        if store.exists():
            skipped += 1
            continue
        info("  [model] %s/%s/%s -> %s/" % (mid, vid, quant, rel))
        if DRY:
            print("[dry-run] download_model %s -> %s/%s" % (url, rel, name))
            continue
        try:
            rep = call(download_model, url, relative_path=rel,
                       filename=name, wait=True, timeout_seconds=100.0)
            # big transfers outlive one waited call: poll the handle
            deadline = time.time() + 7200
            while isinstance(rep, dict) and rep.get("timed_out") \
                    and rep.get("download_id") and time.time() < deadline:
                rep = call(download, action="wait",
                           download_id=rep["download_id"],
                           timeout_seconds=3600.0)
            if not (isinstance(rep, dict) and rep.get("status") == "completed"):
                warn("  [model] %s: download did not complete: %s"
                     % (name, str(rep)[:160]))
                bad += 1
                continue
        except Exception as exc:
            warn("  [model] %s: download_model raised: %s" % (name, str(exc)[:160]))
            bad += 1
            continue
        want = (art.sha256 or "").strip().lower()
        verify_at = dest
        # THE POINTER TEST: with download pointers laid (cmd_paths),
        # dest resolves THROUGH the symlink onto the configured
        # store — same real file, nothing to move. Only a download
        # that landed on real runtime scratch (unpointered world,
        # e.g. a fresh workspace before its first `paths` run) moves.
        # The old `not dest.exists()` guard was dead code — dest
        # always exists right after a completed download.
        if store is not None and dest.exists() \
                and os.path.realpath(str(dest)) != str(store) \
                and store.parent.is_dir():
            # landed in runtime scratch; move to the weights store —
            # weights NEVER live in the runtime (extra_model_paths maps
            # the categories to the store)
            try:
                store.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(dest), str(store))
                verify_at = store
                info("  [model] %s: moved to the weights store" % name)
            except OSError as exc:
                warn("  [model] %s: move to store failed (%s); verifying "
                     "in place" % (name, exc))
        if want:
            got = sha256_of(verify_at).lower()
            if got != want:
                verify_at.unlink(missing_ok=True)
                warn("  [model] %s: sha256 mismatch — deleted" % name)
                bad += 1
                continue
        info("  [model] %s: verified" % name)
        ok += 1

    info("models: %d downloaded+verified, %d present, %d failed"
         % (ok, skipped, bad))
    return bad == 0


# ── agent harness home (server mount) ──────────────────────────────

def need_dsh_sdk():
    """The python client + bundled dsh runtime — loudly, with the fix."""
    try:
        import deepseek_harness  # noqa: F401
        from deepseek_harness_runtime import resolve_bundled_launch_args
        return resolve_bundled_launch_args
    except ImportError:
        fail("deepseek-harness-sdk is not importable — the base env "
             "carries it (uv sync); the bundled dsh runtime ships in "
             "the wheel: no Node.js and no pnpm are needed to SERVE")


def _dsh_materialize_profile(home: Path) -> Path:
    """Render the estate profile into the harness home.

    Generated state: absolute paths are legal HERE, never in the
    recipe. Idempotent — reruns re-render everything they own.
    """
    prof = home / "profiles" / DSH_PROFILE
    prof.mkdir(parents=True, exist_ok=True)
    # the home is GENERATED STATE and carries SECRETS (settings with
    # provider refs, .credentials.yaml with values) — it self-ignores,
    # independent of the repo's data/ patterns (never trust them).
    (home / ".gitignore").write_text("*\n")
    (prof / "package.json").write_text(json.dumps({
        "name": "dsh-profile-%s" % DSH_PROFILE,
        "private": True,
        "dependencies": {DSH_PROVISIONER_NAME: "link:%s" % DSH_PROVISIONER},
        "dsh": {"profile": {"bundles": list(DSH_PROFILE_BUNDLES)}},
    }, indent=2) + "\n")
    (prof / "pnpm-workspace.yaml").write_text(
        "packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n")
    (prof / "cordis.yml").write_text(
        "# dsh profile root — an empty entry list. The tree is composed as\n"
        "# patches: each bundle in package.json's dsh.profile.bundles, then\n"
        "# cordis.patch.yml, then any --patch overlays. GENERATED by\n"
        "# provision.py dsh — edit cordis.patch.yml, not this file.\n[]\n")
    (prof / "cordis.patch.yml").write_text(
        "# estate server profile patch — GENERATED by tools/provision.py dsh.\n"
        "# Per-machine rows live here BY DESIGN (materialized state, not\n"
        "# recipe): the skill root is absolute so tasks whose cwd sits\n"
        "# OUTSIDE the repo still load .dsh/skills (an in-repo cwd gets\n"
        "# them at rank 100 already, via project discovery). The five\n"
        "# web-surface rows are disabled: the SDK app has no webServer\n"
        "# service, and infer-tools registers its tools without one.\n"
        "- id: skill-filesystem\n"
        "  config:\n"
        "    includeDefaultRoots: true\n"
        "    customSkillDirs:\n"
        "      - '%s'\n"
        # INTERFACE LAW: the server mount is the HEADLESS agent —
        # config-pinned run doors (card_run / pipeline_run / run_status),
        # the delegated operator riding the same queue doors as the
        # editor's Run button. The GUI mount keeps browser mode (no row).
        "- id: infer-tools\n"
        "  config:\n"
        "    headless: true\n"
        "- id: infer-card-view-host\n"
        "  disabled: true\n"
        "- id: infer-card-view-client\n"
        "  disabled: true\n"
        "- id: infer-card-deck\n"
        "  disabled: true\n"
        "- id: infer-media\n"
        "  disabled: true\n"
        "- id: infer-gallery-host\n"
        "  disabled: true\n" % (REPO / ".dsh" / "skills"))
    # the provisioner installs through the OFFICIAL rail — pnpm, the
    # same one `dsh plugin add` and infer-provision use. Its five plugin
    # rows resolve BY PACKAGE NAME from link: deps back into this repo;
    # no absolute paths ever land in the profile rows. Serving needs
    # neither node nor pnpm — only provisioning does.
    r = subprocess.run(["pnpm", "install"], cwd=str(prof),
                       capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        print(r.stdout[-600:], file=sys.stderr)
        print(r.stderr[-600:], file=sys.stderr)
        fail("pnpm install failed in %s — the provisioner rail needs "
             "pnpm (`npm i -g pnpm` or `corepack enable`)" % prof)
    return prof


def cmd_dsh():
    """Materialize the harness home + estate profile, then PROVE the
    composition resolves through the bundled runtime (--dump-config:
    the full tree, no app boot, no model key needed)."""
    home = Path(os.environ.get("MELITE_DSH_HOME", str(DSH_HARNESS_HOME)))
    gui_home = Path.home() / ".dsh"
    if home.resolve() == gui_home.resolve():
        die("harness home must differ from the GUI home (%s) — isolation "
            "is the mount's whole point" % gui_home)
    if not (DSH_PROVISIONER / "cordis.patch.yml").is_file():
        fail("provisioner bundle missing: %s (tracked in-repo)"
             % DSH_PROVISIONER)
    resolve = need_dsh_sdk()
    prof = _dsh_materialize_profile(home)
    info("profile 'estate' -> %s" % prof)
    info("  bundles: %s" % ", ".join(DSH_PROFILE_BUNDLES))
    info("  provisioner installed via pnpm -> %s"
         % (prof / "node_modules" / DSH_PROVISIONER_NAME))
    # per-machine local layer: written ONCE, then owned by the operator
    local = home / "cordis.patch.yml"
    if not local.exists():
        local.parent.mkdir(parents=True, exist_ok=True)
        local.write_text(
            "# harness-home local patch (applies to every profile in this\n"
            "# home). WRITTEN ONCE by provision.py dsh — yours to edit\n"
            "# afterwards; reprovision never overwrites it. Provider/model\n"
            "# overrides, MCP bridges, and machine endpoints belong here —\n"
            "# NEVER in the shared bundle.\n[]\n")
        info("  local patch layer created (edit freely): %s" % local)
    # composition proof through the bundled runtime
    argv = [*resolve(), "--profile", DSH_PROFILE, "--dump-config"]
    env = {**os.environ, "DSH_HOME": str(home)}
    r = subprocess.run(argv, capture_output=True, text=True, env=env,
                       cwd=str(REPO), timeout=180)
    if r.returncode != 0:
        print(r.stdout[-800:], file=sys.stderr)
        print(r.stderr[-800:], file=sys.stderr)
        fail("estate profile failed to compose (--dump-config rc=%d)"
             % r.returncode)
    for needle in ("infer-tools", "dsh-sdk"):
        check("composed tree carries '%s'" % needle, needle in r.stdout)
    info("composition verified via bundled-runtime --dump-config "
         "(server mount ready; GUI home untouched)")


# ── main ────────────────────────────────────────────────────────────

def _managed_routing():
    """managed mode: comfy-mcp spawns must hit THIS runtime's comfy-cli
    and workspace (COMFY_BIN + COMFYUI_PATH env routing — the same
    deployment-glue mechanism, owned by config instead of a wrapper)."""
    try:
        cfg = load_config(DEFAULT_CONFIG)
    except Exception:
        return
    if cfg.get("provision") != "managed":
        return
    comfy_bin = RUNTIME / ".venv" / "bin" / "comfy"
    if not comfy_bin.is_file():
        fail("managed routing: %s missing — run `provision.py sync` "
             "first (the runtime venv carries the instance's comfy-cli)"
             % comfy_bin)
    os.environ["COMFY_BIN"] = str(comfy_bin)
    os.environ["COMFYUI_PATH"] = str(RUNTIME)
    # comfy-cli resolves the WORKSPACE python from VIRTUAL_ENV when
    # inherited — under `uv run` that is the MANAGEMENT venv, whose
    # python lacks cm_cli, and Manager detection flips to "none"
    # (live-probed flip day). Claim the runtime's own venv.
    os.environ["VIRTUAL_ENV"] = str(RUNTIME / ".venv")
    # comfy-cli routes by REGISTERED default workspace (comfy-mcp has
    # no per-call workspace hook); managed mode registers the runtime —
    # comfy-cli's own supported mechanism, idempotent. The operator's
    # PATH glue (docker exec into the serving container) never reads
    # this config, so container routing is untouched.
    subprocess.run([str(comfy_bin), "set-default", str(RUNTIME)],
                   capture_output=True, timeout=90)
    info("managed routing: COMFY_BIN=%s workspace=%s (set-default)"
         % (comfy_bin, RUNTIME))


def run_declarations(args) -> int:
    _managed_routing()
    rc = 0
    if args.cmd in ("all", "extensions"):
        rc |= 0 if step_extensions() else 1
    if args.cmd in ("all", "models"):
        rc |= 0 if step_models() else 1
    info("=" * 42)
    info("provision complete" if rc == 0 else "provision FINISHED WITH FAILURES")
    return rc


def cmd_manage(argv):
    """manual door of the ONE ComfyUI manager (py/manage.py — the SSOT;
    the AI door is POST /v1/manage → the comfy_manage DSH tool).

    usage: provision.py manage <action> [key=value ...] [positional…]
      provision.py manage status
      provision.py manage install-extension ComfyUI-KJNodes
      provision.py manage install-extension-url https://github.com/x/y
      provision.py manage provision-model z-image
      provision.py manage download-model url=... relative_path=models/x
      provision.py manage logs tail=80
      provision.py manage update target=all
    positional args map per-action: install_extension → nodes,
    provision_model → model, search_models → query, switch_version →
    version, install_extension_url → url.
    """
    import json as _json
    if not argv:
        print(__doc__ or "")
        print(cmd_manage.__doc__)
        return 1
    action = argv[0].replace("_", "-").replace("-", "_")
    body = {"action": action}
    positional = {
        "install_extension": "nodes", "provision_model": "model",
        "search_models": "query", "switch_version": "version",
        "install_extension_url": "url",
    }
    # single-value positionals (model/query/version/url) take ONE arg;
    # only install_extension is plural
    _plural = {"install_extension"}
    rest = argv[1:]
    if action in positional and rest and "=" not in rest[0]:
        body[positional[action]] = rest if action in _plural else rest[0]
        if positional[action] == "nodes" and isinstance(body["nodes"], list):
            pass                                    # already a list
        rest = []
    for kv in rest:
        if "=" not in kv:
            print("REFUSED: cannot parse %r (want key=value)" % kv)
            return 2
        k, v = kv.split("=", 1)
        try:
            body[k] = _json.loads(v)                 # numbers, lists, bools
        except _json.JSONDecodeError:
            body[k] = v
    if body.get("nodes") is not None and isinstance(body["nodes"], str):
        body["nodes"] = [body["nodes"]]
    body.setdefault("wait", True)                    # CLI blocks by default

    _py = str(Path(__file__).resolve().parent.parent / "py")
    if _py not in sys.path:
        sys.path.insert(0, _py)
    import manage as _mg
    code, rep = _mg.dispatch(body)
    print("[%d] %s: %s" % (code, rep.get("action"), rep.get("detail")))
    data = rep.get("data")
    if data is not None:
        print(_json.dumps(data, indent=2, default=str)[:4000])
    return 0 if rep.get("ok") else 1


def main():
    global DRY
    ap = argparse.ArgumentParser(
        description="inference.cpp provisioning — the ONE orchestrator "
                    "(management plane in-process; run via: uv run "
                    "python tools/provision.py …)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    for name, help_ in (("paths", "runtime layout + extra_model_paths.yaml"),
                        ("sync", "managed only: uv sync --frozen"),
                        ("boot-cmd", "print the exact launch for this mode"),
                        ("verify", "health probe: config, instance, routing")):
        s = sub.add_parser(name, help=help_)
        s.add_argument("config", nargs="?", default=str(DEFAULT_CONFIG),
                       help="endpoint config (default: the engine plugin's)")

    for name, help_ in (
            ("extensions", "install declared extensions (comfy-mcp in-process)"),
            ("models", "download declared models (comfy-mcp, sha-verified)"),
            ("all", "extensions + models")):
        s = sub.add_parser(name, help=help_)
        s.add_argument("--dry-run", action="store_true",
                       help="print the plan, change nothing")
    sub.add_parser("dsh", help="materialize the agent harness home + "
                               "estate server profile (recipe: dsh/)")
    mg = sub.add_parser(
        "manage", help="the ONE ComfyUI manager door (comfy-mcp + "
                       "comfyui-manager security=medium + comfy-cli, "
                       "in-process; see: provision.py manage --help)")
    mg.add_argument("rest", nargs=argparse.REMAINDER,
                    help="<action> [key=value ...]")
    args = ap.parse_args()

    if args.cmd == "dsh":
        cmd_dsh()
    elif args.cmd == "manage":
        sys.exit(cmd_manage(args.rest))
    elif args.cmd in ("paths", "sync", "boot-cmd", "verify"):
        cfg = load_config(args.config)
        {"paths": cmd_paths, "sync": cmd_sync,
         "boot-cmd": cmd_boot_cmd, "verify": cmd_verify}[args.cmd](cfg)
    else:
        DRY = args.dry_run
        sys.exit(run_declarations(args))


if __name__ == "__main__":
    main()
