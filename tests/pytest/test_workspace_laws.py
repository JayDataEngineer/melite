"""Workspace-laws tripwires (no server needed).

Laws codified: secrets stay ignored, study clones stay ignored, no
packages glob in pnpm-workspace, no derived artifact at web root,
gen_registry.py dry-run reports zero drift, pnpm parses.

STRUCTURE: a function-scoped REPO fixture (git rev-parse) replaces
the module-level constant. Every test takes REPO explicitly -- no
hidden state.
"""
import json
import os
import subprocess

import pytest


@pytest.fixture
def REPO():
    # git rev-parse is cheap and avoids the module-level constant
    # (a fixture makes the test honest about what it needs).
    return subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], text=True).strip()


def _read(rel, REPO):
    with open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return f.read()


def _exists(rel, REPO):
    return os.path.exists(os.path.join(REPO, rel))


class TestSecretSafety:
    def test_keystore_ignored(self, REPO):
        for rel in ("data/llm_keystore.json", "data/llm_keystore.key"):
            r = subprocess.run(
                ["git", "check-ignore", "-v", rel],
                cwd=REPO, capture_output=True, text=True)
            assert r.returncode == 0, \
                f"{rel} is NOT ignored: {r.stderr}"
            assert "data/**" in r.stdout, \
                f"unexpected rule for {rel}: {r.stdout}"

    def test_study_clone_ignored(self, REPO):
        r = subprocess.run(
            ["git", "check-ignore", "-v", "references/comfy-mcp/README.md"],
            cwd=REPO, capture_output=True, text=True)
        assert r.returncode == 0, f"study clone not ignored: {r.stderr}"


class TestPnpmWorkspace:
    def test_no_packages_glob(self, REPO):
        body = _read("pnpm-workspace.yaml", REPO)
        assert "'packages/*'" not in body, \
            "pnpm-workspace.yaml still globs packages/*"

    def test_workspace_parses(self, REPO):
        r = subprocess.run(
            ["pnpm", "ls", "-r", "--depth", "-1"],
            cwd=REPO, capture_output=True, text=True, timeout=60)
        assert r.returncode == 0, f"pnpm ls failed: {r.stderr[:300]}"
        n = sum(1 for ln in r.stdout.splitlines()
                if ln.lstrip().startswith(("@", "|")) or "PRIVATE" in ln)
        assert n > 18, f"only {n} members -- workspace regressed?"

    def test_gen_registry_dry_run(self, REPO):
        r = subprocess.run(
            ["python3", "tools/gen_registry.py"],
            cwd=REPO, capture_output=True, text=True, timeout=60)
        assert r.returncode == 0, \
            f"registry drift: stdout={r.stdout[:200]} stderr={r.stderr[:200]}"
        assert "matches the packages" in r.stdout


class TestDerivedArtifactHome:
    def test_no_registry_at_web_root(self, REPO):
        assert not _exists("web/registry.json", REPO), \
            "web/registry.json exists at the web root"

    def test_generated_registry_present(self, REPO):
        assert _exists("web/generated/registry.json", REPO)
        data = json.loads(_read("web/generated/registry.json", REPO))
        assert "items" in data
        assert len(data["items"]) > 0
        for it in data["items"][:3]:
            assert "name" in it
            assert "package" in it

    def test_no_packages_dir(self, REPO):
        assert not _exists("packages", REPO), \
            "packages/ directory exists -- the straggler dir is back"
