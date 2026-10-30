/**
 * Path, Share and Settings against the fake Firebase build.
 *
 *   npx vite build --mode e2e && node e2e/screens.e2e.mjs [screenshotDir]
 */
import assert from 'node:assert/strict'
import { heading, launch, toast } from './harness.mjs'

const run = await launch(process.argv[2])
const shot = run.shot
const H = 3_600_000
const D = 24 * H
const now = Date.now()
const P = ['Що сьогодні дало енергію?', 'Що хочеться відпустити?']
const sample = [
  { id: 'd1', type: 'check', ts: now - 2 * H, mood: 4, scale: 'vaha', feelings: ['calm', 'grateful'] },
  { id: 'd2', ts: now - D - 3 * H, mood: 3, scale: 'voda', feelings: ['tired', 'hope'], qa: [{ prompt: P[0], text: 'Ранкова кава біля вікна і розмова з другом. Після неї стало легше.' }, { prompt: null, text: 'День був довгий, але без поспіху. Хочеться раніше лягти спати.' }], text: '', additions: [{ at: now - D, text: 'Ввечері була коротка прогулянка, і думки прояснилися.' }], lang: 'uk' },
  { id: 'd3', ts: now - 3 * D, mood: 2, scale: 'vaha', feelings: ['anxious', 'tension'], qa: [{ prompt: P[1], text: 'Постійне відчуття, що я нічого не встигаю. Можна дозволити собі робити менше.' }], text: '', editedAt: now - 3 * D + 2 * H, history: [{ at: now - 3 * D + 2 * H, qa: [{ prompt: P[1], text: 'Постійне відчуття, що я не встигаю.' }], additions: [] }], lang: 'uk' },
  { id: 'd4', ts: now - 40 * D, mood: 5, scale: 'teplo', feelings: ['joy'], qa: [{ prompt: null, text: 'Сьогодні вперше за тиждень вдалося спокійно поснідати.' }], text: '', lang: 'uk' },
]
const local = { 'ts-entries': JSON.stringify(sample) }
const tab = (page, name) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click()

// Path
const a = await run.open({ local })
await tab(a.page, 'Шлях')
await a.page.locator('.calendar').waitFor()
assert.equal(await a.page.locator('.entry').count(), 4)
assert.equal(await a.page.locator('.path__month').count(), 2, 'entries grouped by month')
await shot(a.page, 'path')

// a day from the calendar
await a.page.locator('.calendar__day[aria-pressed]').first().click()
await a.page.getByRole('button', { name: 'Показати все' }).waitFor()
assert.ok((await a.page.locator('.entry').count()) < 4)
await a.page.getByRole('button', { name: 'Показати все' }).click()

// history of an edited entry
const edited = a.page.locator('article.entry', { hasText: 'Можна дозволити собі' })
await edited.getByRole('button', { name: 'змінено' }).click()
await edited.locator('.history__in').first().waitFor()
await shot(a.page, 'path-history')

// edit
const second = a.page.locator('article.entry').first() // newest entry: «Ранкова кава…»
await second.getByRole('button', { name: 'Дії із записом' }).click()
await second.getByRole('button', { name: 'Виправити' }).click()
await second.locator('textarea').first().fill('Ранкова кава біля вікна. Після неї стало легше.')
await shot(a.page, 'path-edit')
await second.getByRole('button', { name: 'Зберегти зміни' }).click()
await toast(a.page, 'Виправлено')
await second.getByRole('button', { name: 'змінено' }).waitFor()

// addition
await second.getByRole('button', { name: 'Дії із записом' }).click()
await second.getByRole('button', { name: 'Дописати' }).click()
await second.locator('textarea').fill('І ще: подзвонила мама.')
await second.getByRole('button', { name: 'Додати' }).click()
await toast(a.page, 'Додано до запису')
await second.getByText('І ще: подзвонила мама.').waitFor()

// remove a mood note: needs a second tap
const check = a.page.locator('.entry--check').first()
await check.getByRole('button', { name: 'прибрати' }).click()
await check.getByRole('button', { name: 'ще раз, щоб прибрати' }).click()
await toast(a.page, 'Відмітку прибрано')
assert.equal(await a.page.locator('.entry').count(), 3)
const stored = JSON.parse(await a.page.evaluate(() => localStorage.getItem('ts-entries')))
assert.equal(stored.length, 3)
const d2 = stored.find((r) => r.id === 'd2')
assert.equal(d2.history.length, 1)
assert.equal(d2.additions.length, 2)

