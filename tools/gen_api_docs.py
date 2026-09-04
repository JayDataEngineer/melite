#!/usr/bin/env python3
"""tools/gen_api_docs.py — generate the gateway API surface docs FROM
the route table (the wire SSOT in py/gateway.py).

Emits:
  docs/gateway/endpoints.md   — the human wire table (grouped)
  docs/gateway/openapi.yaml   — the machine surface (paths + params;
                                response BODIES stay pinned by the
                                goldens — the spec deliberately carries
                                no schemas)

The wall (tests/walls/suites/test_api_doc_parity.py) refuses drift
between the table, the doc, and the spec: run this after every route
change, and the wall keeps them honest.

Usage: .venv/bin/python tools/gen_api_docs.py [--check]
  --check: exit 1 if the on-disk files differ from what the table
  generates (CI mode — no writes).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "py"))

import gateway  # noqa: E402  (stdlib only; the table imports clean)

DOC_PATH = REPO / "docs" / "gateway" / "endpoints.md"
SPEC_PATH = REPO / "docs" / "gateway" / "openapi.yaml"

INTRO = """# Gateway endpoints — the LIVE wire table

GENERATED from the route table in `py/gateway.py` (`ROUTES`) by
`tools/gen_api_docs.py` — edit the table, not this file. The wall
`tests/walls/suites/test_api_doc_parity.py` refuses drift between the
table, this page, and `openapi.yaml`.

Authorities, in order:
- **Response bodies**: the goldens in `tests/golden_http/` (the estate's
  own regression pin since C retirement, 2026-09-03). Changing one is a
  deliberate contract change, never drift.
- **The path list**: the route table (this page mirrors it).
- **State is not contract**: runs/drafts routes are pinned in-harness
  (envelope + count invariant + row shape), not golden-pinned.

The surface groups by AUDIENCE, not by REST resource:
- *Queue & runs* — the inference contract every client speaks
  (agents, MCP tools, the editor, the DSH embed).
- *Assets & ledger* — delivered artifacts and the activity journal.
- *Lane discovery* — the progressive-disclosure ladder for agents.
- *Models & forms* — the catalog + editor form surfaces.
- *Templates & drafts* — the flow library the editor edits. The
  `yaml/*` prefix is HONEST: the library on disk is still `flow.yaml`
  files (5 of 8 lanes; the rest are `flow.py` declarations). The RETIRED
  thing (2026-09-04) was the yaml START door — `/v1/flows/start` takes
  `{flow: name}` or `{model: id}`, never yaml text.
- *Management* — the ONE comfy management door.
- *Health & chrome* — liveness plus the deck-shape stubs the editor
  renders against.

`/v1/models` is the OpenAI-compat list door (custom format; see
docs/gateway/openai-compat.md) — a different vocabulary from
`/v1/model-catalog`, not a duplicate.
"""


def _methods(row):
    if row.ws:
        return "WS"
    if row.method == "*":
        return "ANY"
    return row.method.replace("|", "/")


def _doc_path(row):
    return row.template or row.path


def gen_doc():
    groups = {}
    for row in gateway.ROUTES:
        groups.setdefault(row.group, []).append(row)
    out = [INTRO]
    for group in sorted(groups):
        out.append("\n## %s\n" % group)
        out.append("| Method | Path | Purpose |")
        out.append("|--------|------|---------|")
        for row in groups[group]:
            out.append("| %s | `%s` | %s |" % (
                _methods(row), _doc_path(row), row.summary))
    return "\n".join(out) + "\n"


def _spec_methods(row):
    if row.ws:
        return ["get"]
    if row.method == "*":
        return ["get", "post", "delete", "put", "patch"]
    return [m.strip().lower() for m in row.method.split("|")]


def _spec_path(row):
    """OpenAPI path: template minus query string; params from braces."""
    tmpl = _doc_path(row)
    path, _, query = tmpl.partition("?")
    params = []
    for name in ("run_id", "id", "file", "lane", "family", "draft_id"):
        if "{%s}" % name in path:
            params.append({"name": name, "in": "path", "required": True,
                           "schema": {"type": "string"}})
    for q in row.query:
        params.append({"name": q, "in": "query", "required": False,
                       "schema": {"type": "string"}})
    if query and "{" in query:
        qname = query.split("={", 1)[0]
        params.append({"name": qname, "in": "query", "required": True,
                       "schema": {"type": "string"}})
    return path, params


def gen_spec():
    lines = [
        "# GENERATED from py/gateway.py ROUTES by tools/gen_api_docs.py —",
        "# edit the table, not this file. Paths + parameters only:",
        "# response bodies are pinned by tests/golden_http/ (the wire",
        "# contract's byte authority), so this spec carries no schemas.",
        "openapi: 3.1.0",
        "info:",
        "  title: inference.cpp gateway",
        "  description: The local inference gateway. Serial GPU queue",
        "    (INFERENCE LAW); unresolved requests 4xx before registration",
        "    (QUEUE LANE LAW); a bad run never crashes the gateway",
        "    (RESILIENCE LAW).",
        "  version: 1.0.0",
        "servers:",
        "  - url: http://127.0.0.1:33081",
        "paths:",
    ]
    paths = {}
    for row in gateway.ROUTES:
        spath, params = _spec_path(row)
        entry = paths.setdefault(spath, {"params": params, "ops": []})
        for m in _spec_methods(row):
            desc = row.summary
            if row.ws:
                desc += (" [websocket — hijacked on Upgrade; the "
                         "non-upgrade GET falls to the 404 fallback]")
            entry["ops"].append((m, desc))
    for spath in sorted(paths):
        entry = paths[spath]
        lines.append("  %s:" % spath)
        if entry["params"]:
            lines.append("    parameters:")
            for p in entry["params"]:
                lines.append("      - name: %s" % p["name"])
                lines.append("        in: %s" % p["in"])
                lines.append("        required: %s" % (
                    "true" if p["required"] else "false"))
                lines.append("        schema:")
                lines.append("          type: string")
        for m, desc in entry["ops"]:
            lines.append("    %s:" % m)
            lines.append("      summary: %s" % json.dumps(desc))
            lines.append("      responses:")
            lines.append("        '200':")
            lines.append("          description: ok (shape pinned by goldens)")
    return "\n".join(lines) + "\n"


def main():
    if "--check" in sys.argv:
        ok = True
        for path, text in ((DOC_PATH, gen_doc()), (SPEC_PATH, gen_spec())):
            if path.read_text() != text:
                print("STALE: %s (regenerate: .venv/bin/python "
                      "tools/gen_api_docs.py)" % path)
                ok = False
        return 0 if ok else 1
    DOC_PATH.write_text(gen_doc())
    SPEC_PATH.write_text(gen_spec())
    print("wrote %s + %s (%d routes)" % (DOC_PATH, SPEC_PATH,
                                         len(gateway.ROUTES)))


if __name__ == "__main__":
    sys.exit(main())
