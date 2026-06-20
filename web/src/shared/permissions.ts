/**
 * Central permission catalog.
 *
 * Keys follow the pattern `<module>.<resource>.<action>`.
 * These are seeded into the database and enforced by the API's
 * permissions guard, and used by the web app to show/hide UI.
 */

export const ACTIONS = ['view', 'create', 'update', 'delete', 'manage'] as const;
export type Action = (typeof ACTIONS)[number];

/** Build a permission key. */
const p = (module: string, resource: string, action: Action) =>
  `${module}.${resource}.${action}`;

/** All permission keys grouped by module. */
export const PERMISSIONS = {
  // System / org
  branch: ['view', 'create', 'update', 'delete'].map((a) => p('org', 'branch', a as Action)),
  department: ['view', 'create', 'update', 'delete'].map((a) => p('org', 'department', a as Action)),
  settings: [p('org', 'settings', 'view'), p('org', 'settings', 'update')],
  audit: [p('system', 'audit', 'view')],

  // Access control
  user: ['view', 'create', 'update', 'delete'].map((a) => p('access', 'user', a as Action)),
  role: ['view', 'create', 'update', 'delete'].map((a) => p('access', 'role', a as Action)),

  // Membership
  member: ['view', 'create', 'update', 'delete'].map((a) => p('membership', 'member', a as Action)),
  household: ['view', 'create', 'update', 'delete'].map((a) => p('membership', 'household', a as Action)),
  visitor: ['view', 'create', 'update', 'delete'].map((a) => p('membership', 'visitor', a as Action)),
  followup: ['view', 'create', 'update', 'delete'].map((a) => p('membership', 'followup', a as Action)),
  group: ['view', 'create', 'update', 'delete'].map((a) => p('membership', 'group', a as Action)),

  // Attendance & events
  attendance: ['view', 'create', 'update', 'delete'].map((a) => p('engagement', 'attendance', a as Action)),
  event: ['view', 'create', 'update', 'delete'].map((a) => p('engagement', 'event', a as Action)),

  // Content
  sermon: ['view', 'create', 'update', 'delete'].map((a) => p('content', 'sermon', a as Action)),
  testimony: ['view', 'create', 'update', 'delete', 'manage'].map((a) => p('content', 'testimony', a as Action)),
  outreach: ['view', 'create', 'update', 'delete'].map((a) => p('content', 'outreach', a as Action)),
  website: ['view', 'create', 'update', 'delete', 'manage'].map((a) => p('content', 'website', a as Action)),

  // Communication
  message: ['view', 'create', 'delete'].map((a) => p('comms', 'message', a as Action)),
  template: ['view', 'create', 'update', 'delete'].map((a) => p('comms', 'template', a as Action)),
  bulksms: ['view', 'send', 'manage', 'wallet'].map((a) => p('comms', 'bulksms', a as Action)),

  // Finance
  contribution: ['view', 'create', 'update', 'delete'].map((a) => p('finance', 'contribution', a as Action)),
  expense: ['view', 'create', 'update', 'delete'].map((a) => p('finance', 'expense', a as Action)),
  fund: ['view', 'create', 'update', 'delete'].map((a) => p('finance', 'fund', a as Action)),
  pledge: ['view', 'create', 'update', 'delete'].map((a) => p('finance', 'pledge', a as Action)),

  // HR & Payroll
  employee: ['view', 'create', 'update', 'delete'].map((a) => p('hr', 'employee', a as Action)),
  leave: ['view', 'create', 'update', 'delete', 'manage'].map((a) => p('hr', 'leave', a as Action)),
  payroll: ['view', 'create', 'update', 'delete', 'manage'].map((a) => p('payroll', 'payroll', a as Action)),

  // Reports
  report: [p('reports', 'report', 'view')],
} as const;

/** Flat list of every permission key. */
export const ALL_PERMISSIONS: string[] = Array.from(
  new Set(Object.values(PERMISSIONS).flat()),
);

/** Derive the module name from a permission key. */
export const moduleOf = (key: string): string => key.split('.')[0] ?? 'unknown';

