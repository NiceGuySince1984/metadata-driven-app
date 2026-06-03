import { describe, it, expect } from 'vitest';
import {
  checkCondition,
  isFieldVisible,
  validateField,
  applyFormValidation,
} from '@shared/validation';
import type { FieldWithRules, FullForm } from '@shared/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function field(overrides: Partial<FieldWithRules> = {}): FieldWithRules {
  return {
    id: 'f1',
    sectionId: 's1',
    name: 'testField',
    label: 'Test Field',
    type: 'text',
    order: 1,
    config: {},
    validationRules: [],
    ...overrides,
  };
}

// ── checkCondition ────────────────────────────────────────────────────────────

describe('checkCondition', () => {
  it('eq: matches equal values', () => {
    expect(checkCondition('yes', 'eq', 'yes')).toBe(true);
    expect(checkCondition('no',  'eq', 'yes')).toBe(false);
  });

  it('eq: strict equality (no coercion)', () => {
    expect(checkCondition(1,   'eq', '1')).toBe(false);
    expect(checkCondition(true,'eq', 'true')).toBe(false);
  });

  it('neq: matches unequal values', () => {
    expect(checkCondition('a', 'neq', 'b')).toBe(true);
    expect(checkCondition('a', 'neq', 'a')).toBe(false);
  });

  it('gt: numeric greater-than', () => {
    expect(checkCondition(5, 'gt', 3)).toBe(true);
    expect(checkCondition(3, 'gt', 5)).toBe(false);
    expect(checkCondition(3, 'gt', 3)).toBe(false);
  });

  it('lt: numeric less-than', () => {
    expect(checkCondition(2, 'lt', 5)).toBe(true);
    expect(checkCondition(5, 'lt', 2)).toBe(false);
  });

  it('contains: substring match', () => {
    expect(checkCondition('hello world', 'contains', 'world')).toBe(true);
    expect(checkCondition('hello world', 'contains', 'xyz')).toBe(false);
    expect(checkCondition(42,            'contains', '42')).toBe(false); // non-string actual
  });

  it('unknown operator defaults to visible (true)', () => {
    // @ts-expect-error intentional invalid operator
    expect(checkCondition('x', 'unknown', 'x')).toBe(true);
  });
});

// ── isFieldVisible ────────────────────────────────────────────────────────────

describe('isFieldVisible', () => {
  it('returns true when there is no visibility rule', () => {
    expect(isFieldVisible(field(), {})).toBe(true);
  });

  it('returns true when visibility is explicitly null', () => {
    const f = field({ config: { visibility: null } });
    expect(isFieldVisible(f, {})).toBe(true);
  });

  it('returns false when condition is not met', () => {
    const f = field({ config: { visibility: { dependsOn: 'ctrl', operator: 'eq', value: 'yes' } } });
    expect(isFieldVisible(f, { ctrl: 'no' })).toBe(false);
    expect(isFieldVisible(f, {})).toBe(false); // undefined !== 'yes'
  });

  it('returns true when condition is met', () => {
    const f = field({ config: { visibility: { dependsOn: 'ctrl', operator: 'eq', value: 'yes' } } });
    expect(isFieldVisible(f, { ctrl: 'yes' })).toBe(true);
  });

  it('handles neq operator', () => {
    const f = field({ config: { visibility: { dependsOn: 'status', operator: 'neq', value: 'inactive' } } });
    expect(isFieldVisible(f, { status: 'active' })).toBe(true);
    expect(isFieldVisible(f, { status: 'inactive' })).toBe(false);
  });
});

// ── validateField ─────────────────────────────────────────────────────────────

describe('validateField — required', () => {
  const rules = [{ id: 'r', fieldId: 'f', type: 'required' as const, value: null, message: 'Required' }];

  it('fails on empty string',  () => expect(validateField('',        rules)).toBe('Required'));
  it('fails on null',          () => expect(validateField(null,      rules)).toBe('Required'));
  it('fails on undefined',     () => expect(validateField(undefined, rules)).toBe('Required'));
  it('fails on false (checkbox)', () => expect(validateField(false,  rules)).toBe('Required'));
  it('passes on non-empty string', () => expect(validateField('hi',  rules)).toBeUndefined());
  it('passes on number 0',     () => expect(validateField(0,         rules)).toBeUndefined());
  it('passes on true',         () => expect(validateField(true,      rules)).toBeUndefined());
});

