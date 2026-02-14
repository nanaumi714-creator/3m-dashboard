# Project Structure Rules

## Directory Map

```
/
├── .agent/         # AI Context (Rules, Skills, Workflows)
├── app/            # Next.js App Router (UI Components, Pages, Layouts)
│   ├── (auth)/     # Auth-related routes
│   └── (dashboard)/# Protected dashboard routes
├── components/     # Shared React Components
│   ├── ui/         # Generic UI elements (Buttons, Inputs)
│   └── ...
├── lib/            # Pure logic, helpers, utilities
├── server/         # Server-side logic (Database clients, API wrappers)
├── types/          # TypeScript definitions
├── hooks/          # Custom React Hooks
├── docs/           # Documentation
└── public/         # Static assets
```

## Rules
- **app/**: Contains `page.tsx`, `layout.tsx`, `loading.tsx`. Keep business logic minimal here; delegate to `components` and `lib`.
- **components/**: Presentational components. Should be reusable.
- **lib/**: Stateless logic. `utils.ts`, `constants.ts`.
- **server/**: Code that MUST run on the server (DB direct access, Secrets). `server-only` package recommended.
- **types/**: Centralized type definitions. Avoid `any`.
