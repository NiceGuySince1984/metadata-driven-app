import { Router, Request, Response } from 'express';
import * as recordRepo from '../repositories/recordRepo';
import * as formRepo from '../repositories/formRepo';
import { applyRules } from '../validation/applyRules';

const router = Router();

// POST /api/records — validate against form metadata, then persist
router.post('/', (req: Request, res: Response) => {
  const { formId, data } = req.body;
  if (!formId || !data || typeof data !== 'object') {
    return res.status(400).json({ error: 'formId and data are required' });
  }

  const form = formRepo.getFullForm(formId);
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const errors = applyRules(form, data);
  if (errors.length > 0) {
    return res.status(422).json({ errors });
  }

  const record = recordRepo.createRecord({
    formId,
    formVersion: form.version,
    applicationId: form.applicationId,
    data,
  });

  res.status(201).json(record);
});

// GET /api/records?formId=xxx — list records for a form
router.get('/', (req: Request, res: Response) => {
  const { formId } = req.query;
  if (!formId || typeof formId !== 'string') {
    return res.status(400).json({ error: 'formId query param is required' });
  }
  res.json(recordRepo.listRecords(formId));
});

// GET /api/records/:id — get a single record
router.get('/:id', (req: Request, res: Response) => {
  const record = recordRepo.getRecord(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
});

// DELETE /api/records/:id
router.delete('/:id', (req: Request, res: Response) => {
  const ok = recordRepo.deleteRecord(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Record not found' });
  res.status(204).send();
});

export default router;
