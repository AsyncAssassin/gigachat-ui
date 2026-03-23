# GigaChat UI (Итоговое ДЗ)

Учебное приложение в стиле ChatGPT на React + TypeScript с локальным backend-proxy для GigaChat.

## Быстрый старт

Требования: Node.js 20+.

```bash
npm install
cp server/.env.example server/.env
# заполните GIGACHAT_AUTH_KEY и GIGACHAT_SCOPE в server/.env
npm run dev:all
```

- Фронтенд: `http://localhost:5173`
- Бэкенд: `http://localhost:8787`

## Безопасность

- Секреты используются только на бэкенде (`server/.env`).
- В git хранятся только шаблоны (`.env.example`).
- Проверка утечек секретов:

```bash
npm run security:secrets
npm run security:secrets:staged
```

- Pre-commit hook:

```bash
git config core.hooksPath .githooks
```

Подробнее: [SECURITY.md](./SECURITY.md)

## Production-пайплайн чата

Основной пользовательский поток:

1. Пользователь отправляет сообщение в `ChatWindow`.
2. Оркестрация запроса выполняется в `useChatSession`:
- `stream:true` (SSE поверх `fetch` + `ReadableStream`),
- обновление ответа токен за токеном,
- `Stop` через `AbortController`,
- fallback на `stream:false`, если стрим не стартовал.
3. Состояние чатов/сообщений/настроек хранится в Zustand.
4. Доменные данные сохраняются в `localStorage` (versioned snapshot + безопасная гидрация/миграция).

`src/hooks/useChat.ts`, `src/hooks/useStreamingResponse.ts`, `src/components/demo/StreamingDemo.tsx` оставлены как non-production demo artifacts и не участвуют в основном пользовательском сценарии.

## Соответствие критериям ДЗ

| Критерий | Где реализовано |
|---|---|
| Главный экран чата (messages + input) | `AppLayout` + `ChatWindow` + `InputArea` |
| Разделение user/assistant и хронология | `MessageList` + `Message` |
| Markdown-ответы | `react-markdown` + `remark-gfm` в `Message` |
| Подсветка кода | custom `code` renderer + `highlight.js` |
| Индикатор загрузки | `TypingIndicator` |
| Автоскролл к последнему сообщению | `MessageList` (`scrollIntoView`) |
| Копирование ответа ассистента | `Message` (copy action) |
| Остановка генерации | `InputArea` + `useChatSession.stopGeneration` |
| Sidebar со списком чатов | `Sidebar` + `ChatList` |
| Новый чат + автоназвание по первому сообщению | `createChat` + `applyAutoTitle` |
| Переключение чатов без потери данных | `activeChatId` + `messagesByChat` |
| Редактирование названия | inline-редактор в `ChatItem` |
| Удаление с подтверждением | confirm-диалог в `Sidebar` |
| Поиск по названию и содержимому | `Sidebar` (по `title` + `messagesByChat`) |
| Персистентность истории и настроек | `chatStore` + `localStorage` |
| POST `/api/v1/chat/completions` и контекст | backend proxy + payload из `useChatSession` |
| Streaming (`stream:true`) + SSE | backend stream proxy + frontend SSE parser |
| Fallback на REST при сбое старта стрима | fallback-ветка в `useChatSession` |
| Параметры (`temperature`, `top_p`, `max_tokens`, `repetition_penalty`) | `SettingsPanel` + payload запроса |
| Модели из API | `GET /api/models` + fallback список |
| Изоляция runtime-ошибок | `AppErrorBoundary` |

## Скрипты

```bash
npm run dev
npm run dev:server
npm run dev:all
npm run start:server
npm run lint
npm run test
npm run test:server
npm run build
npm run typecheck:server
npm run security:secrets
npm run security:secrets:staged
```

## Демо-материалы для сдачи

- Инструкция по демо и чек-лист скриншотов: [docs/demo/README.md](./docs/demo/README.md)
- Папка для скриншотов: `docs/demo/screenshots`
- Перед отправкой добавьте ссылку на итоговое видео-демо в этот README.

Рекомендуемый сценарий live-демо (3–5 минут):

1. Создать новый чат и показать автоназвание.
2. Показать потоковую генерацию и `Stop`.
3. Показать markdown с код-блоком и подсветкой.
4. Показать поиск в sidebar по содержимому сообщений.
5. Показать inline rename + delete confirm.
6. Перезагрузить страницу и показать восстановление истории.
7. Показать fallback-экран Error Boundary и reset UI.

## Финальный чек-лист

- [x] Обязательные критерии интерфейса выполнены.
- [x] Обязательные критерии управления чатами выполнены.
- [x] Реальная интеграция с GigaChat через локальный backend-proxy.
- [x] Streaming + SSE + fallback на REST реализованы.
- [x] Секреты только на бэкенде, secret scan проходит.
- [x] `lint`, `test`, `test:server`, `build` — зелёные.
- [ ] Добавить финальные скриншоты и ссылку на видео перед отправкой преподавателю.
