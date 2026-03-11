export function autoSizeTextarea(
  textarea: HTMLTextAreaElement,
  maxRows = 5,
  minRows = 1,
): void {
  const lineHeight = 24
  const minHeight = minRows * lineHeight
  const maxHeight = maxRows * lineHeight

  textarea.style.height = 'auto'
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
}
