import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

const fake = (name: string) => fileURLToPath(new URL(`./src/testing/fake-firebase/${name}.ts`, import.meta.url))

// GitHub Pages serves the site from /quiet-page/. QP_BASE overrides it: `/` on Cloudflare Pages,
// /quiet-page/v2/ for the preview.
// `--mode e2e` swaps the Firebase SDK for an in-browser fake (see src/testing/fake-firebase).
export default defineConfig(({ mode }) => ({
  base: process.env.QP_BASE ?? '/quiet-page/',
  plugins: [preact()],
  resolve:
    mode === 'e2e'
      ? {
          alias: [
            { find: /^firebase\/app$/, replacement: fake('app') },
            { find: /^firebase\/auth$/, replacement: fake('auth') },
            { find: /^firebase\/firestore$/, replacement: fake('firestore') },
          ],
        }
      : {},
  build: {
    target: 'es2022',
    sourcemap: false,
    outDir: mode === 'e2e' ? 'dist-e2e' : 'dist',
  },
}))
