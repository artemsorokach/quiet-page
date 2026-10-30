import { useI18n } from '../../core/i18n/I18nProvider.tsx'
import { dateFormat } from '../../core/journal/dates.ts'
import { diffSide, diffWords } from '../../core/journal/diff.ts'
import { revisions } from '../../core/journal/history.ts'
import type { JournalRecord } from '../../core/store/types.ts'

function Side({ before, after, side }: { before: string; after: string; side: 'before' | 'after' }) {
  const text = side === 'before' ? before : after
  if (!text) return <p class="history__text">—</p>
  return (
    <p class="history__text">
      {diffSide(diffWords(before, after), side).map((span, i) =>
        span.marked ? <span key={i} class={side === 'before' ? 'history__out' : 'history__in'}>{span.text}</span> : span.text,
      )}
    </p>
  )
}

/** Earlier versions of an edited entry, with the changed words marked. */
export function History({ record }: { record: JournalRecord }) {
  const { t, lang } = useI18n()
  const f = dateFormat(lang)
  return (
    <div class="history">
      {revisions(record).map((step) => (
        <div class="history__step" key={step.at}>
          <p class="history__when">{t('wasBefore', { d: `${f.day(step.at)}, ${f.time(step.at)}` })}</p>
          {step.changes.map((change, i) => (
            <div key={i}>
              <p class="history__label">
                {change.additionAt ? `${t('addition')} · ${f.day(change.additionAt)}, ${f.time(change.additionAt)}` : (change.prompt ?? t('free'))}
              </p>
              <p class="history__side">{t('dBefore')}</p>
              <Side before={change.before} after={change.after} side="before" />
              <p class="history__side">{t('dAfter')}</p>
              <Side before={change.before} after={change.after} side="after" />
            </div>
          ))}
        </div>
      ))}
      <p class="history__hint">{t('diffHint')}</p>
    </div>
  )
}
