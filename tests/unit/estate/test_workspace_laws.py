"""Workspace-laws tripwires (no server needed).

Laws codified: secrets stay ignored, study clones stay ignored, no
packages glob in pnpm-workspace, no derived artifact at web root,
gen_registry.py dry-run reports zero drift, pnpm parses.

STRUCTURE: every test takes the root `repo` fixture (tests/conftest.py)
explicitly -- no hidden state, no local second derivation (fixture
audit 2026-09-04, F1).
"""
import json
import os
import subprocess

import pytest


def _read(rel, repo):
    with open(os.path.join(repo, rel), encoding="utf-8") as f:
        return f.read()


def _exists(rel, repo):
    return os.path.exists(os.path.join(repo, rel))


class TestSecretSafety:
    def test_keystore_ignored(self, repo):
        for rel in ("data/llm_keystore.json", "data/llm_keystore.key"):
            r = subprocess.run(
                ["git", "check-ignore", "-v", rel],
                cwd=repo, capture_output=True, text=True)
            assert r.returncode == 0, \
                f"{rel} is NOT ignored: {r.stderr}"
            assert "data/**" in r.stdout, \
                f"unexpected rule for {rel}: {r.stdout}"

    def test_study_clone_ignored(self, repo):
        r = subprocess.run(
            ["git", "check-ignore", "-v", "references/comfy-mcp/README.md"],
            cwd=repo, capture_output=True, text=True)
        assert r.returncode == 0, f"study clone not ignored: {r.stderr}"


class TestPnpmWorkspace:
    def test_no_packages_glob(self, repo):
        body = _read("pnpm-workspace.yaml", repo)
        assert "'packages/*'" not in body, \
            "pnpm-workspace.yaml still globs packages/*"

    def test_workspace_parses(self, repo):
        r = subprocess.run(
            ["pnpm", "ls", "-r", "--depth", "-1"],
            cwd=repo, capture_output=True, text=True, timeout=60)
        assert r.returncode == 0, f"pnpm ls failed: {r.stderr[:300]}"
        n = sum(1 for ln in r.stdout.splitlines()
                if ln.lstrip().startswith(("@", "|")) or "PRIVATE" in ln)
        assert n > 18, f"only {n} members -- workspace regressed?"

    def test_gen_registry_dry_run(self, repo):
        r = subprocess.run(
            ["python3", "tools/gen_registry.py"],
            cwd=repo, capture_output=True, text=True, timeout=60)
        assert r.returncode == 0, \
            f"registry drift: stdout={r.stdout[:200]} stderr={r.stderr[:200]}"
        assert "matches the packages" in r.stdout


class TestDerivedArtifactHome:
    def test_no_registry_at_web_root(self, repo):
        assert not _exists("web/registry.json", repo), \
            "web/registry.json exists at the web root"

    def test_generated_registry_present(self, repo):
        assert _exists("web/generated/registry.json", repo)
        data = json.loads(_read("web/generated/registry.json", repo))
        assert "items" in data
        assert len(data["items"]) > 0
        for it in data["items"][:3]:
            assert "name" in it
            assert "package" in it

    def test_no_packages_dir(self, repo):
        assert not _exists("packages", repo), \
            "packages/ directory exists -- the straggler dir is back"
