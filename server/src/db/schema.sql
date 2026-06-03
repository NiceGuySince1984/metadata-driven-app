-- ── Metadata tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS applications (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  config      TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS forms (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  version        INTEGER NOT NULL DEFAULT 1,
  config         TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sections (
  id      TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  title   TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fields (
  id         TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  label      TEXT NOT NULL,
  type       TEXT NOT NULL,
  "order"    INTEGER NOT NULL DEFAULT 0,
  config     TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS validation_rules (
  id       TEXT PRIMARY KEY,
  field_id TEXT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  type     TEXT NOT NULL,
  value    TEXT,
  message  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cross_field_rules (
  id          TEXT PRIMARY KEY,
  form_id     TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  fields      TEXT NOT NULL DEFAULT '[]',
  config      TEXT NOT NULL DEFAULT '{}',
  message     TEXT NOT NULL,
  error_field TEXT NOT NULL
);

-- ── Widget / Dashboard ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS widgets (
  id     TEXT PRIMARY KEY,
  type   TEXT NOT NULL,
  title  TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS dashboards (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  version        INTEGER NOT NULL DEFAULT 1,
  layout         TEXT NOT NULL DEFAULT '[]'
);

-- ── Versioning ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metadata_versions (
  id          TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  version     INTEGER NOT NULL,
  snapshot    TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metadata_versions_entity
  ON metadata_versions (entity_type, entity_id);

-- ── Persistence / runtime tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS records (
  id             TEXT PRIMARY KEY,
  form_id        TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  form_version   INTEGER NOT NULL DEFAULT 1,
  application_id TEXT NOT NULL,
  submitted_at   TEXT NOT NULL,
  data           TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_records_form_id ON records (form_id);

CREATE TABLE IF NOT EXISTS saved_views (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  target_form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  config         TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  before_data TEXT,
  after_data  TEXT,
  timestamp   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log (entity, entity_id);
