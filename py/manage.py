"""manage.py — the ONE ComfyUI manager SSOT (2026-09-03).

Operator order: wrap comfyui-manager (security=medium), comfy-cli, and
comfy-mcp into ONE streamlined manager with TWO doors — manual
(tools/provision.py manage …) and AI (POST /v1/manage → the comfy_manage
DSH tool). Management is python packages in-process, never shell
wrapping (PROVISIONING LAW); no action runs inference (INFERENCE LAW) —
lifecycle actions that would kill a live GPU job scan the run sidecars
first and refuse while anything reads running/queued.

PYTHON SHAPE: Action is a closed enum; the request envelope is frozen
pydantic; validation happens at construction. Response discipline is
one shape everywhere: {action, ok, detail, data}.
"""

from __future__ import annotations

import asyncio
import inspect
import json
import os
import re
import subprocess
import sys
from enum import Enum
from pathlib import Path
from types import ModuleType
from typing import Any, Callable, Optional

# The management-plane shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

from pydantic import BaseModel, ConfigDict, Field

REPO = Path(__file__).resolve().parent.parent
STATE_RUNS = REPO / "data" / "runs" / "output"
DEFAULT_CONFIG = (REPO / "plugins" / "engines" / "comfyui" /
                    "data" / "comfyui_endpoint.json")
RUNTIME = REPO / "data" / "runtime" / "comfyui"

# ---------------------------------------------------------------- shape


class Action(str, Enum):
    """Closed vocabulary — a typo is a 422, not a silent miss."""

    # reads
    STATUS = "status"
    LOGS = "logs"
    SEARCH_MODELS = "search_models"
    LIST_EXTENSIONS = "list_extensions"     # cm_cli simple-show installed
    SNAPSHOT_LIST = "snapshot_list"         # cm_cli show snapshot-list
    # installs
    INSTALL_EXTENSION = "install_extension"
    INSTALL_EXTENSION_URL = "install_extension_url"
    DOWNLOAD_MODEL = "download_model"
    PROVISION_MODEL = "provision_model"
    # lifecycle
    RESTART = "restart"
    STOP = "stop"
    LAUNCH = "launch"
    UPDATE = "update"
    SWITCH_VERSION = "switch_version"
    FREE = "free"
    # snapshots (cm_cli rail): save reads state; RESTORE rewrites the
    # extension tree + pip deps — it is lifecycle-guarded below
    SNAPSHOT_SAVE = "snapshot_save"
    SNAPSHOT_RESTORE = "snapshot_restore"


# lifecycle actions that would kill a live GPU job — guarded (INFERENCE
# LAW: management never manufactures zombie runs; the stop DOOR is the
# sanctioned way a run dies)
LIFECYCLE_GUARDED = {
    Action.RESTART, Action.STOP, Action.SWITCH_VERSION, Action.UPDATE,
    Action.SNAPSHOT_RESTORE,
}


