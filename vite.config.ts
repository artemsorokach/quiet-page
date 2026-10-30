import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// GitHub Pages serves the site from /quiet-page/
export default defineConfig({
  base: '/quiet-page/',
  plugins: [preact()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
})