describe('validateField — minLength / maxLength', () => {
  it('minLength: fails when string is too short', () => {
    const rules = [{ id: 'r', fieldId: 'f', type: 'minLength' as const, value: '5', message: 'Too short' }];
    expect(validateField('ab',    rules)).toBe('Too short');
    expect(validateField('abcde', rules)).toBeUndefined();
  });

  it('maxLength: fails when string is too long', () => {
    const rules = [{ id: 'r', fieldId: 'f', type: 'maxLength' as const, value: '3', message: 'Too long' }];
    expect(validateField('abcd', rules)).toBe('Too long');
    expect(validateField('abc',  rules)).toBeUndefined();
  });
});

describe('validateField — min / max', () => {
  it('min: fails when number is below threshold', () => {
    const rules = [{ id: 'r', fieldId: 'f', type: 'min' as const, value: '1', message: 'Too low' }];
    expect(validateField(0,  rules)).toBe('Too low');
    expect(validateField(1,  rules)).toBeUndefined();
    expect(validateField(-5, rules)).toBe('Too low');
  });

  it('max: fails when number exceeds threshold', () => {
    const rules = [{ id: 'r', fieldId: 'f', type: 'max' as const, value: '5', message: 'Too high' }];
    expect(validateField(6, rules)).toBe('Too high');
    expect(validateField(5, rules)).toBeUndefined();
  });

  it('min/max: skips validation on empty string (no required rule)', () => {
    const minRule = [{ id: 'r', fieldId: 'f', type: 'min' as const, value: '1', message: 'Too low' }];
    const maxRule = [{ id: 'r', fieldId: 'f', type: 'max' as const, value: '5', message: 'Too high' }];
    expect(validateField('', minRule)).toBeUndefined();
    expect(validateField('', maxRule)).toBeUndefined();
  });

  it('min/max: skips validation on null / undefined', () => {
    const rules = [{ id: 'r', fieldId: 'f', type: 'min' as const, value: '1', message: 'Too low' }];
    expect(validateField(null,      rules)).toBeUndefined();
    expect(validateField(undefined, rules)).toBeUndefined();
  });
});

describe('validateField — pattern', () => {
  const rules = [
    { id: 'r', fieldId: 'f', type: 'pattern' as const, value: '^[^@]+@[^@]+\\.[^@]+$', message: 'Invalid email' },
  ];

  it('fails when value does not match pattern', () => {
    expect(validateField('not-an-email', rules)).toBe('Invalid email');
    expect(validateField('missing@tld',  rules)).toBe('Invalid email');
  });

  it('passes when value matches pattern', () => {
    expect(validateField('user@example.com', rules)).toBeUndefined();
  });

  it('skips pattern check on empty string', () => {
    expect(validateField('', rules)).toBeUndefined();
  });
});

describe('validateField — first-failure short-circuit', () => {
  it('returns only the first failing rule message', () => {
    const rules = [
      { id: 'r1', fieldId: 'f', type: 'required'  as const, value: null, message: 'Required' },
      { id: 'r2', fieldId: 'f', type: 'minLength' as const, value: '5',  message: 'Too short' },
    ];
    // Empty string triggers required first, not minLength
    expect(validateField('', rules)).toBe('Required');
  });
});

// ── applyFormValidation ───────────────────────────────────────────────────────

