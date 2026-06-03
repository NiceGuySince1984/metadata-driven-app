import { Router, Request, Response } from 'express';
import * as repo from '../repositories/formRepo';

const router = Router();

// ── Applications ──────────────────────────────────────────────────────────────

router.get('/applications', (_req: Request, res: Response) => {
  res.json(repo.listApplications());
});

router.get('/applications/:id', (req: Request, res: Response) => {
  const app = repo.getApplication(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
});

router.post('/applications', (req: Request, res: Response) => {
  const { name, description, config } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const app = repo.createApplication({ name, description: description || '', config: config || {} });
  res.status(201).json(app);
});

// ── Forms ─────────────────────────────────────────────────────────────────────

router.get('/forms', (req: Request, res: Response) => {
  res.json(repo.listForms(req.query.applicationId as string | undefined));
});

router.post('/forms', (req: Request, res: Response) => {
  const { applicationId, name, config } = req.body;
  if (!applicationId || !name) return res.status(400).json({ error: 'applicationId and name are required' });
  const form = repo.createForm({ applicationId, name, config });
  res.status(201).json(form);
});

router.get('/forms/:id', (req: Request, res: Response) => {
  const form = repo.getFullForm(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  res.json(form);
});

router.put('/forms/:id', (req: Request, res: Response) => {
  const form = repo.updateForm(req.params.id, req.body);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  res.json(form);
});

router.delete('/forms/:id', (req: Request, res: Response) => {
  const ok = repo.deleteForm(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Form not found' });
  res.status(204).send();
});

router.get('/forms/:id/versions', (req: Request, res: Response) => {
  res.json(repo.getFormVersions(req.params.id));
});

// ── Sections ──────────────────────────────────────────────────────────────────

router.post('/forms/:formId/sections', (req: Request, res: Response) => {
  const { title, order } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const section = repo.createSection({ formId: req.params.formId, title, order });
  res.status(201).json(section);
});

router.put('/sections/:id', (req: Request, res: Response) => {
  const section = repo.updateSection(req.params.id, req.body);
  if (!section) return res.status(404).json({ error: 'Section not found' });
  res.json(section);
});

router.delete('/sections/:id', (req: Request, res: Response) => {
  const ok = repo.deleteSection(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Section not found' });
  res.status(204).send();
});

// ── Fields ────────────────────────────────────────────────────────────────────

router.post('/sections/:sectionId/fields', (req: Request, res: Response) => {
  const { name, label, type, order, config } = req.body;
  if (!name || !label || !type) return res.status(400).json({ error: 'name, label, and type are required' });
  const field = repo.createField({ sectionId: req.params.sectionId, name, label, type, order, config });
  res.status(201).json(field);
});

router.put('/fields/:id', (req: Request, res: Response) => {
  const field = repo.updateField(req.params.id, req.body);
  if (!field) return res.status(404).json({ error: 'Field not found' });
  res.json(field);
});

router.delete('/fields/:id', (req: Request, res: Response) => {
  const ok = repo.deleteField(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Field not found' });
  res.status(204).send();
});

// ── Validation Rules ──────────────────────────────────────────────────────────

router.post('/fields/:fieldId/validation-rules', (req: Request, res: Response) => {
  const { type, value, message } = req.body;
  if (!type || !message) return res.status(400).json({ error: 'type and message are required' });
  const rule = repo.createValidationRule({ fieldId: req.params.fieldId, type, value, message });
  res.status(201).json(rule);
});

router.delete('/validation-rules/:id', (req: Request, res: Response) => {
  const ok = repo.deleteValidationRule(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Validation rule not found' });
  res.status(204).send();
});

// ── Cross-field Rules ─────────────────────────────────────────────────────────

router.post('/forms/:formId/cross-field-rules', (req: Request, res: Response) => {
  const { type, fields, config, message, errorField } = req.body;
  if (!type || !fields || !message || !errorField) {
    return res.status(400).json({ error: 'type, fields, message, and errorField are required' });
  }
  const rule = repo.createCrossFieldRule({ formId: req.params.formId, type, fields, config: config || {}, message, errorField });
  res.status(201).json(rule);
});

router.delete('/cross-field-rules/:id', (req: Request, res: Response) => {
  const ok = repo.deleteCrossFieldRule(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Cross-field rule not found' });
  res.status(204).send();
});

// ── Widgets ───────────────────────────────────────────────────────────────────

router.get('/widgets', (_req: Request, res: Response) => {
  res.json(repo.listWidgets());
});

router.post('/widgets', (req: Request, res: Response) => {
  const { type, title, config } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'type and title are required' });
  const widget = repo.createWidget({ type, title, config: config || {} });
  res.status(201).json(widget);
});

router.get('/widgets/:id', (req: Request, res: Response) => {
  const widget = repo.getWidget(req.params.id);
  if (!widget) return res.status(404).json({ error: 'Widget not found' });
  res.json(widget);
});

router.put('/widgets/:id', (req: Request, res: Response) => {
  const widget = repo.updateWidget(req.params.id, req.body);
  if (!widget) return res.status(404).json({ error: 'Widget not found' });
  res.json(widget);
});

router.delete('/widgets/:id', (req: Request, res: Response) => {
  const ok = repo.deleteWidget(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Widget not found' });
  res.status(204).send();
});

// ── Dashboards ────────────────────────────────────────────────────────────────

router.get('/dashboards', (req: Request, res: Response) => {
  res.json(repo.listDashboards(req.query.applicationId as string | undefined));
});

router.post('/dashboards', (req: Request, res: Response) => {
  const { applicationId, name, layout } = req.body;
  if (!applicationId || !name) return res.status(400).json({ error: 'applicationId and name are required' });
  const dash = repo.createDashboard({ applicationId, name, layout });
  res.status(201).json(dash);
});

router.get('/dashboards/:id', (req: Request, res: Response) => {
  const dash = repo.getDashboard(req.params.id);
  if (!dash) return res.status(404).json({ error: 'Dashboard not found' });
  res.json(dash);
});

router.put('/dashboards/:id', (req: Request, res: Response) => {
  const dash = repo.updateDashboard(req.params.id, req.body);
  if (!dash) return res.status(404).json({ error: 'Dashboard not found' });
  res.json(dash);
});

router.delete('/dashboards/:id', (req: Request, res: Response) => {
  const ok = repo.deleteDashboard(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Dashboard not found' });
  res.status(204).send();
});

export default router;
