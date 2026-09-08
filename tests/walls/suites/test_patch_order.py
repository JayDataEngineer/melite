#!/usr/bin/env python3
"""Patch-order wall — the bundle patch row set is the boot order SSOT.

`packages/gateway/cordis.patch.yml` (`- insert:` rows, dsh-base shape)
is read by core/context.ts and created SEQUENTIALLY: registration
order IS dispatch order (the F3 stage-patch-before-greedy-draft
contract rides it — providers before consumers, gateway-errors
first, the gateway assembler last). A reordered/readdressed row
silently reroutes traffic, so the row ids, addresses, and order are
frozen here. No network, no GPU.

Run: pytest tests/walls/suites/test_patch_order.py -v
"""

from pathlib import Path

import pytest
import yaml

REPO = Path(__file__).resolve().parents[3]
PATCH = REPO / "packages" / "gateway" / "cordis.patch.yml"

# The frozen boot rows: (id, address). Order is the contract.
ROWS = [
    ("gateway-errors", "cordis:gateway-errors"),
    ("logger-console", "@deepseek-ai/cordis-plugin-logger-console"),
    ("timer", "@deepseek-ai/cordis-plugin-timer"),
    ("webserver", "@deepseek-ai/dsh-host-webserver"),
    ("storage-hub", "cordis:storage-hub"),
    ("storage-json", "cordis:storage-json"),
    ("storage-domain", "cordis:storage-domain"),
    ("gateway-uploads", "@melite/gateway-doors/uploads"),
    ("gateway-validate", "@melite/gateway-doors/validate"),
    ("gateway-flows-start", "@melite/gateway-doors/flows-start"),
    ("gateway-flows-status", "@melite/gateway-doors/flows-status"),
    ("gateway-flows-stop", "@melite/gateway-doors/flows-stop"),
    ("gateway-flows-resume", "@melite/queue/flows-resume"),
    ("gateway-flows-reproduce", "@melite/queue/flows-reproduce"),
    ("gateway-bridges", "@melite/gateway-doors/bridges"),
    ("gateway-discovery", "@melite/gateway-doors/discovery"),
    ("gateway-runs", "@melite/gateway-doors/runs"),
    ("gateway-chrome", "@melite/gateway-doors/chrome"),
    ("gateway-assets", "@melite/gateway-doors/assets"),
    ("gateway-drafts", "@melite/gateway-doors/drafts"),
    ("gateway-studios", "@melite/gateway-doors/studios"),
    ("gateway-planes", "@melite/gateway-doors/planes"),
    ("gateway", "cordis:gateway"),
]

# Rows whose config is built per boot (never pinned — the queue parity
# + e2e walls boot isolated roots via env).
RUNTIME_ROWS = {"storage-json", "storage-domain", "webserver", "gateway"}


def load_rows():
    doc = yaml.safe_load(PATCH.read_text(encoding="utf-8"))
    assert isinstance(doc, list) and len(doc) == 1
    rows = doc[0]["insert"]
    assert isinstance(rows, list)
    return rows


def test_row_ids_names_order():
    rows = load_rows()
    assert [(r["id"], r["name"]) for r in rows] == ROWS


def test_runtime_config_markers():
    rows = load_rows()
    for row in rows:
        if row["id"] in RUNTIME_ROWS:
            assert row.get("config") == "$runtime", row["id"]
        else:
            assert "config" not in row, row["id"]


def test_no_disabled_rows_without_cause():
    rows = load_rows()
    for row in rows:
        assert row.get("disabled") is not True, row["id"]


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q", "-p", "no:cacheprovider"]))
