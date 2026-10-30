/**
 * Gives the person a text file: the share sheet on phones (so it can go to Files, Drive or mail),
 * a normal download elsewhere. Returns false when the person cancelled sharing.
 */
export async function saveTextFile(filename: string, text: string): Promise<boolean> {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const file = new File([blob], filename, { type: 'text/plain' })
  const isPhone = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)
  if (isPhone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return true
}
