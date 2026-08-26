"""extension_lane.py — the per-plugin custom-node lane merge (infra twin).

§16 E-EXTENSIONS: the flat config/comfyui_extensions.yaml SSOT is DEAD.
Each plugin declares the ComfyUI custom-node packs it needs in
``plugins/<id>/nodes/extensions.yaml`` (same document shape the flat file
had: an ``extensions:`` list of name/url/desc/required/ref/pip/patches/
nodes entries). The TS gateway merges the lane in
server-js/src/media/comfyui/preflight/extension_requirements.ts; this
module is the INFRA twin for the Docker build (setup_comfyui.py), the
local sync (sync_local_comfyui.py), and the clone script
(scripts/setup_upstream_custom_nodes.sh) — same law, same order:
deterministic plugin-id order + a LOUD duplicate-name error naming both
owners (one owner per extension name; the name IS the custom_nodes/
directory).
"""

from __future__ import annotations

import sys
import glob
import os

try:
    import yaml
except ImportError:  # pragma: no cover - callers pre-install pyyaml
    raise SystemExit("FATAL: pyyaml required (pip install pyyaml)")


def merge_plugin_extensions(plugins_root: str) -> list[dict]:
    """Merge every ``<plugins_root>/<id>/nodes/extensions.yaml``.

    Deterministic: sorted plugin id, then file order within a plugin.
    Duplicate extension names across two plugins raise SystemExit naming
    both owners (the rail-conflict law — shadowing is drift).
    """
    pattern = os.path.join(plugins_root, "*", "nodes", "extensions.yaml")
    decls: list[tuple[str, str, list[dict]]] = []
    for path in sorted(glob.glob(pattern)):
        plugin = os.path.basename(os.path.dirname(os.path.dirname(path)))
        with open(path) as f:
            cfg = yaml.safe_load(f) or {}
        entries = cfg.get("extensions") or []
        if not isinstance(entries, list):
            raise SystemExit(f"FATAL: {path}: 'extensions' must be a list")
        decls.append((plugin, path, entries))

    merged: list[dict] = []
    owner: dict[str, str] = {}
    for plugin, path, entries in decls:
        for e in entries:
            name = str(e.get("name", "")).strip()
            if not name:
                raise SystemExit(f"FATAL: {path}: entry missing 'name'")
            if name in owner:
                raise SystemExit(
                    f"FATAL: extension '{name}' declared by both "
                    f"'{owner[name]}' and '{plugin}' — one owner per "
                    "extension name (the name is the custom_nodes/ "
                    "directory; shadowing is drift, not resolution)"
                )
            owner[name] = plugin
            merged.append(e)
    return merged


def iter_upstream(plugins_root: str) -> list[tuple[str, str, str]]:
    """[(name, url, ref)] for every declared extension with a url
    (in-tree packs have none) — the clone-script projection."""
    out: list[tuple[str, str, str]] = []
    for e in merge_plugin_extensions(plugins_root):
        name = str(e.get("name", "")).strip()
        url = e.get("url")
        if not name or not url:
            continue
        out.append((name, str(url), str(e.get("ref") or "")))
    return out


if __name__ == "__main__":
    # CLI: print the merged install list as "name|url|ref" lines (the
    # setup_upstream_custom_nodes.sh contract). The plugins root may be a
    # repo checkout or the /tmp/melite-plugins subtree staged in a Docker build.
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "..", "plugins")
    for name, url, ref in iter_upstream(os.path.abspath(root)):
        print(f"{name}|{url}|{ref}")
