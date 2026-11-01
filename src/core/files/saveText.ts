/**
 * Gives the person a text file: the share sheet on phones (so it can go to Files, Drive or mail),
 * a normal download elsewhere. Returns false when the person cancelled sharing.
 */
export async function saveTextFile(filename: string, text: string, type = 'text/plain'): Promise<boolean> {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const file = new File([blob], filename, { type })
  if (sharesFiles(file)) {
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

const isPhone = () => /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)

function sharesFiles(file: File): boolean {
  try {
    return isPhone() && Boolean(navigator.canShare?.({ files: [file] }))
  } catch {
    return false
  }
}

/** True when «зберегти» opens the phone's own share menu (messengers, mail, Files) rather than downloading. */
export function canSendFiles(): boolean {
  return sharesFiles(new File([''], 'x.txt', { type: 'text/plain' }))
}
