import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LANGS, placeholdersOf } from '../core/i18n/format.ts'

// Every language must have exactly the same shape as Ukrainian (the source language):
// same keys, same value types, same list lengths and the same {placeholders}.

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

function load(lang: string): Json {
  return JSON.parse(readFileSync(new URL(`./locales/${lang}.json`, import.meta.url), 'utf8')) as Json
}

function kind(value: Json): string {
  if (Array.isArray(value)) return 'array'
  return value === null ? 'null' : typeof value
}

function compare(source: Json, other: Json, path: string, problems: string[]): void {
  if (kind(source) !== kind(other)) {
    problems.push(`${path}: ${kind(other)} instead of ${kind(source)}`)
    return
  }
  if (typeof source === 'string') {
    const want = placeholdersOf(source).join(',')
    const got = placeholdersOf(other as string).join(',')
    if (want !== got) problems.push(`${path}: placeholders {${got}} instead of {${want}}`)
    if ((other as string).trim() === '') problems.push(`${path}: empty`)
    return
  }
  if (Array.isArray(source)) {
    const list = other as Json[]
    if (list.length !== source.length) problems.push(`${path}: ${list.length} items instead of ${source.length}`)
    source.forEach((item, i) => list[i] !== undefined && compare(item, list[i] as Json, `${path}[${i}]`, problems))
    return
  }
  if (source && typeof source === 'object') {
    const target = other as Record<string, Json>
    for (const key of Object.keys(source)) {
      if (!(key in target)) problems.push(`${path}.${key}: missing`)
      else compare(source[key] as Json, target[key] as Json, `${path}.${key}`, problems)
    }
    for (const key of Object.keys(target)) if (!(key in source)) problems.push(`${path}.${key}: not in uk`)
  }
}

const source = load('uk')

for (const lang of LANGS.filter((l) => l !== 'uk')) {
  test(`${lang} matches the shape of uk`, () => {
    const problems: string[] = []
    compare(source, load(lang), lang, problems)
    assert.deepEqual(problems, [])
  })
}
