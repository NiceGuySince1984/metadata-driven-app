// ── Core metadata types ──────────────────────────────────────────────────────

export interface Application {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  config: Record<string, unknown>;
}

export interface Form {
  id: string;
  applicationId: string;
  name: string;
  version: number;
  config: {
    description?: string;
    submitLabel?: string;
  };
}

export interface Section {
  id: string;
  formId: string;
  title: string;
  order: number;
}

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'computed';

export interface FieldOption {
  label: string;
  value: string;
}

export interface VisibilityRule {
  dependsOn: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: unknown;
}

export interface Expression {
  op: 'concat' | 'sum' | 'subtract' | 'multiply' | 'template';
  fields?: string[];
  separator?: string;
  template?: string;
}

export interface FieldConfig {
  placeholder?: string;
  defaultValue?: unknown;
  options?: FieldOption[];
  visibility?: VisibilityRule | null;
  expression?: Expression | null;
}

export interface Field {
  id: string;
  sectionId: string;
  name: string;
  label: string;
  type: FieldType;
  order: number;
  config: FieldConfig;
}

export type ValidationRuleType = 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern';

export interface ValidationRule {
  id: string;
  fieldId: string;
  type: ValidationRuleType;
  value: string | null;
  message: string;
}

export interface CrossFieldRule {
  id: string;
  formId: string;
  type: 'dateOrder' | 'equals' | 'greaterThan' | 'lessThan' | 'conditional' | 'sumEquals';
  fields: string[];
  config: Record<string, unknown>;
  message: string;
  errorField: string;
}

// ── Assembled / composite types ───────────────────────────────────────────────

export interface FieldWithRules extends Field {
  validationRules: ValidationRule[];
}

export interface SectionWithFields extends Section {
  fields: FieldWithRules[];
}

export interface FullForm extends Form {
  sections: SectionWithFields[];
  crossFieldRules: CrossFieldRule[];
}

// ── Widget / Dashboard ────────────────────────────────────────────────────────

export interface WidgetConfig {
  sourceFormId: string;
  metric?: 'count' | 'sum' | 'avg';
  field?: string | null;
  prefix?: string;
  suffix?: string;
  chartType?: 'bar' | 'line' | 'pie';
  xField?: string;
  yMetric?: string;
  columns?: string[];
}

export interface Widget {
  id: string;
  type: 'kpi' | 'chart' | 'table';
  title: string;
  config: WidgetConfig;
}

export interface DashboardLayoutItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dashboard {
  id: string;
  applicationId: string;
  name: string;
  version: number;
  layout: DashboardLayoutItem[];
}

// ── Persistence / runtime types ───────────────────────────────────────────────

export interface SubmittedRecord {
  id: string;
  formId: string;
  formVersion: number;
  applicationId: string;
  submittedAt: string;
  data: Record<string, unknown>;
}

export interface SavedView {
  id: string;
  name: string;
  targetFormId: string;
  config: {
    filters?: Array<{ field: string; operator: string; value: unknown }>;
    sort?: { field: string; direction: 'asc' | 'desc' };
    columns?: string[];
    pageSize?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Preference {
  key: string;
  value: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  timestamp: string;
}

export interface MetadataVersion {
  id: string;
  entityType: 'form' | 'dashboard';
  entityId: string;
  version: number;
  snapshot: unknown;
  createdAt: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}
