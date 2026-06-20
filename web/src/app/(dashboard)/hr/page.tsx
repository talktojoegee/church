'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { EmployeesTab } from '@/components/hr/EmployeesTab';
import { LeaveTab } from '@/components/hr/LeaveTab';
import { PayrollTab } from '@/components/hr/PayrollTab';

const TABS = [
  { id: 'employees', label: 'Employees' },
  { id: 'leave', label: 'Leave' },
  { id: 'payroll', label: 'Payroll' },
];

export default function HrPage() {
  const [tab, setTab] = useState('employees');

  return (
    <div>
      <PageHeader title="HR & Payroll" description="Manage staff, leave and salary payments." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'employees' && <EmployeesTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'payroll' && <PayrollTab />}
    </div>
  );
}
