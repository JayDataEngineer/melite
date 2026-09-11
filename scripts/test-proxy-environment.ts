/**
 * Remove the machine's proxy configuration from every Vitest process.
 *
 * A developer's Clash and a CI runner's squid both export `HTTP_PROXY` and its siblings.
 * An ambient value silently decides test outcomes: a request meant for a local fixture
 * server is sent to a proxy that cannot resolve the fixture's hostname, and the proxy's
 * error page is recorded as the expected output.
 *
 * Clearing here gives every suite one known starting environment, so a test that needs a
 * proxy sets exactly the names it means to exercise.
 *
 * One name resists this: `NODE_USE_ENV_PROXY`. Node samples the proxy environment when the
 * process starts, so deleting the variable from a setup file cannot unbind the built-in
 * `fetch` it already configured. A shell that exports it must unset it before running the
 * suite. The eight standard names below are fully handled.
 *
 * Real-API e2e is cleared too: a direct connection is the environment that suite is known
 * to work in; leaving the ambient proxy in place would newly stake it on the proxy
 * reaching the provider.
 * @module
 */

/** The standard proxy-variable names (upper- and lowercase), as fixed protocol names. */
const PROXY_ENV_NAMES = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
  'no_proxy',
] as const

/** The flag a Node process reads before honoring the names above; ambient in the same way. */
const NODE_PROXY_FLAG = 'NODE_USE_ENV_PROXY'

/** This module's path as a `setupFiles` entry, so the wiring test names it once. */
export const TEST_PROXY_SETUP_FILE = './scripts/test-proxy-environment.ts'

/**
 * Delete every proxy name from one environment.
 *
 * @param env - the environment to clear.
 * @returns the names that carried a value, in the order checked.
 */
export function clearAmbientProxyEnv(env: NodeJS.ProcessEnv): string[] {
  const cleared: string[] = []
  for (const name of [...PROXY_ENV_NAMES, NODE_PROXY_FLAG]) {
    if (env[name] === undefined) continue
    cleared.push(name)
    Reflect.deleteProperty(env, name)
  }
  return cleared
}

clearAmbientProxyEnv(process.env)
