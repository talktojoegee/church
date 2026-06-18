import '../../models/auth_user.dart';

/// Permission keys aligned with `packages/shared/src/permissions.ts`.
abstract final class Perm {
  static const memberCreate = 'membership.member.create';
  static const memberUpdate = 'membership.member.update';
  static const groupCreate = 'membership.group.create';
  static const groupUpdate = 'membership.group.update';
  static const followupCreate = 'membership.followup.create';
  static const attendanceCreate = 'engagement.attendance.create';
  static const attendanceUpdate = 'engagement.attendance.update';
  static const eventCreate = 'engagement.event.create';
  static const eventUpdate = 'engagement.event.update';
  static const sermonCreate = 'content.sermon.create';
  static const sermonUpdate = 'content.sermon.update';
  static const testimonyCreate = 'content.testimony.create';
  static const testimonyManage = 'content.testimony.manage';
  static const outreachCreate = 'content.outreach.create';
  static const outreachUpdate = 'content.outreach.update';
  static const contributionCreate = 'finance.contribution.create';
  static const expenseCreate = 'finance.expense.create';
  static const auditView = 'system.audit.view';
}

bool canAccess(AuthUser? user, String permission) {
  if (user == null) return false;
  if (user.isSuperAdmin) return true;
  return user.permissions.contains(permission);
}
