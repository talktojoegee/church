'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  Plane,
  Wallet,
  Sliders,
  Search,
  Filter,
  X,
  Eye,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches, useDefaultBranchId } from '@/lib/hooks';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_TONES,
  EMPLOYMENT_TYPES,
  humanize,
} from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { UserSelect } from '@/components/users/UserSelect';

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string | null;
  employmentType: string;
  status: string;
  baseSalary: string;
  branch: { name: string };
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Component {
  name: string;
  type: 'ALLOWANCE' | 'DEDUCTION';
  amount: number;
  isPercentage: boolean;
}

const emptyFilters = { search: '', status: '', employmentType: '' };

function buildParams(filters: typeof emptyFilters, branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.status) params.status = filters.status;
  if (filters.employmentType) params.employmentType = filters.employmentType;
  return params;
}

export function EmployeesTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = useDefaultBranchId();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [compFor, setCompFor] = useState<Employee | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState('');

  const blank = {
    firstName: '',
    lastName: '',
    branchId,
    email: '',
    phone: '',
    position: '',
    department: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    hireDate: '',
    baseSalary: '',
    bankName: '',
    bankAccountNo: '',
    bankAccountName: '',
    userId: '',
  };
  const [form, setForm] = useState(blank);

  const params = buildParams(filters, branchId);

  const statsQuery = useQuery({
    queryKey: ['hr-stats', params],
    queryFn: async () => (await api.get('/hr/employees/stats', { params })).data,
  });
  const listQuery = useQuery({
    queryKey: ['employees', params],
    queryFn: async () => (await api.get('/hr/employees', { params })).data as Employee[],
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        ...form,
        baseSalary: Number(form.baseSalary || 0),
        branchId: branchId || form.branchId,
        userId: form.userId || null,
      };
      if (!payload.hireDate) delete payload.hireDate;
      if (editing) {
        delete payload.branchId;
        return api.patch(`/hr/employees/${editing.id}`, payload);
      }
      return api.post('/hr/employees', payload);
    },
    meta: {
      successMessage: editing ? 'Employee updated' : 'Employee created',
      errorMessage: 'Failed to save employee',
    },
    onSuccess: () => {
      ['employees', 'hr-stats', 'employees-linked-users'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
      setOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/employees/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => ['employees', 'hr-stats'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });

  const saveComponents = useMutation({
    mutationFn: () => api.put(`/hr/employees/${compFor!.id}/components`, { components }),
    meta: { successMessage: 'Salary components saved', errorMessage: 'Failed to save salary components' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setCompFor(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, branchId });
    setOpen(true);
  };
  const openEdit = async (e: Employee) => {
    const detail = (await api.get(`/hr/employees/${e.id}`)).data;
    setEditing(e);
    setForm({
      firstName: detail.firstName,
      lastName: detail.lastName,
      branchId: '',
      email: detail.email ?? '',
      phone: detail.phone ?? '',
      position: detail.position ?? '',
      department: detail.department ?? '',
      employmentType: detail.employmentType,
      status: detail.status,
      hireDate: detail.hireDate ? String(detail.hireDate).slice(0, 10) : '',
      baseSalary: String(detail.baseSalary),
      bankName: detail.bankName ?? '',
      bankAccountNo: detail.bankAccountNo ?? '',
      bankAccountName: detail.bankAccountName ?? '',
      userId: detail.user?.id ?? '',
    });
    setOpen(true);
  };
  const openComponents = async (e: Employee) => {
    const detail = (await api.get(`/hr/employees/${e.id}`)).data;
    setComponents(
      detail.components.map((c: Component) => ({
        name: c.name,
        type: c.type,
        amount: Number(c.amount),
        isPercentage: c.isPercentage,
      })),
    );
    setCompFor(e);
  };

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));
  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters = filters.search || filters.status || filters.employmentType;
  const s = statsQuery.data;
  const list = listQuery.data ?? [];

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ColorStatCard
          label="Total Employees"
          value={s?.totalEmployees ?? '—'}
          icon={<Users size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Active"
          value={s?.active ?? '—'}
          hint="Currently working"
          icon={<UserCheck size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="On Leave"
          value={s?.onLeave ?? '—'}
          icon={<Plane size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="Pending Leave"
          value={s?.pendingLeave ?? '—'}
          hint="Awaiting approval"
          icon={<Clock size={22} />}
          color="rose"
        />
        <ColorStatCard
          label="Monthly Base"
          value={formatCurrency(s?.monthlyBaseTotal ?? 0)}
          hint="Combined base salary"
          icon={<Wallet size={22} />}
          color="blue"
        />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-sm">
        <div className="border-b border-violet-100/80 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Filter size={18} /> Filters
          </h3>
          <p className="mt-0.5 text-sm text-white/80">Search by name, ID, position, or filter by status</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Name, employee ID, position…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                  />
                </div>
                <Button type="button" onClick={applySearch}>
                  Search
                </Button>
              </div>
            </div>
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All statuses</option>
              {EMPLOYEE_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Select
              label="Employment type"
              value={filters.employmentType}
              onChange={(e) => setFilters((f) => ({ ...f, employmentType: e.target.value }))}
            >
              <option value="">All types</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {filters.search && <Badge tone="brand">Search: {filters.search}</Badge>}
              {filters.status && <Badge tone="blue">{humanize(filters.status)}</Badge>}
              {filters.employmentType && <Badge tone="green">{humanize(filters.employmentType)}</Badge>}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X size={14} /> Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        {hasPermission('hr.employee.create') && (
          <Button onClick={openCreate}>
            <Plus size={16} /> New Employee
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Employee</Th>
              <Th>ID</Th>
              <Th>Position</Th>
              <Th>System user</Th>
              <Th>Type</Th>
              <Th>Base Salary</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={9} message="Loading…" />}
            {!listQuery.isLoading && list.length === 0 && (
              <EmptyRow colSpan={9} message="No employees match your filters." />
            )}
            {list.map((e, i) => (
              <tr key={e.id} className="group">
                <SerialTd index={i} />
                <Td>
                  <Link
                    href={`/hr/employees/${e.id}`}
                    className="font-medium text-slate-900 hover:text-violet-700"
                  >
                    {e.firstName} {e.lastName}
                  </Link>
                </Td>
                <Td className="font-mono text-xs">{e.employeeNumber}</Td>
                <Td className="text-slate-500">{e.position ?? '—'}</Td>
                <Td className="text-slate-500">
                  {e.user ? (
                    <span className="text-sm text-violet-700">{e.user.email}</span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="text-slate-500">{humanize(e.employmentType)}</Td>
                <Td>{formatCurrency(Number(e.baseSalary))}</Td>
                <Td>
                  <Badge tone={EMPLOYEE_STATUS_TONES[e.status] ?? 'gray'}>{humanize(e.status)}</Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/hr/employees/${e.id}`}
                      title="View profile"
                      className="rounded p-1.5 text-violet-500 hover:bg-violet-50 hover:text-violet-700"
                    >
                      <Eye size={15} />
                    </Link>
                    {hasPermission('hr.employee.update') && (
                      <>
                        <button
                          title="Salary components"
                          onClick={() => openComponents(e)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Sliders size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={15} />
                        </button>
                      </>
                    )}
                    {hasPermission('hr.employee.delete') && (
                      <button
                        onClick={() => {
                          if (confirm('Delete employee?')) del.mutate(e.id);
                        }}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Employee' : 'New Employee'} size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <UserSelect
            label="System user"
            value={form.userId}
            exceptEmployeeId={editing?.id}
            onChange={(userId, user) => {
              setForm((current) => ({
                ...current,
                userId,
                firstName: current.firstName || user?.firstName || '',
                lastName: current.lastName || user?.lastName || '',
                email: current.email || user?.email || '',
                phone: current.phone || user?.phone || '',
              }));
            }}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
            <Input
              label="Position"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
            <Select
              label="Employment type"
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Input
              label="Base salary (monthly)"
              type="number"
              step="0.01"
              min={0}
              value={form.baseSalary}
              onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {EMPLOYEE_STATUSES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Hire date"
              type="date"
              value={form.hireDate}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            />
            {!editing && (branches.data?.length ?? 0) > 1 && (
              <Select
                label="Branch"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                required
              >
                {branches.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <Input
              label="Bank name"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
            <Input
              label="Account number"
              value={form.bankAccountNo}
              onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!compFor}
        onClose={() => setCompFor(null)}
        title={`Salary Components · ${compFor?.firstName ?? ''}`}
        size="lg"
      >
        {compFor && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Base salary: {formatCurrency(Number(compFor.baseSalary))}. Deductions are recorded as
              repayments when payroll is marked paid.
            </p>
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Name (e.g. Housing)"
                    value={c.name}
                    onChange={(e) =>
                      setComponents((cs) =>
                        cs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                  <Select
                    className="w-32"
                    value={c.type}
                    onChange={(e) =>
                      setComponents((cs) =>
                        cs.map((x, j) =>
                          j === i ? { ...x, type: e.target.value as Component['type'] } : x,
                        ),
                      )
                    }
                  >
                    <option value="ALLOWANCE">Allowance</option>
                    <option value="DEDUCTION">Deduction</option>
                  </Select>
                  <Input
                    className="w-28"
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={c.amount}
                    onChange={(e) =>
                      setComponents((cs) =>
                        cs.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)),
                      )
                    }
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={c.isPercentage}
                      onChange={(e) =>
                        setComponents((cs) =>
                          cs.map((x, j) => (j === i ? { ...x, isPercentage: e.target.checked } : x)),
                        )
                      }
                    />{' '}
                    %
                  </label>
                  <button
                    onClick={() => setComponents((cs) => cs.filter((_, j) => j !== i))}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setComponents((cs) => [...cs, { name: '', type: 'ALLOWANCE', amount: 0, isPercentage: false }])
              }
            >
              <Plus size={14} /> Add component
            </Button>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setCompFor(null)}>
                Cancel
              </Button>
              <Button loading={saveComponents.isPending} onClick={() => saveComponents.mutate()}>
                Save components
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
