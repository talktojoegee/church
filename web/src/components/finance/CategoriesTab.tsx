'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDefaultBranchId, useExpenseCategories, useGivingTypes } from '@/lib/hooks';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';

const SUB_TABS = [
  { id: 'giving-types', label: 'Income types' },
  { id: 'expense-categories', label: 'Expense categories' },
];

interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  _count?: { contributions?: number; expenses?: number };
}

export function CategoriesTab() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const branchId = useDefaultBranchId();
  const givingTypes = useGivingTypes(branchId);
  const expenseCategories = useExpenseCategories(branchId);
  const [subTab, setSubTab] = useState('giving-types');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const isGiving = subTab === 'giving-types';
  const canCreate = hasPermission(isGiving ? 'finance.contribution.create' : 'finance.expense.create');
  const canUpdate = hasPermission(isGiving ? 'finance.contribution.update' : 'finance.expense.update');
  const canDelete = hasPermission(isGiving ? 'finance.contribution.delete' : 'finance.expense.delete');

  const rows: CategoryRow[] = isGiving ? (givingTypes.data ?? []) : (expenseCategories.data ?? []);
  const loading = isGiving ? givingTypes.isLoading : expenseCategories.isLoading;
  const queryKey = isGiving ? 'giving-types' : 'expense-categories';
  const basePath = isGiving ? '/finance/giving-types' : '/finance/expense-categories';
  const countKey = isGiving ? 'contributions' : 'expenses';

  const save = useMutation({
    mutationFn: () => {
      if (editing) {
        return api.patch(`${basePath}/${editing.id}`, form);
      }
      return api.post(basePath, { ...form, branchId });
    },
    meta: {
      successMessage: editing ? 'Updated successfully' : 'Created successfully',
      errorMessage: 'Failed to save',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      setOpen(false);
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`${basePath}/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setForm({ name: row.name, description: row.description ?? '' });
    setOpen(true);
  };

  return (
    <div>
      <Tabs tabs={SUB_TABS} active={subTab} onChange={setSubTab} />

      <div className="mb-4 mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {isGiving
            ? 'Register income types used when recording giving.'
            : 'Register expense categories for tracking church spending.'}
        </p>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Add {isGiving ? 'type' : 'category'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader title={isGiving ? 'Income types' : 'Expense categories'} />
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Used in</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow colSpan={5} message="Loading…" />}
            {!loading && rows.length === 0 && (
              <EmptyRow colSpan={5} message={`No ${isGiving ? 'types' : 'categories'} yet.`} />
            )}
            {rows.map((row, i) => (
              <tr key={row.id}>
                <SerialTd index={i} />
                <Td className="font-medium text-slate-900">{row.name}</Td>
                <Td className="max-w-xs truncate text-slate-500">{row.description ?? '—'}</Td>
                <Td className="text-slate-500">{row._count?.[countKey] ?? 0} records</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          const used = (row._count?.[countKey] ?? 0) > 0;
                          const msg = used
                            ? 'This is used in existing records. Delete anyway?'
                            : 'Delete this item?';
                          if (confirm(msg)) del.mutate(row.id);
                        }}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${isGiving ? 'type' : 'category'}` : `Add ${isGiving ? 'type' : 'category'}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={isGiving ? 'Tithe, Offering…' : 'Utilities, Salaries…'}
            required
          />
          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
