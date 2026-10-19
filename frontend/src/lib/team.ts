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

export type TeamRole = (typeof TEAM_ROLES)[number];

import type { Permissions } from './rbac';

export type TeamMember = {
  id: string;
  name: string;
  number: string;
  email: string;
  role: TeamRole;
  permissions?: Permissions;
  createdAt?: string;
  updatedAt?: string;
};

export function roleLabel(role: string) {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const ROLE_STYLES: Record<
  TeamRole,
  { chip: string; soft: string; bar: string }
> = {
  developer: {
    chip: 'bg-teal-50 text-teal-700 ring-teal-200',
    soft: 'from-teal-100/80 to-transparent',
    bar: 'bg-teal-500',
  },
  tester: {
    chip: 'bg-amber-50 text-amber-800 ring-amber-200',
    soft: 'from-amber-100/80 to-transparent',
    bar: 'bg-amber-500',
  },
  project_manager: {
    chip: 'bg-sky-50 text-sky-800 ring-sky-200',
    soft: 'from-sky-100/80 to-transparent',
    bar: 'bg-sky-500',
  },
  designer: {
    chip: 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200',
    soft: 'from-fuchsia-100/80 to-transparent',
    bar: 'bg-fuchsia-500',
  },
  devops: {
    chip: 'bg-blue-50 text-blue-800 ring-blue-200',
    soft: 'from-blue-100/80 to-transparent',
    bar: 'bg-blue-500',
  },
  qa_lead: {
    chip: 'bg-orange-50 text-orange-800 ring-orange-200',
    soft: 'from-orange-100/80 to-transparent',
    bar: 'bg-orange-500',
  },
  tech_lead: {
    chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    soft: 'from-emerald-100/80 to-transparent',
    bar: 'bg-emerald-500',
  },
  business_analyst: {
    chip: 'bg-rose-50 text-rose-800 ring-rose-200',
    soft: 'from-rose-100/80 to-transparent',
    bar: 'bg-rose-500',
  },
};

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}
