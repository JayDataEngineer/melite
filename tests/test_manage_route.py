"""/v1/manage — the ONE management door (provisioning law).

Covers the action-dispatch envelope end-to-end against the LIVE
gateway:
  * unknown actions refuse with 422 (pydantic enum validation, not 400)
  * known actions (status = non-mutating liveness probe) dispatch and
    echo the action + ok + detail + data envelope
  * missing action field is a validation error
  * no shadow doors (C-era siblings stay 404 — the ONE-DOOR law)

A live gateway is required at 127.0.0.1:33081 (overridable via
TEST_GATEWAY_BASE).
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import _live
import _http as hh  # noqa: E402


class ManageEnvelopeTests(_live.LiveRequired, unittest.TestCase):
    # the action dispatch + the envelope contract. status is a
    # non-mutating probe — the dispatch + response shape is the wall;
    # the action's downstream liveness (ComfyUI :18466 reachable) is
    # not what this test pins.

    def test_unknown_action_rejected(self):
        code, body = hh.post("/v1/manage", {"action": "__nonexistent__"})
        self.assertIn(
            code, (400, 422),
            f"unknown action returned {code}: {body!r}"
        )
        self.assertIn("detail", body)

    def test_status_action_dispatches(self):
        code, body = hh.post("/v1/manage", {"action": "status"})
        self.assertEqual(code, 200, f"status dispatch failed: {body!r}")
        self.assertEqual(body.get("action"), "status")
        self.assertIsInstance(body.get("ok"), bool)
        self.assertIsInstance(body.get("detail"), str)
        self.assertIn("data", body)

    def test_missing_action_field_rejected(self):
        code, body = hh.post("/v1/manage", {})
        self.assertIn(
            code, (400, 422),
            f"missing action returned {code}: {body!r}"
        )
        self.assertIn("detail", body)


class ManageDoorSingularityTests(_live.LiveRequired, unittest.TestCase):
    # provisioning law: /v1/manage is the ONE management door. C-era
    # siblings (download, provision, install) are cut. This is the live
    # regression guard — if any shadow door reappears, the law breaks.

    def test_no_shadow_door(self):
        for shadow in (
            "/v1/models/provision",
            "/v1/models/download",
            "/v1/download_model",
            "/v1/install_extension",
        ):
            code, _ = hh.post(shadow, {})
            self.assertEqual(
                code, 404,
                f"{shadow} is back (code {code}) — the ONE-DOOR law broke"
            )


if __name__ == "__main__":
    unittest.main()
