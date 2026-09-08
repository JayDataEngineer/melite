#!/usr/bin/env python3
"""extension_lane.py — merge all plugin nodes.yaml declarations into one manifest.

ONE PATTERN: reads every packages/*/nodes/extensions.yaml and
packages/*/models/**/nodes.yaml, merges in plugin-id order, fails
loud on duplicate names. Output is a unified manifest consumed by
the bootstrap installer. (STRUCTURE STAGE 1, 2026-09-05:
plugins/ -> packages/; the pre-rename plugins/ roots retired
2026-09-08 — the lane merged empty from the day of the rename.)

Usage:
    python3 extension_lane.py [--repo <path>] [--format yaml|json]
"""
from __future__ import annotations

import glob
import os
import sys
from pathlib import Path

import yaml


def fail(msg: str) -> None:
    print(f"extension_lane: FATAL: {msg}", file=sys.stderr)
    sys.exit(1)


def warn(msg: str) -> None:
    print(f"extension_lane: WARN: {msg}", file=sys.stderr)


def find_nodes_yaml(repo: str) -> list[tuple[str, str]]:
    """Find all nodes.yaml files, return (path, owner_id) pairs sorted by owner.

    Plugin layouts (root reorganization, 2026-09-03; packages/
    rename, STRUCTURE STAGE 1 2026-09-05): flat
    packages/<id>/… and engine-scoped packages/engines/<engine>/… —
    owner id is the plugin path between packages/ and the first
    models|nodes segment (e.g. "engines/comfyui").
    """
    patterns = [
        os.path.join(repo, "packages", "*", "nodes", "extensions.yaml"),
        os.path.join(repo, "packages", "*", "models", "**", "nodes.yaml"),
        os.path.join(repo, "packages", "*", "*", "nodes", "extensions.yaml"),
        os.path.join(repo, "packages", "*", "*", "models", "**", "nodes.yaml"),
    ]
    results: list[tuple[str, str]] = []
    for pattern in patterns:
        for path in sorted(glob.glob(pattern, recursive=True)):
            rel = Path(path).relative_to(repo)
            parts = list(rel.parts)
            try:
                idx = parts.index("packages")
                tail = parts[idx + 1:]
                cut = next(i for i, p in enumerate(tail)
                           if p in ("models", "nodes"))
                plugin_id = "/".join(tail[:cut]) or tail[0]
            except (ValueError, IndexError, StopIteration):
                warn(f"Cannot determine plugin id from {path}, skipping")
                continue
            results.append((path, plugin_id))
    # Sort by plugin-id for deterministic merge order
    results.sort(key=lambda x: x[1])
    return results


# ── the manifest schema (PYTHON SHAPE LAW: construction IS the gate) ──
#
# The 2026-09-05 audit found this loader duck-typed end to end: a
# typo'd top-level key (``extentions:``) silently merged NOTHING (the
# extension never installs, invisibly), garbage rows rode into
# provision's install step, and the divergent-pin guard compared
# url/ref only — registry/version pins (the cm_cli rail) could
# diverge silently and merge as "identical". Rows are frozen
# pydantic now: an invalid manifest is a LOUD refusal naming the
# file, never a partial install.
from pydantic import (BaseModel, ConfigDict, Field,
                      ValidationError, field_validator)


class ExtensionRow(BaseModel):
    """One declared extension. The pin pair is BOTH rails: registry+
    version (the cm_cli install rail, PIN LAW) and url+ref (the
    recorded git expectation). `pip` rides for python deps."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str = Field(min_length=1)
    registry: str = ""
    version: str = ""
    url: str = ""
    ref: str = ""
    required: bool = True
    desc: str = ""
    pip: tuple[str, ...] = ()

    def pin(self) -> tuple[str, str, str, str, tuple[str, ...]]:
        """The comparable pin identity — EVERY rail, so divergence in
        any one of them refuses (the url/ref-only era let registry
        pins diverge silently)."""
        return (self.registry, self.version, self.url, self.ref,
                self.pip)


class NodesDoc(BaseModel):
    """A nodes.yaml document. Top level is CLOSED: a typo'd key is a
    refusal, never a silently-empty manifest."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    # `extensions:` followed by only comments parses as explicit
    # null — a legitimate "declared nothing here" document (the
    # genre-level heads carry the declaration elsewhere).
    # A PROVIDED null (`extensions:` followed only by comments)
    # normalizes to () through the before-validator — a legitimate
    # "declared nothing here" genre head. A MISSING key takes the ()
    # default directly (pydantic skips validators for defaults, so
    # the annotation stays non-optional).
    extensions: tuple[ExtensionRow, ...] = ()

    @field_validator("extensions", mode="before")
    @classmethod
    def _null_is_empty(cls, v: list[dict[str, str | bool | list[str]]] | None) -> list[dict[str, str | bool | list[str]]] | tuple[()]:
        return () if v is None else v


