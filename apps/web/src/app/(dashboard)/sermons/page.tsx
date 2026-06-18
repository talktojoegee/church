'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Mic2,
  Search,
  Filter,
  X,
  BookOpen,
  Radio,
  FileText,
  Play,
  Eye,
  ListMusic,
  Headphones,
  ChevronDown,
} from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranches, useDefaultBranchId } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { formatDate, cn } from '@/lib/utils';

interface SermonSeries {
  id: string;
  name: string;
  description: string | null;
  _count?: { sermons: number };
}

interface Sermon {
  id: string;
  title: string;
  speaker: string | null;
  seriesId: string | null;
  sermonSeries?: { id: string; name: string } | null;
  scripture: string | null;
  summary: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  preachedAt: string | null;
  isPublished: boolean;
  branch?: { name: string };
}

interface PlaylistSeries extends SermonSeries {
  sermons: Array<{
    id: string;
    title: string;
    speaker: string | null;
    preachedAt: string | null;
    audioUrl: string | null;
    videoUrl: string | null;
    isPublished: boolean;
  }>;
}

const PAGE_TABS = [
  { id: 'sermons', label: 'Sermons' },
  { id: 'series', label: 'Series' },
];

const emptyFilters = {
  title: '',
  search: '',
  seriesId: '',
  startDate: '',
  endDate: '',
};

function buildParams(filters: typeof emptyFilters, branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  if (filters.title.trim()) params.title = filters.title.trim();
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.seriesId) params.seriesId = filters.seriesId;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  return params;
}