/** Human-readable labels for permission keys (used in seed + role editor). */
export const PERMISSION_LABELS: Record<string, string> = {
  // Org
  'org.branch.view': 'View branches and campuses',
  'org.branch.create': 'Create new branches',
  'org.branch.update': 'Edit branch details',
  'org.branch.delete': 'Delete branches',
  'org.department.view': 'View departments',
  'org.department.create': 'Create departments',
  'org.department.update': 'Edit departments',
  'org.department.delete': 'Delete departments',
  'org.settings.view': 'View church settings',
  'org.settings.update': 'Update church settings and branding',
  'system.audit.view': 'View system audit trail',

  // Access
  'access.user.view': 'View staff user accounts',
  'access.user.create': 'Create staff user accounts',
  'access.user.update': 'Edit users and activate/deactivate accounts',
  'access.user.delete': 'Delete staff user accounts',
  'access.role.view': 'View roles and permissions',
  'access.role.create': 'Create custom roles',
  'access.role.update': 'Edit roles and assign permissions',
  'access.role.delete': 'Delete custom roles',

  // Membership
  'membership.member.view': 'View member records',
  'membership.member.create': 'Register new members',
  'membership.member.update': 'Edit member profiles',
  'membership.member.delete': 'Remove member records',
  'membership.household.view': 'View households',
  'membership.household.create': 'Create households',
  'membership.household.update': 'Edit households',
  'membership.household.delete': 'Delete households',
  'membership.visitor.view': 'View visitors',
  'membership.visitor.create': 'Register visitors',
  'membership.visitor.update': 'Edit visitor records',
  'membership.visitor.delete': 'Delete visitor records',
  'membership.followup.view': 'View follow-up cases',
  'membership.followup.create': 'Create follow-up cases',
  'membership.followup.update': 'Update follow-up cases',
  'membership.followup.delete': 'Delete follow-up cases',
  'membership.group.view': 'View groups and cells',
  'membership.group.create': 'Create groups',
  'membership.group.update': 'Edit groups',
  'membership.group.delete': 'Delete groups',

  // Engagement
  'engagement.attendance.view': 'View attendance sessions',
  'engagement.attendance.create': 'Create attendance sessions',
  'engagement.attendance.update': 'Edit attendance records',
  'engagement.attendance.delete': 'Delete attendance sessions',
  'engagement.event.view': 'View events',
  'engagement.event.create': 'Create events',
  'engagement.event.update': 'Edit events',
  'engagement.event.delete': 'Delete events',

  // Content
  'content.sermon.view': 'View sermons',
  'content.sermon.create': 'Publish sermons',
  'content.sermon.update': 'Edit sermons',
  'content.sermon.delete': 'Delete sermons',
  'content.testimony.view': 'View testimonies',
  'content.testimony.create': 'Submit testimonies',
  'content.testimony.update': 'Edit testimonies',
  'content.testimony.delete': 'Delete testimonies',
  'content.testimony.manage': 'Approve or reject testimonies',
  'content.outreach.view': 'View outreaches',
  'content.outreach.create': 'Create outreaches',
  'content.outreach.update': 'Edit outreaches',
  'content.outreach.delete': 'Delete outreaches',
  'content.website.view': 'View website CMS',
  'content.website.create': 'Create website content',
  'content.website.update': 'Edit website content',
  'content.website.delete': 'Delete website content',
  'content.website.manage': 'Manage contact messages & giving settings',

  // Communication
  'comms.message.view': 'View messages',
  'comms.message.create': 'Send messages',
  'comms.message.delete': 'Delete messages',
  'comms.template.view': 'View message templates',
  'comms.template.create': 'Create templates',
  'comms.template.update': 'Edit templates',
  'comms.template.delete': 'Delete templates',
  'comms.bulksms.view': 'View bulk SMS campaigns',
  'comms.bulksms.send': 'Send bulk SMS',
  'comms.bulksms.manage': 'Manage bulk SMS settings',
  'comms.bulksms.wallet': 'Manage SMS wallet',

  // Finance
  'finance.contribution.view': 'View income and contributions',
  'finance.contribution.create': 'Record income',
  'finance.contribution.update': 'Edit income records',
  'finance.contribution.delete': 'Delete income records',
  'finance.expense.view': 'View expenses',
  'finance.expense.create': 'Record expenses',
  'finance.expense.update': 'Edit expenses',
  'finance.expense.delete': 'Delete expenses',
  'finance.fund.view': 'View accounts and funds',
  'finance.fund.create': 'Create accounts',
  'finance.fund.update': 'Edit accounts',
  'finance.fund.delete': 'Delete accounts',
  'finance.pledge.view': 'View pledges',
  'finance.pledge.create': 'Create pledges',
  'finance.pledge.update': 'Update pledges',
  'finance.pledge.delete': 'Delete pledges',

  // HR & Payroll
  'hr.employee.view': 'View employees',
  'hr.employee.create': 'Add employees',
  'hr.employee.update': 'Edit employee records',
  'hr.employee.delete': 'Remove employees',
  'hr.leave.view': 'View leave requests',
  'hr.leave.create': 'Submit leave requests',
  'hr.leave.update': 'Edit leave requests',
  'hr.leave.delete': 'Delete leave requests',
  'hr.leave.manage': 'Approve or reject leave',
  'payroll.payroll.view': 'View payroll runs',
  'payroll.payroll.create': 'Create payroll runs',
  'payroll.payroll.update': 'Edit payroll runs',
  'payroll.payroll.delete': 'Delete payroll runs',
  'payroll.payroll.manage': 'Process and approve payroll',

  // Reports
  'reports.report.view': 'View and export reports',
};

/** Get a human-readable label for a permission key. */
export function permissionLabel(key: string): string {
  if (PERMISSION_LABELS[key]) return PERMISSION_LABELS[key];
  const parts = key.split('.');
  const action = parts[parts.length - 1] ?? key;
  const resource = parts.slice(1, -1).join(' ') || (parts[0] ?? 'resource');
  return `${action.charAt(0).toUpperCase()}${action.slice(1)} ${resource}`;
}
