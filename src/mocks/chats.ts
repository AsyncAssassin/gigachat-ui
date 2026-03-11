import type { Chat } from '../types/chat'

export const mockChats: Chat[] = [
  {
    id: 'chat-1',
    title: 'React roadmap for junior frontend dev',
    lastMessage: 'Собрал для тебя учебный план на 3 месяца.',
    lastMessageAt: new Date().toISOString(),
  },
  {
    id: 'chat-2',
    title: 'Подготовка к собесу (JavaScript + TypeScript)',
    lastMessage: 'Давай потренируем 10 вопросов по event loop.',
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'chat-3',
    title: 'Макет лендинга для портфолио (Figma -> React)',
    lastMessage: 'Сначала выделим дизайн-токены и сетку.',
    lastMessageAt: '2026-03-09T09:45:00.000Z',
  },
  {
    id: 'chat-4',
    title: 'Разбор ошибок TypeScript в проекте',
    lastMessage: 'Проблема была в несовместимых generic-типах.',
    lastMessageAt: '2026-03-07T18:10:00.000Z',
  },
  {
    id: 'chat-5',
    title: 'Идеи pet-проекта с акцентом на frontend',
    lastMessage: 'Сделай mini-канбан с drag and drop.',
    lastMessageAt: '2026-03-04T11:20:00.000Z',
  },
  {
    id: 'chat-6',
    title: 'Краткий конспект по алгоритмам',
    lastMessage: 'Начни с массивов, строк и двух указателей.',
    lastMessageAt: '2026-03-01T08:00:00.000Z',
  },
]
