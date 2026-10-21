# Правила работы над сайтом

Перед началом задачи прочитай проектные документы в родительской папке:

- [PRD](../PRD.md) — цели, аудитория и требования.
- [SPEC](../SPEC.md) — предлагаемая структура и технологии.
- [TASKS](../TASKS.md) — этапы и проверяемые задачи.

Работай над одним ID из `TASKS.md` за раз. Для интерфейсного этапа используй локальные фикстуры каталога и заказов. Не подключай базу, настоящую авторизацию, серверную загрузку аватара или платёжный сервис до соответствующего этапа. В пользовательском интерфейсе сохраняй вид и тон готового интернет-магазина.

Для интерфейса применяй доступные навыки `design-taste-frontend` и `frontend-design`. Проверь состояния загрузки/пустого результата, клавиатурную навигацию, узкий экран и настройку `prefers-reduced-motion`.

После задачи запусти подходящие проверки. Отмечай пункт в `../TASKS.md` выполненным только после успешной проверки. Не добавляй реальные секреты в код, документы или чат.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
