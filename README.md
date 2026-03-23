# GigaChat UI (Frontend Homework)

Учебный интерфейс чата на React + TypeScript + Vite + local backend-proxy для GigaChat.

## Текущий статус проекта

Проект адаптирован под итоговое задание с реальной REST-интеграцией GigaChat через локальный сервер.

Реализовано:

- централизованное состояние чатов/сообщений/настроек через Zustand
- `isLoading` и `TypingIndicator` во время ожидания ответа
- реальный запрос к `POST /api/chat/completions` через backend-proxy
- получение моделей через `GET /api/models` (с fallback списком на фронте)
- хранение истории и loading отдельно по `chatId` при переключении чатов
- `InputArea` как контролируемая форма
- отправка по кнопке и по `Enter`, перенос строки по `Shift+Enter`
- запрет отправки пустой или пробельной строки
- кнопка `Стоп` вместо `Отправить` во время генерации (`AbortController`)
- кнопка `Копировать` для сообщений ассистента
- состояние `Скопировано` на 2 секунды после успешного копирования
- автоскролл к последнему сообщению (`useRef` + `useEffect`)
- темы через CSS-переменные и переключатель темы (`data-theme`)
- адаптивная верстка для мобильных и десктопа

Дополнительно:

- боковая панель чатов (создать, выбрать, удалить, редактировать)
- markdown-рендеринг сообщений (`react-markdown` + `remark-gfm`)
- панель настроек
- server-side OAuth токен-кеш с принудительным refresh при `401`
- единый backend error envelope

## Стек и версии

- React `19.2.0`
- TypeScript `5.9.x`
- Vite `7.3.x`
- Vitest `4.1.x`
- ESLint `9.x`

## Проверка и тесты

В проекте есть unit-тесты (Vitest + Testing Library), включая:

- `InputArea`: отправка, Enter/Shift+Enter, запрет пустого ввода, кнопка `Стоп`
- `Message`: копирование ответа ассистента и feedback `Скопировано`
- `ChatWindow`: сохранение истории по чатам и остановка генерации

Запуск:

```bash
npm test
```

## Запуск проекта

Требования: Node.js 20+.

```bash
npm install
npm run dev:all
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8787`

## Скрипты

```bash
npm run dev
npm run dev:server
npm run dev:all
npm run start:server
npm run lint
npm run test
npm run test:server
npm run test:watch
npm run build
npm run typecheck:server
npm run preview
npm run security:secrets
npm run security:secrets:staged
```

## Backend env

1. Скопируйте шаблон:

```bash
cp server/.env.example server/.env
```

2. Заполните `GIGACHAT_AUTH_KEY` и `GIGACHAT_SCOPE` в `server/.env`.

Ключ хранится только на сервере и не передается на фронт.

## Security Baseline

В репозитории запрещено хранить реальные секреты.

- используйте только локальные `.env`/`server/.env` (они игнорируются git)
- храните в git только шаблоны `.env.example`
- включите pre-commit hook для сканирования staged файлов:

```bash
git config core.hooksPath .githooks
```

Для локального сканирования секретов используется `gitleaks`.
Если `gitleaks` не установлен локально, скрипт автоматически использует Docker-образ.

Пример установки на macOS:

```bash
brew install gitleaks
```

Подробная политика и процесс ротации ключей: [SECURITY.md](./SECURITY.md)

## Ограничения текущего этапа

- streaming/SSE режим перенесен в следующий PR (в этом этапе только REST)
- история не сохраняется после перезагрузки страницы (runtime-only)
