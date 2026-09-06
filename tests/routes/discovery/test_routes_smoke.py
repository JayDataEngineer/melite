"""Route smokes for endpoints with NO other wall.

test_http_parity is golden-compared for the editor-data surface;
test_assets_route walls /v1/assets + run.completed; test_manage_route
walls /v1/manage. This file is the smoke wall for the remaining
list endpoints so a route that silently 404s (or drifts its
envelope) is caught.
"""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import GatewayClient


class TestLanesSmoke:
    # lane disclosure: every plugin can advertise its lanes; the
    # list route is the deck stable view.

    def test_envelope(self, live: "GatewayClient") -> None:
        code, body = live.get("/v1/lanes")
        assert code == 200
        assert set(body.keys()) == {"count", "lanes"}
        assert body["count"] == len(body["lanes"])
        assert body["count"] > 0

    def test_lane_row_keys(self, live: "GatewayClient") -> None:
        # params / skills / steps are engine-specific; only identity
        # keys are pinned.
        required = {"kind", "lane", "genre", "title", "description"}
        code, body = live.get("/v1/lanes")
        for lane in body["lanes"]:
            assert required.issubset(set(lane.keys())), \
                f"lane {lane.get('lane', '?')!r} dropped a key: {sorted(lane.keys())}"

    def test_no_model_rows(self, live: "GatewayClient") -> None:
        # Operator order, 2026-09-04: "The only way to actually do
        # inference is through action cards, yet I see the model level
        # as available for inference." The lane table is the CALLABLE
        # surface — models are NOT lanes (a model is a card parameter
        # + craft docs; model_catalog and the skills surface serve
        # them). This wall keeps the model level out of the callable
        # table forever.
        code, body = live.get("/v1/lanes")
        kinds = {lane["kind"] for lane in body["lanes"]}
        assert kinds <= {"action_card", "template"}, \
            f"non-callable lane classes leaked into /v1/lanes: {sorted(kinds)}"

    def test_model_kind_is_a_named_refusal(self, live: "GatewayClient") -> None:
        # kind="model" must refuse LOUDLY (never an empty table that
        # looks like "no models", never a 500) and teach where models
        # DO live — the peek error envelope carries the pointer.
        code, body = live.get("/v1/lanes?kind=model")
        assert code == 200
        assert body["count"] == 0
        assert body["lanes"] == []
        assert "not lanes" in body.get("error", ""), \
            f"kind=model refusal must name the law, got: {body.get('error')!r}"


class TestCardToolsSmoke:
    # card-tools: the registry the action-card editor consumes.
    # Returns a bare list (not an envelope).

    def test_envelope(self, live: "GatewayClient") -> None:
        code, body = live.get("/v1/card-tools")
        assert code == 200
        assert isinstance(body, list)
        assert len(body) > 0

    def test_tool_row_keys(self, live: "GatewayClient") -> None:
        # universal keys are pinned; tools may carry EXTRA fields
        # (e.g. hidden) -- the row may be richer than the minimum,
        # never poorer.
        required = {"name", "version", "kind", "card", "model",
                    "stage_title", "description", "params_schema"}
        code, body = live.get("/v1/card-tools")
        for tool in body:
            assert required.issubset(set(tool.keys())), \
                f"tool {tool.get('name', '?')!r} dropped a key: " \
                f"have {sorted(tool.keys())}, required {sorted(required)}"

    def test_lane_filter_serves_exactly_the_lane(self, live: "GatewayClient") -> None:
        # The DSH lane-session contract (the 2026-09-06 kimodo 502):
        # a lane session mounts ONE card's tool — the registrar
        # demands EXACTLY the lane's manifest and 502s otherwise.
        # The gateway must filter, never serve the unfiltered list
        # where 1 was demanded.
        code, body = live.get("/v1/card-tools?lane=motion")
        assert code == 200
        names = [t["name"] for t in body]
        assert names == ["motion_card"], \
            f"lane=motion must serve exactly motion_card, got {names}"

    def test_lane_filter_resolves_model_ids(self, live: "GatewayClient") -> None:
        # a bare model id lands on the card that boards it (models
        # are not lanes) — anycreature → the forge card (the soma/
        # text-to-motion variant retired 2026-09-06 with the cpp
        # ggml kimodo lane)
        code, body = live.get("/v1/card-tools?lane=anycreature")
        assert code == 200
        assert [t["name"] for t in body] == ["forge_card"]

    def test_lane_filter_refuses_unknown_lanes(self, live: "GatewayClient") -> None:
        # unknown lane = a NAMED 404 teaching the resolution
        # vocabulary, never the unfiltered list
        code, body = live.get("/v1/card-tools?lane=no-such-lane")
        assert code == 404
        assert "no such lane" in body.get("error", "")


class TestModelProvisionsSmoke:
    # /v1/models/<family>/provisions/<name> — the DECLARED viewer
    # asset door (2026-09-06, the SOMA-skin 404): streams from the
    # mount or ACQUIRES on demand through the comfy-mcp rail. Studio
    # assets point here, never at vite-public blobs.

    def test_provision_streams_or_acquires(self, live: "GatewayClient") -> None:
        # the kimodo SOMA template skin: 200 with the sha-pinned
        # byte count — cold (rail fetch + store landing) or warm
        # (mount hit), the contract is the same answer
        code, body, ctype = live.get_raw(
            "/v1/models/kimodo/provisions/skin_standard.npz")
        assert code == 200
        assert isinstance(body, bytes)
        assert "octet-stream" in ctype
        assert len(body) == 531434, \
            f"skin bytes drifted: {len(body)} != 531434 (the row's " \
            "declared size — regold the declaration deliberately)"

    def test_unknown_family_404s_named(self, live: "GatewayClient") -> None:
        code, body = live.get(
            "/v1/models/no-such-family/provisions/skin_standard.npz")
        assert code == 404
        assert "unknown model family" in body.get("error", "")

    def test_unknown_provision_404s_listing_declared(
            self, live: "GatewayClient") -> None:
        code, body = live.get(
            "/v1/models/kimodo/provisions/not-declared.npz")
        assert code == 404
        err = body.get("error", "")
        assert "declares no provision" in err
        assert "skin_standard.npz" in err  # teaches what IS declared


class TestSkillsSmoke:
    # /v1/skills: the DSH skill catalog. Envelope mirrors /v1/assets.

    def test_envelope(self, live: "GatewayClient") -> None:
        code, body = live.get("/v1/skills")
        assert code == 200
        assert set(body.keys()) == {"count", "skills"}
        assert body["count"] == len(body["skills"])
        assert body["count"] > 0

    def test_skill_row_keys(self, live: "GatewayClient") -> None:
        # the (card, model) union is scope-dependent (card:/model:/flow:)
        # -- the wall pins the universal identity keys only.
        required = {"id", "name", "description", "scope"}
        code, body = live.get("/v1/skills")
        for skill in body["skills"]:
            assert required.issubset(set(skill.keys())), \
                f"skill {skill.get('id', '?')!r} dropped a key: {sorted(skill.keys())}"
