/** Shared Playwright setup: serves dist-e2e at https://qp.test/quiet-page/ (a secure context). */
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

// require() honours NODE_PATH, so a globally installed Playwright works too.
const { chromium } = createRequire(import.meta.url)('playwright')

const ROOT = new URL('../dist-e2e/', import.meta.url).pathname
export const BASE = 'https://qp.test/quiet-page/'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' }

export async function launch(shotsDir) {
  const browser = await chromium.launch()
  let step = 0
  const contexts = []

  /** A fresh "device". `fake` seeds the fake Firebase, `local` seeds other localStorage keys. */
  async function open({ fake = null, local = {}, width = 390 } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, locale: 'uk-UA', acceptDownloads: true })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://qp.test' })
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.host !== 'qp.test') return route.abort()
      let path = url.pathname.replace('/quiet-page/', '') || 'index.html'
      if (path.endsWith('/')) path += 'index.html'
      try {
        await route.fulfill({ body: await readFile(join(ROOT, path)), contentType: TYPES[extname(path)] ?? 'application/octet-stream' })
      } catch {
        await route.fulfill({ status: 404, body: '' })
      }
    })
    const seed = { ...local, ...(fake ? { 'fake-fb': JSON.stringify(fake) } : {}) }
    if (Object.keys(seed).length) {
      await context.addInitScript((items) => {
        if (sessionStorage.getItem('seeded')) return
        for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v)
        sessionStorage.setItem('seeded', '1')
      }, seed)
    }
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(BASE)
    const handle = { context, page, errors }
    contexts.push(handle)
    return handle
  }

  async function shot(page, name) {
    if (!shotsDir) return
    await page.waitForTimeout(350)
    await page.screenshot({ path: join(shotsDir, `${String(++step).padStart(2, '0')}-${name}.png`), fullPage: true })
  }

  async function close() {
    const errors = contexts.flatMap((c) => c.errors)
    await browser.close()
    return errors
  }

  return { open, shot, close }
}

export const fakeState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('fake-fb') ?? '{}'))
export const heading = (page, text) => page.getByRole('heading', { name: text }).waitFor({ timeout: 15000 })
export const toast = (page, text) => page.locator('.toast--on', { hasText: text }).waitFor({ timeout: 10000 })
