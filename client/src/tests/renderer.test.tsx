import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormRenderer, { evaluateExpression } from '../renderer/FormRenderer';
import type { FullForm } from '@shared/types';

// ── Mock form ─────────────────────────────────────────────────────────────────
// Covers all field types, one visibility rule, and one computed field.

const MOCK_FORM: FullForm = {
  id: 'test_form',
  applicationId: 'test_app',
  name: 'Test Form',
  version: 1,
  config: { submitLabel: 'Submit Test', description: 'A test form' },
  crossFieldRules: [],
  sections: [
    {
      id: 'sec_1',
      formId: 'test_form',
      title: 'Contact',
      order: 1,
      fields: [
        {
          id: 'f_name',
          sectionId: 'sec_1',
          name: 'name',
          label: 'Your Name',
          type: 'text',
          order: 1,
          config: { placeholder: 'Enter name' },
          validationRules: [
            { id: 'r1', fieldId: 'f_name', type: 'required', value: null, message: 'Name is required' },
          ],
        },
        {
          id: 'f_age',
          sectionId: 'sec_1',
          name: 'age',
          label: 'Age',
          type: 'number',
          order: 2,
          config: {},
          validationRules: [],
        },
      ],
    },
    {
      id: 'sec_2',
      formId: 'test_form',
      title: 'Location',
      order: 2,
      fields: [
        {
          id: 'f_country',
          sectionId: 'sec_2',
          name: 'country',
          label: 'Country',
          type: 'select',
          order: 1,
          config: {
            options: [
              { label: 'USA', value: 'usa' },
              { label: 'UK',  value: 'uk'  },
            ],
          },
          validationRules: [],
        },
        {
          id: 'f_state',
          sectionId: 'sec_2',
          name: 'state',
          label: 'State',
          type: 'text',
          order: 2,
          config: {
            // Only visible when country === 'usa'
            visibility: { dependsOn: 'country', operator: 'eq', value: 'usa' },
          },
          validationRules: [],
        },
      ],
    },
    {
      id: 'sec_3',
      formId: 'test_form',
      title: 'Summary',
      order: 3,
      fields: [
        {
          id: 'f_full',
          sectionId: 'sec_3',
          name: 'fullName',
          label: 'Full Name',
          type: 'computed',
          order: 1,
          config: {
            expression: { op: 'concat', fields: ['name', 'age'], separator: ' — ' },
          },
          validationRules: [],
        },
      ],
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FormRenderer — metadata-to-UI rendering', () => {
  it('renders all three sections from metadata', () => {
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders the correct fields per section', () => {
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    // All non-hidden fields are present
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
    // Computed field label is present
    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });
});

describe('FormRenderer — conditional visibility', () => {
  it('does not render a field whose visibility condition is unmet', () => {
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    // country is blank → state should not appear
    expect(screen.queryByLabelText(/State/i)).not.toBeInTheDocument();
  });

  it('shows a hidden field when its controlling field changes to the trigger value', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/State/i)).not.toBeInTheDocument();

    const countrySelect = screen.getByLabelText(/Country/i);
    await user.selectOptions(countrySelect, 'usa');

    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();
  });

  it('hides the field again when the controlling field changes away from trigger value', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    const countrySelect = screen.getByLabelText(/Country/i);
    await user.selectOptions(countrySelect, 'usa');
    expect(screen.getByLabelText(/State/i)).toBeInTheDocument();

    await user.selectOptions(countrySelect, 'uk');
    expect(screen.queryByLabelText(/State/i)).not.toBeInTheDocument();
  });
});

describe('FormRenderer — computed fields', () => {
  it('displays the evaluated computed value when dependencies have values', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    const nameInput = screen.getByLabelText(/Your Name/i);
    await user.type(nameInput, 'Jane');

    const ageInput = screen.getByLabelText(/Age/i);
    await user.type(ageInput, '30');

    const computedEl = screen.getByTestId('computed-fullName');
    expect(computedEl).toHaveTextContent('Jane — 30');
  });

  it('shows placeholder text in the computed field when no dependencies are filled', () => {
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);
    const computedEl = screen.getByTestId('computed-fullName');
    expect(computedEl).toHaveTextContent('Will be computed…');
  });
});

describe('FormRenderer — validation', () => {
  it('shows a required-field error and does not call onSubmit', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<FormRenderer form={MOCK_FORM} onSubmit={handleSubmit} />);

    // Leave 'name' empty and submit
    const submitButton = screen.getByRole('button', { name: /Submit Test/i });
    await user.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('clears a field error when the user starts typing', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    // Trigger error
    await user.click(screen.getByRole('button', { name: /Submit Test/i }));
    expect(screen.getByText('Name is required')).toBeInTheDocument();

    // Start typing → error clears
    await user.type(screen.getByLabelText(/Your Name/i), 'A');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });
});

