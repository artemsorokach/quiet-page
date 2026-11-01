import { render } from 'preact'
import { App } from './App.tsx'

const root = document.getElementById('app')
if (root) render(<App />, root)

// Offline support and «add to home screen» for the public site only (not the /v2/ test copy or E2E builds).
const PUBLIC_BASE = '/quiet-page/'
if (import.meta.env.PROD && import.meta.env.MODE !== 'e2e' && import.meta.env.BASE_URL === PUBLIC_BASE && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${PUBLIC_BASE}sw.js`).catch(() => undefined))
}
