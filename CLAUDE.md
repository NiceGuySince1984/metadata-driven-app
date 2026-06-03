# CLAUDE.md

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| Backend | Node.js · Express · TypeScript |
| Database | SQLite via `better-sqlite3` |
| Charts | Recharts |
| Testing | Vitest · Testing Library · Supertest |

## Project layout

```
shared/          TypeScript types and validation logic shared by client + server
client/src/
  renderer/      Metadata → JSX (FormRenderer, FieldRenderer, DashboardRenderer, WidgetRenderer)
  components/    Dumb UI primitives — no metadata knowledge
  pages/         Route-level components that fetch metadata and pass it to renderers
  admin/         Metadata CRUD editors
  api/           Typed fetch wrappers
server/src/
  routes/        Thin Express handlers — call repos, return JSON
  repositories/  All SQL lives here
  db/            Schema, migration runner, seed script
  validation/    Delegates to shared/validation.ts
```

## The one non-negotiable rule

**All UI must render from metadata. Nothing is hard-coded.**

What this means in practice:

- Forms, sections, and fields come from the database. `FormRenderer` receives a `FullForm` object and builds the form from it — it has no knowledge of specific field names, types, or labels at compile time.
- Dashboards and widgets come from the database. `DashboardRenderer` lays out whatever widgets the `Dashboard.layout` array describes.
- Validation rules, conditional visibility, and computed field expressions come from the database. The renderer reads them at runtime; they are never inlined in component code.
- Adding a new form, field, or dashboard is a data operation — insert rows, reload the page.

**Violations to avoid:**

```tsx
// ❌ Hard-coded field
<input name="email" placeholder="Email" />

// ❌ Hard-coded validation
if (!data.email.includes('@')) setError('Invalid email');

// ❌ Hard-coded widget
<KpiCard title="Total Submissions" value={records.length} />

// ✅ Correct — driven by metadata
<FormRenderer form={form} onSubmit={handleSubmit} />
<DashboardRenderer dashboard={dashboard} records={records} />
```

## Renderer layer contract

`FormRenderer`, `DashboardRenderer`, `FieldRenderer`, and `WidgetRenderer` are the **only** components allowed to read metadata types. Components under `components/` receive plain props (strings, numbers, booleans, callbacks) and must not import from `shared/types.ts`.

## Shared validation

`shared/validation.ts` is the single implementation of all validation logic. The client uses it for live field validation; the server re-runs it before persisting a record. Never duplicate validation logic in a route handler or a component — add it to `shared/validation.ts` and import from there.

## Commands

```bash
npm run dev:server        # Start Express API on port 3001
cd client && npm run dev  # Start Vite dev server on port 3000
npm run test:server       # Run server tests (Vitest + Supertest)
cd client && npm test     # Run client tests (Vitest + Testing Library)
npm run seed              # Reset DB to seeded state
```

## Testing conventions

- Server tests hit a real SQLite DB (seeded in `beforeAll`) — no mocking the database.
- Client tests use jsdom; `ResizeObserver` and `scrollIntoView` are stubbed in `client/src/tests/setup.ts`.
- Renderer tests use a `MOCK_FORM` fixture — they never make network calls.
- Validation tests call pure functions from `shared/validation.ts` directly.
