'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, FileText, Heart, Mail, Plus, Pencil, Trash2, ExternalLink, Layout, Images, User, Eye, Phone } from 'lucide-react';
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
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'about', label: 'About Page', icon: User },
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

interface GalleryItem {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
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

  const galleryQuery = useQuery({
    queryKey: ['site-gallery'],
    queryFn: async () => (await api.get('/site/gallery')).data as GalleryItem[],
  });

  const pagesQuery = useQuery({
    queryKey: ['site-pages'],
    queryFn: async () => (await api.get('/site/pages')).data as SitePage[],
  });

  const givingQuery = useQuery({
    queryKey: ['site-giving'],
    queryFn: async () => (await api.get('/site/giving')).data,
  });

  const aboutQuery = useQuery({
    queryKey: ['site-about'],
    queryFn: async () => (await api.get('/site/about')).data,
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

  // Gallery modal
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [galleryForm, setGalleryForm] = useState({
    title: '',
    caption: '',
    imageUrl: '',
    sortOrder: 0,
    isActive: true,
  });

  const saveGallery = useMutation({
    mutationFn: async () => {
      const payload = { ...galleryForm, sortOrder: Number(galleryForm.sortOrder) };
      if (editingGallery) return api.patch(`/site/gallery/${editingGallery.id}`, payload);
      return api.post('/site/gallery', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-gallery'] });
      setGalleryOpen(false);
      toast.success('Gallery image saved');
    },
    onError: () => toast.error('Failed to save gallery image'),
  });

  const deleteGallery = useMutation({
    mutationFn: (id: string) => api.delete(`/site/gallery/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-gallery'] });
      toast.success('Image deleted');
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
    paystackPublicKey: '',
    paystackSecretKey: '',
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
      paystackPublicKey: givingLoaded.paystackPublicKey ?? '',
      paystackSecretKey: '',
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

  const [aboutForm, setAboutForm] = useState({
    pastorName: '',
    pastorTitle: '',
    pastorBio: '',
    pastorPhotoUrl: '',
    aboutFounded: '',
    aboutStory: '',
    aboutBeliefs: '',
    aboutValues: '',
  });

  const aboutLoaded = aboutQuery.data;

  useEffect(() => {
    if (!aboutLoaded) return;
    setAboutForm({
      pastorName: aboutLoaded.pastorName ?? '',
      pastorTitle: aboutLoaded.pastorTitle ?? '',
      pastorBio: aboutLoaded.pastorBio ?? '',
      pastorPhotoUrl: aboutLoaded.pastorPhotoUrl ?? '',
      aboutFounded: aboutLoaded.aboutFounded ?? '',
      aboutStory: aboutLoaded.aboutStory ?? '',
      aboutBeliefs: aboutLoaded.aboutBeliefs ?? '',
      aboutValues: aboutLoaded.aboutValues ?? '',
    });
  }, [aboutLoaded]);

  const saveAbout = useMutation({
    mutationFn: () => api.patch('/site/about', aboutForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-about'] });
      toast.success('About page settings saved');
    },
    onError: () => toast.error('Failed to save about settings'),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/site/contact-messages/${id}/read`, { isRead: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-contact'] }),
  });

  const [contactOpen, setContactOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);

  const openContactMessage = (msg: ContactMessage) => {
    setSelectedContact(msg);
    setContactOpen(true);
    if (!msg.isRead) markRead.mutate(msg.id);
  };

  const closeContactMessage = () => {
    setContactOpen(false);
    setSelectedContact(null);
  };

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

  const openGalleryModal = (item?: GalleryItem) => {
    setEditingGallery(item ?? null);
    setGalleryForm(
      item
        ? {
            title: item.title,
            caption: item.caption ?? '',
            imageUrl: item.imageUrl,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : { title: '', caption: '', imageUrl: '', sortOrder: 0, isActive: true },
    );
    setGalleryOpen(true);
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

  const publicPath = (slug: string) => `/${slug}`;

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

      {tab === 'gallery' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Photo Gallery</h2>
            {canEdit && (
              <Button size="sm" onClick={() => openGalleryModal()}>
                <Plus size={16} /> Add photo
              </Button>
            )}
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                {canEdit && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {(galleryQuery.data ?? []).map((item) => (
                <tr key={item.id}>
                  <Td className="font-medium">{item.title}</Td>
                  <Td>{item.sortOrder}</Td>
                  <Td>
                    <Badge tone={item.isActive ? 'green' : 'gray'}>
                      {item.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </Td>
                  {canEdit && (
                    <Td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openGalleryModal(item)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteGallery.mutate(item.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
              {!galleryQuery.data?.length && (
                <EmptyRow colSpan={canEdit ? 4 : 3} message="No gallery images yet" />
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

      {tab === 'about' && canManage && (
        <Card className="max-w-2xl space-y-4">
          <h2 className="font-semibold text-slate-900">About Page</h2>
          <p className="text-sm text-slate-500">
            Manage senior pastor profile and about page content. Leave pastor name empty to use the
            branch pastor from your church setup.
          </p>
          <Input
            label="Senior pastor name"
            value={aboutForm.pastorName}
            onChange={(e) => setAboutForm({ ...aboutForm, pastorName: e.target.value })}
          />
          <Input
            label="Title"
            value={aboutForm.pastorTitle}
            onChange={(e) => setAboutForm({ ...aboutForm, pastorTitle: e.target.value })}
            placeholder="Senior Pastor"
          />
          <FileUpload
            label="Pastor photo"
            value={aboutForm.pastorPhotoUrl}
            onChange={(url) => setAboutForm({ ...aboutForm, pastorPhotoUrl: url })}
          />
          <Textarea
            label="Pastor biography"
            value={aboutForm.pastorBio}
            onChange={(e) => setAboutForm({ ...aboutForm, pastorBio: e.target.value })}
            rows={6}
            placeholder="Write a short bio. Use blank lines between paragraphs."
          />
          <Input
            label="Year founded"
            value={aboutForm.aboutFounded}
            onChange={(e) => setAboutForm({ ...aboutForm, aboutFounded: e.target.value })}
            placeholder="e.g. 2010"
          />
          <Textarea
            label="Our story (HTML supported)"
            value={aboutForm.aboutStory}
            onChange={(e) => setAboutForm({ ...aboutForm, aboutStory: e.target.value })}
            rows={6}
          />
          <Textarea
            label="What we believe (one per line)"
            value={aboutForm.aboutBeliefs}
            onChange={(e) => setAboutForm({ ...aboutForm, aboutBeliefs: e.target.value })}
            rows={6}
          />
          <Textarea
            label="Core values (one per line)"
            value={aboutForm.aboutValues}
            onChange={(e) => setAboutForm({ ...aboutForm, aboutValues: e.target.value })}
            rows={4}
            placeholder={'Authentic Worship\nBiblical Teaching\nCommunity Care'}
          />
          <Button onClick={() => saveAbout.mutate()} disabled={saveAbout.isPending}>
            Save about page
          </Button>
        </Card>
      )}

      {tab === 'about' && !canManage && (
        <Card>
          <p className="text-sm text-slate-500">
            You need website manage permission to edit about page settings.
          </p>
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

          <div className="border-t border-slate-200 pt-4">
            <h3 className="font-semibold text-slate-900">Paystack</h3>
            <p className="mt-1 text-sm text-slate-500">
              Add your Paystack keys to accept online giving on the public Give page.
            </p>
            {givingQuery.data?.paystackKeysSource === 'environment' && (
              <p className="mt-2 text-xs text-amber-700">
                Keys are currently loaded from server environment variables. Saving keys here will
                store church-specific credentials in settings.
              </p>
            )}
            <div className="mt-4 space-y-4">
              <Input
                label="Paystack public key"
                value={givingForm.paystackPublicKey}
                onChange={(e) => setGivingForm({ ...givingForm, paystackPublicKey: e.target.value })}
                placeholder="pk_live_… or pk_test_…"
              />
              <Input
                label="Paystack secret key"
                type="password"
                value={givingForm.paystackSecretKey}
                onChange={(e) => setGivingForm({ ...givingForm, paystackSecretKey: e.target.value })}
                placeholder={
                  givingQuery.data?.paystackSecretKeyMasked
                    ? `Saved: ${givingQuery.data.paystackSecretKeyMasked}`
                    : 'sk_live_… or sk_test_…'
                }
              />
              {givingQuery.data?.paystackSecretKeyMasked && (
                <p className="text-xs text-slate-500">
                  Leave secret key blank to keep the current saved key.
                </p>
              )}
            </div>
          </div>

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
              Add both Paystack public and secret keys above to enable online giving.
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
                <tr
                  key={msg.id}
                  className={`cursor-pointer ${!msg.isRead ? 'bg-brand-50/50' : ''} hover:bg-slate-50`}
                  onClick={() => openContactMessage(msg)}
                >
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openContactMessage(msg);
                      }}
                    >
                      <Eye size={14} className="mr-1" /> View
                    </Button>
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

      <Modal
        open={contactOpen}
        onClose={closeContactMessage}
        title={selectedContact?.subject || 'Contact message'}
        size="lg"
      >
        {selectedContact && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">From</p>
                <p className="mt-1 font-medium text-slate-900">{selectedContact.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Received</p>
                <p className="mt-1 text-sm text-slate-700">{formatDate(selectedContact.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                <a
                  href={`mailto:${selectedContact.email}`}
                  className="mt-1 block text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  {selectedContact.email}
                </a>
              </div>
              {selectedContact.phone && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</p>
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
                  >
                    <Phone size={14} />
                    {selectedContact.phone}
                  </a>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Message</p>
              <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {selectedContact.message}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${selectedContact.email}?subject=Re: ${encodeURIComponent(selectedContact.subject || 'Your message')}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Mail size={16} /> Reply by email
              </a>
              <Button type="button" variant="outline" onClick={closeContactMessage}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

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

      {/* Gallery modal */}
      <Modal open={galleryOpen} onClose={() => setGalleryOpen(false)} title={editingGallery ? 'Edit photo' : 'Add photo'}>
        <div className="space-y-4">
          <Input label="Title" value={galleryForm.title} onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })} required />
          <Textarea label="Caption" value={galleryForm.caption} onChange={(e) => setGalleryForm({ ...galleryForm, caption: e.target.value })} rows={2} />
          <FileUpload
            label="Photo"
            value={galleryForm.imageUrl}
            onChange={(url) => setGalleryForm({ ...galleryForm, imageUrl: url })}
            accept="image/*"
          />
          <Input label="Sort order" type="number" value={String(galleryForm.sortOrder)} onChange={(e) => setGalleryForm({ ...galleryForm, sortOrder: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              checked={galleryForm.isActive}
              onChange={(e) => setGalleryForm({ ...galleryForm, isActive: e.target.checked })}
            />
            Active
          </label>
          <Button onClick={() => saveGallery.mutate()} disabled={saveGallery.isPending || !galleryForm.imageUrl} className="w-full">
            Save photo
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
