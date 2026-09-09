//#region host half (Node side)
// The sidebar registry (ctx.betterSidebar) exists ONLY in the browser, so the
// host half of a pure UI plugin is an empty cordis plugin: mounted so the
// Loader entry exists, doing no work. The editor's data plane (gateway proxy
// routes) lands here in S4d when the tenants ride this rail.
/** Required services: none. */
const inject = [];
/** Host plugin body: nothing to do yet. */
function apply(_ctx) {}
//#endregion
export { apply, inject };
