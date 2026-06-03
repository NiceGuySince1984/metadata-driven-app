# Architecture — Metadata-Driven Full-Stack Application Builder

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via `better-sqlite3` |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Testing | Vitest (frontend) + Supertest (backend) |

---

## The Core Rule

**All UI must render from metadata. Nothing is hard-coded.**

- Forms, sections, and fields come from the database. `FormRenderer` receives a `FullForm` object and builds the form from it — it has no knowledge of specific field names, types, or labels at compile time.
- Dashboards and widgets come from the database. `DashboardRenderer` lays out whatever widgets `Dashboard.layout` describes.
- Validation rules, conditional visibility, and computed field expressions come from the database and are read at runtime — never inlined in component code.
- Adding a new form, field, or dashboard is a **data operation** (insert rows, reload the page), not a code change.

```tsx
// ❌ Hard-coded — never do this
<input name="email" placeholder="Email" />
if (!data.email.includes('@')) setError('Invalid email');
<KpiCard title="Total Submissions" value={records.length} />

// ✅ Metadata-driven — always do this
<FormRenderer form={form} onSubmit={handleSubmit} />
<DashboardRenderer dashboard={dashboard} records={records} />
```

The Renderer layer (`FormRenderer`, `DashboardRenderer`, `FieldRenderer`, `WidgetRenderer`) is the **only** place that reads metadata types. Components under `components/` receive plain typed props and must not import from `shared/types.ts`.

---

## Architectural Layers

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                                                     │
│  ┌──────────────┐   ┌───────────────────────────┐  │
│  │  Admin UI    │   │     Runtime App UI        │  │
│  │  (edit meta) │   │  (forms / dashboards)     │  │
│  └──────┬───────┘   └────────────┬──────────────┘  │
│         │                        │                  │
│  ┌──────▼────────────────────────▼──────────────┐  │
│  │              Renderer Layer                   │  │
│  │  FormRenderer | DashboardRenderer |           │  │
│  │  FieldRenderer | WidgetRenderer               │  │
│  └──────────────────┬────────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼────────────────────────────┐  │
│  │           UI Components Layer                 │  │
│  │  (dumb: TextInput, Select, KpiCard, Chart…)   │  │
│  └───────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / JSON
┌───────────────────────▼─────────────────────────────┐
│                    Express API                      │
│                                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │              Routes Layer                      │ │
│  │  /api/metadata  |  /api/records  |  /api/dash  │ │
│  │  /api/views     |  /api/prefs    |  /api/audit │ │
│  └──────────────────┬─────────────────────────────┘ │
│                     │                               │
│  ┌──────────────────▼─────────────────────────────┐ │
│  │        Persistence Layer (Repositories)        │ │
│  │  recordRepo | savedViewRepo | prefsRepo        │ │
│  │  auditRepo  | formRepo | dashboardRepo …       │ │
│  └──────────────────┬─────────────────────────────┘ │
│                     │                               │
│  ┌──────────────────▼─────────────────────────────┐ │
│  │               SQLite Database                  │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Rule:** the Renderer layer depends only on metadata types — it never talks to the DB directly. The UI Components layer is stateless and has no knowledge of metadata at all.

---

## Folder Structure

