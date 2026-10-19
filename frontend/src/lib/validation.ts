export const TEAM_ROLES = [
  'developer',
  'tester',
  'project_manager',
  'designer',
  'devops',
  'qa_lead',
  'tech_lead',
  'business_analyst',
] as const;

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*[A-Za-z.]$/;
const PHONE_RE = /^[+\d][\d\s()-]*$/;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export type FieldErrors = Record<string, string>;

export function trim(value: unknown) {
  return String(value ?? '').trim();
}

export function compactErrors(raw: Record<string, string | null | undefined>): FieldErrors {
  const errors: FieldErrors = {};
  for (const [key, message] of Object.entries(raw)) {
    if (message) errors[key] = message;
  }
  return errors;
}

export function required(value: unknown, label: string) {
  if (!trim(value)) return `${label} is required`;
  return null;
}

export function username(value: unknown, optional = false) {
  const v = trim(value).toLowerCase();
  if (!v) return optional ? null : 'Username is required';
  if (v.length < 3) return 'Username must be at least 3 characters';
  if (v.length > 32) return 'Username must be at most 32 characters';
  if (!USERNAME_RE.test(v)) {
    return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
  }
  return null;
}

export function personName(value: unknown) {
  const v = trim(value);
  if (!v) return 'Name is required';
  if (v.length < 2) return 'Name must be at least 2 characters';
  if (v.length > 80) return 'Name must be at most 80 characters';
  if (v.length === 2 ? !/^[A-Za-z]{2}$/.test(v) : !NAME_RE.test(v)) {
    return "Name can only contain letters, spaces, and . ' -";
  }
  return null;
}

export function phone(value: unknown) {
  const v = trim(value);
  if (!v) return 'Number is required';
  if (!PHONE_RE.test(v)) {
    return 'Number can only contain digits, spaces, +, -, and ()';
  }
  const digits = v.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return 'Enter a valid phone number (7–15 digits)';
  }
  return null;
}

export function email(value: unknown) {
  const v = trim(value).toLowerCase();
  if (!v) return 'Email is required';
  if (v.length > 254) return 'Email is too long';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return null;
}

export function password(
  value: unknown,
  { min = 8, optional = false, label = 'Password' } = {},
) {
  const v = String(value ?? '');
  if (!v) return optional ? null : `${label} is required`;
  if (v.length < min) return `${label} must be at least ${min} characters`;
  if (v.length > 72) return `${label} must be at most 72 characters`;
  return null;
}

export function title(value: unknown) {
  const v = trim(value);
  if (!v) return 'Title is required';
  if (v.length < 3) return 'Title must be at least 3 characters';
  if (v.length > 150) return 'Title must be at most 150 characters';
  return null;
}

export function description(value: unknown) {
  const v = trim(value);
  if (!v) return 'Description is required';
  if (v.length < 5) return 'Description must be at least 5 characters';
  if (v.length > 2000) return 'Description must be at most 2000 characters';
  return null;
}

export function updateMessage(value: unknown) {
  const v = trim(value);
  if (!v) return 'Update message is required';
  if (v.length < 5) return 'Write at least 5 characters';
  if (v.length > 2000) return 'Update must be at most 2000 characters';
  return null;
}

export function etaAmount(value: unknown, required = false) {
  const v = trim(value);
  if (!v) return required ? 'Estimate is required' : null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 'Enter a valid amount of time';
  if (n > 999) return 'Estimate is too large';
  return null;
}

export function taskUpdateErrors(form: {
  message: string;
  etaAmount: string;
}) {
  return compactErrors({
    message: updateMessage(form.message),
    etaAmount: etaAmount(form.etaAmount),
  });
}

export function dueDate(value: unknown) {
  if (!value) return 'Due date is required';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return 'Enter a valid due date';
  const year = d.getFullYear();
  if (year < 2000 || year > 2100) return 'Due date is out of range';
  return null;
}

export function oneOf(value: unknown, list: readonly string[], label: string) {
  if (!value) return `${label} is required`;
  if (!list.includes(String(value))) return `Select a valid ${label.toLowerCase()}`;
  return null;
}

export function objectId(value: unknown, label: string, optional = false) {
  if (value === null || value === undefined || value === '') {
    return optional ? null : `${label} is required`;
  }
  if (!OBJECT_ID_RE.test(String(value))) return `${label} is invalid`;
  return null;
}

export function memberErrors(
  form: {
    name: string;
    number: string;
    email: string;
    role: string;
    password: string;
  },
  editing = false,
) {
  return compactErrors({
    name: personName(form.name),
    number: phone(form.number),
    email: email(form.email),
    role: oneOf(form.role, TEAM_ROLES, 'Role'),
    password: password(form.password, { min: 4, optional: editing }),
  });
}

export function taskErrors(
  form: {
    title: string;
    description: string;
    dueDate: string;
    priority: string;
    status: string;
    assignedTo: string;
  },
  assignedRequired = false,
) {
  return compactErrors({
    title: title(form.title),
    description: description(form.description),
    dueDate: dueDate(form.dueDate),
    priority: oneOf(form.priority, TASK_PRIORITIES, 'Priority'),
    status: oneOf(form.status, TASK_STATUSES, 'Status'),
    assignedTo: assignedRequired
      ? objectId(form.assignedTo, 'Assignee')
      : form.assignedTo
        ? objectId(form.assignedTo, 'Assignee', true)
        : null,
  });
}

export function adminLoginErrors(
  form: { username: string; password: string },
  setup = false,
) {
  return compactErrors({
    username: setup ? username(form.username) : required(form.username, 'Username'),
    password: setup
      ? password(form.password, { min: 8 })
      : required(form.password, 'Password'),
  });
}

export function userLoginErrors(form: { email: string; password: string }) {
  return compactErrors({
    email: email(form.email),
    password: required(form.password, 'Password'),
  });
}