// Share
await tab(a.page, 'Поділитися')
await a.page.getByText('Ти створюєш', { exact: false }).waitFor()
await shot(a.page, 'share')
await a.page.getByRole('button', { name: 'Скопіювати текстом' }).click()
await toast(a.page, 'Скопійовано')
const copied = await a.page.evaluate(() => navigator.clipboard.readText())
assert.match(copied, /Ранкова кава біля вікна\. Після/)
assert.ok(!copied.includes('вперше за тиждень'), 'older than 7 days is not in the default range')

await a.page.locator('.share__pick').click()
await a.page.locator('dialog[open] .pick-list').waitFor()
await a.page.locator('dialog[open]').getByRole('button', { name: 'Лише відмітки' }).click()
await shot(a.page, 'share-pick')
await a.page.locator('dialog[open]').getByRole('button', { name: 'Готово' }).click()
const [download] = await Promise.all([a.page.waitForEvent('download'), a.page.getByRole('button', { name: 'Зберегти файл' }).click()])
const html = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8')
assert.match(html, /<!doctype html>/)
assert.ok(!html.includes('Ранкова кава'), 'text left out with «Лише відмітки»')
assert.match(html, /Відмітка/)

// "send this day" from the Path preselects that day
await tab(a.page, 'Шлях')
await a.page.locator('.calendar__day[aria-pressed]').first().click()
await a.page.getByRole('button', { name: 'Надіслати цей день' }).click()
await a.page.locator('input[name="range"][value="days"]:checked').waitFor()

// Backup export
const [backup] = await Promise.all([a.page.waitForEvent('download'), a.page.getByRole('button', { name: 'Експортувати всі записи' }).click()])
const data = JSON.parse(await (await import('node:fs/promises')).readFile(await backup.path(), 'utf8'))
assert.equal(data.entries.length, 3)

// Settings: look, words, language
await a.page.getByRole('button', { name: 'Налаштування' }).click()
await a.page.locator('dialog[open] .settings__skins').waitFor()
await a.page.locator('dialog[open]').getByRole('button', { name: 'Світле' }).click()
await a.page.locator('dialog[open]').getByRole('button', { name: 'Ліс' }).click()
await a.page.waitForFunction(() => document.documentElement.dataset.skin === 'lis-light')
await a.page.locator('dialog[open]').getByRole('button', { name: /^Вода/ }).click()
await shot(a.page, 'settings')
await a.page.locator('dialog[open]').getByRole('button', { name: 'English' }).click()
await a.page.locator('dialog[open]').getByRole('heading', { name: 'Settings' }).waitFor()
await a.page.locator('dialog[open]').getByRole('button', { name: 'Українська' }).click()
await a.page.locator('dialog[open]').getByRole('button', { name: 'Готово' }).click()
await tab(a.page, 'Сторінка')
await a.page.getByRole('button', { name: 'Штиль' }).waitFor()
assert.equal(await a.page.evaluate(() => localStorage.getItem('ts-pal')), '"lis"')
await a.page.reload()
await a.page.locator('#write-free').waitFor()
await a.page.waitForFunction(() => document.documentElement.dataset.skin === 'lis-light') // look is remembered
await a.context.close()

