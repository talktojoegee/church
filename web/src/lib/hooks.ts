import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { PublicBranding } from './branding';

export function useChurchBranding() {
  return useQuery({
    queryKey: ['church-branding'],
    queryFn: async () => (await api.get('/settings/public')).data as PublicBranding,
    staleTime: 5 * 60_000,
  });
}

export interface BranchOption {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
  isActive: boolean;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  _count?: {
    members: number;
    users: number;
    departments: number;
    groups?: number;
    events?: number;
    outreaches?: number;
    attendanceSessions?: number;
  };
}

export interface DepartmentOption {
  id: string;
  name: string;
  description?: string | null;
  leader?: { id: string; firstName: string; lastName: string } | null;
  parent?: { id: string; name: string } | null;
  _count?: { members: number; children: number };
}

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => (await api.get('/branches')).data as BranchOption[],
  });
}

export function useDepartments(branchId?: string) {
  return useQuery({
    queryKey: ['departments', branchId ?? 'all'],
    queryFn: async () =>
      (await api.get('/departments', { params: branchId ? { branchId } : {} }))
        .data as DepartmentOption[],
  });
}

export interface FundOption {
  id: string;
  name: string;
  code?: string | null;
  currency: string;
  accountType: string;
  bankName?: string | null;
  accountNumber?: string | null;
  openingBalance: number;
  openingBalanceDate?: string | null;
  isDefault: boolean;
  isActive: boolean;
  totalIn: number;
  totalOut: number;
  balance: number;
  dateFiltered?: boolean;
  branch?: { id: string; name: string };
}

export function useFunds(branchId?: string, dateRange?: { from?: string; to?: string }) {
  const from = dateRange?.from;
  const to = dateRange?.to;
  return useQuery({
    queryKey: ['funds', branchId ?? 'all', from ?? '', to ?? ''],
    queryFn: async () =>
      (
        await api.get('/finance/funds', {
          params: {
            ...(branchId ? { branchId } : {}),
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
          },
        })
      ).data as FundOption[],
  });
}

/** Active default account for the branch (falls back to first account). */
export function useDefaultFundId(branchId?: string) {
  const funds = useFunds(branchId);
  const defaultFund =
    funds.data?.find((f) => f.isDefault && f.isActive) ??
    funds.data?.find((f) => f.isActive) ??
    funds.data?.[0];
  return defaultFund?.id ?? '';
}

export function useGivingTypes(branchId?: string) {
  return useQuery({
    queryKey: ['giving-types', branchId ?? 'all'],
    queryFn: async () =>
      (await api.get('/finance/giving-types', { params: branchId ? { branchId } : {} })).data,
  });
}

export function useExpenseCategories(branchId?: string) {
  return useQuery({
    queryKey: ['expense-categories', branchId ?? 'all'],
    queryFn: async () =>
      (await api.get('/finance/expense-categories', { params: branchId ? { branchId } : {} }))
        .data,
  });
}

export function useDefaultBranchId() {
  const branches = useBranches();
  const main = branches.data?.find((b) => b.isMain) ?? branches.data?.[0];
  return main?.id ?? '';
}

/** Branch id + API params for queries that should wait until branches are loaded. */
export function useBranchQueryContext() {
  const branches = useBranches();
  const branchId = useDefaultBranchId();
  return {
    branchId,
    params: branchId ? { branchId } : {},
    queryEnabled: branches.isSuccess,
  };
}
