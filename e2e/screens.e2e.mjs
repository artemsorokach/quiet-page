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
/** A day with records; at the start of a month the sample may only be in the previous one. */
async function dayWithRecords(page) {
  const week = page.locator('.week__day[aria-pressed]')
  if (await week.count()) return week.first()
  await page.getByRole('button', { name: 'Місяць' }).click()
  const days = page.locator('.calendar__day[aria-pressed]')
  if ((await days.count()) === 0) await page.getByRole('button', { name: 'Попередній місяць' }).click()
  return days.first()
}
const tab = (page, name) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click()

// Path
const a = await run.open({ local })
await tab(a.page, 'Шлях')
await a.page.locator('.week').waitFor()
await a.page.getByText('Колір показує стан за день.', { exact: false }).waitFor()
assert.equal(await a.page.locator('.entry').count(), 4)
assert.ok((await a.page.locator('.path__month').count()) >= 2, 'entries grouped by month')
await shot(a.page, 'path')

// a day from the calendar
await (await dayWithRecords(a.page)).click()
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
await (await dayWithRecords(a.page)).click()
await a.page.getByRole('button', { name: 'Надіслати цей день' }).click()
await a.page.locator('input[name="range"][value="days"]:checked').waitFor()

// Backup export
await a.page.getByRole('button', { name: 'Налаштування' }).click()
const [backup] = await Promise.all([a.page.waitForEvent('download'), a.page.locator('dialog[open]').getByRole('button', { name: /Зберегти резервну копію/ }).click()])
await a.page.keyboard.press('Escape')
await a.page.locator('dialog[open]').waitFor({ state: 'detached' })
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
await w.page.getByRole('button', { name: 'Налаштування' }).click()
await w.page.locator('dialog[open]').getByLabel('Показувати записи в оформленні, в якому їх писали', { exact: true }).check()
await w.page.locator('dialog[open]').getByRole('button', { name: 'Готово' }).click()
await w.page.locator('dialog[open]').waitFor({ state: 'detached' })
const demoLooks = await w.page.locator('.entry[data-look]').evaluateAll((cards) => cards.map((c) => c.dataset.look))
assert.ok(new Set(demoLooks).size >= 4, 'example records show different looks: ' + JSON.stringify(demoLooks))
await shot(w.page, 'demo-path-looks')
await w.page.getByRole('button', { name: 'Налаштування' }).click()
await w.page.locator('dialog[open]').getByLabel('Показувати записи в оформленні, в якому їх писали', { exact: true }).uncheck()
await w.page.locator('dialog[open]').getByRole('button', { name: 'Готово' }).click()
await w.page.locator('dialog[open]').waitFor({ state: 'detached' })
await w.page.getByRole('button', { name: 'Вийти з прикладу' }).click()
await w.page.getByRole('button', { name: 'Почати' }).click()
await w.page.locator('#write-free').waitFor()
assert.equal(await w.page.evaluate(() => localStorage.getItem('ts-entries')), null, 'the example saved nothing')
assert.equal(await w.page.evaluate(() => localStorage.getItem('ts-welcomed')), 'true')

// The free field grows with the text (no length limit) and shrinks back after saving.
const free = w.page.locator('#write-free')
const startHeight = (await free.boundingBox()).height
await free.fill('Рядок, який повторюється.\n'.repeat(30))
assert.ok((await free.boundingBox()).height > startHeight + 200, 'field grows with the text')
await free.fill('')
assert.ok(Math.abs((await free.boundingBox()).height - startHeight) < 2, 'empty field is back to its size')

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

