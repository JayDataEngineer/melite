#!/usr/bin/env python3
"""DSH PLUGIN CLIENT HYGIENE wall — no chrome-driving tick machines.

Operator context (2026-09-05, "the add tab menu flashes in and out"):
the ray-card-deck shipped a 400ms auto-open state machine that drove the
HOST shell with synthetic clicks — the better-sidebar expand toggle, the
"+" button, the menu's "Ray Media" item. Its latch target had already
been removed from that plugin (commit 20eb2c5, operator order — media
moved to @infer-media/dsh-media), so the machine could never latch and
instead toggled the host's "+ New tab" menu open/closed every 400ms,
forever, on every page that carried the plugin (reproduced on the
remote-web-ui profile; a synthetic el.click() fires no pointerdown, so
nothing in the shell's outside-dismiss machinery ever saw it). The fix
deleted the machine; these walls pin the CLASS, not just the instance:

1. No timer-driven clicks — a setInterval/setTimeout callback in a dsh
   plugin source may never call .click(). Reachability belongs to the
   user (the + menu lists registered tabs) or to the betterSidebar
   service API (bs.openTab) — never to synthetic clicks on the shell's
   buttons. A plugin that cannot tell whether its target still exists
   must not click it in a loop.
2. No host-chrome hunt markers — dsh plugin sources never reference the
   shell's internal selectors, hashed class names, or host-wide button
   sweeps. A plugin styles and drives ITS OWN surface (its panels, its
   embed iframe via frame.contentDocument) only.

Run: pytest tests/walls/suites/test_dsh_plugin_hygiene.py -v
"""
from __future__ import annotations

import re
from collections.abc import Iterator
from pathlib import Path

from _anchor import REPO

DSH_ROOTS = [
    REPO / "packages" / "harness" / "dsh",
    REPO / "packages" / "web" / "dsh",
]

# Timer callbacks whose click is justified — stem -> reason. EMPTY today:
# an exception is a deliberate, explained act, not a workaround.
TIMER_CLICK_ALLOWLIST: dict[str, str] = {}

# Files allowed to carry host-chrome markers — name -> reason. EMPTY today.
# (embed-bridge.ts drives the EMBEDDED canvas iframe's own document via
# frame.contentDocument on load/user events, not the host shell on a
# timer — and carries none of the banned markers.)
HOST_CHROME_MARKER_ALLOWLIST: dict[str, str] = {}

# Markers only the DSH shell owns: better-sidebar's + button class, its
# build-hashed panel classes, its menu-item roles, its expand-toggle
# aria-label. (Document-wide column queries are pinned separately and
# precisely in test_the_card_bleed_never_reaches_the_right_panel — a
# blanket document.querySelectorAll ban would forbid the composer-seed
# lookup, the sanctioned shape.)
HOST_CHROME_MARKERS = (
    "tabBarPlus",
    "nArs4W_panel",
    "panelHidden",
    "Expand sidebar",
    "[role=menuitem]",
    "[role=option]",
)

SOURCE_SUFFIXES = {".ts", ".tsx", ".mjs", ".js"}

TIMER_CALL = re.compile(r"\b(?:setInterval|setTimeout)\s*\(")
CLICK_CALL = re.compile(r"\.click\s*\(")


def _plugin_sources() -> Iterator[Path]:
    """Every non-test source file in the dsh plugin packages."""
    for root in DSH_ROOTS:
        if not root.exists():
            continue
        for pkg in sorted(p for p in root.iterdir() if p.is_dir()):
            src = pkg / "src"
            if not src.exists():
                continue
            for path in sorted(src.rglob("*")):
                if path.suffix not in SOURCE_SUFFIXES or path.name.endswith(".d.ts"):
                    continue
                if ".test." in path.name or ".spec." in path.name:
                    continue
                yield path


def _mask_strings_and_comments(text: str) -> str:
    """Blank string literals and comments (keeps offsets, drops content)."""
    out = list(text)
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if c in ("'", '"', "`"):
            quote = c
            out[i] = " "
            i += 1
            while i < n and text[i] != quote:
                if text[i] == "\\":
                    out[i] = " "
                    i += 1
                out[i] = " " if text[i] != "\n" else "\n"
                i += 1
            if i < n:
                out[i] = " "
        elif text.startswith("//", i):
            while i < n and text[i] != "\n":
                out[i] = " "
                i += 1
        elif text.startswith("/*", i):
            end = text.find("*/", i + 2)
            end = n if end == -1 else end + 2
            while i < end:
                out[i] = "\n" if text[i] == "\n" else " "
                i += 1
        i += 1
    return "".join(out)


def _timer_callbacks(masked: str) -> Iterator[str]:
    """Yield the first (callback) argument of every timer call, strings
    masked. Balanced-paren scan from each call site's opening paren."""
    for m in TIMER_CALL.finditer(masked):
        depth = 0
        i = m.end()  # just past '('
        start = i
        while i < len(masked):
            c = masked[i]
            if c == "(":
                depth += 1
            elif c == ")":
                if depth == 0:
                    break
                depth -= 1
            elif c == "," and depth == 0:
                break  # end of the first argument
            i += 1
        yield masked[start:i]