# future-annotations module: resolve the forward refs now
ExtensionRow.model_rebuild()
NodesDoc.model_rebuild()


# model_dump rows (+ the merged `_source` tag): every value is a
# manifest scalar — str fields, the required bool, the pip tuple.
ManifestRow = dict[str, str | bool | tuple[str, ...]]


def load_extensions(path: str) -> list[ManifestRow]:
    """Load + VALIDATE the extensions list from a nodes.yaml file.
    An invalid document fails LOUD (a manifest that cannot be parsed
    honestly must not half-install)."""
    with open(path) as f:
        cfg = yaml.safe_load(f) or {}
    try:
        doc = NodesDoc.model_validate(cfg)
    except ValidationError as e:
        reasons = "; ".join(
            "%s: %s" % (".".join(str(x) for x in err["loc"]) or "?",
                        err["msg"])
            for err in e.errors()[:5])
        fail(f"{path}: refuses to parse as a nodes.yaml manifest "
             f"({reasons})")
    return [row.model_dump() for row in doc.extensions]


def merge_all(repo: str) -> list[ManifestRow]:
    """Merge all nodes.yaml files. Returns deduplicated extension list."""
    files = find_nodes_yaml(repo)
    if not files:
        warn("No nodes.yaml files found")
    return _merge_from(files)


def merge_plugins_dir(plugins_root: str) -> list[ManifestRow]:
    """Merge a bare plugins/ subtree (e.g. a docker bind mount like
    /tmp/melite-plugins) — same law, plugin-id order, dup guard."""
    pattern = os.path.join(plugins_root, "*", "nodes", "extensions.yaml")
    files = []
    for path in sorted(glob.glob(pattern)):
        plugin_id = Path(path).parts[-4] if len(Path(path).parts) >= 4 else Path(path).parent.parent.parent.name
        files.append((path, plugin_id))
    files.sort(key=lambda x: x[1])
    return _merge_from(files)


def _merge_from(files: list[tuple[str, str]]) -> list[ManifestRow]:
    """One extension per name; an IDENTICAL restatement (same url AND
    ref — two family heads of one physical lane pinning the same
    extension) merges silently, a DIVERGENT pin refuses loud. (The
    2026-09-04 integration sweep: qwen-img-edit-2511 and img-edit
    both carry Comfyui-QwenEditUtils — one lane, two family heads,
    same pin: truth, not drift.)"""
    merged: list[dict] = []
    seen: dict[str, dict] = {}   # name -> owning row

    for path, plugin_id in files:
        exts = load_extensions(path)
        for ext in exts:
            name = ext.get("name")
            if not name:
                fail(f"{path}: extension with no name")
            pin = (ext.get("registry", ""), ext.get("version", ""),
                   ext.get("url", ""), ext.get("ref", ""),
                   tuple(ext.get("pip") or ()))
            if name in seen:
                prior = seen[name]
                if prior[0] != pin:
                    fail(
                        f"Divergent pins for extension '{name}':\n"
                        f"  {prior[1]}: {prior[0]}\n"
                        f"  {path}: {pin}"
                    )
                continue          # identical restatement — one truth
            seen[name] = (pin, f"{plugin_id}:{path}")
            # Tag with source for traceability
            ext["_source"] = f"{plugin_id}:{path}"
            merged.append(ext)

    return merged


def main() -> None:
    # default repo root = parent of infra/ (this file lives at <repo>/infra/)
    repo = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    fmt = "yaml"
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--repo" and i + 1 < len(args):
            repo = os.path.abspath(args[i + 1])
            i += 2
        elif args[i].startswith("--repo="):
            repo = os.path.abspath(args[i].split("=", 1)[1])
            i += 1
        elif args[i] == "--format" and i + 1 < len(args):
            fmt = args[i + 1]
            i += 2
        elif args[i].startswith("--format="):
            fmt = args[i].split("=", 1)[1]
            i += 1
        else:
            i += 1

    merged = merge_all(repo)

    if fmt == "json":
        import json
        print(json.dumps(merged, indent=2))
    else:
        print("# Auto-generated by extension_lane.py — DO NOT EDIT")
        print(f"# Merged from {len(merged)} extensions across all plugins")
        # Build a proper YAML structure
        out = {"extensions": [{k: v for k, v in ext.items() if k != "_source"} for ext in merged]}
        print(yaml.dump(out, default_flow_style=False, sort_keys=False).rstrip())


if __name__ == "__main__":
    main()
