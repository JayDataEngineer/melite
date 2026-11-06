"""THE ENGINE-SERVE LAW (operator order, 2026-11-16: "DID YOU ACTUALLY
PIN TO TEST FOR NO SILENT REGRESSIONS"): the engine tree the estate's
endpoint names must serve the SAME pack commits the vendored tree
declares. Both F3-14 burns passed green estate walls while the pack
the ENGINE executed was lethal — the vendored tree was cured, the
wall judged the vendored bytes, and the served copy rode an older
commit with no gate red anywhere. A cured vendored tree plus a stale
served copy IS the silent-regression seat, and this wall is its
catcher: for every gitlinked pack under ``vendor/comfyui_extensions``
whose directory exists in the engine's ``custom_nodes``, the served
commit (or, where the copy carries no git metadata, the hashed
python sources) must equal the vendored one.

The seat is machine-local by nature: where no engine tree is seated
(CI, a fresh clone) the arms skip LOUD naming the absent seat — the
law judges exactly where the engine lives, the developer estate and
the operator's press machine.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
VENDOR = REPO / "vendor" / "comfyui_extensions"
ENDPOINT = REPO / "data" / "comfyui_endpoint.json"


def _engine_root() -> Path | None:
    if not ENDPOINT.is_file():
        return None
    try:
        raw = json.loads(ENDPOINT.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    root = raw.get("engine_root")
    return Path(root) if isinstance(root, str) and root else None


def _git_head(repo: Path) -> str | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=30, check=True,
        )
        return out.stdout.strip()
    except (subprocess.SubprocessError, OSError):
        return None


def _py_digest(pack: Path) -> str:
    """The pack's python-source digest — the no-git-metadata copy's
    truth (sorted walk, .py files only, name+bytes)."""
    digest = hashlib.sha256()
    for file in sorted(p for p in pack.rglob("*.py") if "__pycache__" not in p.parts):
        digest.update(file.relative_to(pack).as_posix().encode())
        digest.update(hashlib.sha256(file.read_bytes()).digest())
    return digest.hexdigest()


def _gitlinked_packs() -> list[tuple[str, Path]]:
    """Every vendored pack the main repo pins as a gitlink (submodule
    or plain nested repo with its own HEAD)."""
    out = subprocess.run(
        ["git", "-C", str(REPO), "ls-files", "-s", "vendor/comfyui_extensions"],
        capture_output=True, text=True, timeout=30, check=True,
    )
    packs: list[tuple[str, Path]] = []
    for line in out.stdout.splitlines():
        meta, path = line.split("\t", 1)
        mode = meta.split(" ")[0]
        if mode != "160000":  # a gitlink row, never a plain directory
            continue
        repo = REPO / path
        if (repo / ".git").exists() or _git_head(repo) is not None:
            packs.append((path, repo))
    return packs


ENGINE = _engine_root()
NO_ENGINE = pytest.mark.skipif(
    ENGINE is None or not (ENGINE / "custom_nodes").is_dir(),
    reason="no engine tree seated on this machine (CI) — the engine-serve law judges where the engine lives",
)


def test_no_vendored_pack_is_not_a_gitlink():
    """SEAT LAW: the vendor tree's packs ARE gitlinks — a pack demoted
    to plain files loses the commit pin this wall judges (and the
    manifest's ref column lies)."""
    packs = _gitlinked_packs()
    assert packs, (
        "no gitlinked packs under vendor/comfyui_extensions — the "
        "engine-serve wall lost its truth source"
    )


@NO_ENGINE
def test_the_engine_serves_exactly_the_vendored_pack_commits():
    """THE NO-SILENT-REGRESSION ARM: for every gitlinked pack with a
    served copy under the engine's custom_nodes, the served commit
    equals the vendored gitlink. A cured vendored tree plus a stale
    served copy reds HERE — the shape both F3-14 burns rode through."""
    assert ENGINE is not None
    stale: list[str] = []
    judged = 0
    for decl, vendored in _gitlinked_packs():
        name = Path(decl).name
        served = ENGINE / "custom_nodes" / name
        if not served.is_dir():
            continue
        judged += 1
        v_head, s_head = _git_head(vendored), _git_head(served)
        if v_head is not None and s_head is not None:
            if v_head != s_head:
                stale.append(
                    f"{name}: served {s_head[:12]} != vendored {v_head[:12]}"
                )
        elif _py_digest(vendored) != _py_digest(served):
            stale.append(f"{name}: served python sources differ from vendored")
    assert judged > 0, (
        "the engine tree seats none of the vendored packs — the "
        "engine-serve law has nothing to judge (seat misprovisioned?)"
    )
    assert stale == [], (
        "the engine serves STALE pack copies — the vendored cures "
        "are not what the engine executes (the F3-14 silent-"
        "regression seat): " + "; ".join(stale)
    )
