const { TEAM_ROLES } = require('../models/TeamMember');
const { TASK_PRIORITIES, TASK_STATUSES } = require('../models/Task');
const { normalizePermissions } = require('./rbac');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*[A-Za-z.]$/;
const PHONE_RE = /^[+\d][\d\s()-]*$/;
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function trim(value) {
  return String(value ?? '').trim();
}

function compactErrors(raw) {
  const errors = {};
  for (const [key, message] of Object.entries(raw || {})) {
    if (message) errors[key] = message;
  }
  return errors;
}

function sendValidation(res, errors, status = 400) {
  const compact = compactErrors(errors);
  const keys = Object.keys(compact);
  if (!keys.length) return false;
  res.status(status).json({
    message: compact[keys[0]],
    errors: compact,
  });
  return true;
}

function required(value, label) {
  if (!trim(value)) return `${label} is required`;
  return null;
}

function username(value, { optional = false } = {}) {
  const v = trim(value).toLowerCase();
  if (!v) return optional ? null : 'Username is required';
  if (v.length < 3) return 'Username must be at least 3 characters';
  if (v.length > 32) return 'Username must be at most 32 characters';
  if (!USERNAME_RE.test(v)) {
    return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
  }
  return null;
}

function personName(value) {
  const v = trim(value);
  if (!v) return 'Name is required';
  if (v.length < 2) return 'Name must be at least 2 characters';
  if (v.length > 80) return 'Name must be at most 80 characters';
  if (v.length === 2 ? !/^[A-Za-z]{2}$/.test(v) : !NAME_RE.test(v)) {
    return "Name can only contain letters, spaces, and . ' -";
  }
  return null;
}

