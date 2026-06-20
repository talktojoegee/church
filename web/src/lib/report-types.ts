export type ReportType =
  | 'members'
  | 'groups'
  | 'follow-ups'
  | 'attendance'
  | 'events'
  | 'outreaches'
  | 'contributions'
  | 'expenses'
  | 'pledges'
  | 'employees'
  | 'leave'
  | 'payroll'
  | 'bulk-sms';

export interface ReportTypeConfig {
  id: ReportType;
  label: string;
  group: string;
  statusOptions?: { value: string; label: string }[];
  dateLabel?: string;
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: 'members',
    label: 'Members',
    group: 'People',
    statusOptions: [
      { value: 'VISITOR', label: 'Visitor' },
      { value: 'FIRST_TIMER', label: 'First timer' },
      { value: 'NEW_CONVERT', label: 'New convert' },
      { value: 'MEMBER', label: 'Member' },
      { value: 'WORKER', label: 'Worker' },
      { value: 'LEADER', label: 'Leader' },
      { value: 'INACTIVE', label: 'Inactive' },
    ],
    dateLabel: 'Joined date',
  },
  { id: 'groups', label: 'Groups', group: 'People' },
  {
    id: 'follow-ups',
    label: 'Follow-ups',
    group: 'People',
    statusOptions: [
      { value: 'OPEN', label: 'Open' },
      { value: 'IN_PROGRESS', label: 'In progress' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CLOSED', label: 'Closed' },
    ],
  },
  { id: 'attendance', label: 'Attendance', group: 'Engagement', dateLabel: 'Service date' },
  {
    id: 'events',
    label: 'Events',
    group: 'Engagement',
    statusOptions: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PUBLISHED', label: 'Published' },
      { value: 'CANCELLED', label: 'Cancelled' },
      { value: 'COMPLETED', label: 'Completed' },
    ],
    dateLabel: 'Event date',
  },
  {
    id: 'outreaches',
    label: 'Outreaches',
    group: 'Engagement',
    statusOptions: [
      { value: 'PLANNED', label: 'Planned' },
      { value: 'ONGOING', label: 'Ongoing' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
    dateLabel: 'Outreach date',
  },
  { id: 'contributions', label: 'Income', group: 'Finance', dateLabel: 'Income date' },
  { id: 'expenses', label: 'Expenses', group: 'Finance', dateLabel: 'Expense date' },
  {
    id: 'pledges',
    label: 'Pledges',
    group: 'Finance',
    statusOptions: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'FULFILLED', label: 'Fulfilled' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
  },
  {
    id: 'employees',
    label: 'Employees',
    group: 'HR & Payroll',
    statusOptions: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'ON_LEAVE', label: 'On leave' },
      { value: 'SUSPENDED', label: 'Suspended' },
      { value: 'TERMINATED', label: 'Terminated' },
    ],
  },
  {
    id: 'leave',
    label: 'Leave requests',
    group: 'HR & Payroll',
    statusOptions: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
    dateLabel: 'Leave start',
  },
  {
    id: 'payroll',
    label: 'Payroll runs',
    group: 'HR & Payroll',
    statusOptions: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PROCESSED', label: 'Processed' },
      { value: 'PAID', label: 'Paid' },
    ],
    dateLabel: 'Run date',
  },
  {
    id: 'bulk-sms',
    label: 'Bulk SMS',
    group: 'Communication',
    statusOptions: [
      { value: 'SENT', label: 'Sent' },
      { value: 'FAILED', label: 'Failed' },
    ],
    dateLabel: 'Message date',
  },
];

export const REPORT_GROUPS = [...new Set(REPORT_TYPES.map((r) => r.group))];

export function getReportConfig(type: ReportType) {
  return REPORT_TYPES.find((r) => r.id === type)!;
}

export function formatSummaryValue(key: string, value: number | string): string {
  if (typeof value === 'string') return value;
  const moneyKeys = ['totalAmount', 'totalCost', 'totalNet', 'pledged', 'fulfilled'];
  if (moneyKeys.includes(key)) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);
  }
  return String(value);
}

export const SUMMARY_LABELS: Record<string, string> = {
  total: 'Total records',
  activeMembers: 'Active members',
  activeGroups: 'Active groups',
  open: 'Open',
  sessions: 'Sessions',
  totalAttendance: 'Total attendance',
  average: 'Average',
  upcoming: 'Upcoming',
  totalSouls: 'Souls won',
  records: 'Records',
  totalAmount: 'Total amount',
  pledged: 'Total pledged',
  fulfilled: 'Total fulfilled',
  active: 'Active',
  pending: 'Pending',
  payRuns: 'Pay runs',
  totalNet: 'Total net pay',
  messages: 'Messages',
  totalCost: 'Total cost',
  totalRecipients: 'Total recipients',
};
