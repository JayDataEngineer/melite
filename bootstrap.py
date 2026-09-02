#!/usr/bin/env python3
"""bootstrap.py — one path, one truth, every platform.

Cross-platform (Linux / macOS / Windows) bootstrap for inference.cpp.

  extensions  comfy-cli `node install` from the plugin declarations,
              ref-pinned via git, pip deps applied after
  models      comfy-cli `model download` from model.yaml provisions,
              sha256-verified after download

(2026-09-02 python flip) the C++ server build step is RETIRED — the
gateway is py/gateway.py, stdlib-only, no build step. Provisioning of
the ComfyUI workspace (extensions + models) is unchanged.

Provisioning engine: comfy-cli — the same engine comfy-mcp wraps. The
bootstrap calls the engine directly because it must run headless from a
fresh git clone with zero MCP client runtime; agent-driven interactive
provisioning goes through comfy-mcp instead (docs/comfyui/comfy-mcp.md).

Loud-fail law: no silent defaults. A missing ComfyUI workspace aborts with
instructions; a sha256 mismatch deletes the file and counts as failure.

Usage:
  python3 bootstrap.py                      # extensions + models
  python3 bootstrap.py --extensions         # ComfyUI extensions only
  python3 bootstrap.py --models             # model downloads only
  python3 bootstrap.py --dry-run            # print the plan, change nothing
  python3 bootstrap.py --comfyui-dir /opt/ComfyUI

Windows:  py bootstrap.py <flags>   (python 3.10+; git on PATH)
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
IS_WIN = os.name == "nt"
DRY = False

# ── output helpers ──────────────────────────────────────────────────


def info(msg: str) -> None:
    print(f"[bootstrap] {msg}", flush=True)


def warn(msg: str) -> None:
    print(f"[bootstrap] WARN: {msg}", flush=True)


def fail(msg: str) -> None:
    print(f"[bootstrap] FATAL: {msg}", file=sys.stderr, flush=True)
    sys.exit(1)


def sh(cmd: list[str], cwd: str | Path | None = None,
        env: dict | None = None, timeout: int = 900,
        force: bool = False) -> subprocess.CompletedProcess:
    """Run a command (list form, never shell=True).

    Dry-run prints only — unless force=True for read-only commands whose
    output the plan itself needs (e.g. the extension_lane manifest).
    """
    pretty = " ".join(str(c) for c in cmd) + (f"  (cwd={cwd})" if cwd else "")
    if DRY and not force:
        print(f"[dry-run] {pretty}")
        return subprocess.CompletedProcess(cmd, 0, "", "")
    try:
        r = subprocess.run([str(c) for c in cmd], cwd=str(cwd) if cwd else None,
                           env=env, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        return subprocess.CompletedProcess(cmd, 127, "", f"not found: {cmd[0]}")
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(cmd, 124, "", f"timeout after {timeout}s")
    if r.returncode != 0:
        tail = (r.stderr or r.stdout or "")[-400:]
        warn(f"command failed ({r.returncode}): {pretty}\n{tail}")
    return r


# ── environment resolution (no silent defaults) ─────────────────────


def venv_python(comfy_dir: Path) -> Path | None:
    for c in (".venv/bin/python", ".venv/Scripts/python.exe",
              "venv/bin/python", "venv/Scripts/python.exe"):
        p = comfy_dir / c
        if p.is_file():
            return p
    return None


def find_comfy(comfy_dir: Path) -> Path | None:
    for c in (".venv/bin/comfy", ".venv/Scripts/comfy.exe",
              "venv/bin/comfy", "venv/Scripts/comfy.exe"):
        p = comfy_dir / c
        if p.is_file():
            return p
    return Path(shutil.which("comfy")) if shutil.which("comfy") else None


def resolve_comfy_dir(flag: str | None) -> Path:
    """--comfyui-dir > COMFYUI_DIR > comfy-cli's registered workspace > loud fail."""
    if flag:
        p = Path(flag).resolve()
        if not p.is_dir():
            fail(f"--comfyui-dir {flag} is not a directory")
        return p
    env = os.environ.get("COMFYUI_DIR")
    if env:
        p = Path(env).resolve()
        if not p.is_dir():
            fail(f"COMFYUI_DIR={env} is not a directory")
        return p
    comfy = find_comfy(Path(".")) or shutil.which("comfy")
    if comfy:
        r = sh([comfy, "--json", "env"], timeout=60)
        try:
            d = json.loads(r.stdout)["data"]
            for k in (d.get("workspace", {}).get("path"),
                      d.get("config", {}).get("recent_workspace"),
                      d.get("config", {}).get("default_workspace")):
                if k and Path(k).is_dir():
                    info(f"ComfyUI workspace discovered via comfy-cli: {k}")
                    return Path(k)
        except Exception:
            pass
    fail("No ComfyUI workspace found. Fix one of:\n"
         "  1. export COMFYUI_DIR=/path/to/ComfyUI\n"
         "  2. comfy set-default /path/to/ComfyUI   (registers with comfy-cli)\n"
         "  3. python3 bootstrap.py --comfyui-dir /path/to/ComfyUI\n"
         "No ComfyUI yet? Install one: pip install comfy-cli && comfy install")


