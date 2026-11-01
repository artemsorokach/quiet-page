import { render } from 'preact'
import { App } from './App.tsx'

const root = document.getElementById('app')
if (root) render(<App />, root)

// Offline support and «add to home screen» for the public site — GitHub Pages (/quiet-page/) or
// Cloudflare Pages (/) — but not the /v2/ test copy or E2E builds.
const base = import.meta.env.BASE_URL
if (import.meta.env.PROD && import.meta.env.MODE !== 'e2e' && !base.includes('/v2/') && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${base}sw.js`).catch(() => undefined))
}
