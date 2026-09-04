"""THE ROOT CONFIG (operator order 2026-09-04: "we need to let
people configure from the root of the overall project").

`inference.config.json` at the repo root is THE user-facing place
where the WHOLE estate is configured — model storage AND each
engine's connection — every engine, not just one. Shape:

    {
      "models": {
        "read_root":     "/mnt/data/models",   # where weights live
        "download_root": "/mnt/data/models"    # where downloads land
      },
      "engines": {
        "comfyui": {
          "base": "image-gen/comfyui",         # subdir under the roots
          "url":  "http://127.0.0.1:18466"     # engine endpoint (when
                                               # the engine has one)
        },
        "kimodo": {
          "base": "motion/kimodo"
        }
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
  engines.<name>.url
      The engine's connection (the comfyui HTTP endpoint today;
      engine-specific — set only for engines that have one). Optional.

Engine-level configs (e.g. the comfyui endpoint's url /
model_base_path / model_download_path) still WIN when set — the
root config is the base layer, engine configs are explicit
overrides for deployments that want them. comfyui's endpoint
unset keys inherit from here; kimodo falls back here before its
runtime default.

Downloads land where download_root says — enforced at the rails by
tools/provision.py's download pointers and walled by
tests/test_models_on_second_drive.py (which reads THIS file, never
a hardcoded spot). The engine URL is synced from the root into
the comfyui endpoint by `provision paths` so the gateway and the
config never drift (extra_model_paths.yaml's generation is the
precedent — the endpoint's url becomes a derived surface, the
root remains the SSOT).
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


def engine_url(engine: str, endpoint_override: str | None = None) -> str:
    """The engine's connection string (comfyui's HTTP URL today).

    Priority: explicit endpoint value → root config
    engines.<engine>.url. Empty/unset for engines that have no
    connection (kimodo is local subprocess; the URL key is then
    simply not set — a missing key is fine, an empty string dies
    loud).
    """
    raw = str(endpoint_override or "").strip()
    if raw:
        return raw
    cfg = load()
    row = (cfg.get("engines") or {}).get(engine) or {}
    if not isinstance(row, dict):
        return ""
    return str(row.get("url") or "").strip()


def engine_field(engine: str, field: str,
                 endpoint_override: str | None = None) -> str:
    """Any engine field: endpoint override wins when SET and non-empty;
    otherwise the root config's engines.<engine>.<field>. Returns ''
    when absent (callers decide whether '' is valid).

    Used for stream paths (input_dir, output_dir), the boot_cmd,
    kimodo's generator/exporter paths, and any future fields that
    follow the same override-then-root pattern.
    """
    raw = str(endpoint_override or "").strip()
    if raw:
        return raw
    cfg = load()
    row = (cfg.get("engines") or {}).get(engine) or {}
    if not isinstance(row, dict):
        return ""
    return str(row.get(field) or "").strip()


def engine_port(engine: str, endpoint_override=None) -> int:
    """The port (int) — derived from the URL when not set explicitly
    in the root config. This lets boot_cmd drift be caught: if the
    root config's URL says 18466, the port is 18466 regardless of
    what the endpoint's boot_cmd string says.
    """
    val = endpoint_override
    if val is not None:
        val = str(val).strip()
    if val:
        try:
            return int(val)
        except ValueError:
            pass
    cfg = load()
    row = (cfg.get("engines") or {}).get(engine) or {}
    if isinstance(row, dict):
        p = row.get("port")
        if p is not None:
            try:
                return int(p)
            except (ValueError, TypeError):
                pass
        url = str(row.get("url") or "").strip()
        if url:
            from urllib.parse import urlparse
            try:
                return int(urlparse(url).port)
            except (ValueError, TypeError):
                pass
    return 0
