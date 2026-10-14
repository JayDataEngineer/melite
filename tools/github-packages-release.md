# GitHub Packages lane (backend B) — operator runbook

Backend A (the estate registry on `:4873`) is shipped and gated: 98/98
published, content-accepted, cold-installed (`tools/registry-acceptance.mjs`,
all failure modes pinned by `scripts/registry-acceptance.spec.ts`).

Backend B is **blocked on operator input only** — every mechanical step is
prepared and the refusal path is already observed:

```
npm error 403 Forbidden - PUT https://npm.pkg.github.com/@melite%2fviewer-base
permission_denied: The token provided does not match expected scopes.
```

(probed 2026-10-10 with the session's `gh` token, scopes
`gist, read:org, repo, workflow` — no packages rights; nothing published.)

## What the operator must provide

1. **The `melite` owner on GitHub Packages.** The published identities are
   `@melite/*` (88 packages) and `@melite-plugin/*` (10). On
   `npm.pkg.github.com` the scope must equal an owner that exists and has
   Packages enabled — the `melite` org, or a user namespace.
2. **A PAT (classic) with `write:packages`** (implies `repo`) for publishing.
   Fine-grained tokens do not work against the GitHub Packages npm registry.
   Keep it out of the repo — export it in the shell only.
3. **A token with `read:packages`** for consumer installs and for the
   acceptance gate's cold-install step (it can be the same PAT).

## Publish (mirrors the proven backend-A run)

```sh
export GPR_TOKEN=<the write:packages PAT>            # shell only, never in a file
printf '//npm.pkg.github.com/:_authToken=${GPR_TOKEN}\n' > /tmp/gpr-publish.npmrc
npm_config_userconfig=/tmp/gpr-publish.npmrc \
  node tools/publish-npm.mjs \
  --from ~/.cache/melite-release/v0.1.5-pre-alpha \
  --registry https://npm.pkg.github.com
```

`publish-npm.mjs` already emits `--tag next` for prerelease versions.

## Acceptance (the same gate, pointed at backend B)

```sh
export GPR_READ=<a read:packages token>
printf '//npm.pkg.github.com/:_authToken=${GPR_READ}\n' > /tmp/gpr-read.npmrc
npm_config_userconfig=/tmp/gpr-read.npmrc \
  node tools/registry-acceptance.mjs \
  --registry https://npm.pkg.github.com \
  --from ~/.cache/melite-release/v0.1.5-pre-alpha
```

The gate redirects both `@melite` scopes, verifies packument sha512 vs
served bytes and manifest sha256 per row, then cold-installs representative
packages and asserts the exact versions came from `npm.pkg.github.com`.

## Scope law (do not break)

Do **not** silently republish as `@jaydataengineer/*` to make the token
work. That renames all 98 identities, breaks every consumer config already
written for `@melite`, and forks the namespace backend A serves. A rescope
is the operator's explicit call, made here, never a workaround inside the
publish lane.