// Settings when signed in: change password and make a new code, both with the current password.
const b = await run.open()
await b.page.getByRole('button', { name: 'Налаштування' }).click()
await b.page.locator('dialog[open]').getByRole('button', { name: 'Увійти' }).click()
await b.page.locator('#auth-email').fill('person@example.com')
await b.page.locator('#auth-pass').fill('account-pass')
await b.page.getByRole('button', { name: 'Створити акаунт' }).click()
await heading(b.page, 'Пароль для записів')
await b.page.locator('#key-pass').fill('entries-pass-1')
await b.page.locator('#key-pass2').fill('entries-pass-1')
await b.page.getByRole('button', { name: 'Зберегти пароль' }).click()
await b.page.getByRole('button', { name: 'Код збережено' }).click()
await b.page.getByRole('button', { name: 'Налаштування' }).click()
await b.page.locator('dialog[open]').getByText('person@example.com').waitFor()
await shot(b.page, 'settings-account')
await b.page.locator('dialog[open]').getByRole('button', { name: 'Змінити пароль для записів' }).click()
await heading(b.page, 'Змінити пароль для записів')
await b.page.locator('#sec-current').fill('wrong-pass')
await b.page.locator('#sec-new').fill('entries-pass-2')
await b.page.locator('#sec-repeat').fill('entries-pass-2')
await b.page.getByRole('button', { name: 'Зберегти зміни' }).click()
await b.page.getByText('Пароль не підходить.').waitFor()
await b.page.locator('#sec-current').fill('entries-pass-1')
await shot(b.page, 'change-password')
await b.page.getByRole('button', { name: 'Зберегти зміни' }).click()
await toast(b.page, 'Пароль змінено.')
await b.page.getByRole('button', { name: 'Налаштування' }).click()
await b.page.locator('dialog[open]').getByRole('button', { name: 'Новий код відновлення' }).click()
await heading(b.page, 'Новий код відновлення')
await b.page.locator('#sec-current').fill('entries-pass-2')
await b.page.getByRole('button', { name: 'Створити код' }).click()
await heading(b.page, 'Код відновлення')
await b.page.getByRole('button', { name: 'Код збережено' }).click()
await b.page.locator('#write-free').waitFor()

// ask every time: after a reload the password is asked again
await b.page.getByRole('button', { name: 'Налаштування' }).click()
await b.page.locator('dialog[open]').getByLabel('Питати пароль при кожному відкритті').check()
await b.page.waitForTimeout(300)
await b.page.reload()
await heading(b.page, 'Відкрити записи')
await b.page.locator('#key-pass').fill('entries-pass-2')
await b.page.getByRole('button', { name: 'Відкрити', exact: true }).click()
await b.page.locator('#write-free').waitFor()

// Welcome page on the first visit, the example, then a calm start.
const w = await run.open({ welcomed: false })
await heading(w.page, 'Тиха сторінка')
await w.page.getByText('Що таке саморефлексія?').click()
await shot(w.page, 'welcome')
await w.page.getByRole('button', { name: 'Подивитися приклад' }).click()
await w.page.getByText('Це приклад. Записи тут не зберігаються.').waitFor()
await tab(w.page, 'Шлях')
assert.equal(await w.page.locator('.entry').count(), 5)
await shot(w.page, 'demo-path')
await w.page.getByRole('button', { name: 'Вийти з прикладу' }).click()
await w.page.getByRole('button', { name: 'Почати' }).click()
await w.page.locator('#write-free').waitFor()
assert.equal(await w.page.evaluate(() => localStorage.getItem('ts-entries')), null, 'the example saved nothing')
assert.equal(await w.page.evaluate(() => localStorage.getItem('ts-welcomed')), 'true')

// Focus mode: typing fades the rest; writing font and atmosphere apply.
await w.page.locator('#write-free').pressSequentially('Тихо пишу', { delay: 30 })
await w.page.waitForFunction(() => document.body.classList.contains('writing'))
await w.page.locator('.write__intro').click()
await w.page.waitForFunction(() => !document.body.classList.contains('writing'))
await w.page.getByRole('button', { name: 'Налаштування' }).click()
await w.page.locator('dialog[open]').getByRole('button', { name: /Книжковий/ }).click()
await w.page.locator('dialog[open]').getByRole('button', { name: 'Дихання' }).click()
await w.page.locator('dialog[open]').getByText('Світло ледь помітно').waitFor()
await shot(w.page, 'settings-look')
await w.page.locator('dialog[open]').getByRole('button', { name: 'Готово' }).click()
await w.page.waitForFunction(() => document.documentElement.dataset.wfont === 'lora' && document.documentElement.dataset.atmo === 'breath')
assert.match(await w.page.locator('#write-free').evaluate((el) => getComputedStyle(el).fontFamily), /Lora/)
await w.page.waitForFunction(() => document.fonts.check('16px Lora'))
await shot(w.page, 'write-lora')

assert.deepEqual(await run.close(), [], 'no page errors')
console.log('screens e2e: all flows passed')
