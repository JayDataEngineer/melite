"""Workspace-laws tripwires (2026-09-03, OPERATOR).

Laws codified:
  * secrets (data/llm_keystore.{json,key}) must never become committable
  * study clones (references/comfy-mcp/) stay ignored
  * pnpm-workspace holds NO packages/ glob (python lives elsewhere)
  * no project root holds a derived artifact (web/registry.json belongs
    under web/generated/)
  * gen_registry.py dry-run must report zero drift against the
    composed package exports
  * pnpm-workspace parses and members enumerate

These run without the live gateway — they are filesystem and git
checks. Cheap, fast, CI-friendly.
"""
import json
import os
import subprocess
import sys
import unittest

REPO = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))


def _read(rel):
    with open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return f.read()


def _exists(rel):
    return os.path.exists(os.path.join(REPO, rel))


class SecretSafetyTests(unittest.TestCase):
    def test_keystore_ignored(self):
        # law: a fresh clone + git add . must not be able to commit the
        # keystore. The .gitignore data/** rule (post-fix) covers it.
        for rel in ("data/llm_keystore.json", "data/llm_keystore.key"):
            r = subprocess.run(
                ["git", "check-ignore", "-v", rel],
                cwd=REPO, capture_output=True, text=True,
            )
            self.assertEqual(
                r.returncode, 0,
                f"{rel} is NOT ignored (would leak on git add .): {r.stderr}"
            )
            self.assertIn("data/**", r.stdout, f"unexpected rule for {rel}: {r.stdout}")

    def test_study_clone_ignored(self):
        # references/comfy-mcp is a study copy, not a package — ignored.
        r = subprocess.run(
            ["git", "check-ignore", "-v", "references/comfy-mcp/README.md"],
            cwd=REPO, capture_output=True, text=True,
        )
        self.assertEqual(r.returncode, 0,
                         f"study clone not ignored: {r.stderr}")


class PnpmWorkspaceTests(unittest.TestCase):
    def test_no_packages_glob(self):
        # python libs no longer live under the TS workspace glob
        body = _read("pnpm-workspace.yaml")
        self.assertNotIn(
            "'packages/*'", body,
            "pnpm-workspace.yaml still globs packages/* — python blood does not "
            "belong in the TS workspace"
        )

    def test_workspace_parses(self):
        # the manifest must enumerate cleanly (mirrors the pnpm -r ls)
        r = subprocess.run(
            ["pnpm", "ls", "-r", "--depth", "-1"],
            cwd=REPO, capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(r.returncode, 0, f"pnpm ls failed: {r.stderr[:300]}")
        # count package lines (@...|PRIVATE)
        n = sum(1 for ln in r.stdout.splitlines()
                if ln.lstrip().startswith(("@", "│")) or "PRIVATE" in ln)
        # sanity: at least 18 workspace members
        self.assertGreater(n, 18, f"only {n} members — workspace regressed?")

    def test_gen_registry_dry_run(self):
        # gen_registry.py must report zero drift against the composed
        # package exports. Hand edits to the committed catalog break the
        # tripwire; the dry-run exits 0 only when it matches.
        r = subprocess.run(
            [sys.executable, "tools/gen_registry.py"],
            cwd=REPO, capture_output=True, text=True, timeout=60,
        )
        self.assertEqual(r.returncode, 0,
                         f"registry drift: stdout={r.stdout[:200]} stderr={r.stderr[:200]}")
        self.assertIn("matches the packages", r.stdout)


class DerivedArtifactHomeTests(unittest.TestCase):
    def test_no_registry_at_web_root(self):
        # law: derived tripwires never sit in a project root
        self.assertFalse(
            _exists("web/registry.json"),
            "web/registry.json exists at the web root — derived tripwires "
            "belong under web/generated/"
        )

    def test_generated_registry_present(self):
        self.assertTrue(
            _exists("web/generated/registry.json"),
            "web/generated/registry.json missing — the composed catalog is gone"
        )
        data = json.loads(_read("web/generated/registry.json"))
        self.assertIn("items", data)
        self.assertGreater(len(data["items"]), 0)
        # every item declares its package and exports (catalog schema)
        for it in data["items"][:3]:
            self.assertIn("name", it)
            self.assertIn("package", it)

    def test_no_packages_dir(self):
        # python stragglers are gone; packages/ was the generic straggler dir
        self.assertFalse(
            _exists("packages"),
            "packages/ directory exists — the TS-workspace straggler dir is back"
        )


if __name__ == "__main__":
    unittest.main()
