"""provision_rail.py — the gateway's ON-DEMAND acquisition rail.

A model-declared Provision (melite_models grammar) whose file is not
on the mount yet is fetched THROUGH THE ONE RAIL (PROVISIONING LAW:
comfy-mcp/comfy-cli — never a second acquisition mechanism), sha256-
verified, landed in the weights store, and returned. The provision
door (py/gateway.py _h_model_provision) calls this when the disk
read misses; tools/provision.py's step_models walk pre-fetches the
same rows at provisioning time (the two meet at the same sha-pinned
bytes on the same mount path).

The rail mechanics mirror tools/provision.py's _managed_routing +
_fetch_verified (managed routing env, comfy set-default registration,
polled download, pointer-test move to the store, sha verify). Rung-6
debt, named here: the derivation is RESTATEd in two files — converge
the provisioner onto this module on its next touch (the same
honest-debt note the anny model carries for compose.py's
_BASE_BODY_NAME).

Laws kept:
  PROVISIONING LAW — downloads ride comfy-mcp's download_model
  (comfy-cli `model download --background`) in-process; the managed
  runtime env (COMFY_BIN/COMFYUI_PATH/VIRTUAL_ENV) is derived from
  the deployment's fixed managed path, never configured ad hoc.
  PYTHON SHAPE LAW rung 4 — a Provision is all-or-nothing: url
  + sha256 + size; a row without a sha never lands silently
  (ValueError at fetch time — step_models refuses the same rows
  at walk time).
  RESILIENCE LAW — every failure raises ProvisionRailError with the
  EXACT upstream reason; the caller serves a loud 502 and the
  gateway lives. No code path here touches the run queue (this is
  the management plane, not inference — the base-body precedent).
"""

from __future__ import annotations

import asyncio
import hashlib
import inspect
import os
import shutil
import subprocess
from pathlib import Path

# Rail args ride tool boundaries as decoded JSON (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

REPO = Path(__file__).resolve().parent.parent
RUNTIME = REPO / "data" / "runtime" / "comfyui"

# per-process routing state: the comfy-cli default-workspace
# registration is idempotent but not free — do it once.
_ROUTED = False


class ProvisionRailError(RuntimeError):
    """A loud, teachable rail failure (the door serves it as 502)."""


def _sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _managed_routing() -> None:
    """The managed-mode env + default-workspace registration (the
    provisioner's own _managed_routing, verbatim semantics): COMFY_BIN
    points at the runtime venv's comfy-cli, COMFYUI_PATH at the
    runtime, VIRTUAL_ENV claims the runtime's venv (comfy-cli resolves
    the workspace python from it), and `comfy set-default` registers
    the workspace — comfy-cli's own supported mechanism, idempotent."""
    global _ROUTED
    if _ROUTED:
        return
    comfy_bin = RUNTIME / ".venv" / "bin" / "comfy"
    if not comfy_bin.is_file():
        raise ProvisionRailError(
            "managed runtime missing (%s) — run `uv run python "
            "tools/provision.py sync` first (the runtime venv carries "
            "the instance's comfy-cli)" % comfy_bin)
    os.environ["COMFY_BIN"] = str(comfy_bin)
    os.environ["COMFYUI_PATH"] = str(RUNTIME)
    os.environ["VIRTUAL_ENV"] = str(RUNTIME / ".venv")
    try:
        subprocess.run([str(comfy_bin), "set-default", str(RUNTIME)],
                       capture_output=True, timeout=90, check=False)
    except (OSError, subprocess.SubprocessError) as e:
        raise ProvisionRailError(
            "comfy set-default registration failed: %s" % e) from e
    _ROUTED = True


def _call_tool(name: str, *args: JsonValue, **kwargs: JsonValue) -> JsonValue:
    """One comfy-mcp tool invoked as a plain function. The gateway
    handler is async — a coroutine tool is awaited INSIDE this helper
    (callers run us in a worker thread; see the door)."""
    try:
        import comfy_mcp.server as sms
    except ImportError as e:
        raise ProvisionRailError(
            "comfy-mcp is not importable in the gateway env (the base "
            "env carries it — uv sync; the service unit must run the "
            "base env python): %s" % e) from e
    fn = getattr(sms, name, None)
    if fn is None:
        raise ProvisionRailError("comfy-mcp tool %r not found" % name)
    fn = getattr(fn, "fn", fn)          # unwrap the @mcp.tool shell
    r = fn(*args, **kwargs)
    if inspect.iscoroutine(r):
        r = asyncio.run(r)
    return r


def fetch_provision(url: str, name: str, sub: str,
                    sha256: str, store_root: Path,
                    workspace: Path = RUNTIME,
                    budget_s: float = 300.0) -> Path:
    """Download one provision through the rail, verify, land in the
    store, return the landed path. SERIAL per process (the caller
    holds the per-provision lock); big transfers may outlive the
    budget — the comfy-cli worker keeps going server-side, so the
    next demand finds it (poll again), never re-starts it blind.

    sha256 is REQUIRED (an unverifiable row never lands — the same
    refusal step_models makes at walk time)."""
    want = (sha256 or "").strip().lower()
    if not want:
        raise ProvisionRailError(
            "provision %r declares no sha256 — unverifiable bytes "
            "never land (declare the row, never guess it)" % name)
    _managed_routing()
    rel = "models/%s" % sub if sub else "models"
    dest = workspace / rel / name            # comfy-cli lands here
    store = store_root / sub / name if sub else store_root / name
    if store.is_file() and _sha256_of(store) == want:
        return store                          # raced in — already ours

    rep = _call_tool("download_model", url, relative_path=rel,
                     filename=name, wait=True, timeout_seconds=100.0)
    deadline = budget_s
    waited = 0.0
    while isinstance(rep, dict) and rep.get("timed_out") \
            and rep.get("download_id") and waited < deadline:
        rep = _call_tool("download", action="wait",
                         download_id=rep["download_id"],
                         timeout_seconds=60.0)
        waited += 60.0
    if not (isinstance(rep, dict) and rep.get("status") == "completed"):
        raise ProvisionRailError(
            "download_model did not complete for %r: %s (the worker "
            "may still be running — retry, or provision manually: uv "
            "run python tools/provision.py models)"
            % (name, str(rep)[:160]))

    # THE POINTER TEST (the provisioner's shape, first-folder fix):
    # with download pointers laid, dest resolves THROUGH the symlink
    # onto the store — nothing to move. Otherwise the download landed
    # on runtime scratch and MOVES: weights never live in the runtime.
    # The guard is the STORE ROOT (the declared download place) — a
    # first-time subfolder (somaskel77/) is created by the move
    # itself, never a reason to leave bytes in the runtime.
    verify_at = dest
    if dest.is_file() and os.path.realpath(str(dest)) != str(store) \
            and store_root.is_dir():
        store.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(dest), str(store))
        verify_at = store
    got = _sha256_of(verify_at).lower() if verify_at.is_file() else ""
    if got != want:
        verify_at.unlink(missing_ok=True)
        raise ProvisionRailError(
            "sha256 mismatch for %r — deleted (declared %s, got %s)"
            % (name, want[:16], got[:16] or "nothing"))
    return verify_at
