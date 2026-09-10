import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/doors.ts'],
  format: 'esm',
  dts: true,
  outDir: 'lib',
})