// Entries remember the look they were written in; the Path shows it only when switched on.
const l = await run.open({ local: { 'ts-pal': '"lavanda"', 'ts-mode': '"dark"', 'ts-wfont': '"lora"' } })
await l.page.locator('#write-free').fill('Записано в Лаванді')
await l.page.getByRole('button', { name: 'Зберегти', exact: true }).click()
await l.page.getByText('Збережено. Дякую за цю хвилину.').waitFor()
const saved = JSON.parse(await l.page.evaluate(() => localStorage.getItem('ts-entries')))
assert.deepEqual(saved[0].look, { skin: 'lavanda', mode: 'dark', font: 'lora' })
await l.page.getByRole('button', { name: 'Налаштування' }).click()
await l.page.locator('dialog[open]').getByRole('button', { name: 'Світле' }).click()
await l.page.locator('dialog[open]').getByRole('button', { name: 'Глибина' }).click()
await l.page.locator('dialog[open]').getByRole('button', { name: /^Аа\s*М'який/ }).click()
await l.page.locator('dialog[open]').getByRole('button', { name: 'Готово' }).click()
await tab(l.page, 'Шлях')
assert.equal(await l.page.locator('article.entry[data-look]').count(), 0, 'off by default')
await l.page.getByRole('button', { name: 'Налаштування' }).click()
await l.page.locator('dialog[open]').getByLabel('Показувати записи в оформленні, в якому їх писали').check()
await shot(l.page, 'settings-pathlook')
await l.page.locator('dialog[open]').getByRole('button', { name: 'Готово' }).click()
const card = l.page.locator('article.entry[data-look="lavanda-dark"][data-look-font="lora"]')
await card.waitFor()
const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor)
assert.equal(bg, 'rgb(44, 44, 59)', 'card uses the dark Lavender surface')
await shot(l.page, 'path-look')
await l.page.reload()
await tab(l.page, 'Шлях')
await l.page.locator('article.entry[data-look]').waitFor()

// Draft: unsaved text, mood and an own feeling survive a reload, and go away after «Зберегти».
const dr = await run.open()
await dr.page.locator('#write-free').fill('Ще не збережений текст')
await dr.page.getByRole('button', { name: 'Наповнено' }).click()
await dr.page.getByRole('button', { name: '+ Почуття' }).click()
await dr.page.getByRole('button', { name: '+ своє' }).click()
await dr.page.getByPlaceholder('Твоє слово…').fill('легка туга')
await dr.page.getByRole('button', { name: 'Додати', exact: true }).click()
await dr.page.getByText('Твої тексти чекатимуть тебе тут.', { exact: false }).waitFor()
await dr.page.waitForTimeout(900)
const sealed = await dr.page.evaluate(() => localStorage.getItem('qp-draft:local') ?? '')
assert.ok(sealed && !sealed.includes('збережений'), 'draft is stored encrypted')
await dr.page.reload()
await dr.page.locator('#write-free').waitFor()
assert.equal(await dr.page.locator('#write-free').inputValue(), 'Ще не збережений текст')
assert.equal(await dr.page.getByRole('button', { name: 'Наповнено' }).getAttribute('aria-pressed'), 'true')
await dr.page.getByRole('button', { name: /Почуття: легка туга/ }).waitFor()
// switching tabs keeps it too
await tab(dr.page, 'Шлях')
await tab(dr.page, 'Сторінка')
assert.equal(await dr.page.locator('#write-free').inputValue(), 'Ще не збережений текст')
// the corner mark resizes the field with a pointer
const field = dr.page.locator('#write-free')
await field.evaluate((el) => { el.blur(); el.scrollIntoView({ block: 'start' }) })
const before = (await field.boundingBox()).height
const handle = await dr.page.locator('#write-free + .grow-field__handle').boundingBox()
await dr.page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
await dr.page.mouse.down()
await dr.page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 120, { steps: 5 })
await dr.page.mouse.up()
assert.ok((await field.boundingBox()).height > before + 100, 'field can be pulled taller')
await dr.page.getByRole('button', { name: 'Зберегти', exact: true }).click()
await dr.page.getByText('Збережено. Дякую за цю хвилину.').waitFor()
await dr.page.waitForTimeout(900)
await dr.page.reload()
await dr.page.locator('#write-free').waitFor()
assert.equal(await dr.page.locator('#write-free').inputValue(), '')
assert.equal(await dr.page.evaluate(() => localStorage.getItem('qp-draft:local')), null)
assert.deepEqual(JSON.parse(await dr.page.evaluate(() => localStorage.getItem('ts-myfeels'))), ['легка туга'])

// Swipe left/right moves between the tabs, but not while writing.
const swipe = (page, from, to) => page.evaluate(([x0, x1]) => {
  const target = document.querySelector('.write__intro, .path, .share') ?? document.body
  const t = (x) => new Touch({ identifier: 1, target, clientX: x, clientY: 300 })
  target.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x0)], changedTouches: [t(x0)], bubbles: true }))
  target.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x1)], bubbles: true }))
}, [from, to])
await dr.page.locator('#write-free').evaluate((el) => el.blur())
await swipe(dr.page, 300, 120)
await dr.page.locator('.week').waitFor()
await swipe(dr.page, 120, 300)
await dr.page.locator('#write-free').waitFor()
await dr.page.locator('#write-free').focus()
await swipe(dr.page, 300, 120)
await dr.page.waitForTimeout(200)
assert.equal(await dr.page.locator('.week').count(), 0, 'no swipe while writing')

// About: the footer opens in place; «Як влаштований додаток» leads to the welcome page.
await dr.page.locator('#write-free').evaluate((el) => el.blur())
await dr.page.getByRole('button', { name: 'Про додаток' }).click()
await dr.page.getByText('Кожна ідея допомагає додатку стати кращим.').waitFor()
await dr.page.getByRole('button', { name: 'Конфіденційність і правова інформація' }).click()
const legal = dr.page.locator('dialog[open]')
await legal.getByText('Хто обробляє дані').waitFor()
assert.equal(await legal.locator('.legal__part').count(), 10)
await shot(dr.page, 'legal')
await legal.getByRole('button', { name: 'Закрити' }).click()
await legal.waitFor({ state: 'detached' })
await dr.page.getByRole('button', { name: 'Як влаштований додаток' }).click()
await dr.page.getByText('Що тут є').waitFor()
await shot(dr.page, 'welcome-v2')

assert.deepEqual(await run.close(), [], 'no page errors')
console.log('screens e2e: all flows passed')
