/**
 * End-to-end check of saving and the account flows against the fake Firebase build.
 *
 *   npx vite build --mode e2e && node e2e/account.e2e.mjs [screenshotDir]
 *
 * The build is served from https://qp.test/quiet-page/ through Playwright routing
 * (a secure context, so WebCrypto works). Nothing reaches the real Firebase.
 */
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { fakeState, heading, launch, toast } from './harness.mjs'

const fixtures = JSON.parse(await readFile(new URL('../src/core/crypto/__fixtures__/legacy-fixtures.json', import.meta.url)))
const run = await launch(process.argv[2])
const open = (fake) => run.open({ fake })
const shot = run.shot
const entriesOf = (state, uid) => Object.keys(state.docs ?? {}).filter((k) => k.startsWith(`users/${uid}/entries/`))

async function writeAndSave(page, text) {
  await page.locator('#write-free').fill(text)
  await page.getByRole('button', { name: 'Зберегти', exact: true }).click()
  await page.getByText('Збережено. Дякую за цю хвилину.').waitFor()
}

// 1. First entry without an account stays in this browser.
const a = await open(null)
await writeAndSave(a.page, 'Перший запис без акаунта')
await a.page.locator('.write__local').waitFor()
await shot(a.page, 'local-saved')
assert.equal(JSON.parse(await a.page.evaluate(() => localStorage.getItem('ts-entries'))).length, 1)

// 2. Sign up, create the entries password, see the recovery code.
await a.page.locator('.write__local').getByRole('button', { name: 'Увійти' }).click()
await heading(a.page, 'Увійти')
assert.equal(await a.page.evaluate(() => window.scrollY), 0, 'the sign-in screen opens at its top')
await shot(a.page, 'sign-in')
await a.page.locator('#auth-email').fill('person@example.com')
await a.page.locator('#auth-pass').fill('account-pass')
await a.page.getByRole('button', { name: 'Створити акаунт' }).click()
await heading(a.page, 'Пароль для записів')
await a.page.getByText('Вхід виконано. Тепер придумай пароль для записів: він окремий від пароля для входу.').waitFor()
await a.page.getByRole('button', { name: 'Показати пароль' }).first().waitFor()
await a.page.locator('#key-pass').fill('short')
await a.page.locator('#key-pass2').fill('short')
await a.page.getByRole('button', { name: 'Зберегти пароль' }).click()
await a.page.getByText('Щонайменше 6 символів.').waitFor()
await a.page.locator('#key-pass').fill('entries-pass-1')
await a.page.locator('#key-pass2').fill('entries-pass-2')
await a.page.getByRole('button', { name: 'Зберегти пароль' }).click()
await a.page.getByText('Паролі не збігаються.').waitFor()
await a.page.locator('#key-pass2').fill('entries-pass-1')
await shot(a.page, 'new-password')
await a.page.getByRole('button', { name: 'Зберегти пароль' }).click()
await heading(a.page, 'Код відновлення')
const code = (await a.page.locator('.account__code').innerText()).replace(/\s+/g, '')
assert.match(code, /^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{4}$/)
await shot(a.page, 'recovery-code')
await a.page.getByRole('button', { name: 'Код збережено' }).click()
await a.page.locator('#write-free').waitFor()
assert.equal(await a.page.locator('.write__local').count(), 0, 'local notice hidden once in the cloud')

// 3. The local entry moved to the cloud, encrypted; the browser copy is cleared.
let state = await fakeState(a.page)
const uid = state.current
await a.page.waitForFunction((u) => Object.keys(JSON.parse(localStorage.getItem('fake-fb')).docs).filter((k) => k.startsWith(`users/${u}/entries/`)).length === 1, uid)
state = await fakeState(a.page)
assert.equal(state.docs[`users/${uid}`].keyring.v, 2)
const [firstPath] = entriesOf(state, uid)
assert.deepEqual(Object.keys(state.docs[firstPath]).sort(), ['ct', 'iv', 'ts', 'v'])
assert.ok(!JSON.stringify(state).includes('Перший запис'), 'no plaintext in the cloud')
assert.equal(await a.page.evaluate(() => localStorage.getItem('ts-entries')), '[]')

