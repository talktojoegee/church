'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { OverviewTab } from '@/components/finance/OverviewTab';
import { ContributionsTab } from '@/components/finance/ContributionsTab';
import { ExpensesTab } from '@/components/finance/ExpensesTab';
import { FundsTab } from '@/components/finance/FundsTab';
import { PledgesTab } from '@/components/finance/PledgesTab';
import { CategoriesTab } from '@/components/finance/CategoriesTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'contributions', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'funds', label: 'Accounts' },
  { id: 'pledges', label: 'Pledges' },
  { id: 'categories', label: 'Categories' },
];

export default function FinancePage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, [searchParams]);

  return (
    <div>
      <PageHeader title="Finance" description="Track giving, expenses, accounts and pledges." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'overview' && <OverviewTab />}
      {tab === 'contributions' && <ContributionsTab />}
      {tab === 'expenses' && <ExpensesTab />}
      {tab === 'funds' && <FundsTab />}
      {tab === 'pledges' && <PledgesTab />}
      {tab === 'categories' && <CategoriesTab />}
    </div>
  );
}
