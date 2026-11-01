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
// First visit: the explanation is open; later it waits folded.
await a.page.getByText('Ти створюєш', { exact: false }).waitFor()
assert.equal(await a.page.locator('details.share__about').getAttribute('open'), '')
await a.page.getByText(/^Записів: \d+ · /).waitFor()
await shot(a.page, 'share')
await a.page.getByRole('button', { name: 'Скопіювати текст' }).click()
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
assert.equal(await a.page.getByText('Файл збережеться в «Завантаження», звідти його можна надіслати.').count(), 1, 'on a computer the button says what it does')
const html = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8')
assert.match(html, /<!doctype html>/)
assert.ok(!html.includes('Ранкова кава'), 'text left out with «Лише відмітки»')
assert.match(html, /Відмітка/)

// "send this day" from the Path preselects that day
await tab(a.page, 'Шлях')
await (await dayWithRecords(a.page)).click()
await a.page.getByRole('button', { name: 'Надіслати цей день' }).click()
await a.page.locator('.share__range[aria-pressed="true"]', { hasText: 'Обрати дні' }).waitFor()
assert.equal(await a.page.locator('details.share__about[open]').count(), 0, 'folded on later visits')

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
// Opening «Про додаток» glides the page down so its text is in view.
await dr.page.waitForFunction(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4)
await dr.page.getByRole('button', { name: 'Конфіденційність і правова інформація' }).click()
const legal = dr.page.locator('dialog[open]')
await legal.getByText('Хто обробляє дані').waitFor()
await legal.getByText(/у Цюриху/).waitFor()
assert.equal(await legal.locator('.legal__part').count(), 10)
await shot(dr.page, 'legal')
await legal.getByRole('button', { name: 'Закрити' }).click()
await legal.waitFor({ state: 'detached' })
await dr.page.getByRole('button', { name: 'Як влаштований додаток' }).click()
await dr.page.getByText('Що тут є').waitFor()
assert.equal(await dr.page.evaluate(() => window.scrollY), 0, 'the welcome page opens at its top')
await shot(dr.page, 'welcome-v2')
await dr.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await dr.page.getByRole('button', { name: 'Подивитися приклад' }).click()
await dr.page.getByText('Це приклад. Записи тут не зберігаються.').waitFor()
assert.equal(await dr.page.evaluate(() => window.scrollY), 0, 'the example opens at the top')
await dr.page.getByRole('button', { name: 'Вийти з прикладу' }).click()
await dr.page.locator('#write-free').waitFor()
await dr.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await dr.page.waitForFunction(() => document.querySelector('.app-foot')?.classList.contains('is-shown'))

// Something chosen but not saved: the Path says so and can save it.
const un = await run.open({})
await un.page.locator('#write-free').waitFor()
await un.page.getByText('Добре', { exact: true }).click()
await tab(un.page, 'Шлях')
await un.page.getByText('На «Сторінці» є незбережене: стан і почуття.').waitFor()
await shot(un.page, 'path-unsaved')
await un.page.getByRole('button', { name: 'Зберегти зараз' }).click()
await un.page.locator('.entry--check').waitFor()
assert.equal(await un.page.locator('.unsaved').count(), 0)
await un.page.locator('#write-free').count()
await tab(un.page, 'Сторінка')
await un.page.locator('#write-free').fill('Текст, якому дамо інше оформлення')
await un.page.getByRole('button', { name: 'Зберегти' }).click()
await un.page.getByText('Збережено. Дякую за цю хвилину.').waitFor()

// «•••» → «Оформлення»: this entry keeps its own look even with the setting off.
await tab(un.page, 'Шлях')
const styled = un.page.locator('article.entry').first()
assert.equal(await styled.getAttribute('data-look'), null)
await styled.getByRole('button', { name: 'Дії із записом' }).click()
await styled.getByRole('button', { name: 'Оформлення' }).click()
await styled.getByRole('button', { name: 'Лаванда' }).click()
await styled.getByRole('button', { name: 'Темне' }).click()
assert.equal(await styled.getAttribute('data-look'), 'lavanda-dark', 'shown at once')
await styled.getByRole('button', { name: 'Як було' }).click()
assert.equal(await styled.getAttribute('data-look'), null, 'undone')
await styled.getByRole('button', { name: 'Дії із записом' }).click()
await styled.getByRole('button', { name: 'Оформлення' }).click()
await styled.getByRole('button', { name: 'Лаванда' }).click()
await styled.getByRole('button', { name: 'Книжковий' }).click()
await shot(un.page, 'entry-look')
await styled.getByRole('button', { name: 'Готово' }).click()
await toast(un.page, 'Оформлення збережено.')
const kept = JSON.parse(await un.page.evaluate(() => localStorage.getItem('ts-entries')))
assert.equal(kept.find((r) => r.qa)?.look?.chosen, true)
await un.page.reload()
await tab(un.page, 'Шлях')
await un.page.locator('article.entry[data-look][data-look-font="lora"]').waitFor()

