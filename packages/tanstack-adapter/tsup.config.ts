import { defineConfig } from 'tsup';

const config = defineConfig({
  entry: ['src/index.ts'],
  clean: true,
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
});

export default config;
