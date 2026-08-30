// Minimal host ambient — melite-hello runs under the Bun/Node DSH host.
// Declared locally so this demo package needs no @types/node install.
declare const process: { readonly pid: number }
