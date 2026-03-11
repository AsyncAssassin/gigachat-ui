import type { Message } from '../types/chat'

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    chatId: 'chat-1',
    role: 'assistant',
    senderName: 'GigaChat',
    content:
      'Собрал план обучения. Начни с **базы React** и постепенно переходи к TypeScript.',
    createdAt: '2026-03-11T09:00:00.000Z',
  },
  {
    id: 'msg-2',
    chatId: 'chat-1',
    role: 'user',
    senderName: 'Вы',
    content: 'Супер. Добавь практику и мини-проекты.',
    createdAt: '2026-03-11T09:01:00.000Z',
  },
  {
    id: 'msg-3',
    chatId: 'chat-1',
    role: 'assistant',
    senderName: 'GigaChat',
    content: `Отлично. Практика на неделю:\n\n- собрать Todo c фильтрами\n- добавить markdown-редактор\n- сделать чат-интерфейс\n\n\`\`\`ts\ntype WeekPlan = { day: string; task: string }\n\`\`\``,
    createdAt: '2026-03-11T09:02:00.000Z',
  },
  {
    id: 'msg-4',
    chatId: 'chat-1',
    role: 'user',
    senderName: 'Вы',
    content: 'Ок, а что по алгоритмам?',
    createdAt: '2026-03-11T09:03:00.000Z',
  },
  {
    id: 'msg-5',
    chatId: 'chat-1',
    role: 'assistant',
    senderName: 'GigaChat',
    content:
      'Держи приоритет: *массивы*, *строки*, затем хэш-таблицы. Ежедневно 2-3 задачи.',
    createdAt: '2026-03-11T09:04:00.000Z',
  },
  {
    id: 'msg-6',
    chatId: 'chat-1',
    role: 'user',
    senderName: 'Вы',
    content: 'Принято, спасибо!',
    createdAt: '2026-03-11T09:05:00.000Z',
  },
]