// «Згорнути» folds the question away and «Показати питання» brings it back.
await un.page.getByRole('navigation').getByRole('button', { name: 'Сторінка', exact: true }).click()
await un.page.getByRole('button', { name: 'Згорнути' }).click()
await un.page.getByRole('button', { name: 'Питання на сьогодні · Показати питання' }).click()
await un.page.locator('#write-question').waitFor()

// Coming back to an older entry: it stays in place, and «Нещодавно доповнено» points to it.
const threeDaysAgo = Date.now() - 3 * 864e5
const back = await run.open({ local: { 'ts-entries': JSON.stringify([{ id: 'old1', ts: threeDaysAgo, mood: 1, scale: 'syly', feelings: [], qa: [{ prompt: null, text: 'Важкий день.' }], text: 'Важкий день.', lang: 'uk' }]) } })
await back.page.locator('#write-free').waitFor()
await tab(back.page, 'Шлях')
assert.equal(await back.page.locator('.recent').count(), 0)
const oldCard = back.page.locator('article.entry').first()
await oldCard.getByRole('button', { name: 'Дії із записом' }).click()
await oldCard.getByRole('button', { name: 'Дописати' }).click()
await oldCard.locator('textarea').fill('Минуло три дні, стало легше.')
await oldCard.getByRole('button', { name: 'Додати' }).click()
await back.page.locator('.recent').getByText('Минуло три дні, стало легше.').waitFor()
await shot(back.page, 'path-recent')
await back.page.locator('.recent__item').click()
await back.page.getByRole('button', { name: 'Показати все' }).waitFor()

// Path tools: a year ago, search, important, month review.
{
  const DAY = 864e5
  const now = new Date()
  const yearAgoTs = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 20).getTime()
  const seeded = [
    { id: 'y1', ts: yearAgoTs, mood: 4, scale: 'syly', feelings: ['hope'], qa: [{ prompt: null, text: 'Перший тиждень у новому місті.' }], text: 'x', lang: 'uk' },
    { id: 'f1', ts: Date.now() - 2 * 3600e3, mood: 5, scale: 'syly', feelings: ['joy', 'calm'], qa: [{ prompt: null, text: 'Ранкова кава біля озера.' }], text: 'x', lang: 'uk' },
    { id: 'c1', type: 'check', ts: Date.now() - 4 * 3600e3, mood: 3, scale: 'syly', feelings: ['calm'] },
    { id: 'd1', ts: Date.now() - 3 * 3600e3, mood: 1, scale: 'syly', feelings: ['tired'], qa: [{ prompt: null, text: 'Дуже втомився після офісу.' }], text: 'x', lang: 'uk' },
  ]
  const tl = await run.open({ local: { 'ts-entries': JSON.stringify(seeded) } })
  await tl.page.locator('#write-free').waitFor()
  await tab(tl.page, 'Шлях')
  await tl.page.locator('.insight').getByText('Перший тиждень у новому місті.').waitFor()
  await shot(tl.page, 'path-year-ago')

  await tl.page.getByRole('button', { name: 'Пошук', exact: true }).click()
  await tl.page.getByPlaceholder('Слово або кілька слів').fill('КАВА')
  await tl.page.getByText('Знайдено: 1').waitFor()
  assert.equal(await tl.page.locator('article.entry mark').first().innerText(), 'кава')
  await tl.page.getByPlaceholder('Слово або кілька слів').fill('')
  await tl.page.locator('.search__feeling', { hasText: 'втома' }).click()
  await tl.page.getByText('Знайдено: 1').waitFor()
  await shot(tl.page, 'path-search')
  await tl.page.getByRole('button', { name: 'Пошук', exact: true }).click()

  const first = tl.page.locator('article.entry').first()
  await first.getByRole('button', { name: 'Важливе' }).click()
  await toast(tl.page, 'Додано до важливого.')
  await tl.page.locator('.entry--check').first().getByRole('button', { name: 'Важливе' }).click()
  await tl.page.waitForFunction(() => JSON.parse(localStorage.getItem('ts-entries')).filter((r) => r.important).length === 2)
  await tl.page.locator('.path-tools').getByRole('button', { name: 'Важливе' }).click()
  assert.equal(await tl.page.locator('article.entry').count(), 1)
  assert.equal(await tl.page.locator('.entry--check').count(), 1, 'mood notes can be important too')
  await tl.page.locator('.path-tools').getByRole('button', { name: 'Важливе' }).click()

  await tl.page.getByRole('button', { name: 'Огляд', exact: true }).click()
  await tl.page.getByText('Огляд місяця').waitFor()
  assert.equal(await tl.page.locator('.mood-rows li').count(), 1, 'one day, counted once by its average state')
  await tl.page.getByText('Що з цього місяця хочеться взяти з собою?').waitFor()
  await tl.page.getByRole('button', { name: 'Коли сил менше' }).click()
  await tl.page.locator('.insight__snip', { hasText: 'Дуже втомився' }).waitFor()
  await shot(tl.page, 'path-review')
  assert.equal(await tl.page.locator('#path-feed').isHidden(), true, 'the feed waits while reviewing')
}

assert.deepEqual(await run.close(), [], 'no page errors')
console.log('screens e2e: all flows passed')
