//#region src/client — browser half (factory-form CJS, the module-loader contract)
// The 1:1 pattern source is the shipped reference occupant
// (references/deepseek-harness/packages/client/ui-sidebar-files):
// stage one — the tab TYPE into ctx.sidebarRightTabs (priority 'extension':
// a type from outside the product outranks builtins and may take one over);
// stage two — the BODY into the keyed first-party seat
// 'sidebar.right.pane.tab' under the type's id, via ctx.slots.inject (the
// declaration ledger's wait seam; unload cancels a pending wait).
// Hand-written bundle law: classic script, no ESM syntax, no top-level await,
// hook-free components only, react through require (platform table).
window.__ModuleLoader__.load({
  id: "@melite-plugin/dsh-editor-shell", // bare package name — equals package.json name
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var react = require("react");
    var h = react.createElement;

    var NS = "meliteEditor";
    var TYPE_ID = "@melite-plugin/dsh-editor-shell";
    var KIND = "melite-editor";

    /** Copy: locale-owned, thunked titles re-read per call. */
    var DICTS = {
      en: {
        "type.label": "Editor",
        "guide.title": "Melite Editor",
        "guide.description": "The media editor workspace (cards, studios, flow).",
        "body.title": "Melite Editor",
        "body.state": "Rail live — the editor tree mounts here (S4c/S4d).",
      },
      zh: {
        "type.label": "编辑器",
        "guide.title": "Melite 编辑器",
        "guide.description": "媒体编辑工作台（卡片、工作室、流程）。",
        "body.title": "Melite 编辑器",
        "body.state": "通道已通 — 编辑器树将在此挂载（S4c/S4d）。",
      },
    };

    /** The editor page body. Hook-free (hand-written bundle law). */
    function EditorBody() {
      return h("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 16,
          height: "100%",
          overflow: "auto",
        },
        "data-testid": "melite-editor-root",
      },
        h("h2", { style: { margin: 0, fontSize: 14 } }, DICTS.en["body.title"]),
        h("p", { style: { margin: 0, fontSize: 12, opacity: 0.8 } }, DICTS.en["body.state"]));
    }

    /** Required browser services: the tab registry, the keyed seat, copy. */
    exports.inject = ["slots", "locale", "sidebarRightTabs"];

    /** Client plugin body: dictionaries, the type, then the keyed body. */
    exports.apply = function (ctx) {
      var t = ctx.locale.bind(NS);
      ctx.effect(function () {
        return ctx.locale.register(NS, DICTS);
      }, "melite-editor-shell: dictionaries");
      ctx.effect(function () {
        return ctx.sidebarRightTabs.register({
          id: TYPE_ID,
          kind: KIND,
          priority: "extension",
          title: function () { return t("type.label"); },
          guide: [{
            order: 50,
            title: function () { return t("guide.title"); },
            description: function () { return t("guide.description"); },
          }],
        });
      }, "melite-editor-shell: editor tab type");
      ctx.effect(function () {
        return ctx.slots.inject("sidebar.right.pane.tab", function () {
          return ctx.slots.register(
            { name: "sidebar.right.pane.tab", key: TYPE_ID, locale: NS },
            EditorBody,
          );
        });
      }, "melite-editor-shell: editor tab body");
    };

    return module.exports; // MUST return the exports object
  },
});
//#endregion