// 4. A cloud entry, then a reload: this device remembers the key.
await writeAndSave(a.page, 'Другий запис у хмарі')
await a.page.waitForFunction((u) => Object.keys(JSON.parse(localStorage.getItem('fake-fb')).docs).filter((k) => k.startsWith(`users/${u}/entries/`)).length === 2, uid)
await a.page.reload()
await a.page.locator('#write-free').waitFor()
await a.page.waitForTimeout(400)
assert.equal(await a.page.getByRole('heading', { name: 'Відкрити записи' }).count(), 0, 'no password prompt after reload')
state = await fakeState(a.page)
await a.context.close()

// 5. Another device: wrong password, then the right one.
const b = await open(state)
await heading(b.page, 'Відкрити записи')
await b.page.locator('#key-pass').fill('nope-nope')
await b.page.getByRole('button', { name: 'Відкрити', exact: true }).click()
await b.page.getByText('Пароль не підходить.').waitFor()
await shot(b.page, 'open-wrong')
await b.page.locator('#key-pass').fill('entries-pass-1')
await b.page.getByRole('button', { name: 'Відкрити', exact: true }).click()
await b.page.locator('#write-free').waitFor()
await b.context.close()

// 6. Another device: forgot the password, recover with the (normalised) code, set a new one.
const c = await open(state)
await heading(c.page, 'Відкрити записи')
await c.page.getByRole('button', { name: 'Не пам’ятаю пароль' }).click()
await heading(c.page, 'Код відновлення')
await c.page.locator('#key-code').fill('AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG')
await c.page.getByRole('button', { name: 'Продовжити' }).click()
await c.page.locator('.account__message').filter({ hasText: /код/i }).waitFor()
await c.page.locator('#key-code').fill(code.toLowerCase().replace(/0/g, 'o').replace(/-/g, ' '))
await shot(c.page, 'recover')
await c.page.getByRole('button', { name: 'Продовжити' }).click()
await heading(c.page, 'Новий пароль для записів')
await c.page.locator('#key-pass').fill('entries-pass-2')
await c.page.locator('#key-pass2').fill('entries-pass-2')
await c.page.getByRole('button', { name: 'Зберегти пароль' }).click()
await heading(c.page, 'Новий пароль збережено')
await shot(c.page, 'password-done')
await c.page.getByRole('button', { name: 'Далі' }).click()
await c.page.locator('#write-free').waitFor()
state = await fakeState(c.page)
await c.context.close()

// 7. The old password no longer opens; the new one does.
const d = await open(state)
await heading(d.page, 'Відкрити записи')
await d.page.locator('#key-pass').fill('entries-pass-1')
await d.page.getByRole('button', { name: 'Відкрити', exact: true }).click()
await d.page.getByText('Пароль не підходить.').waitFor()
await d.page.locator('#key-pass').fill('entries-pass-2')
await d.page.getByRole('button', { name: 'Відкрити', exact: true }).click()
await d.page.locator('#write-free').waitFor()
await d.context.close()

// 8. No password and no code: start over deletes everything after a confirmation.
const e = await open(state)
await heading(e.page, 'Відкрити записи')
await e.page.getByRole('button', { name: 'Не пам’ятаю пароль' }).click()
await e.page.getByRole('button', { name: 'Немає ні пароля, ні коду' }).click()
await heading(e.page, 'Без пароля й коду')
await e.page.getByRole('button', { name: 'Почати з чистої сторінки' }).click()
await e.page.getByText('Усі старі записи буде видалено назавжди.', { exact: false }).waitFor()
await shot(e.page, 'start-over')
await e.page.getByRole('button', { name: 'Видалити й почати заново' }).click()
await heading(e.page, 'Пароль для записів')
const cleared = await fakeState(e.page)
assert.equal(entriesOf(cleared, uid).length, 0)
assert.equal(cleared.docs[`users/${uid}`].keyring, undefined)
await e.context.close()

// 9. Legacy v1 account: first unlock migrates to the keyring and shows a recovery code.
const legacyUid = 'u-legacy'
const legacy = {
  users: [{ uid: legacyUid, email: 'old@example.com', password: 'x' }],
  current: legacyUid,
  docs: {
    [`users/${legacyUid}`]: fixtures.v1.userDoc,
    [`users/${legacyUid}/entries/e-old`]: fixtures.v1.entryDoc,
  },
}
const f = await open(legacy)
await heading(f.page, 'Відкрити записи')
await f.page.locator('#key-pass').fill(fixtures.v1.password)
await f.page.getByRole('button', { name: 'Відкрити', exact: true }).click()
await heading(f.page, 'Код відновлення')
await f.page.getByRole('button', { name: 'Код збережено' }).click()
await f.page.locator('#write-free').waitFor()
const migrated = await fakeState(f.page)
const userDoc = migrated.docs[`users/${legacyUid}`]
assert.equal(userDoc.keyring.v, 2)
assert.equal(userDoc.salt, undefined)
assert.equal(userDoc.check, undefined)
assert.equal(migrated.docs[`users/${legacyUid}/entries/e-old`].v, 2)

