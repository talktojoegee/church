'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranchQueryContext } from '@/lib/hooks';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

export function BulkSmsPhoneGroupsTab() {
  const qc = useQueryClient();
  const { branchId, params, queryEnabled } = useBranchQueryContext();
  const { hasPermission } = useAuth();
  const [editing, setEditing] = useState<{ id: string; name: string; phoneNumbers: string } | null>(null);
  const [form, setForm] = useState({ name: '', phoneNumbers: '' });

  const groupsQuery = useQuery({
    queryKey: ['bulksms-groups', branchId],
    queryFn: async () => (await api.get('/bulksms/phone-groups', { params })).data,
    enabled: queryEnabled,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, ...(branchId ? { branchId } : {}) };
      return editing
        ? api.patch(`/bulksms/phone-groups/${editing.id}`, form)
        : api.post('/bulksms/phone-groups', payload);
    },
    meta: {
      successMessage: editing ? 'Group updated' : 'Group created',
      errorMessage: 'Failed to save group',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulksms-groups'] });
      setForm({ name: '', phoneNumbers: '' });
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/bulksms/phone-groups/${id}`),
    meta: { successMessage: 'Group deleted', errorMessage: 'Failed to delete' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bulksms-groups'] }),
  });

  const rows = groupsQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {hasPermission('comms.bulksms.manage') && (
        <Card>
          <CardHeader title={editing ? 'Edit Phone Group' : 'Create Phone Group'} />
          <CardBody>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-4"
            >
              <Input
                label="Group Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Marketing Contacts"
                required
              />
              <Textarea
                label="Phone Numbers"
                value={form.phoneNumbers}
                onChange={(e) => setForm({ ...form, phoneNumbers: e.target.value })}
                rows={5}
                placeholder="Enter numbers separated by comma"
                required
              />
              <div className="flex gap-2">
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      setForm({ name: '', phoneNumbers: '' });
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" loading={save.isPending} className="flex-1">
                  {editing ? 'Update Group' : 'Create Group'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className={hasPermission('comms.bulksms.manage') ? 'lg:col-span-2' : 'lg:col-span-3'}>
        <CardHeader title={`Manage Phone Groups — ${rows.length} group(s)`} />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Group Name</Th>
                <Th>Contacts</Th>
                <Th>Created</Th>
                {hasPermission('comms.bulksms.manage') && <Th></Th>}
              </tr>
            </thead>
            <tbody>
              {groupsQuery.isLoading && <EmptyRow colSpan={5} message="Loading…" />}
              {!groupsQuery.isLoading && rows.length === 0 && (
                <EmptyRow colSpan={5} message="No phone groups yet." />
              )}
              {rows.map((g: { id: string; name: string; contactCount: number; phoneNumbers: string; createdAt: string }, i: number) => (
                <tr key={g.id}>
                  <SerialTd index={i} />
                  <Td className="font-medium">{g.name}</Td>
                  <Td>{g.contactCount}</Td>
                  <Td>{formatDate(g.createdAt)}</Td>
                  {hasPermission('comms.bulksms.manage') && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({ id: g.id, name: g.name, phoneNumbers: g.phoneNumbers });
                            setForm({ name: g.name, phoneNumbers: g.phoneNumbers });
                          }}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this group?')) del.mutate(g.id);
                          }}
                          className="rounded p-1.5 text-rose-400 hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
