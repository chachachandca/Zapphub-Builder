# Zapphub

Educational platform for secondary school students — onboarding, learning portal (admin upload + student browsing), and a WhatsApp-style chat.

## Run & Operate

- `pnpm --filter @workspace/zapphub run dev` — run the Zapphub frontend
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind (custom CSS vars, no Tailwind utilities — uses plain CSS)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not yet used — app uses localStorage)
- Build: Vite

## Where things live

- `artifacts/zapphub/src/App.tsx` — all screens and logic (single-file React app)
- `artifacts/zapphub/src/index.css` — all styles using CSS variables for dark/light theming
- `lib/api-spec/openapi.yaml` — API spec (only health check at present)

## Architecture decisions

- App is fully client-side, state stored in `localStorage` (`zapphub_db`, `zapphub_theme`, `zapphub_user_image`)
- Single `App.tsx` handles all screens via a `Screen` discriminated union state — no router needed
- Dark mode driven by `data-theme` attribute on `<body>`
- Admin credentials are hardcoded: user `"Samuel Chibuike Azubuike"`, pass `"Lordmayor"`

## Product

- Onboarding → Registration → Login flow
- User Dashboard with dark mode toggle and profile picture upload
- Zapphub Chat: WhatsApp-style contacts + chat rooms
- Learn Now: Admin portal (upload lessons by section/class/term) and Student portal (browse/search lessons)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `filterStudentLessons` bug fixed: now handled reactively via state rather than an inline handler
- `adminForward()` was missing in original — added with contextual toast messages
- Dark mode toggle HTML nesting bug from original fixed in React version
- Lesson files are not stored (only filenames) — full file content viewing is a future enhancement

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
