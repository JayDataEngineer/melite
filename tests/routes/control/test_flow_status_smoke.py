"""Flow status door — the include_log console enrichment (2026-09-06,
the studio console drilldown): ?include_log=true adds log_tail, the
run's real-state console lines (run status + queue position, one line
per stage with live progress/activity, stage errors verbatim, artifact
basenames). Synthesized from runner/sidecar state — never fabricated;
without the flag the door serves the plain status (no tail key).
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from conftest import GatewayClient


def _a_run_id(live: "GatewayClient") -> str:
    code, body = live.get("/v1/flows/runs?limit=5")
    assert code == 200
    runs = body if isinstance(body, list) else body.get("runs", [])
    assert isinstance(runs, list) and runs, "no historical runs to probe"
    rid = runs[0].get("run_id") or runs[0].get("id")
    assert isinstance(rid, str) and rid
    return rid


class TestFlowStatusIncludeLog:
    def test_include_log_serves_the_tail(self, live: "GatewayClient") -> None:  # noqa: F811
        rid = _a_run_id(live)
        code, body = live.get(f"/v1/flows/status/{rid}?include_log=true")
        assert code == 200
        tail = body.get("log_tail")
        assert isinstance(tail, str) and tail, "log_tail missing on include_log"
        # the tail's first line names the run's real status — every
        # line derives from runner/sidecar fields, never fabricated
        assert tail.startswith("run: ")

    def test_plain_status_has_no_tail(self, live: "GatewayClient") -> None:  # noqa: F811
        rid = _a_run_id(live)
        code, body = live.get(f"/v1/flows/status/{rid}")
        assert code == 200
        assert "log_tail" not in body, \
            "the plain door must not carry the tail (the drilldown " \
            "asks for it explicitly)"

    def test_unknown_run_404s_named(self, live: "GatewayClient") -> None:  # noqa: F811
        code, body = live.get("/v1/flows/status/no-such-run")
        assert code == 404
        assert "unknown run_id" in body.get("error", "")
