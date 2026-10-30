/**
 * Renders a translation that marks emphasis with <b>…</b>. Only <b> is recognised; everything else
 * stays plain text, so no HTML from translations is ever injected.
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