```
metadata-driven-app/
│
├── shared/                          # Types shared by client + server
│   ├── types.ts                     # Application, Form, Field, Widget, Dashboard, Record…
│   ├── expressions.ts               # Computed field expression evaluator (client + server)
│   └── crossFieldValidator.ts       # Cross-field validation runner (client + server)
│
├── client/                          # React + Vite
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                  # Router root
│   │   │
│   │   ├── api/                     # Fetch wrappers (one file per resource)
│   │   │   ├── metadataApi.ts
│   │   │   ├── recordsApi.ts
│   │   │   ├── savedViewsApi.ts
│   │   │   ├── preferencesApi.ts
│   │   │   └── auditApi.ts
│   │   │
│   │   ├── components/              # UI Components layer — dumb, metadata-unaware
│   │   │   ├── fields/
│   │   │   │   ├── TextInput.tsx
│   │   │   │   ├── NumberInput.tsx
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   ├── SelectInput.tsx
│   │   │   │   └── CheckboxInput.tsx
│   │   │   ├── widgets/
│   │   │   │   ├── KpiCard.tsx
│   │   │   │   ├── BarChartWidget.tsx
│   │   │   │   └── DataTable.tsx
│   │   │   └── layout/
│   │   │       ├── Section.tsx
│   │   │       └── DashboardGrid.tsx
│   │   │
│   │   ├── renderer/                # Renderer layer — metadata → component tree
│   │   │   ├── FieldRenderer.tsx    # dispatches to correct field component by type
│   │   │   ├── FormRenderer.tsx     # iterates sections → fields, runs visibility + computed + cross-field rules
│   │   │   ├── WidgetRenderer.tsx   # dispatches to KpiCard / Chart / Table by type
│   │   │   └── DashboardRenderer.tsx# lays out widgets from dashboard.layout
│   │   │
│   │   ├── admin/                   # Admin UI — metadata CRUD
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── FormEditor.tsx       # create/edit form + sections + fields
│   │   │   ├── FieldEditor.tsx      # field type, label, options, validation rules
│   │   │   └── DashboardEditor.tsx  # widget picker, layout config
│   │   │
│   │   └── pages/                   # Route-level pages
│   │       ├── AdminPage.tsx
│   │       ├── FormPage.tsx         # loads form metadata → FormRenderer
│   │       └── DashboardPage.tsx    # loads dashboard metadata → DashboardRenderer
│   │
│   └── tests/
│       ├── renderer.test.tsx        # metadata-to-UI rendering
│       └── validation.test.ts       # validation rule logic
│
├── server/                          # Node + Express
│   ├── src/
│   │   ├── app.ts                   # Express setup, middleware, route mounting
│   │   ├── index.ts                 # Server entry point
│   │   │
│   │   ├── db/                      # Persistence layer
│   │   │   ├── client.ts            # better-sqlite3 connection singleton
│   │   │   ├── schema.sql           # CREATE TABLE statements
│   │   │   └── seed.ts              # Seed one demo application + form + dashboard
│   │   │
│   │   ├── repositories/            # One repo per entity — all raw SQL lives here
│   │   │   ├── applicationRepo.ts
│   │   │   ├── formRepo.ts
│   │   │   ├── dashboardRepo.ts
│   │   │   ├── recordRepo.ts        # submitted form records
│   │   │   ├── savedViewRepo.ts     # saved table filters / column configs
│   │   │   ├── preferencesRepo.ts   # key-value app preferences
│   │   │   ├── auditRepo.ts         # append-only audit log entries
│   │   │   └── metadataVersionRepo.ts # snapshots of form/dashboard at each version
│   │   │
│   │   ├── routes/                  # Thin route handlers — call repos, return JSON
│   │   │   ├── metadata.ts          # GET/POST/PUT/DELETE forms, fields, dashboards
│   │   │   ├── records.ts           # POST submit, GET/PUT/DELETE records by formId
│   │   │   ├── savedViews.ts        # GET/POST/PUT/DELETE saved views
│   │   │   ├── preferences.ts       # GET/PUT preferences (key-value)
│   │   │   ├── audit.ts             # GET audit log (read-only)
│   │   │   └── versions.ts          # GET /api/:entity/:id/versions — version history
│   │   │
│   │   └── validation/
│   │       ├── applyRules.ts        # Per-field validation using metadata rules
│   │       └── applyCrossFieldRules.ts # Cross-field validation; runs after per-field passes
│   │
│   └── tests/
│       └── records.test.ts          # save + read record flow (Supertest)
│
├── data/
│   └── app.db                       # SQLite file (git-ignored)
│
├── screenshots/                     # Required by deliverables
├── package.json                     # Monorepo scripts (dev, build, test)
└── README.md
```

---

## Persistence Layer

All persistent state flows through the repository layer. No route handler touches the DB directly. The four runtime persistence concerns are kept in separate tables and repos from the metadata entities.

### API Surface

