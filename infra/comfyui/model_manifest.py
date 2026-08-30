#!/usr/bin/env python3
"""model_manifest.py — project the model-download list from the catalog.

ONE PATTERN (operator order, 2026-08-30): every model download link
lives in exactly ONE place — the owning family's model.yaml
``provisions:`` block (bytes + sha256 included). There is NO
hand-maintained manifest twin. This projector walks
plugins/*/models/**/model.yaml and emits the install TSV:

    <sub>/<filename>\\t<url>\\t<bytes>\\t<sha256>\\t<optional?>

consumed by infra/comfyui/bootstrap.sh --models (dest root is always
$COMFYUI_ROOT/models). Entries missing url/bytes/sha256 are LOUD
errors — a link that cannot be auto-downloaded and verified is a bug,
not a TODO.

The C++ catalog's single-file ``source:`` block (src/catalog.c) is the
SEPARATE machine door for /v1/models/provision — same file, different
consumer; if a family declares both, source.url MUST equal the primary
provision url (checked here).
"""
from __future__ import annotations

import glob
import os
import sys

import yaml


def fail(msg: str) -> None:
    print(f"model_manifest: FATAL: {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    repo = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else
                           os.path.join(os.path.dirname(__file__), "..", ".."))
    pattern = os.path.join(repo, "plugins", "*", "models", "**", "model.yaml")
    rows: list[tuple[str, str, str, str, str]] = []
    seen_files: dict[str, str] = {}  # filename -> owner model.yaml
    for path in sorted(glob.glob(pattern, recursive=True)):
        with open(path) as f:
            cfg = yaml.safe_load(f) or {}
        fam = cfg.get("family") or {}
        provisions = fam.get("provisions") or cfg.get("provisions") or []
        if not provisions:
            continue
        for i, p in enumerate(provisions):
            where = f"{path} [provisions[{i}]]"
            if not isinstance(p, dict):
                fail(f"{where}: not a mapping")
            name = p.get("name")
            url = p.get("url")
            sub = ((p.get("dest") or {}).get("sub") or "").strip("/")
            if not name:
                if not url:
                    fail(f"{where}: no name and no url — undeclarable")
                name = url.rsplit("/", 1)[-1]
            if not url or not str(url).startswith("http"):
                fail(f"{where} ({name}): missing/invalid url — ONE PATTERN means every declared file carries a working link")
            bytes_ = p.get("bytes")
            sha = p.get("sha256")
            if not bytes_ or not isinstance(bytes_, int):
                fail(f"{where} ({name}): missing integer bytes (exact size gate)")
            if not sha or not isinstance(sha, str) or len(sha) != 64:
                fail(f"{where} ({name}): missing 64-hex sha256 (downloads are verified)")
            if name in seen_files and seen_files[name] != path:
                fail(f"{where} ({name}): declared by BOTH {seen_files[name]} and {path} — one owner per file")
            seen_files[name] = path
            optional = "optional" if p.get("optional") else "required"
            rows.append((f"{sub}/{name}" if sub else name,
                         str(url), str(bytes_), sha.lower(), optional))
        # source/provision agreement check
        src = fam.get("source") or cfg.get("source") or {}
        if isinstance(src, dict) and src.get("url") and provisions:
            prim = provisions[0].get("url") or (src["url"])
            if str(src["url"]) != str(prim):
                fail(f"{path}: source.url != provisions[0].url — the C++ provision door and the bootstrap door must serve the same bytes")
    if not rows:
        fail("no provisions found in any model.yaml — nothing to install")
    for row in rows:
        print("\t".join(row))


if __name__ == "__main__":
    main()
