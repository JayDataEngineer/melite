#!/usr/bin/env python3
"""LAW TEXT HYGIENE wall — AGENTS.md path claims vs the tree.

A law that names a file teaches that file's existence. When the file
dies, the law text must die in the same stroke (the meta-rule, added
2026-09-04 after the first law audit found a dead /generate door, an
extinct card_knobs.yaml SSOT, pre-reorg plugin paths, and audit
journal accretion inside AGENTS.md). This wall makes the rot
mechanical: every backticked file PATH in AGENTS.md must exist in the
tree unless explicitly allowlisted as deliberate dead provenance
(things the laws cite AS deleted).

Scope rules (deliberate):
- backticks only — plain prose mentions are narrative, not claims
- must carry a file extension (dirs and placeholders don't pin bytes)
- must contain a "/" — a bare `plugin.py` names a convention, not a
  repo location
- tokens with "<" or "$" are templates; "~"-relative paths are
  operator-machine facts the repo cannot pin
"""
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
AGENTS = REPO / "AGENTS.md"

# Dead things the laws cite AS dead — history, not a live claim.
DEAD_PROVENANCE = {
    "src/server.cpp",    # C retirement names the deletion itself
    "card_knobs.yaml",   # the knob SSOT that went extinct (class flip)
    "bootstrap.py",      # provisioning law: "is deleted"
}

FILEISH = re.compile(
    r"`([A-Za-z0-9_./$~<>-]+\.(?:py|yaml|yml|md|cpp|toml|json|ts|tsx|sh))`")


def _law_path_claims():
    for m in FILEISH.finditer(AGENTS.read_text()):
        tok = m.group(1)
        if "/" not in tok or "<" in tok or "$" in tok or tok.startswith("~"):
            continue
        yield tok


def test_every_file_path_named_by_a_law_exists():
    missing = sorted({
        tok for tok in _law_path_claims()
        if tok not in DEAD_PROVENANCE and not (REPO / tok).exists()
    })
    assert not missing, (
        "AGENTS.md names file paths that do not exist — law text drift. "
        "Fix the law in the SAME stroke that deleted the file "
        "(or extend DEAD_PROVENANCE only for things cited AS deleted):\n%s"
        % "\n".join(missing)
    )


def test_the_law_hygiene_wall_is_real():
    """The wall file the LAW TEXT HYGIENE section names must exist —
    a law may not cite a fictional enforcement."""
    assert Path(__file__).name == "test_law_hygiene.py"
    text = AGENTS.read_text()
    assert "test_law_hygiene.py" in text, (
        "LAW TEXT HYGIENE section lost its wall reference")