| Resource | Endpoint | Methods | Description |
|---|---|---|---|
| Records | `/api/records` | `GET, POST` | List all records; submit a new record |
| Record | `/api/records/:id` | `GET, PUT, DELETE` | Read, update, or delete one record |
| Saved Views | `/api/views` | `GET, POST` | List all saved views; create a new one |
| Saved View | `/api/views/:id` | `GET, PUT, DELETE` | Read, update, or delete a saved view |
| Preferences | `/api/preferences` | `GET` | Read all preferences as a key-value map |
| Preference | `/api/preferences/:key` | `PUT` | Upsert a single preference by key |
| Audit Log | `/api/audit` | `GET` | Read audit entries (filterable by entity/action) |

Audit log entries are written automatically by repository methods — there is no `POST /api/audit`. The route is read-only.

### Audit Log Strategy

Every write operation (create, update, delete) in any repository calls `auditRepo.log()` before returning. This keeps audit concerns out of route handlers and centralised in the persistence layer.

```
action: create | update | delete
entity: record | saved_view | preference | form | field | dashboard | widget
entityId: the affected row's id
payload: JSON snapshot of the data before/after the change
timestamp: ISO 8601
```

### Preference Keys (initial set)

| Key | Type | Description |
|---|---|---|
| `defaultApplicationId` | string | Application selected on last visit |
| `sidebarCollapsed` | boolean | Sidebar open/closed state |
| `tablePageSize` | number | Default rows per page in data tables |
| `theme` | `light` \| `dark` | UI theme |

New keys can be added without schema changes — the `preferences` table is key-value.

---

## Advanced Features

### 1. Metadata Versioning

Every time a form or dashboard is saved via the admin UI, the current state is snapshotted into a `metadata_versions` table before the mutation is applied. The live `forms` / `dashboards` tables always hold the latest version. History is never deleted.

**Version lifecycle:**

```
Admin edits form_001
  → metadataVersionRepo.snapshot("form", "form_001", currentData)  [before write]
  → formRepo.update("form_001", newData)
  → forms.version increments by 1
```

**New API endpoints:**

| Endpoint | Method | Description |
|---|---|---|
| `/api/forms/:id/versions` | `GET` | List all version snapshots for a form |
| `/api/forms/:id/versions/:version` | `GET` | Fetch the full snapshot at a specific version |
| `/api/dashboards/:id/versions` | `GET` | List all version snapshots for a dashboard |

**`metadata_versions` table:**
```
(id, entity_type, entity_id, version, snapshot JSON, created_at)
```
`snapshot` stores the complete JSON of the entity at that version. Comparing versions is a diff of two JSON blobs.

**Records carry the form version at submit time** — `records.form_version` is written at submission so a record can always be re-rendered against the exact form that produced it, even if the form has since changed.

---

### 2. Computed Fields

A computed field derives its value from an expression over other field values in the same form. It is **read-only** in the UI and re-evaluates reactively whenever a dependency field changes.

**Expression format** — structured objects only, no `eval()`:

```jsonc
// Concatenation
{ "op": "concat", "fields": ["firstName", "lastName"], "separator": " " }

// Arithmetic
{ "op": "sum",      "fields": ["price", "tax"] }
{ "op": "subtract", "fields": ["total", "discount"] }
{ "op": "multiply", "fields": ["quantity", "unitPrice"] }

// String template
{ "op": "template", "template": "{{firstName}} {{lastName}} ({{age}})" }
```

**Field schema addition** — `type: "computed"` with an `expression` property:

```jsonc
{
  "id": "field_005",
  "sectionId": "section_001",
  "name": "fullName",
  "label": "Full Name",
  "type": "computed",              // new type — rendered as read-only display
  "expression": {
    "op": "concat",
    "fields": ["firstName", "lastName"],
    "separator": " "
  },
  "order": 3
  // no validation rules — value is derived, not entered
}
```

**Where evaluation runs:**

