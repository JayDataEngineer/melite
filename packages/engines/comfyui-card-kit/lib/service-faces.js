// service-faces.ts — THE PLUGIN-SIDE SERVICE FACES AND CONTEXT
// AUGMENTATIONS (the workspace-acyclicity cure): plugins call
// exactly three engine members (registerCard/registerFlavor/
// registerVerb) and one models member (registerFamily); these
// faces name those, and the Context augmentation lives HERE at
// the leaf tier so a plugin activates it with no host edge. The
// host classes (comfyui-cordis's ComfyUIService and
// ModelsService) satisfy the faces structurally — assignment
// sites compile against them.
export {};
//# sourceMappingURL=service-faces.js.map
