"""/v1/manage -- the ONE management door (provisioning law).

Covers the action-dispatch envelope: unknown actions refuse with
422, status action dispatches, missing action is a validation
error, no shadow doors. Live-gateway; uses the live client.
"""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import GatewayClient


class TestManageEnvelope:
    # the action dispatch + the envelope contract. status is a
    # non-mutating probe -- the dispatch + response shape is the
    # wall; the action downstream liveness is not this gate concern.

    def test_unknown_action_rejected(self, live: "GatewayClient") -> None:
        code, body = live.post("/v1/manage",
                                   {"action": "__nonexistent__"})
        assert code in (400, 422)
        assert "detail" in body

    def test_status_action_dispatches(self, live: "GatewayClient") -> None:
        code, body = live.post("/v1/manage", {"action": "status"})
        assert code == 200
        assert body.get("action") == "status"
        assert isinstance(body.get("ok"), bool)
        assert isinstance(body.get("detail"), str)
        assert "data" in body

    def test_missing_action_field_rejected(self, live: "GatewayClient") -> None:
        code, body = live.post("/v1/manage", {})
        assert code in (400, 422)
        assert "detail" in body


class TestManageDoorSingularity:
    # provisioning law: /v1/manage is the ONE management door.
    # C-era siblings (download, provision, install) are cut. This is
    # the live regression guard -- if any shadow door reappears,
    # the ONE-DOOR law is broken.

    def test_no_shadow_door(self, live: "GatewayClient") -> None:
        for shadow in (
            "/v1/models/provision",
            "/v1/models/download",
            "/v1/download_model",
            "/v1/install_extension",
        ):
            code, _ = live.post(shadow, {})
            assert code == 404, \
                f"{shadow} is back (code {code}) -- the ONE-DOOR law broke"