export default function SermonsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = useDefaultBranchId();
  const [tab, setTab] = useState('sermons');
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [editing, setEditing] = useState<Sermon | null>(null);
  const [editingSeries, setEditingSeries] = useState<SermonSeries | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [titleInput, setTitleInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [seriesForm, setSeriesForm] = useState({ name: '', description: '' });

  const blank = {
    branchId,
    title: '',
    speaker: '',
    seriesId: '',
    scripture: '',
    summary: '',
    audioUrl: '',
    videoUrl: '',
    preachedAt: '',
    isPublished: false,
  };
  const [form, setForm] = useState(blank);

  const queryParams = useMemo(
    () => buildParams(filters, branchId || undefined),
    [filters, branchId],
  );

  const seriesQuery = useQuery({
    queryKey: ['sermon-series', branchId],
    queryFn: async () =>
      (await api.get('/sermon-series', { params: { branchId } })).data as SermonSeries[],
    enabled: !!branchId,
  });

  const playlistsQuery = useQuery({
    queryKey: ['sermon-playlists', branchId],
    queryFn: async () =>
      (await api.get('/sermon-series/playlists', { params: { branchId } })).data as PlaylistSeries[],
    enabled: !!branchId,
  });

  const listQuery = useQuery({
    queryKey: ['sermons', queryParams],
    queryFn: async () => (await api.get('/sermons', { params: queryParams })).data as Sermon[],
  });

  const statsQuery = useQuery({
    queryKey: ['sermons-stats', queryParams],
    queryFn: async () => (await api.get('/sermons/stats', { params: queryParams })).data,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['sermons'] });
    qc.invalidateQueries({ queryKey: ['sermons-stats'] });
    qc.invalidateQueries({ queryKey: ['sermon-series'] });
    qc.invalidateQueries({ queryKey: ['sermon-playlists'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { ...form, branchId: branchId || form.branchId };
      if (!payload.preachedAt) delete payload.preachedAt;
      if (!payload.seriesId) payload.seriesId = '';
      if (editing) {
        delete payload.branchId;
        return api.patch(`/sermons/${editing.id}`, payload);
      }
      return api.post('/sermons', payload);
    },
    meta: {
      successMessage: editing ? 'Sermon updated' : 'Sermon created',
      errorMessage: 'Failed to save sermon',
    },
    onSuccess: () => {
      invalidateAll();
      setOpen(false);
    },
  });

  const saveSeries = useMutation({
    mutationFn: () => {
      const payload = { ...seriesForm, branchId: branchId! };
      if (editingSeries) return api.patch(`/sermon-series/${editingSeries.id}`, seriesForm);
      return api.post('/sermon-series', payload);
    },
    meta: {
      successMessage: editingSeries ? 'Series updated' : 'Series registered',
      errorMessage: 'Failed to save series',
    },
    onSuccess: () => {
      invalidateAll();
      setEditingSeries(null);
      setSeriesForm({ name: '', description: '' });
      setSeriesOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/sermons/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: invalidateAll,
  });

  const delSeries = useMutation({
    mutationFn: (id: string) => api.delete(`/sermon-series/${id}`),
    meta: { successMessage: 'Series deleted', errorMessage: 'Failed to delete series' },
    onSuccess: invalidateAll,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, branchId });
    setOpen(true);
  };

  const openEdit = (s: Sermon) => {
    setEditing(s);
    setForm({
      branchId: '',
      title: s.title,
      speaker: s.speaker ?? '',
      seriesId: s.seriesId ?? s.sermonSeries?.id ?? '',
      scripture: s.scripture ?? '',
      summary: s.summary ?? '',
      audioUrl: s.audioUrl ?? '',
      videoUrl: s.videoUrl ?? '',
      preachedAt: s.preachedAt?.slice(0, 10) ?? '',
      isPublished: s.isPublished,
    });
    setOpen(true);
  };

  const openSeriesModal = () => {
    setEditingSeries(null);
    setSeriesForm({ name: '', description: '' });
    setSeriesOpen(true);
  };

  const openSeriesCreate = () => {
    openSeriesModal();
    setTab('series');
  };

  const openSeriesEdit = (s: SermonSeries) => {
    setEditingSeries(s);
    setSeriesForm({ name: s.name, description: s.description ?? '' });
    setSeriesOpen(true);
  };

  const editId = searchParams.get('edit');
  const editQuery = useQuery({
    queryKey: ['sermon', editId],
    queryFn: async () => (await api.get(`/sermons/${editId}`)).data as Sermon,
    enabled: !!editId,
  });

  useEffect(() => {
    if (!editId || !editQuery.data) return;
    openEdit(editQuery.data);
    router.replace('/sermons');
  }, [editId, editQuery.data]);

  const applyTitle = () => setFilters((f) => ({ ...f, title: titleInput }));
  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));
  const clearFilters = () => {
    setTitleInput('');
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters =
    filters.title || filters.search || filters.seriesId || filters.startDate || filters.endDate;

  const toggleSeries = (id: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const list = listQuery.data ?? [];
  const stats = statsQuery.data;
  const seriesList = seriesQuery.data ?? [];
  const playlists = playlistsQuery.data ?? [];

  const sermonsBySeriesId = useMemo(() => {
    const map = new Map<string, PlaylistSeries['sermons']>();
    for (const pl of playlists) map.set(pl.id, pl.sermons);
    return map;
  }, [playlists]);

  return (
    <div>
      <PageHeader
        title="Sermons"
        description="Archive of messages, audio and notes."
        action={
          tab === 'sermons' && hasPermission('content.sermon.create') ? (
            <Button onClick={openCreate}>
              <Plus size={16} /> New Sermon
            </Button>
          ) : tab === 'series' && hasPermission('content.sermon.create') ? (
            <Button onClick={openSeriesCreate}>
              <Plus size={16} /> New Series
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Total sermons"
          value={stats?.total ?? '—'}
          icon={<Mic2 size={22} />}
          color="indigo"
        />
        <ColorStatCard
          label="Published"
          value={stats?.published ?? '—'}
          hint={`${stats?.drafts ?? 0} drafts`}
          icon={<BookOpen size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="With media"
          value={stats?.withMedia ?? '—'}
          hint="Audio or video attached"
          icon={<Radio size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Series"
          value={stats?.series ?? '—'}
          hint="Registered sermon series"
          icon={<FileText size={22} />}
          color="amber"
        />
      </div>

      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

      {tab === 'sermons' && (
        <>
      <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/20">
        <div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-600 to-sky-600 px-5 py-4 dark:border-indigo-900/50">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <Filter size={18} /> Filters
          </h3>
          <p className="mt-0.5 text-sm text-white/80">Filter by title, speaker, series, and date</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Title
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Filter by sermon title…"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyTitle()}
                  />
                </div>
                <Button type="button" onClick={applyTitle}>
                  Apply
                </Button>
              </div>
            </div>
            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Speaker / scripture
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Speaker, scripture…"
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
              label="Series"
              value={filters.seriesId}
              onChange={(e) => setFilters({ ...filters, seriesId: e.target.value })}
            >
              <option value="">All series</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="From date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="To date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {filters.title && <Badge tone="brand">Title: {filters.title}</Badge>}
              {filters.search && <Badge tone="blue">Search: {filters.search}</Badge>}
              {filters.seriesId && (
                <Badge tone="brand">
                  Series: {seriesList.find((s) => s.id === filters.seriesId)?.name ?? 'Selected'}
                </Badge>
              )}
              {filters.startDate && (
                <Badge tone="gray">From {formatDate(filters.startDate)}</Badge>
              )}
              {filters.endDate && <Badge tone="gray">To {formatDate(filters.endDate)}</Badge>}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
              >
                <X size={12} /> Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader
          title="All sermons"
          description={`${list.length} sermon${list.length === 1 ? '' : 's'} found`}
        />
        <Table>
          <thead>
            <tr>
              <SerialTh />
              <Th>Sermon</Th>
              <Th>Speaker</Th>
              <Th>Series</Th>
              <Th>Scripture</Th>
              <Th>Date</Th>
              <Th>Media</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading && <EmptyRow colSpan={9} message="Loading…" />}
            {!listQuery.isLoading && list.length === 0 && (
              <EmptyRow colSpan={9} message="No sermons match your filters." />
            )}
            {list.map((s, i) => (
              <tr
                key={s.id}
                className="cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                onClick={() => router.push(`/sermons/${s.id}`)}
              >
                <SerialTd index={i} />
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm">
                      <Mic2 size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{s.title}</p>
                      {s.summary && (
                        <p className="line-clamp-1 text-xs text-slate-500">{s.summary}</p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>{s.speaker ?? '—'}</Td>
                <Td>{s.sermonSeries?.name ?? '—'}</Td>
                <Td>
                  {s.scripture ? (
                    <span className="italic text-slate-500">{s.scripture}</span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>{s.preachedAt ? formatDate(s.preachedAt) : '—'}</Td>
                <Td>
                  {s.audioUrl || s.videoUrl ? (
                    <span className="inline-flex items-center gap-1 text-sm text-indigo-600">
                      {s.audioUrl && <Headphones size={14} />}
                      {s.videoUrl && <Play size={14} />}
                      Media
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={s.isPublished ? 'green' : 'gray'}>
                    {s.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/sermons/${s.id}`);
                      }}
                    >
                      <Eye size={14} /> View
                    </Button>
                    {hasPermission('content.sermon.update') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(s);
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {hasPermission('content.sermon.delete') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete sermon?')) del.mutate(s.id);
                        }}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
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
        </>
      )}

      {tab === 'series' && (
        <Card>
          <CardHeader
            title="Series playlists"
            description="Expand a series to browse its sermons"
          />
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Series</Th>
                <Th>Description</Th>
                <Th>Sermons</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {seriesQuery.isLoading && <EmptyRow colSpan={5} message="Loading…" />}
              {!seriesQuery.isLoading && seriesList.length === 0 && (
                <EmptyRow colSpan={5} message="No series registered yet." />
              )}
              {seriesList.map((s, i) => {
                const expanded = expandedSeries.has(s.id);
                const sermons = sermonsBySeriesId.get(s.id) ?? [];
                return (
                  <Fragment key={s.id}>
                    <tr
                      className="cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                      onClick={() => toggleSeries(s.id)}
                    >
                      <SerialTd index={i} />
                      <Td>
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            size={16}
                            className={cn(
                              'shrink-0 text-slate-400 transition-transform',
                              expanded && 'rotate-180',
                            )}
                          />
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 text-white">
                            <ListMusic size={14} />
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {s.name}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="line-clamp-1 text-slate-500">
                          {s.description ?? '—'}
                        </span>
                      </Td>
                      <Td>{s._count?.sermons ?? sermons.length}</Td>
                      <Td className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasPermission('content.sermon.update') && (
                            <button
                              type="button"
                              onClick={() => {
                                openSeriesEdit(s);
                                setSeriesOpen(true);
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {hasPermission('content.sermon.delete') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete series "${s.name}"? Sermons will be unlinked.`)) {
                                  delSeries.mutate(s.id);
                                }
                              }}
                              className="rounded p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                        <td colSpan={5} className="p-0">
                          {sermons.length === 0 ? (
                            <p className="px-6 py-4 text-sm text-slate-400">
                              No sermons in this series yet.
                            </p>
                          ) : (
                            <div className="border-t border-slate-200 dark:border-slate-800">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60">
                                    <th className="w-12 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      #
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Sermon
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Speaker
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Date
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Media
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sermons.map((sermon, j) => (
                                    <tr
                                      key={sermon.id}
                                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-indigo-950/30"
                                      onClick={() => router.push(`/sermons/${sermon.id}`)}
                                    >
                                      <td className="px-4 py-2.5 text-slate-400">{j + 1}</td>
                                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                                        {sermon.title}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                        {sermon.speaker ?? '—'}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                        {sermon.preachedAt ? formatDate(sermon.preachedAt) : '—'}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        {sermon.audioUrl || sermon.videoUrl ? (
                                          <span className="inline-flex items-center gap-1 text-indigo-600">
                                            {sermon.audioUrl && <Headphones size={13} />}
                                            {sermon.videoUrl && <Play size={13} />}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <div
                                          className="flex justify-end gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {(sermon.audioUrl || sermon.videoUrl) && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                window.open(
                                                  assetUrl(sermon.videoUrl || sermon.audioUrl || ''),
                                                  '_blank',
                                                )
                                              }
                                              className="rounded p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-950"
                                            >
                                              <Play size={14} />
                                            </button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.push(`/sermons/${sermon.id}`)}
                                          >
                                            <Eye size={14} /> View
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Sermon' : 'New Sermon'}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Speaker"
              value={form.speaker}
              onChange={(e) => setForm({ ...form, speaker: e.target.value })}
            />
            <div>
              <Select
                label="Series"
                value={form.seriesId}
                onChange={(e) => setForm({ ...form, seriesId: e.target.value })}
              >
                <option value="">No series</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              {hasPermission('content.sermon.create') && (
                <button
                  type="button"
                  onClick={openSeriesModal}
                  className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  + Register new series
                </button>
              )}
            </div>
            <Input
              label="Scripture"
              value={form.scripture}
              onChange={(e) => setForm({ ...form, scripture: e.target.value })}
              placeholder="John 3:16"
            />
            <Input
              label="Preached on"
              type="date"
              value={form.preachedAt}
              onChange={(e) => setForm({ ...form, preachedAt: e.target.value })}
            />
            <FileUpload
              label="Audio file"
              accept="audio/*,.mp3,.wav,.m4a"
              value={form.audioUrl}
              onChange={(url) => setForm({ ...form, audioUrl: url })}
              hint="Upload or paste URL below"
            />
            <Input
              label="Audio URL"
              value={form.audioUrl}
              onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
              placeholder="https://… or uploaded file path"
            />
            <Input
              label="Video URL"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="https://…"
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
          </div>
          <Textarea
            label="Summary"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />{' '}
            Published
          </label>
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
        open={seriesOpen}
        onClose={() => {
          setSeriesOpen(false);
          setEditingSeries(null);
          setSeriesForm({ name: '', description: '' });
        }}
        title={editingSeries ? 'Edit series' : 'New series'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSeries.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Series name"
            value={seriesForm.name}
            onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })}
            required
          />
          <Textarea
            label="Description (optional)"
            value={seriesForm.description}
            onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSeriesOpen(false);
                setEditingSeries(null);
                setSeriesForm({ name: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saveSeries.isPending}>
              {editingSeries ? 'Save series' : 'Register series'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