// 10. Support sheet opens from the write screen.
await f.page.getByRole('button', { name: 'Якщо зараз дуже важко' }).click()
await f.page.locator('dialog[open]').waitFor()
await shot(f.page, 'support')
await f.context.close()

// 11. Delete the account: wrong passwords change nothing; the right ones remove everything.
const gone = await open(null)
await writeAndSave(gone.page, 'Запис, який буде видалено')
await gone.page.locator('.write__local').getByRole('button', { name: 'Увійти' }).click()
await gone.page.locator('#auth-email').fill('leaving@example.com')
await gone.page.locator('#auth-pass').fill('login-pass')
await gone.page.getByRole('button', { name: 'Створити акаунт' }).click()
await gone.page.locator('#key-pass').fill('entries-pass-9')
await gone.page.locator('#key-pass2').fill('entries-pass-9')
await gone.page.getByRole('button', { name: 'Зберегти пароль' }).click()
await gone.page.getByRole('button', { name: 'Код збережено' }).click()
await gone.page.locator('#write-free').waitFor()
const leavingUid = (await fakeState(gone.page)).current
await gone.page.waitForFunction((u) => Object.keys(JSON.parse(localStorage.getItem('fake-fb')).docs).some((k) => k.startsWith(`users/${u}/entries/`)), leavingUid)
await gone.page.getByRole('button', { name: 'Налаштування' }).click()
await gone.page.locator('dialog[open]').getByRole('button', { name: 'Видалити акаунт і всі записи' }).click()
await heading(gone.page, 'Видалити акаунт')
await gone.page.locator('#del-entries').fill('entries-pass-9')
await gone.page.locator('#del-login').fill('wrong-login')
await gone.page.getByRole('button', { name: 'Видалити назавжди' }).click()
await gone.page.getByText('Неправильна пошта або пароль.').waitFor()
await gone.page.locator('#del-entries').fill('wrong-entries')
await gone.page.locator('#del-login').fill('login-pass')
await gone.page.getByRole('button', { name: 'Видалити назавжди' }).click()
await gone.page.getByText('Пароль не підходить.').waitFor()
await gone.page.locator('#del-entries').fill('entries-pass-9')
assert.ok(entriesOf(await fakeState(gone.page), leavingUid).length > 0, 'nothing removed yet')
await shot(gone.page, 'delete-account')
await gone.page.locator('#del-login').fill('login-pass')
await gone.page.getByRole('button', { name: 'Видалити назавжди' }).click()
await toast(gone.page, 'Акаунт і всі записи видалено.')
const after = await fakeState(gone.page)
assert.equal(entriesOf(after, leavingUid).length, 0, 'entries deleted')
assert.equal(after.docs[`users/${leavingUid}`], undefined, 'user document deleted')
assert.ok(!after.users.some((u) => u.uid === leavingUid), 'sign-in deleted')
assert.equal(after.current, null)
assert.equal(await gone.page.evaluate(() => localStorage.getItem('ts-entries')), null, 'nothing left in this browser')
await gone.page.locator('#write-free').waitFor()

// 12. Signed out: delete what this browser keeps (two taps).
await writeAndSave(gone.page, 'Локальний запис')
await gone.page.getByRole('button', { name: 'Налаштування' }).click()
await gone.page.locator('dialog[open]').getByRole('button', { name: 'Видалити всі записи на цьому пристрої' }).click()
await gone.page.locator('dialog[open]').getByRole('button', { name: 'Точно? Натисни ще раз' }).click()
await toast(gone.page, 'Записи на цьому пристрої видалено.')
assert.equal(await gone.page.evaluate(() => localStorage.getItem('ts-entries')), null)
await gone.context.close()

assert.deepEqual(await run.close(), [], 'no page errors')
console.log('account e2e: all flows passed')
