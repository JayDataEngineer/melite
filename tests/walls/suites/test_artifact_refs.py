"""ARTIFACT REFS WALL — the ONE resolver, all four forms, LOUD
refusals (2026-09-06 gap plug, operator order verbatim: "look for
testing gaps all over the library, and then plug them in").

Why this wall: `resolve_artifact_file` is the function behind every
card compose's artifact sweep (image-edit's image1 among them —
the 2026-09-05 incident this helper exists to kill). The sweep above
it (find_dangling_refs) had walls; the RESOLVER had zero direct
tests. QUEUE LANE LAW: a dangling ref is a 4xx at the validation
door, BEFORE any run registers — this wall pins every form and every
refusal path of that promise.

No GPU, no network. tmpdir fixtures for the on-disk forms."""

import os
import pathlib
import sys
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "python"))

from artifact_refs import (  # noqa: E402
    ASSET_RUNS_PREFIX,
    ArtifactRefError,
    resolve_artifact_file,
)


class TestResolveArtifactFile(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = os.path.join(self._tmp.name, "out")
        # a live artifact under the run root
        self.run_dir = os.path.join(self.root, "run-abc")
        os.makedirs(self.run_dir, exist_ok=True)
        self.png = os.path.join(self.run_dir, "image.png")
        with open(self.png, "wb") as fh:
            fh.write(b"\x89PNG\r\n\x1a\n")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _resolve(self, ref: str) -> str:
        return resolve_artifact_file(ref, out_root=self.root)

    # ── form 1: absolute disk path ────────────────────────────────

    def test_absolute_path_resolves_when_the_file_exists(self) -> None:
        self.assertEqual(self._resolve(self.png), self.png)

    def test_absolute_path_missing_file_refuses_naming_the_lookup(self) -> None:
        missing = os.path.join(self._tmp.name, "nope.png")
        with self.assertRaises(ArtifactRefError) as cm:
            self._resolve(missing)
        self.assertIn("nope.png", str(cm.exception))

    # ── form 2: the estate's artifact URL ─────────────────────────

    def test_artifact_url_maps_under_the_run_root(self) -> None:
        url = ASSET_RUNS_PREFIX + "run-abc/image.png"
        self.assertEqual(self._resolve(url), self.png)

    def test_malformed_artifact_url_refuses_naming_the_want(self) -> None:
        for bad in (ASSET_RUNS_PREFIX,                       # no rel
                    ASSET_RUNS_PREFIX + "run-abc/",          # no file
                    ASSET_RUNS_PREFIX + "image.png"):        # no run
            with self.assertRaises(ArtifactRefError) as cm:
                self._resolve(bad)
            self.assertIn("malformed artifact URL", str(cm.exception))
            self.assertIn("/v1/assets/runs/<run_id>/<file>",
                          str(cm.exception))

    # ── form 3: runs-relative <run>/<file> ────────────────────────

    def test_runs_relative_ref_resolves(self) -> None:
        self.assertEqual(self._resolve("run-abc/image.png"), self.png)

    def test_bare_filename_is_not_this_resolver_s_form(self) -> None:
        # a bare name is the CALLER's form (the ComfyUI input dir) —
        # the resolver refuses it rather than guessing a root
        with self.assertRaises(ArtifactRefError):
            self._resolve("image.png")

    # ── the loud refusals ─────────────────────────────────────────

    def test_empty_ref_refuses(self) -> None:
        with self.assertRaises(ArtifactRefError) as cm:
            self._resolve("   ")
        self.assertIn("empty artifact ref", str(cm.exception))

    def test_traversal_refuses_in_every_form(self) -> None:
        for bad in ("../secrets.png",
                    ASSET_RUNS_PREFIX + "run/../../secrets.png",
                    "run-abc/../../../etc/passwd"):
            with self.assertRaises(ArtifactRefError) as cm:
                self._resolve(bad)
            self.assertIn("traversal", str(cm.exception))

    def test_directory_ref_refuses_as_not_a_file(self) -> None:
        with self.assertRaises(ArtifactRefError):
            self._resolve("run-abc")

    def test_refusal_quotes_the_ref_and_the_lookup_root(self) -> None:
        with self.assertRaises(ArtifactRefError) as cm:
            self._resolve("run-zzz/image.png")
        msg = str(cm.exception)
        self.assertIn("run-zzz/image.png", msg)
        self.assertIn(self.root, msg)


if __name__ == "__main__":
    unittest.main()
