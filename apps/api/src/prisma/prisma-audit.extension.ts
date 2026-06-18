import { Prisma } from '@prisma/client';
import type { AuditContextService } from '../audit/audit-context.service';
import type { AuditLogInput } from '../audit/audit.service';

const MUTATIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

/** Models excluded from automatic audit (avoid loops / session noise). */
const SKIP_MODELS = new Set(['AuditLog', 'RefreshToken']);

const MODEL_MAP: Record<string, { module: string; resource: string }> = {
  Church: { module: 'org', resource: 'church' },
  Branch: { module: 'org', resource: 'branch' },
  Setting: { module: 'org', resource: 'setting' },
  Department: { module: 'org', resource: 'department' },
  DepartmentAnnouncement: { module: 'org', resource: 'department_announcement' },
  User: { module: 'access', resource: 'user' },
  Role: { module: 'access', resource: 'role' },
  Permission: { module: 'access', resource: 'permission' },
  UserRole: { module: 'access', resource: 'user_role' },
  RolePermission: { module: 'access', resource: 'role_permission' },
  Household: { module: 'membership', resource: 'household' },
  Member: { module: 'membership', resource: 'member' },
  MemberDepartment: { module: 'membership', resource: 'member_department' },
  MemberLifeEvent: { module: 'membership', resource: 'member_life_event' },
  Group: { module: 'membership', resource: 'group' },
  GroupMember: { module: 'membership', resource: 'group_member' },
  GroupActivity: { module: 'membership', resource: 'group_activity' },
  GroupMeeting: { module: 'membership', resource: 'group_meeting' },
  GroupMeetingAttendance: { module: 'membership', resource: 'group_meeting_attendance' },
  GroupAnnouncement: { module: 'membership', resource: 'group_announcement' },
  FollowUp: { module: 'membership', resource: 'followup' },
  FollowUpCampaign: { module: 'membership', resource: 'followup_campaign' },
  FollowUpRecipient: { module: 'membership', resource: 'followup_recipient' },
  FollowUpInteraction: { module: 'membership', resource: 'followup_interaction' },
  FollowUpCampaignAssignee: { module: 'membership', resource: 'followup_assignee' },
  AttendanceSession: { module: 'engagement', resource: 'attendance' },
  AttendanceRecord: { module: 'engagement', resource: 'attendance_record' },
  Event: { module: 'engagement', resource: 'event' },
  EventRegistration: { module: 'engagement', resource: 'event_registration' },
  Sermon: { module: 'content', resource: 'sermon' },
  SermonSeries: { module: 'content', resource: 'sermon_series' },
  Testimony: { module: 'content', resource: 'testimony' },
  TestimonyCategory: { module: 'content', resource: 'testimony_category' },
  Outreach: { module: 'content', resource: 'outreach' },
  OutreachImage: { module: 'content', resource: 'outreach_image' },
  OutreachType: { module: 'content', resource: 'outreach_type' },
  Fund: { module: 'finance', resource: 'fund' },
  GivingType: { module: 'finance', resource: 'giving_type' },
  ExpenseCategory: { module: 'finance', resource: 'expense_category' },
  Contribution: { module: 'finance', resource: 'contribution' },
  Expense: { module: 'finance', resource: 'expense' },
  Pledge: { module: 'finance', resource: 'pledge' },
  Employee: { module: 'hr', resource: 'employee' },
  SalaryComponent: { module: 'hr', resource: 'salary_component' },
  LeaveRequest: { module: 'hr', resource: 'leave' },
  PayRun: { module: 'payroll', resource: 'payroll' },
  PayrollPeriodAdjustment: { module: 'payroll', resource: 'period_adjustment' },
  Payslip: { module: 'payroll', resource: 'payslip' },
  MessageTemplate: { module: 'comms', resource: 'template' },
  Message: { module: 'comms', resource: 'message' },
  MessageRecipient: { module: 'comms', resource: 'message_recipient' },
  SmsWallet: { module: 'comms', resource: 'sms_wallet' },
  SmsWalletTransaction: { module: 'comms', resource: 'sms_wallet_transaction' },
  SmsPhoneGroup: { module: 'comms', resource: 'phone_group' },
  SmsSenderId: { module: 'comms', resource: 'sender_id' },
  BulkSmsMessage: { module: 'comms', resource: 'bulksms' },
  BulkSmsSchedule: { module: 'comms', resource: 'bulksms_schedule' },
};

const SENSITIVE_KEYS = new Set([
  'passwordHash',
  'password',
  'token',
  'refreshToken',
  'accessToken',
]);

function operationVerb(operation: string): 'create' | 'update' | 'delete' {
  if (operation === 'create' || operation === 'createMany') return 'create';
  if (operation === 'delete' || operation === 'deleteMany') return 'delete';
  return 'update';
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[nested]';
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

function extractEntityId(operation: string, args: any, result: any): string | undefined {
  if (operation.endsWith('Many')) {
    if (typeof result?.count === 'number') return undefined;
    return undefined;
  }
  if (result?.id && typeof result.id === 'string') return result.id;
  const whereId = args?.where?.id;
  if (typeof whereId === 'string') return whereId;
  return undefined;
}

function buildMetadata(operation: string, args: any, result: any): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = { operation };

  if (operation.endsWith('Many') && typeof result?.count === 'number') {
    meta.count = result.count;
  }

  if (args?.data) meta.data = sanitize(args.data);
  else if (args?.create) meta.create = sanitize(args.create);
  else if (args?.update) meta.update = sanitize(args.update);

  if (result?.amount !== undefined) meta.amount = Number(result.amount);
  if (result?.receiptNumber) meta.receiptNumber = result.receiptNumber;
  if (result?.email) meta.email = result.email;
  if (result?.name) meta.name = result.name;
  if (result?.title) meta.title = result.title;

  return Object.keys(meta).length > 1 ? meta : meta.count !== undefined ? meta : undefined;
}

function fallbackMapping(model: string) {
  const resource = model.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  return { module: resource.split('_')[0] ?? 'system', resource };
}

function shouldSkipAudit(model: string, operation: string, args: any): boolean {
  if (model === 'User' && operation === 'update') {
    const data = args?.data;
    if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 1 && keys[0] === 'lastLoginAt') return true;
    }
  }
  return false;
}

export function createPrismaAuditExtension(
  auditContext: AuditContextService,
  writeAudit: (input: AuditLogInput) => Promise<void>,
) {
  return Prisma.defineExtension({
    name: 'auditTrail',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);

          if (!MUTATIONS.has(operation) || SKIP_MODELS.has(model) || shouldSkipAudit(model, operation, args)) {
            return result;
          }

          const mapping = MODEL_MAP[model] ?? fallbackMapping(model);
          const verb = operationVerb(operation);
          const action = `${mapping.module}.${mapping.resource}.${verb}`;
          const ctx = auditContext.get();

          const input: AuditLogInput = {
            userId: ctx?.userId,
            ipAddress: ctx?.ipAddress,
            action,
            entityType: mapping.resource,
            entityId: extractEntityId(operation, args, result),
            metadata: buildMetadata(operation, args, result),
          };

          void writeAudit(input).catch(() => undefined);

          return result;
        },
      },
    },
  });
}
