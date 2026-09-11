#!/bin/sh
# The old flow system's tailwind v4 compile (the 1:1 port's style plane):
# the editor's theme css verbatim, sources = the ported tree + @melite/ui.
cd "$(dirname "$0")"
bun node_modules/@tailwindcss/cli/dist/index.mjs \
  -i src/old/tailwind.css \
  -o src/client/old-flow.css \
  --minify
