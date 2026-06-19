# GigaChat UI

Personal React + TypeScript chat client with a Node.js/Express TypeScript backend proxy for GigaChat.

The project is built as a practical full-stack demo: the browser never receives GigaChat credentials, OAuth token exchange stays on the backend, chat completions can stream through SSE, and image prompts go through a backend upload flow before being attached to model requests.

## What This Demonstrates

- React + TypeScript chat UX with sidebar history, markdown rendering, code highlighting, settings, persistence, stop generation, and error isolation.
- Node.js/Express TypeScript backend proxy for GigaChat API calls.
- OAuth token provider with caching, refresh-on-401 retry, and redacted logging.
- SSE streaming proxy with frontend token-by-token rendering and REST fallback when streaming does not start.
- Zod validation for server environment and request payloads.
- Multimodal image upload: frontend attachment, backend `/files` upload, and `messages[].attachments` forwarding.
- Vitest coverage for frontend hooks/components/store and Supertest coverage for backend routes/auth/error behavior.

## Quick Start

Requirements: Node.js 20.19+ and npm 10+.

```bash
npm ci
cp server/.env.example server/.env
# Fill GIGACHAT_AUTH_KEY and GIGACHAT_SCOPE in server/.env.
# If your network uses TLS interception, set GIGACHAT_CA_CERT_PATH in server/.env.
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Backend proxy: `http://localhost:8787`
- Health check: `http://localhost:8787/api/health`

## Environment

Runtime secrets belong only in `server/.env`.

```bash
PORT=8787
GIGACHAT_AUTH_KEY=__SET_LOCALLY__
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
GIGACHAT_API_URL=https://gigachat.devices.sberbank.ru/api/v1
# GIGACHAT_CA_CERT_PATH=/absolute/path/to/corporate-ca.pem
```

The Vite frontend does not need a real API key or token. It talks only to the local backend proxy under `/api`.

## Security

- Real secrets are ignored by Git via `.env`, `.env.*`, `server/.env`, and `server/.env.*`.
- Only placeholders are committed in `.env.example` files.
- Logger output redacts auth headers, tokens, and `GIGACHAT_AUTH_KEY`-style assignments.
- Gitleaks checks are available locally and in GitHub Actions.

```bash
npm run security:secrets
npm run security:secrets:staged
```

Optional local pre-commit hook:

```bash
git config core.hooksPath .githooks
```

More details: [SECURITY.md](./SECURITY.md)

## TLS Certificate Notes

If GigaChat calls fail with `AUTH_NETWORK_ERROR` or `self-signed certificate in certificate chain`, add a trusted CA certificate in PEM format and point the backend to it:

```bash
GIGACHAT_CA_CERT_PATH=/absolute/path/to/corporate-ca.pem
```

Restart the backend after changing this value. Avoid `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Chat Flow

1. The user sends a message from `ChatWindow`.
2. `useChatSession` prepares the request with model settings and chat context.
3. The frontend calls the local backend proxy, never GigaChat directly.
4. The backend validates payloads with zod, fetches/caches an OAuth token, uploads images when present, and forwards the request to GigaChat.
5. For `stream:true`, the backend proxies SSE and the frontend updates the assistant message token by token.
6. If streaming fails before the first chunk, the frontend retries with `stream:false`.
7. Zustand stores chats, messages, active chat, and settings in a versioned localStorage snapshot.

`src/hooks/useChat.ts`, `src/hooks/useStreamingResponse.ts`, and `src/components/demo/StreamingDemo.tsx` are kept as non-production demo artifacts; the main user flow is `useChatSession`.

## Feature Map

| Area | Implementation |
|---|---|
| Chat layout, messages, input | `AppLayout`, `ChatWindow`, `MessageList`, `InputArea` |
| User/assistant roles and chronology | `MessageList`, `Message` |
| Markdown and code highlighting | `react-markdown`, `remark-gfm`, `highlight.js` |
| Loading and stop generation | `TypingIndicator`, `AbortController`, `useChatSession.stopGeneration` |
| Sidebar, search, rename, delete | `Sidebar`, `ChatList`, `ChatItem` |
| Persistent state | Zustand store with versioned `localStorage` hydration |
| Models and generation settings | `SettingsPanel`, `GET /api/models`, request payload mapping |
| Backend proxy | Express app under `server/` |
| OAuth | `OAuthTokenProvider` with cache and refresh retry |
| SSE streaming | Backend stream proxy + frontend SSE parser |
| REST fallback | Fallback branch in `useChatSession` |
| Multimodal image prompt | `InputArea` attachment + backend file upload + `attachments` payload |
| Runtime validation | zod schemas in `server/config/env.ts` and `server/gigachat/routes.ts` |
| Tests | Vitest frontend tests and Supertest backend route tests |

## Scripts

```bash
npm run dev
npm run dev:server
npm run dev:all
npm run start:server
npm run lint
npm run test
npm run test:server
npm run typecheck:server
npm run build
npm run security:secrets
npm run security:secrets:staged
```

## Verification Before Publishing

```bash
npm ci
npm run lint
npm run test
npm run test:server
npm run typecheck:server
npm run build
npm audit --omit=dev
```

Full `npm audit` currently includes dev tooling as well; evaluate any remaining dev-only findings separately from runtime production dependencies.

## Demo Materials

- Demo guide: [docs/demo/README.md](./docs/demo/README.md)
- Video demo: [Google Drive](https://drive.google.com/file/d/1KHsnz4mItOv7mCXiwuup_aZM_Ou6nda0/view?usp=sharing)
- Smoke matrix: [docs/submission/SMOKE-MATRIX.md](./docs/submission/SMOKE-MATRIX.md)
- Submission checklist: [docs/submission/CHECKLIST.md](./docs/submission/CHECKLIST.md)

Suggested 3-5 minute live demo:

1. Create a new chat and show automatic title generation.
2. Show streaming generation and `Stop`.
3. Show markdown with a highlighted code block.
4. Search chat history from the sidebar.
5. Rename a chat and open delete confirmation.
6. Reload the page and show restored history/settings.
7. Trigger and reset the error boundary fallback.
8. Attach an image and ask a question about it.
