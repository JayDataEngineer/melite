/** CSS Modules ambient type for the walls face: suites reach client
 *  sources whose `.module.css` imports each package's own face
 *  declares (src/css-modules.d.ts — the tsdown preset inlines the
 *  hashed class map); the walls face carries the same declaration
 *  once, so every package's css-module import types under one shape. */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
