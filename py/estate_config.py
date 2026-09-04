"""THE ROOT CONFIG (operator order 2026-09-04: "we need to let
people configure from the root of the overall project").

`inference.config.json` at the repo root is THE user-facing place
where model storage is configured for the WHOLE estate — every
engine, not just one. Shape:

    {
      "models": {
        "read_root":     "/mnt/data/models",   # where weights live
        "download_root": "/mnt/data/models"    # where downloads land
      },
      "engines": {
        "comfyui": { "base": "image-gen/comfyui" },
        "kimodo":  { "base": "motion/kimodo" }
      }
    }

Resolution law (ONE parser — this module; nothing else re-reads the
file's semantics):

  models.read_root / models.download_root
      ABSOLUTE global roots. Required, never defaulted, never
      guessed: missing or empty dies LOUD (QUEUE LANE LAW).
  engines.<name>.base
      Per-engine home UNDER the global roots (a relative subdir) or
      an ABSOLUTE override. Unset → the engine lives directly under
      the global roots.

Engine-level configs (e.g. the comfyui endpoint's
model_base_path / model_download_path) still WIN when set — the
root config is the base layer, engine configs are explicit
overrides for deployments that want them. ComfortUI's endpoint
unset keys inherit from here; kimodo falls back here before its
runtime default.

Downloads land where download_root says — enforced at the rails by
tools/provision.py's download pointers and walled by
tests/test_models_on_second_drive.py (which reads THIS file, never
a hardcoded spot).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

_REPO = Path(__file__).resolve().parents[1]
ROOT_CONFIG = _REPO / "inference.config.json"


class RootConfigError(Exception):
    """Misconfiguration — dies LOUD, never guessed around."""


def load() -> dict:
    if not ROOT_CONFIG.is_file():
        raise RootConfigError(
            "%s missing — model storage is configured at the ROOT "
            "of the project (see docs/comfyui/setup.md §Configuration)"
            % ROOT_CONFIG.name)
    try:
        cfg = json.loads(ROOT_CONFIG.read_text())
    except json.JSONDecodeError as exc:
        raise RootConfigError(
            "%s is not valid JSON: %s" % (ROOT_CONFIG.name, exc))
    if not isinstance(cfg, dict):
        raise RootConfigError("%s must be a JSON object" % ROOT_CONFIG.name)
    return cfg


def _abs_root(value: object, key: str) -> str:
    """A global root: required, absolute, non-empty."""
    raw = (str(value).strip() if value is not None else "")
    if not raw:
        raise RootConfigError(
            "models.%s missing/empty in %s — where models %s is "
            "deployment config, never guessed (QUEUE LANE LAW)"
            % (key, ROOT_CONFIG.name,
               "live" if key == "read_root" else "download to"))
    root = os.path.abspath(raw)
    if not os.path.isabs(raw):
        raise RootConfigError(
            "models.%s must be ABSOLUTE (got %r) — a relative model "
            "root would move with the working directory"
            % (key, raw))
    return root


def _engine_base(cfg: dict, engine: str) -> str:
    """engines.<name>.base — subdir under the roots, or absolute."""
    row = (cfg.get("engines") or {}).get(engine) or {}
    raw = str(row.get("base") or "").strip() if isinstance(row, dict) else ""
    return raw  # "" → the engine sits directly under the global roots


def join(root: str, sub: str) -> str:
    """Root + optional subdir (absolute subdirs override)."""
    sub = (sub or "").strip()
    if not sub:
        return root
    if os.path.isabs(sub):
        return os.path.abspath(sub)
    return os.path.join(root, sub)


def model_paths(engine: str = "", endpoint_overrides: dict | None = None):
    """THE derivation every engine consumes:

        model_paths("comfyui") → {
            read_root:     /mnt/data/models/image-gen/comfyui,
            download_root: /mnt/data/models/image-gen/comfyui }

    Priority (highest wins):
      1. endpoint_overrides — engine-config keys that, when SET,
         win (explicit per-engine deployment choice)
      2. the ROOT config: engines.<engine>.base under the global
         roots
      3. (no third layer — missing roots raise, never default)
    """
    cfg = load()
    read = _abs_root((cfg.get("models") or {}).get("read_root"),
                     "read_root")
    dl = _abs_root((cfg.get("models") or {}).get("download_root"),
                   "download_root")
    base = _engine_base(cfg, engine)
    paths = {
        "read_root": join(read, base),
        "download_root": join(dl, base),
    }
    over = endpoint_overrides or {}
    for src, dst in (("model_base_path", "read_root"),
                     ("model_download_path", "download_root")):
        raw = str(over.get(src) or "").strip() if over.get(src) else ""
        if raw:                       # set → the override wins
            if not os.path.isabs(raw):
                raise RootConfigError(
                    "%s override must be ABSOLUTE (got %r)"
                    % (src, raw))
            paths[dst] = os.path.abspath(raw)
    return paths