def ensure_comfy_cli(comfy_dir: Path) -> Path:
    comfy = find_comfy(comfy_dir)
    if comfy:
        return comfy
    vpy = venv_python(comfy_dir)
    if not vpy:
        fail(f"no comfy-cli and no venv python in {comfy_dir} — "
             "install comfy-cli first: pip install comfy-cli")
    info("comfy-cli missing — installing into the ComfyUI venv")
    r = sh([vpy, "-m", "pip", "install", "-q", "comfy-cli"], timeout=300)
    if r.returncode != 0 and not DRY:
        fail("comfy-cli installation failed")
    return find_comfy(comfy_dir) or fail("comfy-cli still not found after install")


def cuda_env() -> dict | None:
    """nvcc on PATH wins; else common Linux toolkit prefixes. None = no CUDA."""
    if os.environ.get("INFERENCE_CUDA", "ON") == "OFF":
        return None
    if shutil.which("nvcc"):
        return None  # already on PATH, nothing to inject
    for d in ("/usr/local/cuda-13", "/usr/local/cuda-12.8",
              "/usr/local/cuda-12", "/usr/local/cuda"):
        if Path(d, "bin", "nvcc").is_file():
            e = dict(os.environ)
            e["PATH"] = f"{d}/bin:" + e.get("PATH", "")
            e["CUDA_HOME"] = d
            return e
    return None


# ── step 1 (RETIRED 2026-09-02): C++ server ─────────────────────────
# The gateway is py/gateway.py — stdlib-only, no cmake, no build step.


# ── step 2: extensions via comfy-cli ────────────────────────────────


