window.__ModuleLoader__.load({
	id: "@melite/3d-img-to-mesh",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _melite_card_base_client = require("@melite/card-base/client");
		//#region src/client/index.ts
		/**
		* img-to-mesh-studio — the FIRST-PARTY cards.stage.view surface
		* (2026-09-12, the ui-tool built-in law: the host package ships the
		* shipped cards' views; third-party cards register additively).
		*
		* Primitive ④ (2026-09-21): this file is a DECLARATION + seam
		* registration — the card's ~5 lines of surface data. The machinery
		* (spec fetch, seeding, squares, patch-first run, polling, shell)
		* is the base's DeclarativeStudio; the studio owns ORGANIZATION
		* over the SAME form-spec SSOT, and organization is data now.
		*/
		/** The door's group truth (schema_groups, 2026-09-12 lane read):
		*  input, generation — exposed; stage, mesh, bake, lab — folded. */
		const SURFACE = (0, _melite_card_base_client.defineStudioDeclaration)({
			model: "img-to-mesh",
			expose: ["input", "generation"],
			folds: {
				stage: "Stage passes",
				mesh: "Mesh",
				bake: "Bake maps",
				lab: "Lab (samplers & overrides)"
			},
			preview: "mesh"
		});
		/** The studio surface component — registered under key 'img-to-mesh'. */
		function ImgToMeshStudio(props) {
			return (0, react.createElement)(_melite_card_base_client.DeclarativeStudio, {
				declaration: SURFACE,
				...props
			});
		}
		/** The built-in registration (the ui-tool law, verbatim — the
		* module namespace IS the plugin: the loader consumes name/inject/apply). */
		const name = "imgToMeshStudio";
		const inject = ["slots"];
		const apply = (0, _melite_card_base_client.defineStageViewRegistration)("img-to-mesh", ImgToMeshStudio);
		//#endregion
		exports.ImgToMeshStudio = ImgToMeshStudio;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
