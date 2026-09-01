#!/usr/bin/env python3
"""bootstrap.py — one path, one truth, every platform.

Cross-platform (Linux / macOS / Windows) bootstrap for inference.cpp.
Replaces the bash-only setup.sh body:

  server      cmake build of the C++ gateway (CUDA autodetected)
  extensions  comfy-cli `node install` from the plugin declarations,
              ref-pinned via git, patches + pip deps applied after
  models      comfy-cli `model download` from model.yaml provisions,
              sha256-verified after download

Provisioning engine: comfy-cli — the same engine comfy-mcp wraps. The
bootstrap calls the engine directly because it must run headless from a
fresh git clone with zero MCP client runtime; agent-driven interactive
provisioning goes through comfy-mcp instead (docs/comfyui/comfy-mcp.md).

Loud-fail law: no silent defaults. A missing ComfyUI workspace aborts with
instructions; a sha256 mismatch deletes the file and counts as failure.

Usage:
  python3 bootstrap.py                      # everything
  python3 bootstrap.py --server             # C++ server only
  python3 bootstrap.py --extensions         # ComfyUI extensions only
  python3 bootstrap.py --models             # model downloads only
  python3 bootstrap.py --dry-run            # print the plan, change nothing
  python3 bootstrap.py --comfyui-dir /opt/ComfyUI

Windows:  py bootstrap.py <flags>   (python 3.10+; cmake + git on PATH)
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


# ── step 1: C++ server ──────────────────────────────────────────────


def step_server() -> bool:
    info("building inference.cpp server (cmake)")
    cmake = shutil.which("cmake")
    if not cmake and not DRY:
        fail("cmake not found on PATH — install cmake first")
    cuda = shutil.which("nvcc") if not DRY else None
    flags = ["-DCMAKE_BUILD_TYPE=Release", "-DINFERENCE_BUILD_TESTS=ON"]
    if cuda or (not DRY and os.environ.get("INFERENCE_CUDA", "ON") != "OFF"
                and cuda_env()):
        flags.append("-DINFERENCE_CUDA=ON")
        info("  CUDA detected — GPU build")
    else:
        info("  CPU-only (set INFERENCE_CUDA=ON / put nvcc on PATH for GPU)")
    j = os.cpu_count() or 4
    r1 = sh([cmake or "cmake", "-B", "build", *flags], cwd=REPO)
    r2 = sh([cmake or "cmake", "--build", "build", "-j", str(j)], cwd=REPO,
            timeout=7200)
    return r1.returncode == 0 and r2.returncode == 0


# ── step 2: extensions via comfy-cli ────────────────────────────────


def load_extensions() -> list[dict]:
    """extension_lane.py merges all plugin declarations — the SSOT."""
    r = sh([sys.executable, str(REPO / "infra" / "extension_lane.py"),
            "--repo", str(REPO), "--format", "json"], timeout=120, force=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        fail(f"extension_lane.py failed:\n{(r.stderr or r.stdout)[-500:]}")


def patch_roots() -> list[Path]:
    roots = []
    if os.environ.get("INFERENCE_PATCHES"):
        roots.append(Path(os.environ["INFERENCE_PATCHES"]))
    roots += [REPO / "infra" / "patches", REPO / "patches"]
    return roots


def find_patch(rel: str) -> Path | None:
    for root in patch_roots():
        p = root / rel
        if p.is_file():
            return p
    return None


def link_in_tree(name: str, comfy_dir: Path) -> str:
    """In-tree pack: plugins/*/custom_nodes/<name> -> custom_nodes link.

    Symlink preferred (dev iterates on the checkout); copytree fallback for
    Windows without Developer Mode. Returns installed|skipped|failed.
    """
    target = comfy_dir / "custom_nodes" / name
    if (target / "__init__.py").exists():
        return "skipped"
    src = None
    for cand in glob.glob(str(REPO / "plugins" / "*" / "custom_nodes" / name)):
        if Path(cand, "__init__.py").is_file():
            src = Path(cand)
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


def step_extensions(comfy_dir: Path, comfy: Path) -> bool:
    exts = load_extensions()
    info(f"{len(exts)} extensions declared")
    counts = {"installed": 0, "skipped": 0, "failed": 0}
    env_cuda = cuda_env()
    env = dict(os.environ, **env_cuda) if env_cuda else None

    for e in exts:
        name, url, ref = e.get("name", ""), e.get("url", ""), e.get("ref", "")
        if not name:
            continue
        if not url:  # in-tree pack
            counts[link_in_tree(name, comfy_dir)] += 1
            continue

        target = comfy_dir / "custom_nodes" / name
        if (target / "__init__.py").exists():
            counts["skipped"] += 1
            continue

        r = sh([comfy, "node", "install", url], cwd=comfy_dir, env=env)
        if r.returncode != 0:
            counts["failed"] += 1
            continue
        counts["installed"] += 1

        # comfy-cli has no --ref: pin the declared commit ourselves
        if ref:
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

        # declared patch (may live in the ops repo — skip loudly if absent)
        rel = e.get("patches", "")
        if rel:
            p = find_patch(rel)
            if p:
                sh(["bash", str(p), str(target)], timeout=300)
            else:
                warn(f"  [{name}] patch '{rel}' not in any patch root "
                     f"({', '.join(str(r) for r in patch_roots())}) — skipped")

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
        fam = cfg.get("family") or {}
        for p in (fam.get("provisions") or cfg.get("provisions") or []):
            name, url = p.get("name", ""), p.get("url", "")
            if not name or not url:
                continue
            sub = ((p.get("dest") or {}).get("sub") or "").strip("/")
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
    global DRY
    ap = argparse.ArgumentParser(description="inference.cpp cross-platform bootstrap")
    ap.add_argument("--server", action="store_true", help="build the C++ server")
    ap.add_argument("--extensions", action="store_true", help="install ComfyUI extensions")
    ap.add_argument("--models", action="store_true", help="download declared models")
    ap.add_argument("--dry-run", action="store_true", help="print the plan, change nothing")
    ap.add_argument("--comfyui-dir", default=None, help="ComfyUI workspace path")
    args = ap.parse_args()
    DRY = args.dry_run

    do_all = not (args.server or args.extensions or args.models)
    do_server = args.server or do_all
    do_ext = args.extensions or do_all
    do_models = args.models or do_all

    rc = 0
    if do_server:
        rc |= 0 if step_server() else 1
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
