#!/usr/bin/env bash
# lane-freshness.sh — THE F1 GATE (HMR audit 009, 2026-10-24: "no
# continuous edit→browser judge on lanes — a stale lib serves
# silently"; two receipted outages, 2026-10-13 + 2026-10-26).
#
# THE CLASS: a lane serves lib/ from the repo tree per page-load, so
# served==repo BY CONSTRUCTION — but src can drift past a package's
# built lib (src committed without its artifact, or a mid-session
# edit). Every lane receipt then attests a PRODUCT THAT IS NOT THE
# TREE. The lib-sync arm in hook-full-battery judges this at COMMIT
# time; this gate judges it at LANE time — before a host boots and
# receipts anything.
#
# THE LAW IS THE STAMP'S OWN RECIPE (build-plane writeSrcStamp,
# byte-for-byte): the sorted src *.ts/*.tsx sha256-of-sha256sums,
# first 16 hex, computed from INSIDE the package dir. A mismatch
# between lib/.src-stamp and the recomputed hash = the served bundle
# is not the src tree's truth.
#
# Sourced by e2e-studio-lane.sh; the wall
# (scripts/lane-freshness.spec.ts) exercises THIS function against
# fixture trees — one function, two seats.
#
# Usage: check_lane_freshness [repo_root] — exit 0 fresh, exit 1
# stale with each offender named and the cure printed.

check_lane_freshness() {
  local root="${1:-$PWD}"
  local offenders=()

  while IFS= read -r stamp_file; do
    local pkg_dir
    pkg_dir="$(dirname "$(dirname "$stamp_file")")"
    # only packages under the repo's packages/ tree (the lane's own
    # served fleet); the stamp names its lib dir
    case "$pkg_dir" in
      "$root"/packages/*) ;;
      *) continue ;;
    esac
    [ -d "$pkg_dir/src" ] || continue
    local live
    live="$(cd "$pkg_dir" && find src \( -name '*.ts' -o -name '*.tsx' \) \
      | LC_ALL=C sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16)"
    local seated
    seated="$(tr -d '[:space:]' < "$stamp_file")"
    if [ "$live" != "$seated" ]; then
      offenders+=("${pkg_dir#"$root"/}: src hash $live, lib/.src-stamp $seated")
    fi
  done < <(find "$root/packages" -mindepth 4 -maxdepth 4 -path '*/lib/.src-stamp' -type f 2>/dev/null; \
           find "$root/packages" -mindepth 3 -maxdepth 3 -path '*/lib/.src-stamp' -type f 2>/dev/null)

  if [ "${#offenders[@]}" -gt 0 ]; then
    echo "[lane-freshness] STALE LIB PLANES — the lane would attest a product that is not the tree:" >&2
    for o in "${offenders[@]}"; do
      echo "  $o" >&2
    done
    echo "[lane-freshness] cure: node tools/build-plane.mjs build <pkg> (or the whole tree), then re-drive." >&2
    return 1
  fi
  return 0
}
