"""suites/conftest.py — the collection gate for the walls suites.

Post the 2026-09-04 native-conversion (0fa15c8) most suites ARE
pytest-native. Two are NOT fast-runner material and stay OUT of
pytest collection:

- test_browser_lanes.py — boots a THROWAWAY vite dev server + real
  chromium (live browser infra). Its contract stays the script-style
  wall: the orchestrator (tests/walls/test_walls.py WALLS list)
  subprocesses it with exit codes. Collecting it made the fast
  runner boot vite — a hang, not a test.
- test_gpu_cpp_cards.py — pytest-marked `gpu` instead (deselected by
  addopts "-m not gpu"; opt in with pytest -m gpu). It does not need
  collect_ignore; the marker IS its gate.
"""

collect_ignore = ["test_browser_lanes.py"]
