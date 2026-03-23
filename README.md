# GigaChat UI (Final Homework)

Учебное приложение в стиле ChatGPT на React + TypeScript + local backend-proxy для GigaChat.

## Quick Start

Требования: Node.js 20+.

```bash
npm install
cp server/.env.example server/.env
# заполните GIGACHAT_AUTH_KEY и GIGACHAT_SCOPE в server/.env
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8787`

## Security

- Секреты используются только на backend (`server/.env`), не на фронте.
- В git хранятся только шаблоны (`.env.example`).
- Для проверки утечек:

```bash
npm run security:secrets
npm run security:secrets:staged
```

- Pre-commit hook:

```bash
git config core.hooksPath .githooks
```

Подробно: [SECURITY.md](./SECURITY.md)

## Production Pipeline (Frontend)

Основной production chat flow:

1. Пользователь отправляет сообщение в `ChatWindow`.
2. Оркестрация запроса выполняется через `useChatSession`:
- `stream:true` (SSE over fetch + ReadableStream),
- token-by-token обновление assistant message,
- `Stop` через `AbortController`,
- fallback на `stream:false`, если stream не стартовал.
3. Состояние чатов/сообщений/настроек хранится в Zustand.
4. Доменные данные персистятся в `localStorage` с versioned snapshot + safe hydration/migration.

`src/hooks/useChat.ts`, `src/hooks/useStreamingResponse.ts`, `src/components/demo/StreamingDemo.tsx` сохранены как non-production demo artifacts и не участвуют в пользовательском сценарии.

## Homework Criteria Coverage

| Homework criterion | Implementation |
|---|---|
| Main chat screen (`messages` + input) | `AppLayout` + `ChatWindow` + `InputArea` |
| User/assistant separation + chronological order | `MessageList` + `Message` |
| Markdown responses | `react-markdown` + `remark-gfm` in `Message` |
| Code highlight in markdown blocks | custom `code` renderer + `highlight.js` in `Message` |
| Loading indicator | `TypingIndicator` |
| Auto-scroll to latest message | `MessageList` (`scrollIntoView`) |
| Copy assistant response | `Message` copy action |
| Stop generation | `InputArea` + `useChatSession.stopGeneration` |
| Sidebar with chat list | `Sidebar` + `ChatList` |
| New chat + auto title by first message | `createChat` + `applyAutoTitle` |
| Switch chats without data loss | `activeChatId` + `messagesByChat` |
| Rename title (inline edit) | `ChatItem` inline editor |
| Delete with confirmation | `Sidebar` confirmation dialog |
| Search by title and message content | `Sidebar` search over `title` + `messagesByChat` |
| Persist chat history/settings | `chatStore` localStorage persistence |
| POST `/api/v1/chat/completions` with context | backend proxy + `useChatSession` payload |
| Streaming (`stream:true`) + SSE handling | backend stream proxy + frontend SSE parser |
| Fallback to REST if stream startup fails | `useChatSession` fallback branch |
| Request params (`temperature`, `top_p`, `max_tokens`, `repetition_penalty`) | `SettingsPanel` + chat request payload |
| Model list from API | `GET /api/models` + settings fallback list |
| Runtime isolation | top-level `AppErrorBoundary` fallback |

## Scripts

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

## Demo Package (for Submission)

- Demo instructions and screenshot checklist: [docs/demo/README.md](./docs/demo/README.md)
- Screenshot folder: `docs/demo/screenshots`
- Add final demo video link in this section before submission.

Recommended live demo (3–5 min):

1. Create chat and show auto-title.
2. Show streaming + Stop.
3. Show markdown code block with syntax highlight.
4. Show sidebar search by content.
5. Show inline rename + delete confirmation.
6. Reload page and show persistence recovery.
7. Show Error Boundary fallback and UI reset.

## Final DoD Checklist

- [x] Mandatory UI criteria implemented.
- [x] Chat management criteria implemented.
- [x] Real GigaChat integration through local backend proxy.
- [x] Streaming + SSE + REST fallback path implemented.
- [x] Secrets are backend-only and secret scans are clean.
- [x] `lint`, `test`, `test:server`, `build` are green.
- [ ] Attach screenshot set and demo video link before final submission.
