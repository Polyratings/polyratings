import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const { visualizer } = require('rollup-plugin-visualizer');
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base:process.env.GITHUB_WORKFLOW ? '/polyratings-revamp/' : '/',
  plugins: [react()],
  build:{
    sourcemap:true,
    // Enable for bundle stats
    // rollupOptions:{
    //   plugins:[
    //     visualizer({
    //       filename: resolve(__dirname, 'stats/stats.html'),
    //       template: 'treemap', // sunburst|treemap|network
    //       sourcemap: true
    //   })]
    // }
  }
})
