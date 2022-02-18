import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path'

const { visualizer } = require('rollup-plugin-visualizer');

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_WORKFLOW ? '/polyratings-revamp/' : '/',
  plugins: [react(), tsconfigPaths()],
  build: {
    // Needed since we are compiling shared as a UMD package to make jest happy :(
    commonjsOptions: { exclude: ['@polyratings/shared'], include: [] },
    sourcemap: true,
    rollupOptions:{
      plugins:[
        visualizer({
          filename: resolve(__dirname, 'stats/stats.html'),
          template: 'treemap', // sunburst|treemap|network
          sourcemap: true
      })]
    }
  },
  optimizeDeps: {
    include: ['@polyratings/shared'],
  },
});
