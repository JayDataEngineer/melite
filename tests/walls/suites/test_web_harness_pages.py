#!/usr/bin/env python3
"""test_web_harness_pages.py — the harness-page freshness gate.

The editor's dedicated test pages (*.html in the editor root that mount a
/src/__e2e__/ entry) rotted ONCE, silently, end to end (2026-10-02 postmortem):

  1. the entry source was deleted and nothing noticed (loading-bar-harness);
  2. the pages used ABSOLUTE src ("/src/..."), which 404s under the vite
     base '/editor/' in dev — the module never loaded and the lane rotted
     invisibly;
  3. the pages were never build inputs, so the DSH embed (melite-card-deck
     serves editor/dist under /editor/) could never reach them at all.

This gate encodes the healthy shape as data, so any recurrence fails HERE,
at test time — never as a mystery blank page inside a lane:

  * every module-script src must be RELATIVE ("./src/...") and resolve
  * every such page must be a vite build input (dist inclusion)
  * every such page must be referenced by at least one e2e spec
  * every mounted entry must actually exist on disk

Run: python3 tests/walls/suites/test_web_harness_pages.py   (part of the python gate ladder)
"""
import os
import re
import unittest

from _anchor import REPO
EDITOR = os.path.join(REPO, "plugins", "web", "editor")

MODULE_SRC_RE = re.compile(r'<script[^>]+type="module"[^>]+src="([^"]+)"')
# Pages that deliberately do NOT mount an in-repo module entry (static
# previews with CDN deps) are out of scope for this gate.
REMOTE_SRC = ("http://", "https://", "//")


def _editor_root_htmls():
    return sorted(
        f for f in os.listdir(EDITOR)
        if f.endswith(".html") and os.path.isfile(os.path.join(EDITOR, f))
    )


def _module_srcs(html_name):
    with open(os.path.join(EDITOR, html_name), encoding="utf-8") as fh:
        html = fh.read()
    return MODULE_SRC_RE.findall(html)


class HarnessPageTests(unittest.TestCase):
    """Structural pins on every module-mounting html page in the editor root."""

    def test_at_least_the_two_harness_pages_exist(self):
        # The card harness + the loading-bar harness are the lane anchors.
        for name in ("card-harness.html", "loading-bar-harness.html"):
            self.assertTrue(
                os.path.isfile(os.path.join(EDITOR, name)),
                f"{name} missing — the browser lanes have no page to drive",
            )

    def test_module_srcs_are_relative_and_resolve(self):
        # The absolute "/src/..." form 404s under base '/editor/' in dev —
        # the module never loads and the page renders an empty root.
        for name in _editor_root_htmls():
            for src in _module_srcs(name):
                if src.startswith(REMOTE_SRC):
                    continue
                self.assertTrue(
                    src.startswith("./src/"),
                    f"{name}: module src {src!r} must be RELATIVE ('./src/...') — "
                    "absolute /src/ 404s under the '/editor/' base in dev",
                )
                target = os.path.normpath(os.path.join(EDITOR, src))
                self.assertTrue(
                    os.path.isfile(target),
                    f"{name}: module entry {src!r} does not exist — the harness "
                    "page rotted (entry deleted, page left behind)",
                )

    def test_every_module_page_is_a_vite_build_input(self):
        # Without an explicit rollupOptions.input entry, only index.html
        # lands in dist — the DSH embed serves editor/dist and could never
        # reach the page.
        with open(os.path.join(EDITOR, "vite.config.ts"), encoding="utf-8") as fh:
            vite_config = fh.read()
        for name in _editor_root_htmls():
            if not _module_srcs(name):
                continue  # static previews are not app entries
            self.assertIn(
                name,
                vite_config,
                f"{name} mounts a module but is NOT a vite build input — "
                "it will not land in editor/dist (the DSH embed window)",
            )

    def test_every_harness_page_is_driven_by_a_spec(self):
        # A page no spec drives is a page whose rot nobody would notice.
        e2e_dir = os.path.join(EDITOR, "e2e")
        specs = [
            f for f in os.listdir(e2e_dir)
            if f.endswith(".spec.ts") and os.path.isfile(os.path.join(e2e_dir, f))
        ]
        corpus = ""
        for spec in specs:
            with open(os.path.join(e2e_dir, spec), encoding="utf-8") as fh:
                corpus += fh.read()
        for name in _editor_root_htmls():
            if name == "index.html" or not _module_srcs(name):
                continue  # the app page is driven by every app spec
            self.assertIn(
                name,
                corpus,
                f"{name} is not referenced by any e2e spec — an undriven "
                "harness page is unguarded rot",
            )


if __name__ == "__main__":
    unittest.main()
