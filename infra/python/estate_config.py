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

PYTHON SHAPE LAW (2026-09-05 flip): the config IS a schema — frozen
pydantic rows validated AT PARSE. The duck-typed era (hand-rolled
isinstance walks, `(cfg.get("engines") or {}).get(engine) or {}`,
a garbage `port` silently falling through to the URL, a typo'd
engine key reading as a silently-missing field) is over: an invalid
config cannot be LOADED, so every door that reads it refuses with
the same field-named reason. Key discipline mirrors the wire modules
(run_wire/form_wire): the top level, the models stanza, AND each
engine entry are CLOSED (extra="forbid") with the engine key set
enumerated empirically — a new engine field is a deliberate schema
extension in this file, never drift.

Engine-level configs (e.g. the comfyui endpoint's url /
model_base_path / model_download_path) still WIN when set — the
root config is the base layer, engine configs are explicit
overrides for deployments that want them. comfyui's endpoint
unset keys inherit from here; kimodo falls back here before its
runtime default.

Downloads land where download_root says — enforced at the rails by
tools/provision.py's download pointers and walled by
tests/walls/suites/test_models_on_second_drive.py (which reads THIS file, never
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
from typing import Optional

from pydantic import (BaseModel, ConfigDict, Field, ValidationError,
                      ValidationInfo, field_validator)

_REPO = Path(__file__).resolve().parents[2]
ROOT_CONFIG = _REPO / "inference.config.json"


class RootConfigError(Exception):
    """Misconfiguration — dies LOUD, never guessed around."""


def _reason(error: ValidationError) -> str:
    """One-line, field-named parse refusal (the wire-module shape)."""
    parts = []
    for e in error.errors():
        loc = ".".join(str(x) for x in e["loc"]) or "<root>"
        parts.append(f"{loc}: {e['msg']}")
    return "; ".join(parts)


# ── the schema ─────────────────────────────────────────────────────

def _check_abs_root(value: str | int | float | bool | None, key: str) -> str:
    """A global root: required, absolute, non-empty (ValueError core
    the pydantic validator and the RootConfigError wrapper share)."""
    raw = (str(value).strip() if value is not None else "")
    if not raw:
        raise ValueError(
            "models.%s missing/empty in %s — where models %s is "
            "deployment config, never guessed (QUEUE LANE LAW)"
            % (key, ROOT_CONFIG.name,
               "live" if key == "read_root" else "download to"))
    if not os.path.isabs(raw):
        raise ValueError(
            "models.%s must be ABSOLUTE (got %r) — a relative model "
            "root would move with the working directory"
            % (key, raw))
    return os.path.abspath(raw)


def _abs_root(value: str | int | float | bool | None, key: str) -> str:
    """The RootConfigError surface over the shared check (kept as the
    module's own loud helper — wall-tested directly)."""
    try:
        return _check_abs_root(value, key)
    except ValueError as e:
        raise RootConfigError(str(e)) from e


class ModelsRoots(BaseModel):
    """The global model roots — closed keys, validated AT PARSE."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    read_root: str
    download_root: str

    @field_validator("read_root", "download_root")
    @classmethod
    def _root_is_absolute(cls, v: str, info: ValidationInfo) -> str:
        return _check_abs_root(v, str(info.field_name))


class EngineEntry(BaseModel):
    """One engine's root-config row. Keys are the CLOSED empirical
    engine vocabulary (the form_wire discipline: key sets enumerated
    from the live estate sweep, VALUES typed) — a typo'd engine key
    ("input_dirs") is a parse refusal, never a silently-missing field.
    Adding a field is a deliberate schema extension, never drift."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    base: str = ""
    url: str = ""
    # declared so a garbage port dies AT PARSE (the duck-typed era
    # let it silently fall through to the URL)
    port: Optional[int] = None
    # stream paths + the boot command (comfyui's endpoint sync)
    input_dir: str = ""
    input_dir_container: str = ""
    output_dir: str = ""
    boot_cmd: str = ""
    # kimodo's local tools (engine-specific but declared — the
    # schema names what engine_field reads)
    generator: str = ""
    exporter: str = ""
    # free-form operator prose (audio-cpp's rationale row)
    comment: str = ""

    @field_validator("base", "url", "input_dir", "input_dir_container",
                     "output_dir", "boot_cmd", "generator", "exporter",
                     "comment")
    @classmethod
    def _stripped(cls, v: str) -> str:
        return str(v).strip()

    def field(self, name: str) -> str:
        """Any declared field as a stripped string ('' when absent) —
        the engine_field() read rail."""
        v = getattr(self, name, None)
        return str(v).strip() if v is not None else ""


class RootConfig(BaseModel):
    """The whole inference.config.json — closed at the top level
    (models + engines; a typo'd key dies loud), engines open per
    entry. An invalid config cannot be CONSTRUCTED, so it cannot be
    served, provisioned, or booted against."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    models: ModelsRoots
    engines: dict[str, EngineEntry] = Field(default_factory=dict)

    def engine(self, name: str) -> EngineEntry:
        """The entry, or an empty row (an unconfigured engine sits
        directly under the global roots with no connection)."""
        return self.engines.get(name) or EngineEntry()


# ── the ONE parser ─────────────────────────────────────────────────

def load() -> RootConfig:
    """Parse + validate the root config. Every misconfiguration —
    missing file, bad JSON, non-object, missing/relative roots,
    engines that is not a map, an engine entry that is not an
    object, a garbage port — refuses HERE with one field-named
    RootConfigError (never at some later door, never guessed)."""
    if not ROOT_CONFIG.is_file():
        raise RootConfigError(
            "%s missing — model storage is configured at the ROOT "
            "of the project (see docs/comfyui/setup.md §Configuration)"
            % ROOT_CONFIG.name)
    try:
        raw = json.loads(ROOT_CONFIG.read_text())
    except json.JSONDecodeError as exc:
        raise RootConfigError(
            "%s is not valid JSON: %s" % (ROOT_CONFIG.name, exc))
    try:
        return RootConfig.model_validate(raw)
    except ValidationError as exc:
        raise RootConfigError(
            "%s refuses at parse: %s"
            % (ROOT_CONFIG.name, _reason(exc))) from exc


def join(root: str, sub: str) -> str:
    """Root + optional subdir (absolute subdirs override)."""
    sub = (sub or "").strip()
    if not sub:
        return root
    if os.path.isabs(sub):
        return os.path.abspath(sub)
    return os.path.join(root, sub)


def model_paths(engine: str = "",
                endpoint_overrides: dict[str, str] | None = None
                ) -> dict[str, str]:
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
    read = cfg.models.read_root            # absolute, parse-validated
    dl = cfg.models.download_root
    base = cfg.engine(engine).base
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
    simply not set — a missing key is fine).
    """
    raw = str(endpoint_override or "").strip()
    if raw:
        return raw
    return load().engine(engine).url


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
    return load().engine(engine).field(field)


def engine_port(engine: str,
                endpoint_override: str | int | None = None) -> int:
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
    entry = load().engine(engine)
    if entry.port is not None:
        return entry.port
    if entry.url:
        from urllib.parse import urlparse
        try:
            port = urlparse(entry.url).port
        except (ValueError, TypeError):
            port = None
        if port is not None:
            return port
    return 0