| Where | When | How |
|---|---|---|
| `shared/expressions.ts` | Defines the evaluator | Pure function: `(expression, formValues) → value` |
| `FormRenderer.tsx` (client) | On every field change | Reactively recomputes all computed fields whose dependencies changed |
| `applyCrossFieldRules.ts` (server) | Before cross-field validation | Computed values are resolved first so rules can reference them |
| `recordRepo.ts` (server) | At submit time | Evaluated value is stored in `records.data` as a snapshot |

Computed field values **are stored** in the submitted record (as the evaluated value at submit time). This avoids re-evaluation drift if the expression later changes.

---

### 3. Cross-Field Validation

Per-field `validation_rules` cover single-field constraints (required, min, pattern). Cross-field rules cover constraints that span two or more fields. They are attached to the **form**, not a field.

**Cross-field rule types:**

| Type | Description | Example |
|---|---|---|
| `dateOrder` | Field A must be before/after field B | `endDate` after `startDate` |
| `equals` | Field A must equal field B | `confirmEmail` matches `email` |
| `greaterThan` / `lessThan` | Field A must be greater/less than field B | `maxBudget` ≥ `minBudget` |
| `conditional` | If field A equals X, field B is required | If `hasDiscount` is true, `discountCode` is required |
| `sumEquals` | Sum of fields must equal a target field | `partA + partB + partC` = `total` |

**Schema:**

```jsonc
{
  "id": "xrule_001",
  "formId": "form_001",
  "type": "dateOrder",
  "fields": ["startDate", "endDate"],   // all fields involved
  "config": {
    "before": "startDate",
    "after": "endDate"
  },
  "message": "End date must be after start date",
  "errorField": "endDate"               // which field renders the error message
}
```

```jsonc
{
  "id": "xrule_002",
  "formId": "form_001",
  "type": "conditional",
  "fields": ["hasDiscount", "discountCode"],
  "config": {
    "when": { "field": "hasDiscount", "operator": "eq", "value": true },
    "require": "discountCode"
  },
  "message": "Discount code is required when a discount is applied",
  "errorField": "discountCode"
}
```

**Where validation runs:**

| Where | When | How |
|---|---|---|
| `shared/crossFieldValidator.ts` | Defines the runner | Pure function: `(rules, formValues) → errors[]` |
| `FormRenderer.tsx` (client) | After any field change | Runs only rules that involve the changed field; merges errors into form state |
| `applyCrossFieldRules.ts` (server) | After per-field validation passes | Runs all cross-field rules; returns 422 with field-keyed errors if any fail |

Cross-field rules run **after** per-field rules on both client and server. If per-field validation fails, cross-field rules are skipped (avoids confusing cascaded errors).

**New `cross_field_rules` table:**
```
(id, form_id, type, fields JSON, config JSON, message, error_field)
```

**Updated Persistence Layer API:**

| Endpoint | Methods | Description |
|---|---|---|
| `/api/forms/:id/cross-field-rules` | `GET, POST` | List or create cross-field rules for a form |
| `/api/cross-field-rules/:id` | `PUT, DELETE` | Update or delete a cross-field rule |

---

## Metadata Schema

All entities are stored as rows in SQLite. The `config` column holds entity-specific JSON, keeping the table structure stable while the schema evolves.

---

### Application
```jsonc
{
  "id": "app_001",
  "name": "Customer Feedback",
  "description": "Demo application",
  "version": 1,
  "createdAt": "2026-06-02T10:00:00Z"
}
// forms and dashboards are linked by applicationId (not embedded)
```

---

### Form
```jsonc
{
  "id": "form_001",
  "applicationId": "app_001",
  "name": "Feedback Form",
  "description": "Collects product feedback",
  "submitLabel": "Submit Feedback",
  "version": 1
  // sections are linked by formId, ordered by section.order
}
```

---

### Section
```jsonc
{
  "id": "section_001",
  "formId": "form_001",
  "title": "Contact Details",
  "order": 1
  // fields are linked by sectionId, ordered by field.order
}
```

---

