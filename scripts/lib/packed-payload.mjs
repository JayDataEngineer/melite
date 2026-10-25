#!/usr/bin/env node
/**
 * packed-payload.mjs — THE F7 PAYLOAD JUDGE (HMR audit 009,
 * 2026-10-24): "no wall pins the packed-tarball payload contract
 * for the HMR-relevant members — that `files` covers
 * `lib/client.js` for every client row, and that a
 * `dsh.bundle.patch` target file actually rides its tarball. A
 * dropped member fails loud at consumer boot — but only after
 * publish."
 *
 * THE CURE: the release path (tools/release-artifacts.mjs) always
 * owned these gates; the INSTALL path (pack-real-install.mjs — the
 * lane's own pack door) packed tarballs with NO payload judge, so a
 * manifest whose `files` dropped a client row or an overlay
 * installed fine and died at the consumer's boot. This module is
 * ONE validator both pack doors call at PACK time: read the
 * tarball's own bytes (listing + inner package.json), run the
 * estate's payload gates (exportsRows + validateTarballPayload),
 * and throw naming the tarball and the member.
 *
 * The wall (scripts/packed-payload.spec.ts) mints fixture tarballs
 * and rides THIS function — one law, every pack door.
 */
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exportsRows, validateTarballPayload } from '../../tools/release-artifacts.mjs'

const GATES = { exportsRows, validateTarballPayload }

/**
 * Validate one packed tarball against the payload contract.
 * @param {string} tgz path to the packed tarball
 * @returns {{ listing: string[], inner: any }} the read truth
 * @throws {Error} naming the tarball and the violated member law
 */
export function validatePackedTarball (tgz) {
  const listing = execFileSync('tar', ['-tzf', tgz], { encoding: 'utf8' })
    .split('\n').filter(Boolean)
  if (!listing.includes('package/package.json')) {
    throw new Error(`payload gate: ${tgz} carries no package/package.json — not an npm tarball`)
  }
  const innerText = execFileSync('tar', ['-xzf', tgz, '-O', 'package/package.json'], { encoding: 'utf8' })
  const inner = JSON.parse(innerText)
  // THE ESTATE'S OWN GATES (the same expressions the release mint
  // runs — tools/release-artifacts.mjs G2/G3): the exports promise
  // and the payload plane, judged over the PACKED BYTES.
  GATES.exportsRows(inner, listing, tgz)
  GATES.validateTarballPayload(inner, listing, tgz)
  return { listing, inner }
}

export const gatesPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'release-artifacts.mjs')