function phone(value) {
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

function email(value) {
  const v = trim(value).toLowerCase();
  if (!v) return 'Email is required';
  if (v.length > 254) return 'Email is too long';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return null;
}

function password(value, { min = 8, optional = false, label = 'Password' } = {}) {
  const v = String(value ?? '');
  if (!v) return optional ? null : `${label} is required`;
  if (v.length < min) return `${label} must be at least ${min} characters`;
  if (v.length > 72) return `${label} must be at most 72 characters`;
  return null;
}

function title(value) {
  const v = trim(value);
  if (!v) return 'Title is required';
  if (v.length < 3) return 'Title must be at least 3 characters';
  if (v.length > 150) return 'Title must be at most 150 characters';
  return null;
}

function description(value) {
  const v = trim(value);
  if (!v) return 'Description is required';
  if (v.length < 5) return 'Description must be at least 5 characters';
  if (v.length > 2000) return 'Description must be at most 2000 characters';
  return null;
}

function updateMessage(value) {
  const v = trim(value);
  if (!v) return 'Update message is required';
  if (v.length < 5) return 'Write at least 5 characters';
  if (v.length > 2000) return 'Update must be at most 2000 characters';
  return null;
}

function validateTaskUpdate(body) {
  const errors = {};
  const data = {};
  const err = updateMessage(body?.message);
  if (err) errors.message = err;
  else data.message = trim(body.message);

  if (body?.etaMinutes !== undefined && body?.etaMinutes !== null && body?.etaMinutes !== '') {
    const n = Number(body.etaMinutes);
    if (!Number.isFinite(n) || n < 1 || n > 90 * 24 * 60) {
      errors.etaMinutes = 'Enter a valid estimate (1 minute to 90 days)';
    } else {
      data.etaMinutes = Math.round(n);
    }
  }

  return { errors: compactErrors(errors), data };
}

function dueDate(value) {
  if (!value) return 'Due date is required';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Enter a valid due date';
  const year = d.getFullYear();
  if (year < 2000 || year > 2100) return 'Due date is out of range';
  return null;
}

function oneOf(value, list, label) {
  if (!value) return `${label} is required`;
  if (!list.includes(value)) return `Select a valid ${label.toLowerCase()}`;
  return null;
}

function objectId(value, label, { optional = false } = {}) {
  if (value === null || value === undefined || value === '') {
    return optional ? null : `${label} is required`;
  }
  if (!OBJECT_ID_RE.test(String(value))) return `${label} is invalid`;
  return null;
}

function validateMember(body, { partial = false, passwordRequired = false } = {}) {
  const errors = {};
  const data = {};

  if (!partial || body.name !== undefined) {
    const err = personName(body.name);
    if (err) errors.name = err;
    else data.name = trim(body.name);
  }

  if (!partial || body.number !== undefined) {
    const err = phone(body.number);
    if (err) errors.number = err;
    else data.number = trim(body.number);
  }

  if (!partial || body.email !== undefined) {
    const err = email(body.email);
    if (err) errors.email = err;
    else data.email = trim(body.email).toLowerCase();
  }

  if (!partial || body.role !== undefined) {
    const err = oneOf(body.role, TEAM_ROLES, 'Role');
    if (err) errors.role = err;
    else data.role = body.role;
  }

  if (passwordRequired || body.password) {
    const err = password(body.password, {
      min: 4,
      optional: !passwordRequired,
    });
    if (err) errors.password = err;
  }

  if (!partial || body.permissions !== undefined) {
    if (body.permissions !== undefined) {
      data.permissions = normalizePermissions(body.permissions);
    }
  }

  return { errors, data };
}

function validateTask(body, { partial = false, assignedRequired = false } = {}) {
  const errors = {};
  const data = {};

  if (!partial || body.title !== undefined) {
    const err = title(body.title);
    if (err) errors.title = err;
    else data.title = trim(body.title);
  }

  if (!partial || body.description !== undefined) {
    const err = description(body.description);
    if (err) errors.description = err;
    else data.description = trim(body.description);
  }

  if (!partial || body.dueDate !== undefined) {
    const err = dueDate(body.dueDate);
    if (err) errors.dueDate = err;
    else data.dueDate = new Date(body.dueDate);
  }

  if (!partial || body.priority !== undefined) {
    const err = oneOf(body.priority, TASK_PRIORITIES, 'Priority');
    if (err) errors.priority = err;
    else data.priority = body.priority;
  }

  if (!partial || body.status !== undefined) {
    const err = oneOf(body.status, TASK_STATUSES, 'Status');
    if (err) errors.status = err;
    else data.status = body.status;
  }

  if (!partial || body.assignedTo !== undefined) {
    if (body.assignedTo === null || body.assignedTo === '') {
      if (assignedRequired) errors.assignedTo = 'Please assign this task';
      else data.assignedTo = null;
    } else {
      const err = objectId(body.assignedTo, 'Assignee', {
        optional: !assignedRequired,
      });
      if (err) errors.assignedTo = err;
      else data.assignedTo = String(body.assignedTo);
    }
  }

  return { errors, data };
}

function validateUsernamePassword(
  body,
  { passwordMin = 8, passwordOptional = false } = {},
) {
  const errors = compactErrors({
    username: username(body.username),
    password: password(body.password, {
      min: passwordMin,
      optional: passwordOptional,
    }),
  });
  return {
    errors,
    data: {
      username: trim(body.username).toLowerCase(),
      password: String(body.password || ''),
    },
  };
}

function validateLogin(body, { emailLogin = false } = {}) {
  if (emailLogin) {
    return {
      errors: compactErrors({
        email: email(body.email),
        password: required(body.password, 'Password'),
      }),
    };
  }
  return {
    errors: compactErrors({
      username: required(body.username, 'Username'),
      password: required(body.password, 'Password'),
    }),
  };
}

module.exports = {
  compactErrors,
  sendValidation,
  required,
  username,
  personName,
  phone,
  email,
  password,
  title,
  description,
  dueDate,
  oneOf,
  objectId,
  validateMember,
  validateTask,
  validateTaskUpdate,
  validateUsernamePassword,
  validateLogin,
  updateMessage,
};