class ManageRequest(BaseModel):
    """The one envelope both doors speak. Frozen — a handler never
    mutates its request (PYTHON SHAPE rung 2)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    action: Action
    # install_extension: registry ids (bare, never @pins — PIN LAW)
    nodes: list[str] = Field(default_factory=list, description=(
        "install_extension: registry node-pack ids, e.g. "
        "[\"ComfyUI-KJNodes\"]"))
    # install_extension_url: one git URL (cm_cli direct — install_node
    # refuses URLs; provision.py precedent)
    url: str = ""
    # download_model
    relative_path: str = ""
    filename: str = ""
    wait: Optional[bool] = None        # None: door default (AI False, CLI True)
    timeout_seconds: float = 1800.0
    # provision_model: catalog id + optional cell coordinates
    model: str = ""
    variant: str = ""
    quant: str = ""
    # logs / search
    tail: int = 200
    query: str = ""
    # lifecycle
    version: str = ""
    target: str = "comfy"              # update: comfy|cli|all
    extra_args: list[str] = Field(default_factory=list)
    force: bool = False                # override the active-run guard
    # snapshot_restore: a snapshot filename from snapshot_list
    snapshot: str = ""


# ------------------------------------------------------------ plumbing


def _ok(action: Action, detail: str, data: JsonValue = None) -> tuple[int, dict[str, JsonValue]]:
    return 200, {"action": action.value, "ok": True,
                 "detail": detail, "data": data}

def _refuse(action: Action, code: int, why: str,
            data: JsonValue = None) -> tuple[int, dict[str, JsonValue]]:
    return code, {"action": action.value, "ok": False,
                  "detail": why, "data": data}

def _need(req: ManageRequest, *fields: str) -> None:
    """Per-action required args — named refusal, never a silent default."""
    missing = [f for f in fields if not getattr(req, f, "")]
    if missing:
        raise ValueError(
            "%s requires: %s" % (req.action.value, ", ".join(missing)))


def _need_comfy_mcp() -> ModuleType:
    """Import the management plane loudly, with the fix printed."""
    try:
        import comfy_mcp.server as sms  # noqa: F401
        return sms
    except ImportError:
        raise RuntimeError(
            "comfy-mcp is not importable — the base env carries it "
            "(uv sync); run: uv run python tools/provision.py manage …")


def _tool(sms: ModuleType, name: str) -> Callable[..., JsonValue]:
    """The @mcp.tool function, callable as a plain python function."""
    fn = getattr(sms, name)
    return getattr(fn, "fn", fn)


def _call(fn: Callable[..., JsonValue], *a: JsonValue, **kw: JsonValue) -> JsonValue:
    """Invoke an @mcp.tool function — some are async, some sync."""
    r = fn(*a, **kw)
    return asyncio.run(r) if inspect.iscoroutine(r) else r


def _ensure_routing() -> dict[str, str | bool]:
    """managed mode: point comfy-mcp's spawns at THIS runtime's comfy-cli
    and workspace (COMFY_BIN + COMFYUI_PATH + set-default — the same
    deployment glue provision.py owns; byo mode touches nothing)."""
    try:
        cfg = json.loads(DEFAULT_CONFIG.read_text()) \
            if DEFAULT_CONFIG.is_file() else {}
    except (OSError, json.JSONDecodeError):
        cfg = {}
    if cfg.get("provision") != "managed":
        return {"mode": "byo", "routed": False}
    comfy_bin = RUNTIME / ".venv" / "bin" / "comfy"
    if not comfy_bin.is_file():
        raise RuntimeError(
            "managed routing: %s missing — run \"provision.py sync\" "
            "first (the runtime venv carries the instance's comfy-cli)"
            % comfy_bin)
    os.environ["COMFY_BIN"] = str(comfy_bin)
    os.environ["COMFYUI_PATH"] = str(RUNTIME)
    os.environ["VIRTUAL_ENV"] = str(RUNTIME / ".venv")
    subprocess.run([str(comfy_bin), "set-default", str(RUNTIME)],
                   capture_output=True, timeout=90)
    return {"mode": "managed", "routed": True, "workspace": str(RUNTIME)}


_STATUS_RE = re.compile(r'\"status\"\s*:\s*\"([a-z]+)\"')

def _active_runs() -> list[str]:
    """Sidecar scan: run dirs whose _flow.json reads running|queued.
    Conservative by design — a stale \"running\" sidecar refuses the
    restart (safe); the sweep that marks them failed is the runs
    reader's job, not the manager's."""
    out: list[str] = []
    try:
        names = os.listdir(STATE_RUNS)
    except OSError:
        return out
    for name in names:
        if not name.startswith("run-"):
            continue
        try:
            buf = (STATE_RUNS / name / "_flow.json").read_text(
                encoding="utf-8", errors="surrogateescape")[:8191]
        except OSError:
            continue
        m = _STATUS_RE.search(buf)
        if m and m.group(1) in ("running", "queued"):
            out.append(name)
    return sorted(out)


def ensure_manager_security() -> str:
    """security=medium, the operator's pin. TWO faces: the in-process
    face is confirm_*=True on every install/update/switch call (the
    package-form Manager IS the confirm gate — PROVISIONING LAW ships
    it v4, no custom_node); the config face pins the level for the
    Manager's own UI when a custom_node install exists. Returns the
    effective level string for status."""
    ini = RUNTIME / "custom_nodes" / "ComfyUI-Manager" / "config.ini"
    if ini.is_file():
        try:
            text = ini.read_text(encoding="utf-8",
                                 errors="surrogateescape")
        except OSError:
            return "unreadable"
        if re.search(r"(?m)^\s*security_level\s*=\s*medium\s*$", text):
            return "medium (config pinned)"
        text = re.sub(r"(?m)^(\s*security_level\s*=\s*)(\S+)(\s*)$",
                      r"\1medium\3", text)
        if not re.search(r"(?m)^\s*security_level\s*=", text):
            text += "\nsecurity_level = medium\n"
        tmp = ini.with_suffix(".ini.tmp")
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, ini)
        return "medium (config pinned)"
    # package form (the PROVISIONING LAW default): the confirm kwargs on
    # our calls ARE the security surface
    return "medium (package-form, confirm-gated)"


# ------------------------------------------------------------- catalog


def _resolve_catalog_artifact(mid: str, variant: str, quant: str) -> list[dict[str, str]]:
    """model id → its declared provisions (or the resolved cell
    artifact). The SAME resolution the old /v1/models/provision route
    owned — moved here so both doors share one path."""
    plugins_root = REPO / "plugins"
    eng_root = plugins_root / "engines"
    found = None
    if eng_root.is_dir():
        for engine in sorted(os.listdir(eng_root)):
            models_root = eng_root / engine / "models"
            if not models_root.is_dir():
                continue
            for genre in sorted(os.listdir(models_root)):
                mdir = models_root / genre / mid
                if (mdir / "model.py").is_file() or \
                        (mdir / "model.yaml").is_file():
                    found = mdir
                    break
            if found:
                break
    if found is None or not (found / "model.py").is_file():
        raise LookupError("model %r not found in catalog" % mid)

    if str(REPO / "py") not in sys.path:
        sys.path.insert(0, str(REPO / "py"))
    from melite_models import load_model_py
    engine_dir = found.parent.parent
    cls = load_model_py(str(found / "model.py"), engine_dir.name)
    prov = list(getattr(cls, "provisions", None) or ())
    if not prov:
        _r, _e, cell = cls.resolve(variant or None, quant or None)
        if cell is None or cell.artifact is None:
            raise LookupError(
                "model %r has no artifact at (%s, %s)"
                % (mid, variant or None, quant or None))
        art = cell.artifact
        dest = "models/%s" % art.dest_sub.strip("/") if art.dest_sub \
            else "models"
        prov = [dict(name=str(art.source_url).rsplit("/", 1)[-1],
                     url=str(art.source_url), folder=dest)]
    rows = []
    for p in prov:
        name = (getattr(p, "name", "") or "").strip()
        url = str(getattr(p, "url", "") or "").strip()
        folder = (getattr(p, "folder", "") or "").strip("/")
        if not name or not url:
            continue
        dest = folder if folder.startswith("models") else (
            "models/%s" % folder if folder else "models")
        rows.append({"name": name, "url": url, "relative_path": dest})
    if not rows:
        raise LookupError("model %r declares no downloadable provisions" % mid)
    return rows


# ------------------------------------------------------------ handlers


def _probe_endpoint() -> dict[str, JsonValue]:
    """The endpoint config's OWN server, probed live (/system_stats) —
    the REAL server view in both modes; comfy-cli only knows servers
    it launched itself, so status carries both views honestly."""
    import urllib.request
    try:
        cfg = json.loads(DEFAULT_CONFIG.read_text()) \
            if DEFAULT_CONFIG.is_file() else {}
    except (OSError, json.JSONDecodeError):
        cfg = {}
    url = (cfg.get("url") or "").rstrip("/")
    if not url:
        return {"reachable": False, "reason": "no url in endpoint config"}
    try:
        with urllib.request.urlopen(url + "/system_stats", timeout=5) as r:
            stats = json.loads(r.read())
        sysinfo = stats.get("system", {})
        return {"reachable": True, "url": url,
                "comfyui_version": sysinfo.get("comfyui_version"),
                "devices": [
                    {"name": d.get("name", "?"),
                     "vram_total": d.get("vram_total"),
                     "vram_free": d.get("vram_free")}
                    for d in stats.get("devices", [])][:4]}
    except Exception as e:                              # noqa: BLE001
        return {"reachable": False, "url": url, "reason": str(e)[:120]}


def _h_status(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    info = _call(_tool(sms, "server_info"))
    sec = ensure_manager_security()
    active = _active_runs()
    endpoint = _probe_endpoint()
    data = {"endpoint": endpoint, "server_info": info,
            "manager_security": sec, "active_runs": active,
            "routing": _ensure_routing()}
    up = endpoint.get("reachable") or (info or {}).get("running")
    return _ok(req.action,
               ("server up" if endpoint.get("reachable")
                else "workspace up" if up else "server not reachable"),
               data)


def _h_logs(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    data = _call(_tool(sms, "get_logs"), tail=max(1, min(req.tail, 2000)))
    return _ok(req.action, "%d log line(s)" % (len(data) if isinstance(data, list) else 1), data)


def _h_search(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    _need(req, "query")
    data = _call(_tool(sms, "search_models"), query=req.query)
    rows = data if isinstance(data, list) else (data or {}).get("models", [])
    return _ok(req.action, "%d hit(s) for %r" % (len(rows), req.query), data)


def _h_install_extension(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    if not req.nodes:
        raise ValueError("install_extension requires: nodes")
    _ensure_routing()
    ensure_manager_security()
    # confirm_install=True IS security=medium in-process: standard
    # registry installs auto-approve (bare ids only — PIN LAW: @pins and
    # URLs are refused by install_node and audited on the drift report)
    rep = _call(_tool(sms, "install_node"), list(req.nodes),
                confirm_install=True)
    return _ok(req.action, "install_node accepted: %s"
               % ", ".join(req.nodes), rep)


def _cm_cli(workspace: Path, args: list[str],
            timeout: float) -> subprocess.CompletedProcess:
    """Run ONE cm_cli command in the workspace (the comfyui-manager v4
    rail — same shape install_extension_url pioneered). The interpreter
    is the CURRENT env's python (the base env carries the manager;
    managed routing has already pointed VIRTUAL_ENV at the runtime)."""
    venv = os.environ.get("VIRTUAL_ENV", "")
    py = Path(venv) / "bin" / "python" if venv else Path(sys.executable)
    env = {**os.environ, "COMFYUI_PATH": str(workspace)}
    return subprocess.run([str(py), "-m", "cm_cli", *args],
                          capture_output=True, text=True,
                          cwd=str(workspace), env=env, timeout=timeout)


def _managed_workspace(req: "ManageRequest") -> tuple[
        Optional[Path], Optional[tuple[int, dict[str, JsonValue]]]]:
    """Browse/snapshot actions operate on the MANAGED workspace. A byo
    endpoint refuses loudly — the estate never manages a user-owned
    ComfyUI's extension tree (PROVISIONING LAW's two modes, kept
    honest at every door)."""
    routing = _ensure_routing()
    if routing.get("mode") != "managed":
        return None, _refuse(
            req.action, 409,
            "byo endpoint: %s reads the managed workspace — the estate "
            "never touches a user-owned ComfyUI's packs/snapshots"
            % req.action.value, {"mode": "byo"})
    return Path(routing.get("workspace") or RUNTIME), None


def _h_install_extension_url(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    _need(req, "url")
    _ensure_routing()
    ensure_manager_security()
    workspace = Path(os.environ.get("COMFYUI_PATH") or RUNTIME)
    try:
        r = _cm_cli(workspace, ["install", req.url], timeout=300)
    except subprocess.TimeoutExpired:
        return _refuse(req.action, 504,
                       "cm_cli install timed out (300s)")
    if r.returncode == 0:
        return _ok(req.action, "cm_cli installed %s (restart required)"
                   % req.url, {"restart_required": True,
                               "stdout": r.stdout[-800:]})
    return _refuse(req.action, 500, "cm_cli install failed",
                   {"error": (r.stderr or r.stdout)[:500]})


def _h_download_model(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    _need(req, "url")
    _ensure_routing()
    wait = req.wait if req.wait is not None else False   # AI door: queue
    rep = _call(_tool(sms, "download_model"), req.url,
                relative_path=req.relative_path or None,
                filename=req.filename or None, wait=wait,
                timeout_seconds=req.timeout_seconds)
    return _ok(req.action, ("downloaded " if wait else "queued ")
               + (req.filename or req.url.rsplit("/", 1)[-1]), rep)


def _model_present(relative_path: str, name: str) -> Optional[Path]:
    """A declared weight is PRESENT when the instance can see it: the
    runtime's own models tree (where download_model lands) OR any
    mount dir the generated extra_model_paths.yaml binds (the machine
    statement of every folder ComfyUI scans — never a restated list).
    Idempotent provisioning: a present weight is never re-downloaded."""
    folder = relative_path[len("models/"):] \
        if relative_path.startswith("models/") else relative_path
    cand = RUNTIME / "models" / folder / name
    if cand.is_file():
        return cand
    # the mount bindings: THE ONE derivation (provision.bound_model_
    # folders — same source the generated yaml renders from), never
    # a yaml re-parse and never a restated folder list
    tools_dir = str(REPO / "tools")
    if tools_dir not in sys.path:
        sys.path.insert(0, tools_dir)
    import provision as _prov                    # lazy, no import cycle
    try:
        cfg = json.loads(DEFAULT_CONFIG.read_text()) \
            if DEFAULT_CONFIG.is_file() else {}
        bound = _prov.bound_model_folders(cfg)
    except (OSError, json.JSONDecodeError, SystemExit):
        return None
    head, _, rest = folder.partition("/")
    sub = bound["folders"].get(head)
    if not sub:
        return None
    cand = Path(bound["base_path"]) / sub
    if rest:
        cand = cand / rest
    cand = cand / name
    return cand if cand.is_file() else None


def _h_provision_model(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    _need(req, "model")
    rows = _resolve_catalog_artifact(req.model, req.variant, req.quant)
    _ensure_routing()
    wait = req.wait if req.wait is not None else False
    download = _tool(sms, "download_model")
    done, present, errs = [], [], []
    for row in rows:
        have = _model_present(row["relative_path"], row["name"])
        if have is not None:
            present.append(row["name"])
            continue
        try:
            rep = _call(download, row["url"],
                        relative_path=row["relative_path"],
                        filename=row["name"], wait=wait,
                        timeout_seconds=req.timeout_seconds)
            done.append(row["name"])
        except Exception as e:                        # noqa: BLE001
            errs.append({"file": row["name"], "error": str(e)[:200]})
    parts = []
    if present:
        parts.append("present: %d" % len(present))
    if done:
        parts.append("downloaded: %s" % ", ".join(done))
    detail = "; ".join(parts) if parts else "no files landed"
    if errs:
        detail += "; errors: %d" % len(errs)
    code = 200 if (done or present) else 500
    return code, {"action": req.action.value, "ok": bool(done or present),
                  "detail": detail,
                  "data": {"model": req.model, "files": done,
                           "present": present,
                           "errors": errs or None}}


def _guard_lifecycle(req: ManageRequest) -> tuple[int, dict[str, JsonValue]] | None:
    if req.force:
        return None
    active = _active_runs()
    if active:
        return _refuse(
            req.action, 409,
            "refused: %d active run(s) (%s) — stop them first (the stop "
            "door) or pass force=true" % (len(active), ", ".join(active[:4])),
            {"active_runs": active})
    return None


def _h_restart(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    blocked = _guard_lifecycle(req)
    if blocked:
        return blocked
    _ensure_routing()
    try:
        rep = _call(_tool(sms, "restart_comfyui"),
                    list(req.extra_args) or None,
                    confirm_kill_untracked=True)
        return _ok(req.action, "restart issued", rep)
    except Exception as e:                              # noqa: BLE001
        # honest split: a server this comfy-cli never launched cannot be
        # restarted by it — say WHERE the server is instead
        endpoint = _probe_endpoint()
        if endpoint.get("reachable"):
            return _refuse(
                req.action, 409,
                "the endpoint server (%s) is up but was not launched by "
                "comfy-cli — restart it with the deployment boot_cmd "
                "(provision.py boot-cmd) or launch it under comfy-cli"
                % endpoint.get("url", "?"),
                {"endpoint": endpoint, "comfy_cli_error": str(e)[:200]})
        raise


def _h_stop(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    blocked = _guard_lifecycle(req)
    if blocked:
        return blocked
    _ensure_routing()
    rep = _call(_tool(sms, "stop_comfyui"))
    return _ok(req.action, "stop issued", rep)


def _h_launch(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    _ensure_routing()
    rep = _call(_tool(sms, "launch_comfyui"), list(req.extra_args) or None)
    return _ok(req.action, "launch issued", rep)


def _h_update(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    if req.target not in ("comfy", "cli", "all"):
        raise ValueError("update target must be comfy|cli|all")
    blocked = _guard_lifecycle(req)
    if blocked:
        return blocked
    _ensure_routing()
    ensure_manager_security()
    rep = _call(_tool(sms, "update_comfyui"), req.target,
                confirm_update_all=True)
    return _ok(req.action, "update(%s) accepted" % req.target, rep)


def _h_switch_version(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    _need(req, "version")
    blocked = _guard_lifecycle(req)
    if blocked:
        return blocked
    _ensure_routing()
    rep = _call(_tool(sms, "switch_comfyui_version"), req.version,
                confirm_switch=True)
    return _ok(req.action, "switch to %s accepted" % req.version, rep)


def _h_free(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    rep = _call(_tool(sms, "free_memory"), unload_models=True,
                free_memory=True)
    return _ok(req.action, "free issued (next worker iteration)", rep)


# -------------------------------------------------- browse + snapshots (cm_cli)

# simple-show prints `Name@version` rows (names may contain spaces);
# snapshot-list prints bare json filenames. Both leak bookkeeping lines
# (FETCH/WARNING) — the regexes admit ONLY well-formed rows.
_PACK_ROW = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_ .-]*@[A-Za-z0-9_.-]+$")
_SNAP_ROW = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]*\.json$")


def _h_list_extensions(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    workspace, refused = _managed_workspace(req)
    if refused is not None:
        return refused
    try:
        r = _cm_cli(workspace, ["simple-show", "installed"], timeout=180)
    except subprocess.TimeoutExpired:
        return _refuse(req.action, 504, "cm_cli simple-show timed out (180s)")
    if r.returncode != 0:
        return _refuse(req.action, 500, "cm_cli simple-show failed",
                       {"error": (r.stderr or r.stdout)[-500:]})
    rows = [ln.strip() for ln in r.stdout.splitlines()
            if _PACK_ROW.fullmatch(ln.strip())]
    return _ok(req.action, "%d installed pack(s)" % len(rows), rows)


def _h_snapshot_list(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    workspace, refused = _managed_workspace(req)
    if refused is not None:
        return refused
    try:
        r = _cm_cli(workspace, ["show", "snapshot-list"], timeout=180)
    except subprocess.TimeoutExpired:
        return _refuse(req.action, 504, "cm_cli snapshot-list timed out (180s)")
    if r.returncode != 0:
        return _refuse(req.action, 500, "cm_cli snapshot-list failed",
                       {"error": (r.stderr or r.stdout)[-500:]})
    rows = [ln.strip() for ln in r.stdout.splitlines()
            if _SNAP_ROW.fullmatch(ln.strip())]
    return _ok(req.action, "%d snapshot(s)" % len(rows), rows)


def _h_snapshot_save(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    workspace, refused = _managed_workspace(req)
    if refused is not None:
        return refused
    try:
        r = _cm_cli(workspace, ["save-snapshot"], timeout=300)
    except subprocess.TimeoutExpired:
        return _refuse(req.action, 504, "cm_cli save-snapshot timed out (300s)")
    if r.returncode != 0:
        return _refuse(req.action, 500, "cm_cli save-snapshot failed",
                       {"error": (r.stderr or r.stdout)[-500:]})
    m = re.search(r"saved as `([^`]+)`", r.stdout)
    name = m.group(1) if m else "?"
    return _ok(req.action, "snapshot saved: %s" % name,
               {"snapshot": name, "stdout": r.stdout[-400:]})


def _h_snapshot_restore(req: ManageRequest, sms: ModuleType) -> tuple[int, dict[str, JsonValue]]:
    _need(req, "snapshot")
    blocked = _guard_lifecycle(req)
    if blocked:
        return blocked
    workspace, refused = _managed_workspace(req)
    if refused is not None:
        return refused
    try:
        r = _cm_cli(workspace, ["restore-snapshot", req.snapshot],
                    timeout=600)
    except subprocess.TimeoutExpired:
        return _refuse(req.action, 504,
                       "cm_cli restore-snapshot timed out (600s)")
    if r.returncode != 0:
        return _refuse(req.action, 500, "cm_cli restore-snapshot failed",
                       {"error": (r.stderr or r.stdout)[-500:]})
    return _ok(req.action, "restore of %s issued (restart required)"
               % req.snapshot,
               {"restart_required": True, "stdout": r.stdout[-800:]})


_HANDLERS: dict[Action, Callable[[ManageRequest, ModuleType], tuple[int, dict[str, JsonValue]]]] = {
    Action.STATUS: _h_status,
    Action.LOGS: _h_logs,
    Action.SEARCH_MODELS: _h_search,
    Action.LIST_EXTENSIONS: _h_list_extensions,
    Action.SNAPSHOT_LIST: _h_snapshot_list,
    Action.INSTALL_EXTENSION: _h_install_extension,
    Action.INSTALL_EXTENSION_URL: _h_install_extension_url,
    Action.DOWNLOAD_MODEL: _h_download_model,
    Action.PROVISION_MODEL: _h_provision_model,
    Action.RESTART: _h_restart,
    Action.STOP: _h_stop,
    Action.LAUNCH: _h_launch,
    Action.UPDATE: _h_update,
    Action.SWITCH_VERSION: _h_switch_version,
    Action.FREE: _h_free,
    Action.SNAPSHOT_SAVE: _h_snapshot_save,
    Action.SNAPSHOT_RESTORE: _h_snapshot_restore,
}


# ---------------------------------------------------------------- door


def _ensure_path() -> None:
    """comfy-mcp shells to the `comfy` binary — make sure THIS
    interpreter's own bin dir (where the base env installed comfy-cli)
    is on PATH. Both doors run manage.py under the base-env python, so
    `comfy` resolves without deployment PATH glue.

    sys.prefix is the anchor (NOT executable.resolve(): uv venv
    pythons are SYMLINKS into ~/.local/share/uv/python/… — resolve()
    lands in the interpreter's bin dir, where no comfy lives)."""
    bin_dir = Path(sys.prefix) / "bin"
    if not (bin_dir / "comfy").is_file():
        bin_dir = Path(sys.executable).parent
    if (bin_dir / "comfy").is_file():
        cur = os.environ.get("PATH", "")
        if str(bin_dir) not in cur.split(os.pathsep):
            os.environ["PATH"] = str(bin_dir) + os.pathsep + cur


def dispatch(body: dict[str, JsonValue] | None) -> tuple[int, dict[str, JsonValue]]:
    """The one entry both doors call: (status, response-dict)."""
    _ensure_path()
    try:
        req = ManageRequest(**(body or {}))
    except Exception as e:                             # noqa: BLE001
        return 422, {"action": (body or {}).get("action", "?"), "ok": False,
                     "detail": "bad request: %s" % e, "data": None}
    try:
        sms = _need_comfy_mcp()
        return _HANDLERS[req.action](req, sms)
    except ValueError as e:                            # named arg refusal
        return _refuse(req.action, 422, str(e))
    except LookupError as e:                           # catalog miss
        return _refuse(req.action, 404, str(e))
    except RuntimeError as e:                          # env/plane missing
        return _refuse(req.action, 503, str(e))
    except Exception as e:                             # noqa: BLE001
        return _refuse(req.action, 500,
                       "%s: %s" % (type(e).__name__, str(e)[:300]))
