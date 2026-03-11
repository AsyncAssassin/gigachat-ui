const DAY_MS = 24 * 60 * 60 * 1000

export function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfInput = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.floor((startOfToday.getTime() - startOfInput.getTime()) / DAY_MS)

  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'вчера'

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
