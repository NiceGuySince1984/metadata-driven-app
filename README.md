# MetaForm — Metadata-Driven Full-Stack Application Builder

A full-stack TypeScript application where **forms, validation rules, conditional logic, and dashboards are all driven by database metadata** — no UI is hard-coded. Changing a record in the database changes what the user sees, without touching application code.

---

## Table of Contents

- [Setup](#setup)
- [Running locally](#running-locally)
- [Running the tests](#running-the-tests)
- [Architecture overview](#architecture-overview)
- [Metadata & schema](#metadata--schema)
- [Assumptions](#assumptions)
- [Trade-offs](#trade-offs)

---

## Setup

**Prerequisites:** Node.js ≥ 18

```bash
# 1. Clone the repo
git clone https://github.com/NiceGuySince1984/metadata-driven-app.git
cd metadata-driven-app

# 2. Install all dependencies (root + server + client)
npm run install:all
cd client && npm install && cd ..
```

> The SQLite database file (`data/app.db`) is git-ignored and is created automatically on first run via the migration + seed step below.

---

## Running locally

The app has two processes: an Express API server and a Vite dev server. Run them in two separate terminals.

**Terminal 1 — API server** (port 3001):

```bash
npm run dev:server
```

On first start this automatically:
1. Runs the schema migration (`CREATE TABLE IF NOT EXISTS …`)
2. Seeds one demo application, form, and dashboard with sample records

**Terminal 2 — Client dev server** (port 3000):

```bash
cd client
npm run dev
```

Then open **http://localhost:3000** in your browser.

> If port 3000 is already in use, Vite will increment to the next free port and print the actual URL in the terminal.

### Available pages

| URL | Description |
|---|---|
| `/forms/form_001` | Fill out the "Customer Feedback" form |
| `/forms/form_001/records` | View all submitted responses in a sortable, paginated table |
| `/dashboards/dash_001` | Dashboard with KPI card, bar chart, and recent submissions table |
| `/admin` | Admin panel — list and edit form metadata |
| `/admin/forms/form_001` | Form editor — sections, fields, validation rules |

### Re-seeding

To reset the database to its seeded state:

```bash
npm run seed
```

---

## Running the tests

**Server tests** (Vitest + Supertest — integration against a real in-memory SQLite DB):

```bash
cd server && npm test
```

**Client tests** (Vitest + Testing Library — jsdom):

```bash
cd client && npm test
```

### What is tested

| Suite | File | Coverage |
|---|---|---|
| Validation logic | `client/src/tests/validation.test.ts` | `checkCondition`, `isFieldVisible`, `validateField` (all rule types), `applyFormValidation`, cross-field rules |
| Metadata-to-UI rendering | `client/src/tests/renderer.test.tsx` | Section/field rendering, conditional visibility, computed fields (`concat`, `sum`, `subtract`, `multiply`, `template`), blur/submit validation, checkbox toggle, date input |
| Records table UI | `client/src/tests/recordsTable.test.tsx` | Column derivation, cell-type rendering, sorting, pagination |
| Dashboard widgets | `client/src/tests/dashboard.test.tsx` | KPI computation, bar chart, data table, layout positioning |
| Backend save/read | `server/tests/records.test.ts` | POST (valid, 422 field errors, 422 cross-field, 404 unknown form), GET list, GET single, DELETE, save→read data-fidelity roundtrip |

---

## Architecture overview

```
┌──────────────────────────────────────────────────────┐
│                      Browser                         │
│                                                      │
│  ┌─────────────┐    ┌──────────────────────────────┐ │
│  │  Admin UI   │    │      Runtime App UI          │ │
│  │ (edit meta) │    │  (forms / dashboards)        │ │
│  └──────┬──────┘    └─────────────┬────────────────┘ │
│         │                         │                  │
│  ┌──────▼─────────────────────────▼────────────────┐ │
│  │              Renderer Layer                      │ │
│  │  FormRenderer · DashboardRenderer                │ │
│  │  FieldRenderer · WidgetRenderer                  │ │
│  └──────────────────────┬───────────────────────────┘ │
│                         │                            │
│  ┌──────────────────────▼───────────────────────────┐ │
│  │           UI Components Layer                    │ │
│  │  TextInput · SelectInput · CheckboxInput …       │ │
│  │  KpiCard · BarChartWidget · DataTable            │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────┘
                           │ HTTP / JSON (/api/*)
┌──────────────────────────▼───────────────────────────┐
│                   Express API                        │
│                                                      │
│  Routes: /api/metadata · /api/records                │
│                                                      │
│  Repositories: formRepo · recordRepo · auditRepo … │
│                                                      │
│              SQLite (better-sqlite3)                 │
└──────────────────────────────────────────────────────┘
```

### Layers

**Renderer layer** — the core of the metadata-driven approach. `FormRenderer` receives a `FullForm` object (sections → fields → rules) and turns it into a live React form. `DashboardRenderer` receives a `Dashboard` object (layout + widgets) and renders the widget grid. Neither component knows what fields or widgets will exist at compile time.

**UI Components layer** — dumb, metadata-unaware components (`TextInput`, `SelectInput`, `KpiCard`, etc.). They receive typed props and emit typed events. They can be tested and reused without any knowledge of the metadata system.

**Shared types/validation** (`shared/`) — TypeScript types and the validation runner are shared between client and server from a single source. The client uses them for live validation; the server re-runs the same logic before persisting a record. There is no drift between client-side preview and server-side enforcement.

**Repository layer** — all SQL lives in `server/src/repositories/`. Route handlers call repo functions and return JSON; they never touch the DB directly. Every write automatically appends an entry to the audit log.

### Folder structure

```
metadata-driven-app/
├── shared/
│   ├── types.ts          # All metadata + runtime TypeScript interfaces
│   └── validation.ts     # Pure validation functions (client + server)
├── client/
│   ├── src/
│   │   ├── api/          # Typed fetch wrappers (one file per resource)
│   │   ├── components/   # Dumb UI components (fields, widgets, layout)
│   │   ├── renderer/     # Metadata → component tree
│   │   ├── admin/        # Metadata CRUD editors
│   │   └── pages/        # Route-level pages
│   └── src/tests/
├── server/
│   ├── src/
│   │   ├── db/           # Schema SQL, migration runner, seed script
│   │   ├── repositories/ # SQL — one file per entity
│   │   ├── routes/       # Thin Express route handlers
│   │   └── validation/   # applyRules.ts — delegates to shared/validation
│   └── tests/
└── data/
    └── app.db            # SQLite file (git-ignored)
```

---

## Metadata & schema

All entities are rows in SQLite. JSON `config` columns hold entity-specific properties, keeping the table structure stable as the schema evolves.

### Entity hierarchy

```
Application
└── Form
    ├── Section
    │   └── Field  ←── ValidationRule (per-field)
    └── CrossFieldRule (spans ≥ 2 fields)

Application
└── Dashboard
    └── layout[]  ←── Widget
```

### Application

```jsonc
{
  "id": "app_001",
  "name": "Customer Feedback App",
  "description": "Collect and analyse customer feedback",
  "version": 1,
  "createdAt": "2026-06-03T00:00:00Z",
  "config": {}
}
```

### Form

```jsonc
{
  "id": "form_001",
  "applicationId": "app_001",
  "name": "Customer Feedback",
  "version": 1,
  "config": {
    "description": "Share your experience with us",
    "submitLabel": "Submit Feedback"
  }
  // sections linked by formId, ordered by section.order
}
```

### Section

```jsonc
{
  "id": "section_001",
  "formId": "form_001",
  "title": "Contact Details",
  "order": 1
  // fields linked by sectionId, ordered by field.order
}
```

### Field

```jsonc
{
  "id": "field_001",
  "sectionId": "section_001",
  "name": "email",            // key used in submitted record data
  "label": "Email Address",
  "type": "text",             // text | number | date | select | checkbox | computed
  "order": 3,
  "config": {
    "placeholder": "you@example.com",
    "defaultValue": null,
    "options": [],            // [{ label, value }] — select fields only
    "visibility": {           // null = always visible
      "dependsOn": "hearAbout",
      "operator": "eq",       // eq | neq | gt | lt | contains
      "value": "Friend/Family"
    },
    "expression": null        // computed fields only — see below
  }
}
```

**Computed fields** derive their value from an expression over sibling fields. They are read-only in the UI and re-evaluate reactively. No `eval()` is used — expressions are structured objects:

```jsonc
// Concatenation
{ "op": "concat",   "fields": ["firstName", "lastName"], "separator": " " }
// Arithmetic
{ "op": "sum",      "fields": ["price", "tax"] }
{ "op": "subtract", "fields": ["total", "discount"] }
{ "op": "multiply", "fields": ["quantity", "unitPrice"] }
// String interpolation
{ "op": "template", "template": "{{firstName}} {{lastName}} (age {{age}})" }
```

### Validation rule (per-field)

```jsonc
{
  "id": "rule_001",
  "fieldId": "field_001",
  "type": "required",      // required | minLength | maxLength | min | max | pattern
  "value": null,           // e.g. "5" for minLength, "^\\d+$" for pattern
  "message": "Email is required"
}
```

Rules run in order; the first failure short-circuits. `min`/`max`/`pattern` are skipped on empty values — that is the `required` rule's job.

### Cross-field rule

Attached to the **form**, not a field — because a constraint spanning two fields has no natural single owner.

```jsonc
{
  "id": "xrule_001",
  "formId": "form_001",
  "type": "conditional",
  "fields": ["hearAbout", "referralName"],
  "config": {
    "when": { "field": "hearAbout", "operator": "eq", "value": "Friend/Family" },
    "require": "referralName"
  },
  "message": "Friend's name is required when referred by a friend or family member",
  "errorField": "referralName"   // which field displays the error
}
```

Cross-field rules run **after** all per-field rules pass, on both client and server.

### Widget

```jsonc
{
  "id": "widget_001",
  "type": "kpi",          // kpi | chart | table
  "title": "Total Submissions",
  "config": {
    "sourceFormId": "form_001",
    "metric": "count",    // count | sum | avg
    "field": null,        // field name for sum/avg; null for count
    "prefix": "",
    "suffix": " responses"
    // chart: chartType (bar|line|pie), xField, yMetric
    // table: columns (field name array)
  }
}
```

### Dashboard

```jsonc
{
  "id": "dash_001",
  "applicationId": "app_001",
  "name": "Feedback Overview",
  "version": 1,
  "layout": [
    { "widgetId": "widget_001", "x": 0, "y": 0, "w": 4,  "h": 2 },
    { "widgetId": "widget_002", "x": 4, "y": 0, "w": 8,  "h": 2 },
    { "widgetId": "widget_003", "x": 0, "y": 2, "w": 12, "h": 4 }
  ]
  // x/y/w/h in 12-column grid units
}
```

### Submitted record

```jsonc
{
  "id": "rec_001",
  "formId": "form_001",
  "formVersion": 1,        // version of the form at submit time
  "applicationId": "app_001",
  "submittedAt": "2026-06-03T10:00:00Z",
  "data": {
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice@example.com",
    "rating": 5,
    "fullName": "Alice Smith"  // computed fields are stored at evaluation time
  }
}
```

`formVersion` is recorded so a record can always be re-rendered against the exact form schema that produced it, even after the form has been edited.

### SQLite tables

```
── Metadata ──────────────────────────────────────────────────────────────
applications      (id, name, description, version, created_at, config JSON)
forms             (id, application_id, name, version, config JSON)
sections          (id, form_id, title, order)
fields            (id, section_id, name, label, type, order, config JSON)
validation_rules  (id, field_id, type, value, message)
cross_field_rules (id, form_id, type, fields JSON, config JSON, message, error_field)
widgets           (id, type, title, config JSON)
dashboards        (id, application_id, name, version, layout JSON)

── Versioning ────────────────────────────────────────────────────────────
metadata_versions (id, entity_type, entity_id, version, snapshot JSON, created_at)

── Runtime ───────────────────────────────────────────────────────────────
records           (id, form_id, form_version, application_id, submitted_at, data JSON)
saved_views       (id, name, target_form_id, config JSON, created_at, updated_at)
preferences       (key TEXT PRIMARY KEY, value TEXT, updated_at)
audit_log         (id, action, entity, entity_id, before_data JSON, after_data JSON, timestamp)
```

`audit_log` and `metadata_versions` are append-only — no `UPDATE` or `DELETE` is ever issued against them.

---

## Assumptions

1. **Single-user, single-application scope.** No authentication, no multi-tenancy, no concurrent-write safety beyond SQLite's own serialisation. The seeded data targets one application (`app_001`) with one form and one dashboard.

2. **Metadata is edited through the Admin UI or the seed script — not live-migrated.** There is no migration runner for metadata schema changes (e.g. adding a new field type). If the application code adds a new `op` type, old records that reference it will display the stored evaluated value, not re-evaluate.

3. **Validation is synchronous and in-process.** There is no async rule type (e.g. "check this email against an external service"). All rules operate on the submitted `data` object only.

4. **Computed field values are stored at submit time.** If a form's expression is later edited, existing records retain the value that was computed when they were submitted. This is intentional — records are immutable snapshots.

5. **Dashboards are read-only at runtime.** Widget data is computed from all records for the `sourceFormId` on each page load. There is no caching layer or incremental aggregation.

6. **Form version is informational, not enforced on read.** `records.form_version` is stored for future reference but the GET endpoint does not validate that the form still exists at that version — it always returns records as submitted.

7. **The `data/` directory must be writable.** SQLite creates `app.db` there on first run. In a containerised environment, this directory should be mounted as a volume.

---

## Trade-offs

| Decision | Why | Cost |
|---|---|---|
| **SQLite** | Zero-config local dev; no external service to start | Not suitable for concurrent writes at scale; no connection pool |
| **Shared `types.ts` + `validation.ts`** | Single source of truth — client preview and server enforcement can never drift | Requires a monorepo setup; `tsconfig` path aliases needed in both Vite and the server |
| **JSON `config` column per entity** | Table schema stays stable as metadata evolves; new field properties don't require `ALTER TABLE` | Cannot filter or sort on properties inside `config` with plain SQL — must load and filter in-process |
| **Renderer layer is pure (metadata in → JSX out)** | Easily unit-tested; the full form can be rendered from a fixture object with no network calls | `FormRenderer` must receive all metadata upfront — the page component is responsible for loading and passing it |
| **UI Components know nothing about metadata** | Components are reusable and independently testable | `FieldRenderer` / `WidgetRenderer` do the dispatch work; adding a new field type requires updating the renderer, not just creating a component |
| **Submitted `data` is a flat JSON blob** | Works for any form shape without schema changes | Cannot do relational joins on field values at the DB layer; aggregations run in JavaScript, not SQL |
| **Computed field values stored in records** | Records are self-contained; re-rendering doesn't depend on re-evaluating a potentially changed expression | Stored value may diverge from the current expression if the form is later edited |
| **Cross-field rules attached to `formId`, not `fieldId`** | A rule spanning two fields has no natural single owner | The admin UI must surface form-level rules separately from per-field rules |
| **Cross-field validation runs after per-field validation** | Avoids confusing cascaded error messages when a field value is already invalid | Two-phase validation means the server makes two passes over the submitted data |
| **Structured expression objects instead of `eval()`** | Safe to run in both browser and server with no sandboxing | Expressions are limited to the supported `op` types; no arbitrary scripting is possible |
| **Audit log written inside repositories** | Single enforcement point; route handlers stay thin and unaware of auditing | Every repository function must call `auditRepo.log()` — easy to forget when adding a new write operation |
| **Metadata versioning via snapshot, not event-sourcing** | Simple to implement; full historical state is preserved; live tables stay uncluttered | Snapshots grow large for complex forms; no built-in diffing between versions |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| Backend | Node.js · Express · TypeScript |
| Database | SQLite via `better-sqlite3` |
| Charts | Recharts |
| Testing | Vitest · Testing Library · Supertest |