### Field
```jsonc
{
  "id": "field_001",
  "sectionId": "section_001",
  "name": "email",                   // key used in submitted record data
  "label": "Email Address",
  "type": "text",                    // text | number | date | select | checkbox | computed
  "placeholder": "you@example.com",
  "defaultValue": null,
  "order": 1,
  "options": [],                     // only for type=select: [{label, value}, …]
  "expression": null,                // only for type=computed: expression object (see Advanced Features)
  "visibility": {                    // null = always visible
    "dependsOn": "field_002",        // name of the controlling field
    "operator": "eq",                // eq | neq | gt | lt | contains
    "value": "yes"
  }
  // per-field validation rules linked by fieldId
  // cross-field validation rules are linked by formId — see cross_field_rules table
}
```

---

### Validation Rule (per-field)
```jsonc
{
  "id": "rule_001",
  "fieldId": "field_001",           // single field this rule applies to
  "type": "required",               // required | minLength | maxLength | min | max | pattern
  "value": null,                    // e.g. "5" for min, "^\\d+$" for pattern — null for required
  "message": "Email is required"
}
// Rules that span multiple fields live in cross_field_rules, not here.
// computed fields carry no validation_rules — their value is derived, not entered.
```

---

### Widget
```jsonc
{
  "id": "widget_001",
  "type": "kpi",         // kpi | chart | table
  "title": "Total Submissions",
  "config": {
    // ── kpi ──────────────────────────────────────────
    "sourceFormId": "form_001",
    "metric": "count",   // count | sum | avg
    "field": null,       // field name for sum/avg; null for count
    "prefix": "",
    "suffix": " submissions"

    // ── chart ─────────────────────────────────────────
    // "sourceFormId": "form_001",
    // "chartType": "bar",   // bar | line | pie
    // "xField": "rating",   // field name or "submittedAt"
    // "yMetric": "count"    // count | sum | avg

    // ── table ─────────────────────────────────────────
    // "sourceFormId": "form_001",
    // "columns": ["name", "email", "rating"]  // field names to show
  }
}
```

---

### Dashboard
```jsonc
{
  "id": "dash_001",
  "applicationId": "app_001",
  "name": "Overview",
  "version": 1,
  "layout": [
    { "widgetId": "widget_001", "x": 0, "y": 0, "w": 4, "h": 2 },
    { "widgetId": "widget_002", "x": 4, "y": 0, "w": 8, "h": 2 },
    { "widgetId": "widget_003", "x": 0, "y": 2, "w": 12, "h": 4 }
  ]
  // x/y/w/h are grid units (12-column grid)
}
```

---

### Submitted Record
```jsonc
{
  "id": "rec_001",
  "formId": "form_001",
  "applicationId": "app_001",
  "formVersion": 3,                  // version of the form at submit time — enables re-rendering against historical schema
  "submittedAt": "2026-06-02T11:30:00Z",
  "data": {
    "email": "user@example.com",
    "rating": 4,
    "subscribed": true,
    "comments": "Great product",
    "fullName": "Jane Smith"         // computed field value — stored as evaluated snapshot at submit time
    // keys = field.name values from the form definition
  }
}
```

---

### Saved View
```jsonc
{
  "id": "view_001",
  "name": "High Ratings",
  "targetFormId": "form_001",        // which form's records this view applies to
  "config": {
    "filters": [
      { "field": "rating", "operator": "gte", "value": 4 }
    ],
    "sort": { "field": "submittedAt", "direction": "desc" },
    "columns": ["email", "rating", "comments"], // visible columns and order
    "pageSize": 25
  },
  "createdAt": "2026-06-02T12:00:00Z",
  "updatedAt": "2026-06-02T12:00:00Z"
}
```

---

### Preference
```jsonc
{
  "key": "defaultApplicationId",     // unique string key
  "value": "app_001",                // stored as text; cast on read
  "updatedAt": "2026-06-02T12:00:00Z"
}
```

---

### Audit Log Entry
```jsonc
{
  "id": "audit_001",
  "action": "update",                // create | update | delete
  "entity": "record",                // record | saved_view | preference | form | field | dashboard | widget
  "entityId": "rec_001",
  "before": { "rating": 3 },        // snapshot before change; null for create
  "after":  { "rating": 4 },        // snapshot after change; null for delete
  "timestamp": "2026-06-02T12:05:00Z"
}
```

