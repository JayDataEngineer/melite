/** css-module imports from @melite/card-base/client's root face (the
 * client-plane graph row) reach this package's program; the
 * declaration follows the repo convention (melite-card-view,
 * web-kit/timeline each carry their own). */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
