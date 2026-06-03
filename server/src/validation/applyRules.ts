import { applyFormValidation } from '../../../shared/validation';
import type { FullForm, ValidationError } from '../../../shared/types';

export function applyRules(
  form: FullForm,
  data: Record<string, unknown>,
): ValidationError[] {
  return applyFormValidation(form, data);
}
