'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, FileText, Heart, Mail, Plus, Pencil, Trash2, ExternalLink, Layout } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { FileUpload } from '@/components/ui/FileUpload';
import { Checkbox } from '@/components/ui/Checkbox';
import { formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast-context';

const TABS = [
  { id: 'slides', label: 'Hero Slides', icon: Image },
  { id: 'sections', label: 'Home Sections', icon: Layout },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'giving', label: 'Giving', icon: Heart },
  { id: 'contact', label: 'Contact Inbox', icon: Mail },
];

interface Slide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Section {
  id: string;
  pageSlug: string;
  type: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface SitePage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string;
  status: string;
  sortOrder: number;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const SECTION_TYPES = ['WELCOME', 'VISION', 'MISSION', 'VALUES', 'PASTOR_WORD', 'CTA', 'CUSTOM'];

export default function WebsitePage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('slides');

  const canEdit = hasPermission('content.website.update') || hasPermission('content.website.create');
  const canManage = hasPermission('content.website.manage');

  const slidesQuery = useQuery({
    queryKey: ['site-slides'],
    queryFn: async () => (await api.get('/site/slides')).data as Slide[],
  });

  const sectionsQuery = useQuery({
    queryKey: ['site-sections'],
    queryFn: async () => (await api.get('/site/sections', { params: { pageSlug: 'home' } })).data as Section[],
  });

  const pagesQuery = useQuery({
    queryKey: ['site-pages'],
    queryFn: async () => (await api.get('/site/pages')).data as SitePage[],
  });

  const givingQuery = useQuery({
    queryKey: ['site-giving'],
    queryFn: async () => (await api.get('/site/giving')).data,
  });

  const contactQuery = useQuery({
    queryKey: ['site-contact'],
    queryFn: async () => (await api.get('/site/contact-messages')).data as ContactMessage[],
    enabled: canManage,
  });

