/**
 * Renders a translation that marks emphasis with <b>…</b> (and, in Paragraphs, splits <p>…</p>).
 * Nothing else is interpreted, so no HTML from translations is ever injected.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(<b>.*?<\/b>)/).map((part, i) =>
        part.startsWith('<b>') && part.endsWith('</b>') ? <strong key={i}>{part.slice(3, -4)}</strong> : part,
      )}
    </>
  )
}

export function Paragraphs({ text }: { text: string }) {
  const parts = [...text.matchAll(/<p>(.*?)<\/p>/gs)].map((m) => m[1] ?? '')
  return (
    <>
      {(parts.length ? parts : [text]).map((part, i) => (
        <p key={i}>
          <RichText text={part} />
        </p>
      ))}
    </>
  )
}