---

## SQLite Table Design

### Metadata Tables
```
applications       (id, name, description, version, created_at, config JSON)
forms              (id, application_id, name, version, config JSON)
sections           (id, form_id, title, order)
fields             (id, section_id, name, label, type, order, config JSON)
                   └─ config holds: placeholder, defaultValue, options, visibility, expression
validation_rules   (id, field_id, type, value, message)
                   └─ per-field only; computed fields carry no validation_rules
cross_field_rules  (id, form_id, type, fields JSON, config JSON, message, error_field)
                   └─ spans two or more fields; attached to formId not fieldId
widgets            (id, type, title, config JSON)
dashboards         (id, application_id, name, version, layout JSON)
```

### Versioning Tables
```
metadata_versions  (id, entity_type, entity_id, version, snapshot JSON, created_at)
                   └─ entity_type: form | dashboard; snapshot = full JSON at that version
```

### Persistence / Runtime Tables
```
records            (id, form_id, form_version, application_id, submitted_at, data JSON)
                   └─ form_version records which version of the form produced this record
saved_views        (id, name, target_form_id, config JSON, created_at, updated_at)
preferences        (key TEXT PRIMARY KEY, value TEXT, updated_at)
audit_log          (id, action, entity, entity_id, before JSON, after JSON, timestamp)
```

`config`, `data`, `before`, `after`, `snapshot`, and `fields` are stored as JSON strings. This keeps schema migrations minimal — new field properties don't require `ALTER TABLE`.

The `audit_log` and `metadata_versions` tables are append-only. No `UPDATE` or `DELETE` is ever issued against them.

---

## Key Design Decisions & Trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| `shared/types.ts` for metadata types | Single source of truth for client + server | Requires a monorepo setup |
| JSON `config` column per entity | Schema-stable as metadata evolves | Harder to query inside config with SQL |
| Renderer layer is pure (metadata in → JSX out) | Testable without rendering a full page | Renderer must not hold form state itself (state lives in FormPage) |
| UI Components know nothing about metadata | Reusable, easy to Storybook | FormRenderer does more wiring work |
| Records store `data` as a flat JSON blob | Flexible across any form shape | Can't do relational joins on field values |
| Saved views store `config` as JSON | View shape can evolve without migration | Filter logic must be applied in-process, not in SQL |
| Preferences as a key-value table | New keys require no schema change | No type enforcement at the DB level; cast on read |
| Audit log is append-only (no UPDATE/DELETE) | Tamper-evident history | Table grows indefinitely; prune by timestamp if needed |
| Audit writes happen inside repos, not routes | Single enforcement point; routes stay thin | Repos must accept a common `log()` dependency |
| Metadata versioning via snapshot table, not in-place history | Live tables stay simple; full history is preserved | Snapshots can be large for complex forms; no automatic diffing |
| Version snapshotted before mutation, not after | Guarantees the pre-change state is captured even if the write fails | Requires snapshot + write to run in a single SQLite transaction |
| Computed fields use structured expression objects, not eval() | Safe to run in both browser and server without sandboxing | Expressions are limited to supported op types; no arbitrary scripting |
| Computed field values stored in submitted record | Record is self-contained; re-rendering doesn't depend on re-evaluating a possibly changed expression | Stored value may diverge from expression if expression is later edited |
| Cross-field rules attached to formId, not fieldId | A rule spanning two fields has no natural owner field; form is the right scope | Admin UI must display form-level rules separately from per-field rules |
| Cross-field validation runs after per-field validation | Avoids confusing cascaded errors when a field is already invalid | Two-phase validation means the server makes two passes |
| `shared/expressions.ts` and `shared/crossFieldValidator.ts` run on client and server | Single implementation; no drift between client preview and server enforcement | Shared code must avoid Node- or browser-only APIs |
| SQLite | Zero-config local dev | Not suitable for concurrent writes at scale |

---

## Build Order

1. `shared/types.ts` — metadata type definitions
2. DB schema + seed data
3. Express API routes + repositories
4. Renderer layer
5. UI components
6. Admin UI