  // Slide modal
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    ctaLabel: '',
    ctaUrl: '',
    sortOrder: 0,
    isActive: true,
  });

  const saveSlide = useMutation({
    mutationFn: async () => {
      const payload = { ...slideForm, sortOrder: Number(slideForm.sortOrder) };
      if (editingSlide) return api.patch(`/site/slides/${editingSlide.id}`, payload);
      return api.post('/site/slides', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-slides'] });
      setSlideOpen(false);
      toast.success('Slide saved');
    },
    onError: () => toast.error('Failed to save slide'),
  });

  const deleteSlide = useMutation({
    mutationFn: (id: string) => api.delete(`/site/slides/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-slides'] });
      toast.success('Slide deleted');
    },
  });

  // Section modal
  const [sectionOpen, setSectionOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState({
    type: 'CUSTOM',
    title: '',
    subtitle: '',
    body: '',
    imageUrl: '',
    ctaLabel: '',
    ctaUrl: '',
    sortOrder: 0,
    isActive: true,
  });

  const saveSection = useMutation({
    mutationFn: async () => {
      const payload = { ...sectionForm, pageSlug: 'home', sortOrder: Number(sectionForm.sortOrder) };
      if (editingSection) return api.patch(`/site/sections/${editingSection.id}`, payload);
      return api.post('/site/sections', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-sections'] });
      setSectionOpen(false);
      toast.success('Section saved');
    },
    onError: () => toast.error('Failed to save section'),
  });

  const deleteSection = useMutation({
    mutationFn: (id: string) => api.delete(`/site/sections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-sections'] });
      toast.success('Section deleted');
    },
  });

  // Page modal
  const [pageOpen, setPageOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<SitePage | null>(null);
  const [pageForm, setPageForm] = useState({
    slug: '',
    title: '',
    subtitle: '',
    body: '',
    status: 'DRAFT',
    sortOrder: 0,
  });

  const savePage = useMutation({
    mutationFn: async () => {
      const payload = { ...pageForm, sortOrder: Number(pageForm.sortOrder) };
      if (editingPage) return api.patch(`/site/pages/${editingPage.id}`, payload);
      return api.post('/site/pages', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-pages'] });
      setPageOpen(false);
      toast.success('Page saved');
    },
    onError: () => toast.error('Failed to save page'),
  });

  const deletePage = useMutation({
    mutationFn: (id: string) => api.delete(`/site/pages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-pages'] });
      toast.success('Page deleted');
    },
  });

  // Giving form
  const [givingForm, setGivingForm] = useState({
    givingIntro: '',
    givingInstructions: '',
    givingBankName: '',
    givingAccountName: '',
    givingAccountNumber: '',
    givingPaystackEnabled: false,
  });

  const givingLoaded = givingQuery.data;

  useEffect(() => {
    if (!givingLoaded) return;
    setGivingForm({
      givingIntro: givingLoaded.givingIntro ?? '',
      givingInstructions: givingLoaded.givingInstructions ?? '',
      givingBankName: givingLoaded.givingBankName ?? '',
      givingAccountName: givingLoaded.givingAccountName ?? '',
      givingAccountNumber: givingLoaded.givingAccountNumber ?? '',
      givingPaystackEnabled: givingLoaded.givingPaystackEnabled ?? false,
    });
  }, [givingLoaded]);

  const saveGiving = useMutation({
    mutationFn: () => api.patch('/site/giving', givingForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-giving'] });
      toast.success('Giving settings saved');
    },
    onError: () => toast.error('Failed to save giving settings'),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/site/contact-messages/${id}/read`, { isRead: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-contact'] }),
  });

  const openSlideModal = (slide?: Slide) => {
    setEditingSlide(slide ?? null);
    setSlideForm(
      slide
        ? {
            title: slide.title,
            subtitle: slide.subtitle ?? '',
            imageUrl: slide.imageUrl ?? '',
            ctaLabel: slide.ctaLabel ?? '',
            ctaUrl: slide.ctaUrl ?? '',
            sortOrder: slide.sortOrder,
            isActive: slide.isActive,
          }
        : { title: '', subtitle: '', imageUrl: '', ctaLabel: '', ctaUrl: '', sortOrder: 0, isActive: true },
    );
    setSlideOpen(true);
  };

  const openSectionModal = (section?: Section) => {
    setEditingSection(section ?? null);
    setSectionForm(
      section
        ? {
            type: section.type,
            title: section.title,
            subtitle: section.subtitle ?? '',
            body: section.body ?? '',
            imageUrl: section.imageUrl ?? '',
            ctaLabel: section.ctaLabel ?? '',
            ctaUrl: section.ctaUrl ?? '',
            sortOrder: section.sortOrder,
            isActive: section.isActive,
          }
        : { type: 'CUSTOM', title: '', subtitle: '', body: '', imageUrl: '', ctaLabel: '', ctaUrl: '', sortOrder: 0, isActive: true },
    );
    setSectionOpen(true);
  };

  const openPageModal = (page?: SitePage) => {
    setEditingPage(page ?? null);
    setPageForm(
      page
        ? {
            slug: page.slug,
            title: page.title,
            subtitle: page.subtitle ?? '',
            body: page.body,
            status: page.status,
            sortOrder: page.sortOrder,
          }
        : { slug: '', title: '', subtitle: '', body: '', status: 'DRAFT', sortOrder: 0 },
    );
    setPageOpen(true);
  };

  const publicPath = (slug: string) => (slug === 'about' || slug === 'give' ? `/${slug}` : `/${slug}`);

  return (
    <div>
      <PageHeader
        title="Website"
        description="Manage your public church website — homepage, pages, giving, and contact messages."
        action={
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink size={16} /> View site
            </Button>
          </a>
        }
      />

      <Tabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        active={tab}
        onChange={setTab}
      />

      {tab === 'slides' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Hero Slides</h2>
            {canEdit && (
              <Button size="sm" onClick={() => openSlideModal()}>
                <Plus size={16} /> Add slide
              </Button>
            )}
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>CTA</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                {canEdit && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {(slidesQuery.data ?? []).map((slide) => (
                <tr key={slide.id}>
                  <Td className="font-medium">{slide.title}</Td>
                  <Td className="text-slate-500">{slide.ctaLabel || '—'}</Td>
                  <Td>{slide.sortOrder}</Td>
                  <Td>
                    <Badge tone={slide.isActive ? 'green' : 'gray'}>
                      {slide.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </Td>
                  {canEdit && (
                    <Td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openSlideModal(slide)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSlide.mutate(slide.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
              {!slidesQuery.data?.length && <EmptyRow colSpan={canEdit ? 5 : 4} message="No slides yet" />}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'sections' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Homepage Sections</h2>
            {canEdit && (
              <Button size="sm" onClick={() => openSectionModal()}>
                <Plus size={16} /> Add section
              </Button>
            )}
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Title</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                {canEdit && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {(sectionsQuery.data ?? []).map((section) => (
                <tr key={section.id}>
                  <Td><Badge tone="blue">{section.type}</Badge></Td>
                  <Td className="font-medium">{section.title}</Td>
                  <Td>{section.sortOrder}</Td>
                  <Td>
                    <Badge tone={section.isActive ? 'green' : 'gray'}>
                      {section.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </Td>
                  {canEdit && (
                    <Td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openSectionModal(section)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSection.mutate(section.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
              {!sectionsQuery.data?.length && (
                <EmptyRow colSpan={canEdit ? 5 : 4} message="No sections yet" />
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'pages' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">CMS Pages</h2>
            {canEdit && (
              <Button size="sm" onClick={() => openPageModal()}>
                <Plus size={16} /> Add page
              </Button>
            )}
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Standard slugs: <code className="rounded bg-slate-100 px-1">about</code>,{' '}
            <code className="rounded bg-slate-100 px-1">give</code>,{' '}
            <code className="rounded bg-slate-100 px-1">contact</code>
          </p>
          <Table>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Slug</Th>
                <Th>Status</Th>
                <Th>Link</Th>
                {canEdit && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {(pagesQuery.data ?? []).map((page) => (
                <tr key={page.id}>
                  <Td className="font-medium">{page.title}</Td>
                  <Td><code className="text-xs">{page.slug}</code></Td>
                  <Td>
                    <Badge tone={page.status === 'PUBLISHED' ? 'green' : 'amber'}>
                      {page.status}
                    </Badge>
                  </Td>
                  <Td>
                    {page.status === 'PUBLISHED' && (
                      <a
                        href={publicPath(page.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                  </Td>
                  {canEdit && (
                    <Td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openPageModal(page)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePage.mutate(page.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
              {!pagesQuery.data?.length && <EmptyRow colSpan={canEdit ? 5 : 4} message="No pages yet" />}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'giving' && canManage && (
        <Card className="max-w-2xl space-y-4">
          <h2 className="font-semibold text-slate-900">Giving Settings</h2>
          <Textarea
            label="Introduction"
            value={givingForm.givingIntro}
            onChange={(e) => setGivingForm({ ...givingForm, givingIntro: e.target.value })}
            rows={3}
          />
          <Textarea
            label="Bank transfer instructions"
            value={givingForm.givingInstructions}
            onChange={(e) => setGivingForm({ ...givingForm, givingInstructions: e.target.value })}
            rows={2}
          />
          <Input
            label="Bank name"
            value={givingForm.givingBankName}
            onChange={(e) => setGivingForm({ ...givingForm, givingBankName: e.target.value })}
          />
          <Input
            label="Account name"
            value={givingForm.givingAccountName}
            onChange={(e) => setGivingForm({ ...givingForm, givingAccountName: e.target.value })}
          />
          <Input
            label="Account number"
            value={givingForm.givingAccountNumber}
            onChange={(e) => setGivingForm({ ...givingForm, givingAccountNumber: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              checked={givingForm.givingPaystackEnabled}
              onChange={(e) =>
                setGivingForm({ ...givingForm, givingPaystackEnabled: e.target.checked })
              }
              disabled={!givingQuery.data?.paystackConfigured}
            />
            Enable Paystack online giving
          </label>
          {!givingQuery.data?.paystackConfigured && (
            <p className="text-xs text-amber-700">
              Paystack keys are not configured in server environment variables.
            </p>
          )}
          <Button onClick={() => saveGiving.mutate()} disabled={saveGiving.isPending}>
            Save giving settings
          </Button>
        </Card>
      )}

      {tab === 'giving' && !canManage && (
        <Card><p className="text-sm text-slate-500">You need website manage permission to edit giving settings.</p></Card>
      )}

      {tab === 'contact' && canManage && (
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Contact Messages</h2>
          <Table>
            <thead>
              <tr>
                <Th>From</Th>
                <Th>Subject</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(contactQuery.data ?? []).map((msg) => (
                <tr key={msg.id} className={!msg.isRead ? 'bg-brand-50/50' : undefined}>
                  <Td>
                    <div className="font-medium">{msg.name}</div>
                    <div className="text-xs text-slate-500">{msg.email}</div>
                  </Td>
                  <Td>{msg.subject || 'General enquiry'}</Td>
                  <Td className="text-slate-500">{formatDate(msg.createdAt)}</Td>
                  <Td>
                    <Badge tone={msg.isRead ? 'gray' : 'blue'}>
                      {msg.isRead ? 'Read' : 'New'}
                    </Badge>
                  </Td>
                  <Td>
                    {!msg.isRead && (
                      <Button size="sm" variant="outline" onClick={() => markRead.mutate(msg.id)}>
                        Mark read
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
              {!contactQuery.data?.length && (
                <EmptyRow colSpan={5} message="No messages yet" />
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'contact' && !canManage && (
        <Card><p className="text-sm text-slate-500">You need website manage permission to view contact messages.</p></Card>
      )}

      {/* Slide modal */}
      <Modal open={slideOpen} onClose={() => setSlideOpen(false)} title={editingSlide ? 'Edit slide' : 'New slide'}>
        <div className="space-y-4">
          <Input label="Title" value={slideForm.title} onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })} required />
          <Textarea label="Subtitle" value={slideForm.subtitle} onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })} rows={2} />
          <FileUpload
            label="Background image"
            value={slideForm.imageUrl}
            onChange={(url) => setSlideForm({ ...slideForm, imageUrl: url })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Button label" value={slideForm.ctaLabel} onChange={(e) => setSlideForm({ ...slideForm, ctaLabel: e.target.value })} />
            <Input label="Button URL" value={slideForm.ctaUrl} onChange={(e) => setSlideForm({ ...slideForm, ctaUrl: e.target.value })} placeholder="/contact" />
          </div>
          <Input label="Sort order" type="number" value={String(slideForm.sortOrder)} onChange={(e) => setSlideForm({ ...slideForm, sortOrder: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              checked={slideForm.isActive}
              onChange={(e) => setSlideForm({ ...slideForm, isActive: e.target.checked })}
            />
            Active
          </label>
          <Button onClick={() => saveSlide.mutate()} disabled={saveSlide.isPending} className="w-full">
            Save slide
          </Button>
        </div>
      </Modal>

      {/* Section modal */}
      <Modal open={sectionOpen} onClose={() => setSectionOpen(false)} title={editingSection ? 'Edit section' : 'New section'}>
        <div className="space-y-4">
          <Select label="Type" value={sectionForm.type} onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value })}>
            {SECTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Input label="Title" value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} required />
          <Textarea label="Subtitle" value={sectionForm.subtitle} onChange={(e) => setSectionForm({ ...sectionForm, subtitle: e.target.value })} rows={2} />
          <Textarea label="Body" value={sectionForm.body} onChange={(e) => setSectionForm({ ...sectionForm, body: e.target.value })} rows={4} />
          <FileUpload label="Image" value={sectionForm.imageUrl} onChange={(url) => setSectionForm({ ...sectionForm, imageUrl: url })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="CTA label" value={sectionForm.ctaLabel} onChange={(e) => setSectionForm({ ...sectionForm, ctaLabel: e.target.value })} />
            <Input label="CTA URL" value={sectionForm.ctaUrl} onChange={(e) => setSectionForm({ ...sectionForm, ctaUrl: e.target.value })} />
          </div>
          <Input label="Sort order" type="number" value={String(sectionForm.sortOrder)} onChange={(e) => setSectionForm({ ...sectionForm, sortOrder: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              checked={sectionForm.isActive}
              onChange={(e) => setSectionForm({ ...sectionForm, isActive: e.target.checked })}
            />
            Active
          </label>
          <Button onClick={() => saveSection.mutate()} disabled={saveSection.isPending} className="w-full">
            Save section
          </Button>
        </div>
      </Modal>

      {/* Page modal */}
      <Modal open={pageOpen} onClose={() => setPageOpen(false)} title={editingPage ? 'Edit page' : 'New page'} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Slug" value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} placeholder="about" required />
            <Select label="Status" value={pageForm.status} onChange={(e) => setPageForm({ ...pageForm, status: e.target.value })}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </Select>
          </div>
          <Input label="Title" value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} required />
          <Input label="Subtitle" value={pageForm.subtitle} onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })} />
          <Textarea
            label="Body (HTML supported)"
            value={pageForm.body}
            onChange={(e) => setPageForm({ ...pageForm, body: e.target.value })}
            rows={12}
          />
          <Button onClick={() => savePage.mutate()} disabled={savePage.isPending} className="w-full">
            Save page
          </Button>
        </div>
      </Modal>
    </div>
  );
}
