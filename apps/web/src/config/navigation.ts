import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ScrollText,
  Building2,
  UserSquare2,
  CalendarCheck,
  Wallet,
  Briefcase,
  Mic2,
  HeartHandshake,
  Megaphone,
  PhoneCall,
  BarChart3,
  Settings,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Any-of permission keys required to see this item (empty = always). */
  permissions: string[];
  enabled: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permissions: [], enabled: true },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Members', href: '/members', icon: UserSquare2, permissions: ['membership.member.view'], enabled: true },
      { label: 'Departments', href: '/departments', icon: Users, permissions: ['org.department.view'], enabled: true },
      { label: 'Groups', href: '/groups', icon: Users, permissions: ['membership.group.view'], enabled: true },
      { label: 'Follow-up', href: '/follow-up', icon: PhoneCall, permissions: ['membership.followup.view'], enabled: true },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck, permissions: ['engagement.attendance.view'], enabled: true },
      { label: 'Events', href: '/events', icon: CalendarCheck, permissions: ['engagement.event.view'], enabled: true },
      { label: 'Sermons', href: '/sermons', icon: Mic2, permissions: ['content.sermon.view'], enabled: true },
      { label: 'Testimonies', href: '/testimonies', icon: HeartHandshake, permissions: ['content.testimony.view'], enabled: true },
      { label: 'Outreaches', href: '/outreaches', icon: Megaphone, permissions: ['content.outreach.view'], enabled: true },
      { label: 'Website', href: '/website', icon: Globe, permissions: ['content.website.view'], enabled: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Finance', href: '/finance', icon: Wallet, permissions: ['finance.contribution.view'], enabled: true },
      { label: 'HR & Payroll', href: '/hr', icon: Briefcase, permissions: ['hr.employee.view'], enabled: true },
      { label: 'Communication', href: '/communication', icon: Megaphone, permissions: ['comms.message.view'], enabled: true },
      { label: 'Reports', href: '/reports', icon: BarChart3, permissions: ['reports.report.view'], enabled: true },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Branches', href: '/branches', icon: Building2, permissions: ['org.branch.view'], enabled: true },
      { label: 'Users', href: '/users', icon: Users, permissions: ['access.user.view'], enabled: true },
      { label: 'Roles', href: '/roles', icon: ShieldCheck, permissions: ['access.role.view'], enabled: true },
      { label: 'Audit Trail', href: '/audit', icon: ScrollText, permissions: ['system.audit.view'], enabled: true },
      { label: 'Settings', href: '/settings', icon: Settings, permissions: ['org.settings.view'], enabled: true },
    ],
  },
];