const MINI_FORM: FullForm = {
  id: 'f',
  applicationId: 'app',
  name: 'Mini',
  version: 1,
  config: {},
  crossFieldRules: [],
  sections: [
    {
      id: 's1',
      formId: 'f',
      title: 'Section',
      order: 1,
      fields: [
        {
          id: 'f_name',
          sectionId: 's1',
          name: 'name',
          label: 'Name',
          type: 'text',
          order: 1,
          config: {},
          validationRules: [
            { id: 'r1', fieldId: 'f_name', type: 'required', value: null, message: 'Name required' },
          ],
        },
        {
          id: 'f_age',
          sectionId: 's1',
          name: 'age',
          label: 'Age',
          type: 'number',
          order: 2,
          config: {},
          validationRules: [
            { id: 'r2', fieldId: 'f_age', type: 'min', value: '18', message: 'Must be 18+' },
            { id: 'r3', fieldId: 'f_age', type: 'max', value: '99', message: 'Must be under 100' },
          ],
        },
        {
          id: 'f_note',
          sectionId: 's1',
          name: 'note',
          label: 'Note',
          type: 'text',
          order: 3,
          config: {
            visibility: { dependsOn: 'name', operator: 'eq', value: 'admin' },
          },
          validationRules: [
            { id: 'r4', fieldId: 'f_note', type: 'required', value: null, message: 'Note required for admin' },
          ],
        },
        {
          id: 'f_comp',
          sectionId: 's1',
          name: 'computed',
          label: 'Computed',
          type: 'computed',
          order: 4,
          config: { expression: { op: 'concat', fields: ['name'] } },
          validationRules: [],
        },
      ],
    },
  ],
};

describe('applyFormValidation', () => {
  it('returns errors for all invalid visible fields', () => {
    const errors = applyFormValidation(MINI_FORM, { name: '', age: 10 });
    const fields = errors.map(e => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('age');
  });

  it('returns no errors for a valid submission', () => {
    expect(applyFormValidation(MINI_FORM, { name: 'Alice', age: 25 })).toHaveLength(0);
  });

  it('skips validation for hidden fields', () => {
    // note is only visible when name === 'admin'
    const errors = applyFormValidation(MINI_FORM, { name: 'Alice', age: 25 });
    expect(errors.map(e => e.field)).not.toContain('note');
  });

  it('validates hidden fields when they become visible', () => {
    // name === 'admin' → note field is visible and required
    const errors = applyFormValidation(MINI_FORM, { name: 'admin', age: 25, note: '' });
    expect(errors.map(e => e.field)).toContain('note');
  });

  it('skips computed fields entirely', () => {
    const errors = applyFormValidation(MINI_FORM, { name: 'Alice', age: 25 });
    expect(errors.map(e => e.field)).not.toContain('computed');
  });
});

describe('applyFormValidation — cross-field conditional rule', () => {
  const FORM_WITH_CROSS: FullForm = {
    ...MINI_FORM,
    crossFieldRules: [
      {
        id: 'xr1',
        formId: 'f',
        type: 'conditional',
        fields: ['name', 'note'],
        config: {
          when: { field: 'name', operator: 'eq', value: 'admin' },
          require: 'note',
        },
        message: 'Note is required for admin',
        errorField: 'note',
      },
    ],
  };

  it('fires cross-field rule when condition is met and required field is empty', () => {
    const errors = applyFormValidation(
      FORM_WITH_CROSS,
      { name: 'admin', age: 25, note: '' },
    );
    expect(errors.map(e => e.field)).toContain('note');
  });

  it('does not fire cross-field rule when condition is not met', () => {
    const errors = applyFormValidation(
      FORM_WITH_CROSS,
      { name: 'Alice', age: 25, note: '' },
    );
    expect(errors.map(e => e.field)).not.toContain('note');
  });

  it('does not fire cross-field rule when required field is filled', () => {
    const errors = applyFormValidation(
      FORM_WITH_CROSS,
      { name: 'admin', age: 25, note: 'some note' },
    );
    expect(errors).toHaveLength(0);
  });

  it('skips cross-field rules when per-field errors exist', () => {
    // name is empty → per-field fails → cross-field should not run
    const errors = applyFormValidation(
      FORM_WITH_CROSS,
      { name: '', age: 25, note: '' },
    );
    // Only per-field error for 'name', not cross-field error for 'note'
    expect(errors.every(e => e.field !== 'note' || e.message !== 'Note is required for admin')).toBe(true);
  });
});
