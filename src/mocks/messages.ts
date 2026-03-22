import type { Message } from '../types/message'

export const mockMessagesByChat: Record<string, Message[]> = {
  'chat-1': [
    {
      id: 'msg-1',
      role: 'assistant',
      content:
        'Собрал план обучения. Начни с **базы React** и постепенно переходи к TypeScript.',
      timestamp: '2026-03-11T09:00:00.000Z',
    },
    {
      id: 'msg-2',
      role: 'user',
      content: 'Супер. Добавь практику и мини-проекты.',
      timestamp: '2026-03-11T09:01:00.000Z',
    },
    {
      id: 'msg-3',
      role: 'assistant',
      content: `Отлично. Практика на неделю:\n\n- собрать Todo c фильтрами\n- добавить markdown-редактор\n- сделать чат-интерфейс\n\n\`\`\`ts\ntype WeekPlan = { day: string; task: string }\n\`\`\``,
      timestamp: '2026-03-11T09:02:00.000Z',
    },
    {
      id: 'msg-4',
      role: 'user',
      content: 'Ок, а что по алгоритмам?',
      timestamp: '2026-03-11T09:03:00.000Z',
    },
    {
      id: 'msg-5',
      role: 'assistant',
      content:
        'Держи приоритет: *массивы*, *строки*, затем хэш-таблицы. Ежедневно 2-3 задачи.',
      timestamp: '2026-03-11T09:04:00.000Z',
    },
    {
      id: 'msg-6',
      role: 'user',
      content: 'Принято, спасибо!',
      timestamp: '2026-03-11T09:05:00.000Z',
    },
  ],
}
