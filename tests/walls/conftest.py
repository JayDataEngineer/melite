"""tests/walls conftest.

Converted suites (test_artifact_routing, test_studio_slots, etc.) are
now native pytest tests — their check() calls became assert statements.
They live in suites/ alongside the remaining script-style suites.

The unconverted script-style suites execute at import time and must
NOT be collected by pytest. We use collect_ignore_glob to exclude
them. The subprocess orchestrator (test_walls.py) runs the
unconverted suites and pins the exit code instead.

unittest-style suites (test_cpp_engines, test_browser_lanes, etc.)
are safe to collect — pytest handles unittest.TestCase natively.
"""

# Script-style suites that execute at import time and/or call
# sys.exit(). These MUST NOT be collected by pytest. The subprocess
# orchestrator (test_walls.py) runs them instead.
#
# To convert a suite to native pytest: rewrite it to use assert
# statements, remove the main() guard, and REMOVE it from this list.
collect_ignore_glob = [
    "suites/test_co_script.py",
    "suites/test_card_requires.py",
    "suites/test_http_parity.py",
    "suites/test_python_cards.py",
    "suites/test_python_models.py",
    "suites/test_typing.py",
    "suites/test_workflow_transpile.py",
    "suites/test_doc_parity.py",
    "suites/test_h3_renderer_parity.py",
    "suites/test_streaming.py",
    "suites/test_models_on_second_drive.py",
    # wired 2026-09-05 with its SUBPROCESS_WALLS entry: the cpp
    # lane's new script-style suite (sys.exit at import — uncollectable).
    "suites/test_cpp_native_cards.py",
]
