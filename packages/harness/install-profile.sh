#!/usr/bin/env bash
# install-profile.sh — thin shim; the rail is infer-provision.
#
# Retired 2026-09-03: this script used to render absolute-path profile
# templates (packages/harness/dsh/profile/*.tmpl) — a drift surface the
# provisioner bundle was built to kill (rows live in the BUNDLE; the
# profile user layer stays EMPTY, so rendered profiles and
# `dsh plugin add` can never drift apart). The templates are deleted;
# this entrypoint now forwards to the one renderer.
set -euo pipefail
exec node "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/provisioner/bin/infer-provision.mjs" "$@"