describe('evaluateExpression — unit tests', () => {
  it('concat joins non-empty values with separator', () => {
    expect(evaluateExpression(
      { op: 'concat', fields: ['a', 'b'], separator: ' — ' },
      { a: 'Hello', b: 'World' },
    )).toBe('Hello — World');
  });

  it('concat skips empty strings', () => {
    expect(evaluateExpression(
      { op: 'concat', fields: ['a', 'b'], separator: ' ' },
      { a: 'Hello', b: '' },
    )).toBe('Hello');
  });

  it('sum adds numeric field values', () => {
    expect(evaluateExpression(
      { op: 'sum', fields: ['x', 'y'] },
      { x: 3, y: 7 },
    )).toBe(10);
  });

  it('subtract subtracts remaining fields from the first', () => {
    expect(evaluateExpression(
      { op: 'subtract', fields: ['total', 'discount'] },
      { total: 100, discount: 20 },
    )).toBe(80);
  });

  it('subtract with a single field returns that value', () => {
    expect(evaluateExpression(
      { op: 'subtract', fields: ['price'] },
      { price: 42 },
    )).toBe(42);
  });

  it('multiply returns the product of all field values', () => {
    expect(evaluateExpression(
      { op: 'multiply', fields: ['qty', 'price'] },
      { qty: 3, price: 25 },
    )).toBe(75);
  });

  it('multiply treats missing fields as 0, yielding 0', () => {
    expect(evaluateExpression(
      { op: 'multiply', fields: ['qty', 'price'] },
      { qty: 3 },
    )).toBe(0);
  });

  it('template interpolates a single placeholder', () => {
    expect(evaluateExpression(
      { op: 'template', template: 'Hello, {{name}}!' },
      { name: 'World' },
    )).toBe('Hello, World!');
  });

  it('template interpolates multiple placeholders', () => {
    expect(evaluateExpression(
      { op: 'template', template: '{{first}} {{last}} <{{email}}>' },
      { first: 'Jane', last: 'Doe', email: 'jane@example.com' },
    )).toBe('Jane Doe <jane@example.com>');
  });

  it('template renders empty string for missing keys', () => {
    expect(evaluateExpression(
      { op: 'template', template: 'Hi {{name}}' },
      {},
    )).toBe('Hi ');
  });
});

describe('FormRenderer — field type rendering', () => {
  const TYPED_FORM: FullForm = {
    id: 'typed_form',
    applicationId: 'app',
    name: 'Typed',
    version: 1,
    config: {},
    crossFieldRules: [],
    sections: [{
      id: 's1', formId: 'typed_form', title: 'Fields', order: 1,
      fields: [
        { id: 'f_cb',   sectionId: 's1', name: 'agreed',    label: 'I agree',      type: 'checkbox', order: 1, config: {}, validationRules: [] },
        { id: 'f_date', sectionId: 's1', name: 'dob',       label: 'Date of Birth', type: 'date',    order: 2, config: {}, validationRules: [] },
        { id: 'f_num',  sectionId: 's1', name: 'score',     label: 'Score',         type: 'number',  order: 3, config: { expression: { op: 'subtract', fields: ['a', 'b'] } }, validationRules: [] },
      ],
    }],
  };

  it('renders a toggle switch (role=switch) for checkbox fields', () => {
    render(<FormRenderer form={TYPED_FORM} onSubmit={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: /I agree/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles checkbox aria-checked when clicked', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={TYPED_FORM} onSubmit={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: /I agree/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('renders a date input for date fields', () => {
    render(<FormRenderer form={TYPED_FORM} onSubmit={vi.fn()} />);
    const dateInput = screen.getByLabelText(/Date of Birth/i);
    expect(dateInput).toHaveAttribute('type', 'date');
  });
});

describe('FormRenderer — blur-time validation', () => {
  it('shows a required error immediately when a field is blurred empty', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    const nameInput = screen.getByLabelText(/Your Name/i);
    // Focus then blur without typing
    await user.click(nameInput);
    await user.tab(); // moves focus away → triggers blur

    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('clears the blur error when the user fixes the field value', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    // Blur empty to trigger error
    const nameInput = screen.getByLabelText(/Your Name/i);
    await user.click(nameInput);
    await user.tab();
    expect(screen.getByText('Name is required')).toBeInTheDocument();

    // Now type something → error clears
    await user.type(nameInput, 'Jane');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('does not show errors before any interaction (no error on fresh render)', () => {
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('clears value of a dependent field when its controlling field changes away', async () => {
    const user = userEvent.setup();
    render(<FormRenderer form={MOCK_FORM} onSubmit={vi.fn()} />);

    // Show the state field by setting country = 'usa'
    await user.selectOptions(screen.getByLabelText(/Country/i), 'usa');
    const stateInput = screen.getByLabelText(/State/i);
    await user.type(stateInput, 'California');

    // Switch away — state field disappears
    await user.selectOptions(screen.getByLabelText(/Country/i), 'uk');
    expect(screen.queryByLabelText(/State/i)).not.toBeInTheDocument();

    // Switch back — state field reappears but value is cleared
    await user.selectOptions(screen.getByLabelText(/Country/i), 'usa');
    expect(screen.getByLabelText(/State/i)).toHaveValue('');
  });
});
