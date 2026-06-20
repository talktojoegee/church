import { ALL_PERMISSIONS, PERMISSIONS } from './permissions';

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  PASTOR: 'Pastor',
  ADMIN: 'Admin',
  FINANCE_OFFICER: 'Finance Officer',
  HR_OFFICER: 'HR Officer',
  DEPARTMENT_HEAD: 'Department Head',
  USHER: 'Usher',
  MEMBER: 'Member',
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/**
 * Default permission sets per system role.
 * Super Admin implicitly has all permissions (enforced by isSuperAdmin flag),
 * but we still seed the full set for clarity.
 */
export const ROLE_PERMISSIONS: Record<SystemRoleName, string[]> = {
  [SYSTEM_ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [SYSTEM_ROLES.PASTOR]: ALL_PERMISSIONS,
  [SYSTEM_ROLES.ADMIN]: [
    ...PERMISSIONS.branch,
    ...PERMISSIONS.department,
    ...PERMISSIONS.settings,
    ...PERMISSIONS.audit,
    ...PERMISSIONS.user,
    ...PERMISSIONS.role,
    ...PERMISSIONS.member,
    ...PERMISSIONS.household,
    ...PERMISSIONS.visitor,
    ...PERMISSIONS.followup,
    ...PERMISSIONS.group,
    ...PERMISSIONS.attendance,
    ...PERMISSIONS.event,
    ...PERMISSIONS.sermon,
    ...PERMISSIONS.testimony,
    ...PERMISSIONS.outreach,
    ...PERMISSIONS.website,
    ...PERMISSIONS.message,
    ...PERMISSIONS.template,
    ...PERMISSIONS.bulksms,
    ...PERMISSIONS.report,
  ],
  [SYSTEM_ROLES.FINANCE_OFFICER]: [
    ...PERMISSIONS.contribution,
    ...PERMISSIONS.expense,
    ...PERMISSIONS.fund,
    ...PERMISSIONS.pledge,
    ...PERMISSIONS.report,
    ...PERMISSIONS.member.filter((k) => k.endsWith('.view')),
  ],
  [SYSTEM_ROLES.HR_OFFICER]: [
    ...PERMISSIONS.employee,
    ...PERMISSIONS.leave,
    ...PERMISSIONS.payroll,
    ...PERMISSIONS.report,
  ],
  [SYSTEM_ROLES.DEPARTMENT_HEAD]: [
    ...PERMISSIONS.department.filter((k) => k.endsWith('.view')),
    ...PERMISSIONS.member.filter((k) => k.endsWith('.view')),
    ...PERMISSIONS.group,
    ...PERMISSIONS.attendance,
    ...PERMISSIONS.event,
    ...PERMISSIONS.followup,
  ],
  [SYSTEM_ROLES.USHER]: [
    ...PERMISSIONS.attendance,
    ...PERMISSIONS.member.filter((k) => k.endsWith('.view')),
    ...PERMISSIONS.visitor,
  ],
  [SYSTEM_ROLES.MEMBER]: [],
};
