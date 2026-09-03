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

Management environment (deps: comfy-mcp only — the comfy binary is
deployment-provided):

  uv run --group management python tools/provision.py <command>

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
        fail("comfy-mcp is not importable — run the provisioning "
             "commands through the management env:\n"
             "  uv run --group management python tools/provision.py <command>"
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
""" % base)
    print("runtime layout + extra_model_paths.yaml → %s" % RUNTIME)


def cmd_sync(cfg):
    if cfg.get("provision") != "managed":
        die("provision=%r — BYO deployments never install a ComfyUI "
            "(the estate sits on top; verify instead)" % cfg.get("provision"))
    lock = COMFY_PROJECT / "uv.lock"
    if not lock.is_file():
        die("no uv.lock in infra/comfyui — run `uv lock` there first "
            "(the lock is the pinned truth, tracked in git)")
    cmd_paths(cfg)
    env = dict(os.environ)
    env["UV_PROJECT_ENVIRONMENT"] = str(RUNTIME / ".venv")
    r = subprocess.run(
        ["uv", "sync", "--frozen", "--project", str(COMFY_PROJECT)],
        cwd=str(REPO), env=env)
    sys.exit(r.returncode)


def cmd_boot_cmd(cfg):
    if cfg.get("provision") == "managed":
        port = cfg.get("url", "http://127.0.0.1:18465").rsplit(":", 1)[-1]
        print("# managed launch (cwd resolves custom_nodes; weights via "
              "extra_model_paths; estate streams for input/output):")
        print("cd %s && uv run --project %s --frozen python -m comfy \\\n"
              "  --listen 127.0.0.1 --port %s \\\n"
              "  --extra-model-paths-config extra_model_paths.yaml \\\n"
              "  --input-directory %s \\\n"
              "  --output-directory %s \\\n"
              "  --user-directory user"
              % (RUNTIME, COMFY_PROJECT, port,
                 REPO / "data" / "input", REPO / "data" / "temp"))
        print("# (if the core lacks the `comfy` module entry at this ref, "
              "substitute: python <git-checkout>/main.py)")
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
    # management plane (the packages, in-process)
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
        check("comfy-mcp importable (management env)", False,
              "run via: uv run --group management")
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
        if not reg and not url:                       # vendor pack (ours)
            if not vendor_world:
                counts["failed"] += 1
                continue
            counts[link_in_tree(name, workspace)] += 1
            continue
        if url and not reg:
            # install_node REFUSES git URLs by design — and the estate
            # ruled (2026-09-21) "we never git clone". This declaration
            # form is stranded until the pack publishes to the registry
            # or we vendor it: say so, loudly, and count it.
            warn("  [%s] url-form declaration BLOCKED — install_node "
                 "refuses git URLs (never-git-clone ruling); convert the "
                 "declaration to registry: <slug> (version recorded in "
                 "nodes.yaml) or vendor the pack in-tree" % name)
            counts["blocked"] += 1
            continue

        # registry form: bare id (install_node refuses @pins too; the
        # declared version stays the RECORDED expectation, audited below)
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


def _provisions():
    files = sorted(glob.glob(str(REPO / "plugins" / "*" / "models" / "**"
                                    / "model.yaml"), recursive=True))
    files += sorted(glob.glob(str(REPO / "plugins" / "*" / "*" / "models"
                                     / "**" / "model.yaml"), recursive=True))
    for mf in files:
        try:
            import yaml
            cfg = yaml.safe_load(Path(mf).read_text()) or {}
        except ImportError:
            fail("PyYAML required for models: pip install pyyaml")
        except Exception as exc:
            warn("skipping unreadable %s: %s" % (mf, exc))
            continue
        fam = cfg.get("family") if isinstance(cfg.get("family"), dict) else {}
        for p in (fam.get("provisions") or cfg.get("provisions") or []):
            yield p


def step_models() -> bool:
    sms = need_comfy_mcp()
    workspace = workspace_from_server_info(sms)
    if not _same_world(workspace, "sha-verified model downloads"):
        return False
    download_model = tool(sms, "download_model")
    download = tool(sms, "download")

    rows = [p for p in _provisions() if p.get("name") and p.get("url")]
    if not rows:
        info("no model.yaml provisions found")
        return True
    ok, bad, skipped = 0, 0, 0
    for p in rows:
        name, url = p["name"], p["url"]
        # RULING (operator 2026-09-21): provisioning goes through
        # comfy-mcp/comfy-cli; the folder: field names the models folder
        # CATEGORY — comfy-cli places under models/<folder>, the
        # instance's folder_paths/extra_model_paths decide where that
        # category really lives.
        folder = (p.get("folder") or "").strip("/")
        sub = folder or ((p.get("dest") or {}).get("sub") or "").strip("/")
        rel = "models/%s" % sub if sub else "models"
        dest = workspace / rel / name
        if dest.exists():
            skipped += 1
            continue
        info("  [model] %s -> %s/" % (name, rel))
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
        want = (p.get("sha256") or "").strip().lower()
        if want:
            got = sha256_of(dest).lower()
            if got != want:
                dest.unlink(missing_ok=True)
                warn("  [model] %s: sha256 mismatch — deleted" % name)
                bad += 1
                continue
        info("  [model] %s: verified" % name)
        ok += 1

    info("models: %d downloaded+verified, %d present, %d failed"
         % (ok, skipped, bad))
    return bad == 0


# ── main ────────────────────────────────────────────────────────────

def run_declarations(args) -> int:
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
                    "--group management python tools/provision.py …)")
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
