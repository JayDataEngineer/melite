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


def cmd_paths(cfg):
    """Runtime layout + extra_model_paths.yaml (weights NEVER move:
    the yaml points at the deployment's persistent storage)."""
    base = cfg.get("model_base_path", "").strip()
    if not base:
        die("model_base_path missing from the endpoint config — weights "
            "location is deployment config, never guessed (QUEUE LANE LAW)")
    (RUNTIME / "custom_nodes").mkdir(parents=True, exist_ok=True)
    (RUNTIME / "user").mkdir(parents=True, exist_ok=True)
    yaml = RUNTIME / "extra_model_paths.yaml"
    extra = []
    for cat, sub in sorted((cfg.get("extra_model_folders") or {}).items()):
        cat = str(cat).strip()
        sub = str(sub).strip("/")
        if cat and sub:
            extra.append("  %s: %s" % (cat, sub))
    yaml.write_text("""# generated by tools/provision.py paths — DO NOT hand-edit
# (source of truth: comfyui_endpoint.json model_base_path)
melite_weights:
  base_path: %s
  checkpoints: checkpoints
  clip: clip
  clip_vision: clip_vision
  controlnet: controlnet
  diffusion_models: diffusion_models
  loras: loras
  unet: unet
  vae: vae
  upscale_models: upscale_models
  background_removal: background_removal
""" % base)
    # pack-declared categories (e.g. audiocpp) — the endpoint config
    # owns the mapping; the orchestrator stays generic (PLUGIN
    # ARCHITECTURE LAW: no pack names in the core)
    if extra:
        with open(yaml, "a") as f:
            f.write("  # pack-declared categories (extra_model_folders)\n")
            f.write("\n".join(extra) + "\n")
    print("runtime layout + extra_model_paths.yaml → %s" % RUNTIME)


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
    check("model_base_path present",
          bool(cfg.get("model_base_path", "").strip()))
    check("url present", bool(cfg.get("url", "").strip()))
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
    base = (cfg.get("model_base_path") or "").strip()
    if not base:
        fail("model_base_path missing from the endpoint config — cell "
             "artifacts root there (dest_root=COMFYUI_ROOT)")
    store_root = Path(base)
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
        if store is not None and not dest.exists() and store.parent.is_dir():
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
    args = ap.parse_args()

    if args.cmd in ("paths", "sync", "boot-cmd", "verify"):
        cfg = load_config(args.config)
        {"paths": cmd_paths, "sync": cmd_sync,
         "boot-cmd": cmd_boot_cmd, "verify": cmd_verify}[args.cmd](cfg)
    else:
        DRY = args.dry_run
        sys.exit(run_declarations(args))


if __name__ == "__main__":
    main()
