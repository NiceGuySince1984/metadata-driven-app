import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { migrate } from '../src/db/migrate';
import { seed } from '../src/db/seed';

beforeAll(() => {
  migrate();
  seed();
});

describe('POST /api/records', () => {
  it('saves a valid record and returns 201', async () => {
    const res = await request(app)
      .post('/api/records')
      .send({
        formId: 'form_001',
        data: {
          firstName:       'Jane',
          lastName:        'Smith',
          email:           'jane@example.com',
          product:         'Product A',
          rating:          5,
          wouldRecommend:  true,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.formId).toBe('form_001');
    expect(res.body.data.email).toBe('jane@example.com');
  });

  it('rejects a record missing required fields and returns 422', async () => {
    const res = await request(app)
      .post('/api/records')
      .send({
        formId: 'form_001',
        data: { wouldRecommend: false }, // missing firstName, lastName, email, product, rating
      });

    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.errors)).toBe(true);
    const errorFields = res.body.errors.map((e: { field: string }) => e.field);
    expect(errorFields).toContain('firstName');
    expect(errorFields).toContain('email');
    expect(errorFields).toContain('rating');
  });

  it('rejects a record with invalid email pattern and returns 422', async () => {
    const res = await request(app)
      .post('/api/records')
      .send({
        formId: 'form_001',
        data: {
          firstName: 'Jane',
          lastName:  'Smith',
          email:     'not-an-email',
          product:   'Product A',
          rating:    4,
        },
      });

    expect(res.status).toBe(422);
    const errorFields = res.body.errors.map((e: { field: string }) => e.field);
    expect(errorFields).toContain('email');
  });

  it('rejects a rating outside allowed range and returns 422', async () => {
    const res = await request(app)
      .post('/api/records')
      .send({
        formId: 'form_001',
        data: {
          firstName: 'Jane',
          lastName:  'Smith',
          email:     'jane@example.com',
          product:   'Product A',
          rating:    10,
        },
      });

    expect(res.status).toBe(422);
    const errorFields = res.body.errors.map((e: { field: string }) => e.field);
    expect(errorFields).toContain('rating');
  });

  it('returns 404 for unknown formId', async () => {
    const res = await request(app)
      .post('/api/records')
      .send({ formId: 'nonexistent', data: {} });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/records', () => {
  it('lists records for a form', async () => {
    const res = await request(app).get('/api/records?formId=form_001');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 400 when formId is missing', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/records/:id', () => {
  it('fetches a single record by id', async () => {
    const list = await request(app).get('/api/records?formId=form_001');
    const id = list.body[0].id;

    const res = await request(app).get(`/api/records/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/records/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/forms/:id (metadata-to-UI rendering)', () => {
  it('returns the full assembled form with sections, fields, and rules', async () => {
    const res = await request(app).get('/api/forms/form_001');
    expect(res.status).toBe(200);

    const form = res.body;
    expect(form.id).toBe('form_001');
    expect(Array.isArray(form.sections)).toBe(true);
    expect(form.sections.length).toBe(3);

    const allFields = form.sections.flatMap((s: { fields: unknown[] }) => s.fields);
    expect(allFields.length).toBeGreaterThan(0);

    const emailField = allFields.find((f: { name: string }) => f.name === 'email');
    expect(emailField).toBeDefined();
    expect((emailField as { validationRules: unknown[] }).validationRules.length).toBeGreaterThan(0);

    const computedField = allFields.find((f: { type: string }) => f.type === 'computed');
    expect(computedField).toBeDefined();
    expect((computedField as { config: { expression: unknown } }).config.expression).toBeDefined();

    const conditionalField = allFields.find((f: { name: string }) => f.name === 'referralName');
    expect((conditionalField as { config: { visibility: unknown } }).config.visibility).toBeDefined();
  });
});
