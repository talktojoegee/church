export const MEMBER_STATUSES = [
  'VISITOR',
  'FIRST_TIMER',
  'NEW_CONVERT',
  'MEMBER',
  'WORKER',
  'LEADER',
  'INACTIVE',
] as const;

export const PASTORAL_ROLES = ['NONE', 'PASTOR', 'ASSISTANT_PASTOR'] as const;

export const PASTORAL_LABELS: Record<string, string> = {
  NONE: 'None',
  PASTOR: 'Pastor',
  ASSISTANT_PASTOR: 'Asst. Pastor',
};

export const GENDERS = ['MALE', 'FEMALE'] as const;

export const MARITAL_STATUSES = [
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'SEPARATED',
] as const;

export const LIFE_EVENT_TYPES = [
  'BAPTISM',
  'HOLY_SPIRIT_BAPTISM',
  'MARRIAGE',
  'CHILD_DEDICATION',
  'NEW_BIRTH',
  'MEMBERSHIP_CLASS',
  'ORDINATION',
  'DEATH',
  'OTHER',
] as const;

export const STATUS_TONES: Record<string, 'green' | 'blue' | 'amber' | 'gray' | 'brand'> = {
  VISITOR: 'gray',
  FIRST_TIMER: 'amber',
  NEW_CONVERT: 'blue',
  MEMBER: 'green',
  WORKER: 'brand',
  LEADER: 'brand',
  INACTIVE: 'gray',
};

export const CONTRIBUTION_TYPES = [
  'TITHE',
  'OFFERING',
  'DONATION',
  'SEED',
  'FIRSTFRUIT',
  'BUILDING',
  'THANKSGIVING',
  'WELFARE',
  'MISSIONS',
  'OTHER',
] as const;

export const PAYMENT_METHODS = [
  'CASH',
  'TRANSFER',
  'CARD',
  'POS',
  'CHEQUE',
  'ONLINE',
  'OTHER',
] as const;

export const FINANCE_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'] as const;

export const FINANCE_ACCOUNT_TYPES = ['BANK', 'CASH', 'MOBILE_MONEY', 'OTHER'] as const;

export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VOLUNTEER'] as const;
export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'] as const;
export const LEAVE_TYPES = ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'COMPASSIONATE', 'STUDY', 'OTHER'] as const;
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export const EMPLOYEE_STATUS_TONES: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  ACTIVE: 'green',
  ON_LEAVE: 'amber',
  SUSPENDED: 'red',
  TERMINATED: 'gray',
};

export const LEAVE_STATUS_TONES: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
};

export const TESTIMONY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const;
export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const;
export const OUTREACH_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;

export const CONTENT_STATUS_TONES: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  ARCHIVED: 'gray',
  DRAFT: 'gray',
  PUBLISHED: 'green',
  CANCELLED: 'red',
  COMPLETED: 'blue',
  PLANNED: 'amber',
  ONGOING: 'blue',
  OPEN: 'amber',
  IN_PROGRESS: 'blue',
  CLOSED: 'gray',
  SENT: 'green',
  FAILED: 'red',
  QUEUED: 'amber',
};

export const FOLLOW_UP_TYPES = [
  'FIRST_TIMER',
  'ABSENTEE',
  'NEW_CONVERT',
  'PRAYER_REQUEST',
  'COUNSELING',
  'OTHER',
] as const;

export const FOLLOW_UP_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const;

export const FOLLOW_UP_RECIPIENT_STATUSES = ['PENDING', 'CONTACTED', 'COMPLETED', 'SKIPPED'] as const;

export const MESSAGE_CHANNELS = ['EMAIL', 'SMS'] as const;

/** Nigerian states + FCT + Others for outreach location filter */
export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
  'Others',
] as const;

export const DEPARTMENT_ROLES = ['HOD', 'ASSISTANT', 'SECRETARY', 'MEMBER'] as const;

export const DEPARTMENT_LEADERSHIP_ROLES = ['HOD', 'ASSISTANT', 'SECRETARY'] as const;

export const DEPARTMENT_ROLE_TONES: Record<string, 'brand' | 'blue' | 'amber' | 'gray'> = {
  HOD: 'brand',
  ASSISTANT: 'blue',
  SECRETARY: 'amber',
  MEMBER: 'gray',
};

export function humanize(value?: string | null): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
