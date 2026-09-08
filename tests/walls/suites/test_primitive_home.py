"""test_primitive_home — ROW 5 / PRIMITIVE HOME LAW (2026-09-07).

Cross-genre primitives live genre-neutral: a package consumed from
inside one card's dir is a second home claim waiting to drift. This
wall refuses two shapes (pure tree walk, no node needed):

  1. MISPLACED PACKAGE — the @melite-plugin/timeline package (video
     AND motion consumers) must not live under any card dir. Landed
     2026-09-07: video/h3-timeline/ui → packages/web-kit/timeline, zero consumer
     changes (the package NAME is unchanged; only the home moved).
  2. PATH-CONSUMED PACKAGE — no .ts/.tsx relative import may target
     a directory that owns a package.json under a DIFFERENT card
     tree. Packages are consumed BY NAME (workspace links); a
     relative reach into another card's package is the exact
     sibling-dir coupling the law exists to prevent. (Reaching
     into a card's non-package tenant dir — e.g. editor tests
     importing a studio component — is not a package consumption
     and stays legal.)

Design record: docs/design/studio-shell.md §6.
"""
import json
import os
import re

REPO = os.path.normpath(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "..", "..", ".."))

_REL_IMPORT_RE = re.compile(r"""from\s+['"](\.[^'"]*)['"]""")
_EXTS = (".ts", ".tsx", ".js", ".jsx")


def _owner_package(path: str) -> str | None:
    """Nearest ancestor dir (incl. self) owning a package.json."""
    d = os.path.dirname(os.path.abspath(path))
    while True:
        if os.path.isfile(os.path.join(d, "package.json")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def _under_action_cards(d: str) -> bool:
    return "/action_cards/" in d.replace(os.sep, "/")


def _pkg_name(pkg_dir: str) -> str:
    try:
        return json.load(open(os.path.join(
            pkg_dir, "package.json"), encoding="utf-8")).get("name", "?")
    except Exception:
        return "?"


def test_timeline_package_lives_outside_card_dirs() -> None:
    found = []
    for root, _dirs, files in os.walk(REPO):
        if "node_modules" in root.split(os.sep):
            continue
        if "package.json" in files:
            if _pkg_name(root) == "@melite-plugin/timeline":
                found.append(root)
    assert found, "@melite-plugin/timeline package vanished from the tree"
    for home in found:
        assert not _under_action_cards(home), (
            "PRIMITIVE HOME LAW: @melite-plugin/timeline lives inside "
            "a card dir (%s) — cross-genre primitives live genre-neutral"
            % home)


def test_no_relative_import_reaches_another_cards_package() -> None:
    bad: list[str] = []
    for root, _dirs, files in os.walk(os.path.join(REPO, "packages")):
        if "node_modules" in root.split(os.sep):
            continue
        for name in files:
            if not name.endswith(_EXTS):
                continue
            src = os.path.join(root, name)
            try:
                text = open(src, encoding="utf-8").read()
            except Exception:
                continue
            owner = _owner_package(src)
            for m in _REL_IMPORT_RE.finditer(text):
                target = os.path.normpath(
                    os.path.join(os.path.dirname(src), m.group(1)))
                t_owner = _owner_package(target)
                if t_owner is None or t_owner == owner:
                    continue
                if _under_action_cards(t_owner) and (
                        owner is None or _under_action_cards(owner or "")):
                    bad.append("%s reaches %s (%s) by relative path — "
                               "consume packages by name"
                               % (os.path.relpath(src, REPO),
                                  os.path.relpath(t_owner, REPO),
                                  _pkg_name(t_owner)))
    assert not bad, (
        "PRIMITIVE HOME LAW: relative imports into another card's "
        "package:\n" + "\n".join(bad[:10]))
