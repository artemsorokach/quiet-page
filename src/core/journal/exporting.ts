import type { Translator } from '../i18n/I18nProvider.tsx'
import type { JournalRecord } from '../store/types.ts'
import { dateFormat } from './dates.ts'
import { diffSide, diffWords } from './diff.ts'
import { feelingLabel } from './feelings.ts'
import { revisions } from './history.ts'
import { EXPORT_MOOD, additionsOf, feelingsOf, isCheck, moodOf, qaOf, type Scales } from './records.ts'

/** What the export needs to know besides the records. */
export interface ExportContext {
  i18n: Translator
  ukFeelings: readonly string[]
  /** the person's current scale, for records saved without one */
  scale: string
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
const oldestFirst = (list: readonly JournalRecord[]) => [...list].sort((a, b) => a.ts - b.ts)

function parts(record: JournalRecord, ctx: ExportContext) {
  const { messages } = ctx.i18n
  const mood = moodOf(record, messages.scales as unknown as Scales, ctx.scale)
  const feelings = feelingsOf(record, ctx.ukFeelings).map((f) => feelingLabel(f, messages.feelings, ctx.ukFeelings))
  return { mood, feelings }
}

/** Plain text, oldest first, entries separated by «— — —». */
export function asText(list: readonly JournalRecord[], ctx: ExportContext): string {
  const { t, lang } = ctx.i18n
  const f = dateFormat(lang)
  return oldestFirst(list)
    .map((record) => {
      const { mood, feelings } = parts(record, ctx)
      let head = `${f.date(record.ts)}, ${f.time(record.ts)}`
      if (isCheck(record)) head = `${t('checkLbl')} · ${head}`
      if ((record as { editedAt?: number }).editedAt) head += ` ${t('editedMark')}`
      let state = ''
      if (mood) state += `\n${t('howI')}: ${mood.word}`
      if (feelings.length) state += `\n${t('feelingsLbl')}: ${feelings.join(', ')}`
      if (isCheck(record)) return head + state
      const body = qaOf(record)
        .filter((item) => item.text)
        .map((item) => (item.prompt ? `«${item.prompt}»\n` : '') + item.text)
        .join('\n\n')
      const adds = additionsOf(record)
        .map((a) => `\n\n${t('addition')} · ${f.day(a.at)}, ${f.time(a.at)}\n${a.text}`)
        .join('')
      const steps = revisions(record)
      const history = steps.length
        ? '\n\n· · ·' +
          [...steps]
            .reverse()
            .map(
              (step) =>
                `\n${t('wasBefore', { d: `${f.day(step.at)}, ${f.time(step.at)}` })}` +
                step.changes
                  .map((c) => {
                    const label = c.additionAt
                      ? `${t('pAdd')} (${f.day(c.additionAt)}, ${f.time(c.additionAt)})`
                      : c.prompt
                        ? t('pAns')
                        : t('pFree')
                    const indent = (s: string) => (s || '—').replace(/\n/g, '\n    ')
                    return `\n  ${label}: \n    ${t('dBefore')}: ${indent(c.before)}\n    ${t('dAfter')}: ${indent(c.after)}`
                  })
                  .join(''),
            )
            .join('')
        : ''
      return `${head}${state}\n\n${body}${adds}${history}`
    })
    .join('\n\n— — —\n\n')
}

function spansHtml(before: string, after: string, side: 'before' | 'after'): string {
  const cls = side === 'before' ? 'ou' : 'hi'
  return diffSide(diffWords(before, after), side)
    .map((s) => (s.marked ? `<span class="${cls}">${escape(s.text)}</span>` : escape(s.text)))
    .join('')
}

function historyHtml(record: JournalRecord, ctx: ExportContext): string {
  const { t, lang } = ctx.i18n
  const f = dateFormat(lang)
  const steps = revisions(record)
  if (!steps.length) return ''
  return (
    steps
      .map(
        (step) =>
          `<div class="hstep"><p class="hv">${escape(t('wasBefore', { d: `${f.day(step.at)}, ${f.time(step.at)}` }))}</p>` +
          step.changes
            .map((c) => {
              const label = c.additionAt ? `${t('addition')} · ${f.day(c.additionAt)}, ${f.time(c.additionAt)}` : (c.prompt ?? t('free'))
              return (
                `<p class="hl">${escape(label)}</p><p class="dl">${escape(t('dBefore'))}</p><p class="ht">${c.before ? spansHtml(c.before, c.after, 'before') : '—'}</p>` +
                `<p class="dl">${escape(t('dAfter'))}</p><p class="ht">${c.after ? spansHtml(c.before, c.after, 'after') : '—'}</p>`
              )
            })
            .join('') +
          '</div>',
      )
      .join('') + `<p class="hint2">${escape(t('diffHint'))}</p>`
  )
}

const PAGE_CSS =
  'body{margin:0;background:#0c1a24;color:#e2eef0;font:17px/1.7 Nunito,"Segoe UI",system-ui,sans-serif;padding:40px 18px}main{max-width:600px;margin:0 auto}' +
  'h1{font-weight:700;font-size:26px;margin:0 0 4px}.sub{color:#97b3bb;font-size:14px;margin:0 0 28px}' +
  'article{background:#132a36;border:1px solid #26495b;border-radius:20px;padding:18px;margin-bottom:12px}article.c{background:#10222c;padding:12px 18px}' +
  '.h{font-size:14px;font-weight:600;color:#97b3bb}' +
  '.st{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;align-items:baseline;margin-top:10px;padding:10px 14px;border-radius:14px;background:#183441}' +
  '.lb{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#62828d}.fs{color:#97b3bb}' +
  'details{margin-top:12px}summary{cursor:pointer;font-size:13px;color:#7f9aa3;text-decoration:underline dotted;text-underline-offset:3px;list-style:none;display:inline}summary::-webkit-details-marker{display:none}' +
  '.hist{margin-top:8px;background:#183441;border-radius:12px;padding:10px 14px}.hist p{margin:4px 0}.hv{font-size:12px;font-weight:600;color:#7f9aa3}.hl{font-size:12px;font-style:italic;color:#62828d}.ht{white-space:pre-wrap;color:#c3d6da}.hstep+.hstep{border-top:1px dashed #2c5062;margin-top:8px;padding-top:8px}.hint2{font-size:12px;color:#62828d}' +
  '.hi{background:rgba(250,212,90,.34);color:#f4f8f8;border-radius:4px;padding:0 3px}.ou{border-bottom:1.5px dotted #7f9aa3}.dl{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#62828d;margin:6px 0 0}' +
  '.q{font-style:italic;color:#97b3bb;margin:12px 0 0}.t{white-space:pre-wrap;margin:6px 0 0}.am{font-size:13px;font-weight:600;color:#62828d;margin:14px 0 0}' +
  '@media (prefers-color-scheme:light){body{background:#e2ebec;color:#1b3138}article{background:#f0f5f5;border-color:#c2d4d7}article.c{background:#e8efef}.st,.hist{background:#e4eeee}.sub,.h,.q,.fs,summary,.hv{color:#4c6870}.ht{color:#2c4850}.hi{color:#1b3138;background:rgba(245,196,64,.38)}}'

/** A standalone, read-only page to send to someone. */
export function asHtml(list: readonly JournalRecord[], ctx: ExportContext, today: Date = new Date()): string {
  const { t, lang } = ctx.i18n
  const f = dateFormat(lang)
  const items = oldestFirst(list)
    .map((record) => {
      const { mood, feelings } = parts(record, ctx)
      const state =
        mood || feelings.length
          ? '<div class="st">' +
            (mood
              ? `<span class="lb">${escape(t('howI'))}</span><b style="border-left:3px solid ${EXPORT_MOOD[mood.value - 1]};padding-left:8px">${escape(mood.word)}</b>`
              : '') +
            (feelings.length ? `<span class="lb">${escape(t('feelingsLbl'))}</span><span class="fs">${escape(feelings.join(', '))}</span>` : '') +
            '</div>'
          : ''
      const recordLang = escape(String((record as { lang?: string }).lang ?? lang))
      const head = `<div class="h">${isCheck(record) ? `${escape(t('checkLbl'))} · ` : ''}${escape(f.date(record.ts))}, ${escape(f.time(record.ts))}</div>`
      if (isCheck(record)) return `<article lang="${recordLang}" class="c">${head}${state}</article>`
      const body = qaOf(record)
        .filter((item) => item.text)
        .map((item) => (item.prompt ? `<p class="q">${escape(item.prompt)}</p>` : '') + `<p class="t">${escape(item.text)}</p>`)
        .join('')
      const adds = additionsOf(record)
        .map((a) => `<p class="am">${escape(t('addition'))} · ${escape(f.day(a.at))}, ${escape(f.time(a.at))}</p><p class="t">${escape(a.text)}</p>`)
        .join('')
      const hist = historyHtml(record, ctx)
      const details = hist ? `<details><summary>${escape(t('edited'))}</summary><div class="hist">${hist}</div></details>` : ''
      return `<article lang="${recordLang}">${head}${state}${body}${adds}${details}</article>`
    })
    .join('')
  const title = `${escape(t('appName'))} · ${escape(t('copyOf'))}`
  const sub = `${escape(t('copyOf'))} · ${list.length} · ${escape(t('created'))} ${escape(today.toLocaleDateString(lang))}`
  return (
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;0,700;1,400&display=swap">' +
    `<style>${PAGE_CSS}</style></head><body><main><h1>${escape(t('appName'))}</h1><p class="sub">${sub}</p>${items}</main></body></html>`
  )
}