def test_no_timer_driven_clicks() -> None:
    """A dsh plugin timer callback may never .click() — the flash bug's
    exact mechanism (a 400ms interval toggling the host's + menu)."""
    offenders = []
    for path in _plugin_sources():
        if path.stem in TIMER_CLICK_ALLOWLIST:
            continue
        masked = _mask_strings_and_comments(path.read_text())
        for body in _timer_callbacks(masked):
            if CLICK_CALL.search(body):
                offenders.append(str(path.relative_to(REPO)))
                break
    assert not offenders, (
        "dsh plugin timer callbacks drive UI with synthetic clicks:\n%s\n"
        "Reachability belongs to the user or bs.openTab — never to a "
        "timer clicking the shell's buttons (2026-09-05 '+ menu flashes' "
        "bug class). If an exception is genuinely justified, add it to "
        "TIMER_CLICK_ALLOWLIST with a reason." % "\n".join(sorted(set(offenders)))
    )


def test_no_host_chrome_hunt_markers() -> None:
    """dsh plugin sources must not hunt the shell's internals — hashed
    classes, menu roles, document-wide button sweeps, the expand label."""
    offenders = []
    for path in _plugin_sources():
        if path.name in HOST_CHROME_MARKER_ALLOWLIST:
            continue
        text = path.read_text()
        hits = [marker for marker in HOST_CHROME_MARKERS if marker in text]
        if hits:
            offenders.append(f"{path.relative_to(REPO)}: {', '.join(hits)}")
    assert not offenders, (
        "dsh plugin sources reference host-shell internals:\n%s\n"
        "A plugin drives ITS OWN surface only (its panels, its embed "
        "iframe via frame.contentDocument). Hunting shell chrome is how "
        "the 2026-09-05 flash bug was built." % "\n".join(sorted(offenders))
    )


def test_the_card_bleed_never_reaches_the_right_panel() -> None:
    """RIGHT-PANEL LAW (operator order, 2026-09-05, verbatim): "No
    matter what, I never want to see the full card bleed in the right
    panel. That whole issue is why the extension is in this messed-up
    state." The retired deck-fullbleed queried the hashed center-
    column class DOCUMENT-WIDE — a global match that can hit the
    better-sidebar's own column tree. Pins:
    1. no document-wide query for the hashed center-column guess, in
       any dsh plugin source (ancestor .matches()/.closest() on the
       composer's own chain is the only sanctioned shape);
    2. every display:none rule in deck-fullbleed is scoped under the
       plugin's own placed column attribute (data-ray-deck-column) —
       no rule can match an element the module did not explicitly
       claim;
    3. the column claim is composer-seeded with a right-panel host
       refusal, and the sidebar entry refuses on a null claim.
    """
    # 1. the banned document-wide hashed center-column query.
    doc_query = re.compile(r"document\.querySelector(?:All)?\([^)]*centerCol")
    for path in _plugin_sources():
        text = path.read_text()
        assert doc_query.search(text) is None, (
            f"{path.relative_to(REPO)} queries the hashed center-column "
            "class document-wide — the 2026-09-05 right-panel bleed "
            "vector. Seed at the composer and walk its own ancestry "
            "(.matches()/.closest()) instead."
        )

    # 2/3. the deck fullbleed contract. OVERLAY_CSS is one backtick
    # rule per array element — every rule that hides must carry the
    # COLUMN_HOST_ATTR identifier (the placed-only scope).
    fb = REPO / "packages/web/dsh/melite-card-deck/src/client/deck-fullbleed.ts"
    assert fb.exists(), "deck-fullbleed.ts is the bleed owner — it must exist"
    text = fb.read_text()
    start = text.index("const OVERLAY_CSS")
    end = text.index("].join", start)
    css_block = text[start:end]
    rules = re.findall(r"`([^`]*)`", css_block)
    assert rules, "OVERLAY_CSS backtick rules not found — shape drifted"
    for rule in rules:
        if "display: none" in rule or "display:none" in rule:
            assert "COLUMN_HOST_ATTR" in rule, (
                "deck-fullbleed has a hiding rule NOT scoped under the "
                "placed column attribute — a right-panel bleed vector:\n"
                + rule.strip()
            )
    assert "COMPOSER_SEED_SEL" in text, "composer-seeded claim missing"
    assert text.index("COMPOSER_SEED_SEL") < text.index("export function claimCenterColumn"), (
        "the claim must be seeded, not guessed"
    )
    assert "closest(RIGHT_PANEL_HOST_SEL)" in text, "right-panel host refusal missing"

    entry = REPO / "packages/web/dsh/melite-card-deck/src/client/deck-sidebar-entry.tsx"
    assert entry.exists()
    entry_text = entry.read_text()
    assert "claimCenterColumn()" in entry_text, "entry must claim via the proven anchor"
    assert "refusing to guess" in entry_text, "entry must refuse on a null claim"


def test_the_deck_machine_stays_dead() -> None:
    """The specific fossil stays dead: no interval in the 300-500ms band
    with a latch query in any ray/melite/infer dsh client (the flash
    cadence signature, recorded so the class wall's blind spots stay
    visible — e.g. a dispatchEvent-based driver with no .click)."""
    for path in _plugin_sources():
        masked = _mask_strings_and_comments(path.read_text())
        for body in _timer_callbacks(masked):
            tail = masked[masked.find(body) + len(body): masked.find(body) + len(body) + 40]
            if re.search(r",\s*(?:3|4)\d{2}\s*\)", tail) and "querySelector" in body:
                raise AssertionError(
                    f"{path.relative_to(REPO)} re-introduced a ~400ms "
                    "latch-polling interval — the '+ menu flash' cadence. "
                    "Reachability is the user's or bs.openTab's job."
                )
