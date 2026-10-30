import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_ITERATIONS, openEnvelope, sealEnvelope } from './envelope.ts'
import { WrongSecretError } from './errors.ts'

test('default iteration count is 600 000 and is stored in the envelope', async () => {
  assert.equal(DEFAULT_ITERATIONS, 600_000)
  const raw = crypto.getRandomValues(new Uint8Array(32))
  const env = await sealEnvelope(raw, 'secret12')
  assert.equal(env.iter, 600_000)
  assert.deepEqual(await openEnvelope(env, 'secret12'), raw)
})

test('each envelope gets its own salt and iv', async () => {
  const raw = crypto.getRandomValues(new Uint8Array(32))
  const a = await sealEnvelope(raw, 'secret12', { iterations: 1000 })
  const b = await sealEnvelope(raw, 'secret12', { iterations: 1000 })
  assert.notEqual(a.salt, b.salt)
  assert.notEqual(a.iv, b.iv)
})

test('a tampered envelope is rejected', async () => {
  const raw = crypto.getRandomValues(new Uint8Array(32))
  const env = await sealEnvelope(raw, 'secret12', { iterations: 1000 })
  const flipped = { ...env, ct: env.ct.slice(0, -4) + (env.ct.endsWith('AAA=') ? 'BBB=' : 'AAA=') }
  await assert.rejects(openEnvelope(flipped, 'secret12'), WrongSecretError)
})