def load_extensions() -> list[dict]:
    """extension_lane.py merges all plugin declarations — the SSOT.
    The merger ALWAYS runs from THIS repo (it is the one implementation);
    --repo redirects only which declarations get merged (e.g. ray's)."""
    merger = Path(__file__).resolve().parent / "infra" / "extension_lane.py"
    r = sh([sys.executable, str(merger),
            "--repo", str(REPO), "--format", "json"], timeout=120, force=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        fail(f"extension_lane.py failed:\n{(r.stderr or r.stdout)[-500:]}")


def link_in_tree(name: str, comfy_dir: Path) -> str:
    """In-tree pack: plugins/*/custom_nodes/<name> -> custom_nodes link.

    Symlink preferred (dev iterates on the checkout); copytree fallback for
    Windows without Developer Mode. Returns installed|skipped|failed.
    """
    target = comfy_dir / "custom_nodes" / name
    if (target / "__init__.py").exists():
        return "skipped"
    src = None
    # repo-root custom_nodes/<name> (ray layout) then plugins/*/custom_nodes
    for pattern in (str(REPO / "custom_nodes" / name),
                    str(REPO / "plugins" / "*" / "custom_nodes" / name)):
        for cand in glob.glob(pattern):
            if Path(cand, "__init__.py").is_file():
                src = Path(cand)
                break
        if src:
            break
    if not src:
        warn(f"  [{name}] in-tree pack not found under plugins/*/custom_nodes")
        return "failed"
    if DRY:
        print(f"[dry-run] link {target} <- {src}")
        return "installed"
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.symlink(src, target, target_is_directory=True)
        info(f"  [{name}] symlinked -> {src}")
        return "installed"
    except OSError:
        shutil.copytree(src, target)
        warn(f"  [{name}] symlink unavailable (Windows?) — COPIED; "
             "re-run bootstrap after editing the checkout")
        return "installed"


def url_dirname(url: str) -> str:
    """Directory name comfy-cli/ComfyUI-Manager derives from a git URL."""
    base = url.rstrip("/").split("/")[-1]
    return base[:-4] if base.endswith(".git") else base


def ext_installed_dir(comfy_dir: Path, name: str, url: str) -> Path | None:
    """Installed check tolerates the THREE layouts: declared name, git
    repo dirname, and the registry slug comfy-cli/Manager derives
    (lowercase-dashed, e.g. comfyui-h3-motion-context)."""
    slug = url_dirname(url).lower().replace("_", "-")
    for cand in dict.fromkeys([name, url_dirname(url), slug]):
        d = comfy_dir / "custom_nodes" / cand
        if (d / "__init__.py").exists():
            return d
    return None


def step_extensions(comfy_dir: Path, comfy: Path) -> bool:
    exts = load_extensions()
    info(f"{len(exts)} extensions declared")
    counts = {"installed": 0, "skipped": 0, "failed": 0}
    env_cuda = cuda_env()
    env = dict(os.environ, **env_cuda) if env_cuda else None

    for e in exts:
        name = e.get("name", "")
        url, ref = e.get("url", ""), e.get("ref", "")
        # RULING (operator 2026-09-21): "We never git clone. If more
        # features are to be added it is the comfyui-mcp extension install
        # tool." Preferred declaration form is a Comfy Registry id
        # (registry: <slug>) installed via the same comfy node install
        # verb comfy-mcp's install_node wraps. url+ref is the legacy
        # transitional form (third-party packs not yet on the registry).
        reg = (e.get("registry") or "").strip()
        pver = str(e.get("version") or "").strip().strip('"')
        if not name:
            continue
        if not url and not reg:  # in-tree pack
            counts[link_in_tree(name, comfy_dir)] += 1
            continue

        if reg:
            # MANAGER LAW (probed in-instance 2026-09-21): a BARE registry id
            # resolves to version 'unknown' = Manager's GIT pseudo-version —
            # comfy node install <id> silently git-clones. The registry ZIP
            # rail (ruling 4: never git clone) is only taken with an explicit
            # pin: install <id>@<version>. Versionless registry entries are
            # rejected loudly here.
            if not pver:
                warn(f"  [{name}] registry entry without version: refuses "
                     f"(bare id installs git flavor) — add version: or use url+ref")
                counts["failed"] += 1
                continue
            install_arg = f"{reg}@{pver}"
        else:
            install_arg = url
        installed = ext_installed_dir(comfy_dir, name, url or reg)
        if installed:
            counts["skipped"] += 1
            continue

        r = sh([comfy, "node", "install", install_arg], cwd=comfy_dir, env=env)
        if r.returncode != 0:
            counts["failed"] += 1
            continue
        counts["installed"] += 1
        target = ext_installed_dir(comfy_dir, name, url) \
            or comfy_dir / "custom_nodes" / name

        # comfy-cli has no --ref: pin the declared commit ourselves.
        # Registry installs pin by published version instead (record the
        # expected version in the declaration; never git-pin a registry pack).
        if ref and url and not reg:
            sh(["git", "-C", str(target), "fetch", "--depth", "1",
                "origin", ref], timeout=300)
            rp = sh(["git", "-C", str(target), "checkout", ref], timeout=120)
            if rp.returncode == 0:
                info(f"  [{name}] pinned to {ref[:12]}")
            else:
                warn(f"  [{name}] could not pin ref {ref[:12]}")

        # re-run install.py with CUDA env (packs building extensions need nvcc)
        ipy = target / "install.py"
        if ipy.is_file():
            vpy = venv_python(comfy_dir)
            if vpy:
                sh([vpy, str(ipy)], cwd=target, env=env, timeout=900)

        for dep in e.get("pip", []) or []:
            vpy = venv_python(comfy_dir)
            if vpy and dep:
                sh([vpy, "-m", "pip", "install", "-q", dep], timeout=600)

    info(f"extensions: {counts['installed']} installed, "
         f"{counts['skipped']} skipped, {counts['failed']} failed")
    return counts["failed"] == 0


# ── step 3: models via comfy-cli + sha256 ───────────────────────────


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def step_models(comfy_dir: Path, comfy: Path) -> bool:
    files = sorted(glob.glob(str(REPO / "plugins" / "*" / "models" / "**"
                                   / "model.yaml"), recursive=True))
    if not files:
        info("no model.yaml provisions found")
        return True
    try:
        import yaml  # noqa: F401
    except ImportError:
        fail("PyYAML required for --models: pip install pyyaml")

    ok, bad, skipped = 0, 0, 0
    for mf in files:
        import yaml
        cfg = yaml.safe_load(Path(mf).read_text()) or {}
        # family: may be a string alias (several lanes) — provisions only
        # ride a dict form; tolerate both, never crash the sweep.
        fam = cfg.get("family") if isinstance(cfg.get("family"), dict) else {}
        for p in (fam.get("provisions") or cfg.get("provisions") or []):
            name, url = p.get("name", ""), p.get("url", "")
            if not name or not url:
                continue
            # RULING (operator 2026-09-21): model provisioning goes through
            # comfy-mcp/comfy-cli; the RESOLUTION of the model location is
            # handled by ComfyUI, not us. The folder: field names the models
            # folder CATEGORY (e.g. diffusion_models); comfy-cli places under
            # models/<folder> and ComfyUI's folder_paths/extra_model_paths
            # decide where that category really lives. dest{root,sub} is the
            # legacy spelling, still honored during migration.
            folder = (p.get("folder") or "").strip("/")
            sub = folder or ((p.get("dest") or {}).get("sub") or "").strip("/")
            dest = comfy_dir / "models" / sub / name if sub \
                else comfy_dir / "models" / name
            if dest.exists():
                skipped += 1
                continue
            info(f"  [model] {name} -> models/{sub}/")
            r = sh([comfy, "model", "download", "--url", url,
                    "--relative-path", f"models/{sub}" if sub else "models",
                    "--filename", name],
                   cwd=comfy_dir, timeout=7200)
            if r.returncode != 0 or DRY:
                if not DRY:
                    bad += 1
                continue
            want = p.get("sha256", "")
            if want:
                got = sha256_of(dest)
                if got != want:
                    dest.unlink(missing_ok=True)
                    warn(f"  [model] {name}: sha256 mismatch — deleted")
                    bad += 1
                    continue
            info(f"  [model] {name}: verified")
            ok += 1

    info(f"models: {ok} downloaded+verified, {skipped} present, {bad} failed")
    return bad == 0


# ── main ────────────────────────────────────────────────────────────


def main() -> int:
    global DRY, REPO
    ap = argparse.ArgumentParser(description="inference.cpp cross-platform bootstrap")
    ap.add_argument("--extensions", action="store_true", help="install ComfyUI extensions")
    ap.add_argument("--models", action="store_true", help="download declared models")
    ap.add_argument("--dry-run", action="store_true", help="print the plan, change nothing")
    ap.add_argument("--comfyui-dir", default=None, help="ComfyUI workspace path")
    ap.add_argument("--repo", default=None,
                    help="declarations repo (default: this checkout). Other "
                         "repos (e.g. ray) delegate their provisioning here.")
    args = ap.parse_args()
    DRY = args.dry_run

    if args.repo:
        REPO = Path(args.repo).resolve()

    do_all = not (args.extensions or args.models)
    do_ext = args.extensions or do_all
    do_models = args.models or do_all

    rc = 0
    comfy_dir = comfy = None
    if do_ext or do_models:
        comfy_dir = resolve_comfy_dir(args.comfyui_dir)
        comfy = ensure_comfy_cli(comfy_dir)
        info(f"workspace: {comfy_dir}\ncomfy-cli: {comfy}")
    if do_ext and comfy_dir:
        rc |= 0 if step_extensions(comfy_dir, comfy) else 1
    if do_models and comfy_dir:
        rc |= 0 if step_models(comfy_dir, comfy) else 1

    info("=" * 42)
    info("bootstrap complete" if rc == 0 else "bootstrap FINISHED WITH FAILURES")
    info("run hints:")
    info("  ComfyUI: comfy launch -- --listen 127.0.0.1 --port 18465")
    info("  Gateway: see docs/comfyui/setup.md (boot chain is operator-owned)")
    return rc


if __name__ == "__main__":
    sys.exit(main())
