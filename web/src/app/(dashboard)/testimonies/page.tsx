'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Heart,
  Search,
  Filter,
  X,
  Star,
  Clock,
  CheckCircle,
  Eye,
  FolderOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { CONTENT_STATUS_TONES, TESTIMONY_STATUSES, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface TestimonyCategory {
  id: string;
  name: string;
  description: string | null;
  _count?: { testimonies: number };
}

interface Testimony {
  id: string;
  title: string;
  body: string;
  authorName: string | null;
  status: string;
  isFeatured: boolean;
  createdAt: string;
  occurredAt: string | null;
  categoryId: string | null;
  testimonyCategory?: { id: string; name: string } | null;
  member: { firstName: string; lastName: string } | null;
}

const PAGE_TABS = [
  { id: 'testimonies', label: 'Testimonies' },
  { id: 'categories', label: 'Categories' },
];

const emptyFilters = {
  search: '',
  status: '',
  categoryId: '',
};

function buildParams(filters: typeof emptyFilters) {
  const params: Record<string, string> = {};
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  return params;
}

function authorName(t: Testimony) {
  return t.member
    ? `${t.member.firstName} ${t.member.lastName}`
    : t.authorName ?? 'Anonymous';
}

export default function TestimoniesPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState('testimonies');
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TestimonyCategory | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchInput, setSearchInput] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const blank = { title: '', body: '', authorName: '', categoryId: '' };
  const [form, setForm] = useState(blank);

  const queryParams = useMemo(() => buildParams(filters), [filters]);

  const categoriesQuery = useQuery({
    queryKey: ['testimony-categories'],
    queryFn: async () =>
      (await api.get('/testimony-categories')).data as TestimonyCategory[],
  });

  const listQuery = useQuery({
    queryKey: ['testimonies', queryParams],
    queryFn: async () =>
      (await api.get('/testimonies', { params: queryParams })).data as Testimony[],
  });

  const statsQuery = useQuery({
    queryKey: ['testimonies-stats', queryParams],
    queryFn: async () => (await api.get('/testimonies/stats', { params: queryParams })).data,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['testimonies'] });
    qc.invalidateQueries({ queryKey: ['testimonies-stats'] });
    qc.invalidateQueries({ queryKey: ['testimony-categories'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      if (!payload.authorName) delete payload.authorName;
      if (!payload.categoryId) delete payload.categoryId;
      return api.post('/testimonies', payload);
    },
    meta: { successMessage: 'Testimony submitted', errorMessage: 'Failed to save testimony' },
    onSuccess: () => {
      invalidateAll();
      setOpen(false);
    },
  });

  const saveCategory = useMutation({
    mutationFn: () => {
      if (editingCategory) return api.patch(`/testimony-categories/${editingCategory.id}`, categoryForm);
      return api.post('/testimony-categories', categoryForm);
    },
    meta: {
      successMessage: editingCategory ? 'Category updated' : 'Category registered',
      errorMessage: 'Failed to save category',
    },
    onSuccess: () => {
      invalidateAll();
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      setCategoryOpen(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/testimonies/${id}`),
    meta: { successMessage: 'Deleted successfully', errorMessage: 'Failed to delete' },
    onSuccess: invalidateAll,
  });

  const delCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/testimony-categories/${id}`),
    meta: { successMessage: 'Category deleted', errorMessage: 'Failed to delete category' },
    onSuccess: invalidateAll,
  });

  const openCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
    setCategoryOpen(true);
  };

  const openCategoryCreate = () => {
    openCategoryModal();
    setTab('categories');
  };

  const openCategoryEdit = (c: TestimonyCategory) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, description: c.description ?? '' });
    setCategoryOpen(true);
  };

  const applySearch = () => setFilters((f) => ({ ...f, search: searchInput }));
  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
  };

  const hasActiveFilters = filters.search || filters.status || filters.categoryId;

  const list = listQuery.data ?? [];
  const stats = statsQuery.data;
  const categories = categoriesQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Testimonies"
        description="Member testimonies awaiting review and publishing."
        action={
          tab === 'testimonies' && hasPermission('content.testimony.create') ? (
            <Button onClick={() => { setForm(blank); setOpen(true); }}>
              <Plus size={16} /> Add Testimony
            </Button>
          ) : tab === 'categories' && hasPermission('content.testimony.create') ? (
            <Button onClick={openCategoryCreate}>
              <Plus size={16} /> New Category
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Total testimonies"
          value={stats?.total ?? '—'}
          icon={<Heart size={22} />}
          color="rose"
        />
        <ColorStatCard
          label="Pending review"
          value={stats?.pending ?? '—'}
          hint="Awaiting approval"
          icon={<Clock size={22} />}
          color="amber"
        />
        <ColorStatCard
          label="Approved"
          value={stats?.approved ?? '—'}
          icon={<CheckCircle size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Featured"
          value={stats?.featured ?? '—'}
          hint={`${stats?.categories ?? 0} categories`}
          icon={<Star size={22} />}
          color="violet"
        />
      </div>

      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />

      {tab === 'testimonies' && (
        <>
          <div className="mb-6 overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 shadow-sm dark:border-rose-900/40 dark:from-rose-950/40 dark:via-slate-900 dark:to-amber-950/20">
            <div className="border-b border-rose-100/80 bg-gradient-to-r from-rose-600 to-amber-600 px-5 py-4 dark:border-rose-900/50">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Filter size={18} /> Filters
              </h3>
              <p className="mt-0.5 text-sm text-white/80">Search, status, and category</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Search
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        className="pl-9"
                        placeholder="Title, author, content…"
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
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All statuses</option>
                  {TESTIMONY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Category"
                  value={filters.categoryId}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {filters.search && <Badge tone="brand">Search: {filters.search}</Badge>}
                  {filters.status && (
                    <Badge tone={CONTENT_STATUS_TONES[filters.status] ?? 'gray'}>
                      {humanize(filters.status)}
                    </Badge>
                  )}
                  {filters.categoryId && (
                    <Badge tone="blue">
                      {categories.find((c) => c.id === filters.categoryId)?.name ?? 'Category'}
                    </Badge>
                  )}
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
              title="All testimonies"
              description={`${list.length} testimon${list.length === 1 ? 'y' : 'ies'} found`}
            />
            <Table>
              <thead>
                <tr>
                  <SerialTh />
                  <Th>Title</Th>
                  <Th>Author</Th>
                  <Th>Category</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Featured</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading && <EmptyRow colSpan={8} message="Loading…" />}
                {!listQuery.isLoading && list.length === 0 && (
                  <EmptyRow colSpan={8} message="No testimonies match your filters." />
                )}
                {list.map((t, i) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                    onClick={() => router.push(`/testimonies/${t.id}`)}
                  >
                    <SerialTd index={i} />
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-sm">
                          <Heart size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
                          <p className="line-clamp-1 text-xs text-slate-500">{t.body}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>{authorName(t)}</Td>
                    <Td>{t.testimonyCategory?.name ?? '—'}</Td>
                    <Td>{formatDate(t.occurredAt ?? t.createdAt)}</Td>
                    <Td>
                      <Badge tone={CONTENT_STATUS_TONES[t.status] ?? 'gray'}>
                        {humanize(t.status)}
                      </Badge>
                    </Td>
                    <Td>
                      {t.isFeatured ? (
                        <Star size={16} className="fill-amber-400 text-amber-400" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/testimonies/${t.id}`);
                          }}
                        >
                          <Eye size={14} /> View
                        </Button>
                        {hasPermission('content.testimony.delete') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete testimony?')) del.mutate(t.id);
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

      {tab === 'categories' && (
        <Card>
          <CardHeader
            title="Testimony categories"
            description="Register categories before assigning them to testimonies"
          />
          <Table>
            <thead>
              <tr>
                <SerialTh />
                <Th>Category</Th>
                <Th>Description</Th>
                <Th>Testimonies</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {categoriesQuery.isLoading && <EmptyRow colSpan={5} message="Loading…" />}
              {!categoriesQuery.isLoading && categories.length === 0 && (
                <EmptyRow colSpan={5} message="No categories registered yet." />
              )}
              {categories.map((c, i) => (
                <tr key={c.id} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                  <SerialTd index={i} />
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                        <FolderOpen size={16} />
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{c.name}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="line-clamp-1 text-slate-500">{c.description ?? '—'}</span>
                  </Td>
                  <Td>{c._count?.testimonies ?? 0}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {hasPermission('content.testimony.update') && (
                        <button
                          type="button"
                          onClick={() => openCategoryEdit(c)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {hasPermission('content.testimony.delete') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete category "${c.name}"? Testimonies will be unlinked.`)) {
                              delCategory.mutate(c.id);
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
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Testimony" size="lg">
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
              label="Author name"
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              placeholder="Leave blank for anonymous"
            />
            <div>
              <Select
                label="Category"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {hasPermission('content.testimony.create') && (
                <button
                  type="button"
                  onClick={openCategoryModal}
                  className="mt-1 text-xs font-medium text-rose-600 hover:underline"
                >
                  + Register new category
                </button>
              )}
            </div>
          </div>
          <Textarea
            label="Testimony"
            rows={5}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={categoryOpen}
        onClose={() => {
          setCategoryOpen(false);
          setEditingCategory(null);
          setCategoryForm({ name: '', description: '' });
        }}
        title={editingCategory ? 'Edit category' : 'New category'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveCategory.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Category name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            required
          />
          <Textarea
            label="Description (optional)"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCategoryOpen(false);
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saveCategory.isPending}>
              {editingCategory ? 'Save category' : 'Register category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
