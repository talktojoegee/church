'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users, UserPlus, Star, Upload, Cross } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { MemberForm, emptyMember } from '@/components/members/MemberForm';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { PastorBadge } from '@/components/members/PastorBadge';
import { MemberCsvImport } from '@/components/members/MemberCsvImport';
import { MEMBER_STATUSES, STATUS_TONES, humanize } from '@/lib/constants';

interface MemberRow {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  pastoralRole: string;
  photoUrl: string | null;
  branch: { name: string };
}

export default function MembersPage() {
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [pastorsOnly, setPastorsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const membersQuery = useQuery({
    queryKey: ['members', { search, status, branchId, pastorsOnly, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: 15 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (branchId) params.branchId = branchId;
      if (pastorsOnly) params.pastorsOnly = 'true';
      return (await api.get('/members', { params })).data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['member-stats'],
    queryFn: async () => (await api.get('/members/stats')).data,
  });

  const rows: MemberRow[] = membersQuery.data?.data ?? [];
  const total = membersQuery.data?.total ?? 0;
  const totalPages = membersQuery.data?.totalPages ?? 1;

  const stats = statsQuery.data;
  const workerCount =
    stats?.byStatus
      ?.filter((s: any) => s.status === 'WORKER' || s.status === 'LEADER')
      .reduce((a: number, s: any) => a + s.count, 0) ?? 0;

  const pastorCount =
    stats?.byPastoralRole?.reduce((a: number, s: any) => {
      if (s.pastoralRole !== 'NONE') return a + s.count;
      return a;
    }, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Members"
        description="Your church directory of people."
        action={
          hasPermission('membership.member.create') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload size={16} /> Import CSV
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} /> Add Member
              </Button>
            </div>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Total Members"
          value={stats?.total ?? '—'}
          icon={<Users size={22} />}
          color="violet"
          active={!status && !pastorsOnly}
          onClick={() => {
            setStatus('');
            setPastorsOnly(false);
            setPage(1);
          }}
        />
        <ColorStatCard
          label="New This Month"
          value={stats?.newThisMonth ?? '—'}
          icon={<UserPlus size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Workers & Leaders"
          value={workerCount}
          icon={<Star size={22} />}
          color="amber"
          active={status === 'WORKER' || status === 'LEADER'}
          onClick={() => {
            setStatus('WORKER');
            setPastorsOnly(false);
            setPage(1);
          }}
        />
        <ColorStatCard
          label="Pastors"
          value={pastorCount || '—'}
          icon={<Cross size={22} />}
          color="rose"
          active={pastorsOnly}
          onClick={() => {
            setPastorsOnly((p) => !p);
            setStatus('');
            setPage(1);
          }}
        />
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(280px,1fr)_11rem_11rem]">
          <div className="relative w-full min-w-0">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Search by name, phone, email, ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="w-full"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPastorsOnly(false);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {MEMBER_STATUSES.map((s: any, i: number) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
          {(branches.data?.length ?? 0) > 1 && (
            <Select
              className="w-full"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All branches</option>
              {branches.data?.map((b: any, i: number) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Member</Th>
              <Th>ID</Th>
              <Th>Phone</Th>
              <Th>Branch</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {membersQuery.isLoading && <EmptyRow colSpan={6} message="Loading…" />}
            {!membersQuery.isLoading && rows.length === 0 && (
              <EmptyRow colSpan={6} message="No members found." />
            )}
            {rows.map((m, i: number) => (
              <tr key={m.id} className="cursor-pointer hover:bg-slate-50">
                <SerialTd page={page} pageSize={15} index={i} />
                <Td>
                  <Link href={`/members/${m.id}`} className="flex items-center gap-3">
                    <MemberAvatar
                      photoUrl={m.photoUrl}
                      firstName={m.firstName}
                      lastName={m.lastName}
                    />
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      {m.firstName} {m.lastName}
                      <PastorBadge role={m.pastoralRole} />
                    </span>
                  </Link>
                </Td>
                <Td>{m.membershipNumber ?? '—'}</Td>
                <Td>{m.phone ?? '—'}</Td>
                <Td className="text-slate-500">{m.branch?.name}</Td>
                <Td>
                  <Badge tone={STATUS_TONES[m.status] ?? 'gray'}>{humanize(m.status)}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total} member(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Member" size="xl">
        {open && (
          <MemberForm
            key="new-member"
            initial={emptyMember}
            onDone={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import members from CSV" size="lg">
        <MemberCsvImport onDone={() => setImportOpen(false)} />
      </Modal>
    </div>
  );
}
