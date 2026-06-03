import db from './client';
import { migrate } from './migrate';

export function seed(): void {
  migrate();

  const existing = db.prepare('SELECT id FROM applications WHERE id = ?').get('app_001');
  if (existing) return;

  const insert = db.transaction(() => {
    // ── Application ────────────────────────────────────────────────────────────
    db.prepare(`
      INSERT INTO applications (id, name, description, version, created_at, config)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'app_001',
      'Customer Feedback App',
      'Collect and analyse customer feedback across products',
      1,
      new Date().toISOString(),
      JSON.stringify({})
    );

    // ── Form ───────────────────────────────────────────────────────────────────
    db.prepare(`
      INSERT INTO forms (id, application_id, name, version, config)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'form_001',
      'app_001',
      'Customer Feedback',
      1,
      JSON.stringify({ description: 'Share your experience with us', submitLabel: 'Submit Feedback' })
    );

    // ── Sections ───────────────────────────────────────────────────────────────
    const insertSection = db.prepare(
      'INSERT INTO sections (id, form_id, title, "order") VALUES (?, ?, ?, ?)'
    );
    insertSection.run('section_001', 'form_001', 'Contact Details', 1);
    insertSection.run('section_002', 'form_001', 'Your Experience', 2);
    insertSection.run('section_003', 'form_001', 'Additional Feedback', 3);

    // ── Fields ─────────────────────────────────────────────────────────────────
    const insertField = db.prepare(
      'INSERT INTO fields (id, section_id, name, label, type, "order", config) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    // Section 1 — Contact Details
    insertField.run('field_001', 'section_001', 'firstName', 'First Name', 'text', 1,
      JSON.stringify({ placeholder: 'Enter your first name' }));

    insertField.run('field_002', 'section_001', 'lastName', 'Last Name', 'text', 2,
      JSON.stringify({ placeholder: 'Enter your last name' }));

    insertField.run('field_003', 'section_001', 'email', 'Email Address', 'text', 3,
      JSON.stringify({ placeholder: 'you@example.com' }));

    // Computed: fullName = concat(firstName, lastName)
    insertField.run('field_004', 'section_001', 'fullName', 'Full Name', 'computed', 4,
      JSON.stringify({
        expression: { op: 'concat', fields: ['firstName', 'lastName'], separator: ' ' }
      }));

    // Section 2 — Your Experience
    insertField.run('field_005', 'section_002', 'product', 'Which product did you use?', 'select', 1,
      JSON.stringify({
        options: [
          { label: 'Product A', value: 'Product A' },
          { label: 'Product B', value: 'Product B' },
          { label: 'Product C', value: 'Product C' },
        ]
      }));

    insertField.run('field_006', 'section_002', 'purchaseDate', 'Purchase Date', 'date', 2,
      JSON.stringify({}));

    insertField.run('field_007', 'section_002', 'rating', 'Overall Rating (1–5)', 'number', 3,
      JSON.stringify({ placeholder: '1–5' }));

    insertField.run('field_008', 'section_002', 'wouldRecommend', 'Would you recommend us?', 'checkbox', 4,
      JSON.stringify({ defaultValue: false }));

    // Section 3 — Additional Feedback
    insertField.run('field_009', 'section_003', 'hearAbout', 'How did you hear about us?', 'select', 1,
      JSON.stringify({
        options: [
          { label: 'Social Media',    value: 'Social Media' },
          { label: 'Friend/Family',   value: 'Friend/Family' },
          { label: 'Advertisement',   value: 'Advertisement' },
          { label: 'Search Engine',   value: 'Search Engine' },
          { label: 'Other',           value: 'Other' },
        ]
      }));

    // Conditionally visible when hearAbout = 'Friend/Family'
    insertField.run('field_010', 'section_003', 'referralName', "Friend's Name", 'text', 2,
      JSON.stringify({
        placeholder: 'Who referred you?',
        visibility: { dependsOn: 'hearAbout', operator: 'eq', value: 'Friend/Family' }
      }));

    insertField.run('field_011', 'section_003', 'comments', 'Additional Comments', 'text', 3,
      JSON.stringify({ placeholder: 'Anything else you would like to share? (max 500 characters)' }));

    // ── Validation Rules ───────────────────────────────────────────────────────
    const insertRule = db.prepare(
      'INSERT INTO validation_rules (id, field_id, type, value, message) VALUES (?, ?, ?, ?, ?)'
    );

    insertRule.run('rule_001', 'field_001', 'required',  null,             'First name is required');
    insertRule.run('rule_002', 'field_002', 'required',  null,             'Last name is required');
    insertRule.run('rule_003', 'field_003', 'required',  null,             'Email is required');
    insertRule.run('rule_004', 'field_003', 'pattern',   '^[^@]+@[^@]+\\.[^@]+$', 'Please enter a valid email address');
    insertRule.run('rule_005', 'field_005', 'required',  null,             'Please select a product');
    insertRule.run('rule_006', 'field_007', 'required',  null,             'Rating is required');
    insertRule.run('rule_007', 'field_007', 'min',       '1',              'Rating must be at least 1');
    insertRule.run('rule_008', 'field_007', 'max',       '5',              'Rating must be at most 5');
    insertRule.run('rule_009', 'field_011', 'maxLength', '500',            'Comments cannot exceed 500 characters');

    // ── Cross-field Rule ───────────────────────────────────────────────────────
    db.prepare(`
      INSERT INTO cross_field_rules (id, form_id, type, fields, config, message, error_field)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'xrule_001',
      'form_001',
      'conditional',
      JSON.stringify(['hearAbout', 'referralName']),
      JSON.stringify({ when: { field: 'hearAbout', operator: 'eq', value: 'Friend/Family' }, require: 'referralName' }),
      "Friend's name is required when referred by a friend or family member",
      'referralName'
    );

    // ── Widgets ────────────────────────────────────────────────────────────────
    const insertWidget = db.prepare(
      'INSERT INTO widgets (id, type, title, config) VALUES (?, ?, ?, ?)'
    );

    insertWidget.run('widget_001', 'kpi', 'Total Submissions',
      JSON.stringify({ sourceFormId: 'form_001', metric: 'count', prefix: '', suffix: ' responses' }));

    insertWidget.run('widget_002', 'chart', 'Rating Distribution',
      JSON.stringify({ sourceFormId: 'form_001', chartType: 'bar', xField: 'rating', yMetric: 'count' }));

    insertWidget.run('widget_003', 'table', 'Recent Submissions',
      JSON.stringify({ sourceFormId: 'form_001', columns: ['firstName', 'lastName', 'email', 'product', 'rating'] }));

    // ── Dashboard ──────────────────────────────────────────────────────────────
    db.prepare(`
      INSERT INTO dashboards (id, application_id, name, version, layout)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'dash_001',
      'app_001',
      'Feedback Overview',
      1,
      JSON.stringify([
        { widgetId: 'widget_001', x: 0,  y: 0, w: 4,  h: 2 },
        { widgetId: 'widget_002', x: 4,  y: 0, w: 8,  h: 2 },
        { widgetId: 'widget_003', x: 0,  y: 2, w: 12, h: 4 },
      ])
    );
  });

  insert();
  console.log('Seeded: Customer Feedback App');
}

// Allow running directly: tsx src/db/seed.ts
if (require.main === module) {
  seed();
}
