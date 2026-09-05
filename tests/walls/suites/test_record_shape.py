"""Record-shape wall (DOCUMENTATION LAW): every record carries Date +
Status — the shape that survives compaction.

The law (AGENTS.md, 2026-09-05): session context is ephemeral; the tree
is the only memory. A record a future session can act on ALONE states
WHEN it was decided (a 2026-NN-NN date) and WHERE it stands (a status
word) near its head — a title-only doc is a mystery box the next reader
must archaeology. This wall refuses:

  1. UNDATED records — no date in the head block.
  2. UNGRADED records — no status word in the head block.
  3. UNNAMED walls — AGENTS.md's DOCUMENTATION LAW must cite this file
     (LAW TEXT HYGIENE's mirror: a law that names a wall is named by it).

Status vocabulary (case-insensitive): THINKING | landed | law | live |
resolved | recorded | audited | superseded.
"""

import os
import re

from _anchor import REPO

_DATE_RE = re.compile(r"2026-\d{2}-\d{2}")
_STATUS_RE = re.compile(
    r"\b(thinking|landed|law|live|resolved|recorded|audited|superseded)\b",
    re.IGNORECASE)
_HEAD_LINES = 12

_SCOPE_DIRS = ("docs/design", "docs/audits")


def test_every_record_carries_date_and_status() -> None:
    bad: list[str] = []
    checked = 0
    for scope in _SCOPE_DIRS:
        root = os.path.join(REPO, scope)
        assert os.path.isdir(root), "record scope missing: %s" % scope
        for name in sorted(os.listdir(root)):
            if not name.endswith(".md"):
                continue
            path = os.path.join(root, name)
            head = "\n".join(
                open(path, encoding="utf-8").read().splitlines()[:_HEAD_LINES])
            checked += 1
            if not _DATE_RE.search(head):
                bad.append("%s: no date in the first %d lines"
                           % (os.path.join(scope, name), _HEAD_LINES))
            elif not _STATUS_RE.search(head):
                bad.append("%s: no status word in the first %d lines"
                           % (os.path.join(scope, name), _HEAD_LINES))
    assert checked > 0, "wall walked zero records — scope broke"
    assert not bad, (
        "records a future session cannot act on alone (DOCUMENTATION "
        "LAW: date + status near the head): %s" % bad)


def test_the_law_names_this_wall() -> None:
    law = open(os.path.join(REPO, "AGENTS.md"), encoding="utf-8").read()
    assert "tests/walls/suites/test_record_shape.py" in law, (
        "DOCUMENTATION LAW must cite its wall (LAW TEXT HYGIENE's "
        "mirror: the wall checks the law that names it)")
    assert "DOCUMENTATION LAW" in law
