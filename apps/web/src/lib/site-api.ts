import { API_URL } from './api';
import { fetchWithTimeout } from './fetch-with-timeout';

export interface PublicBranding {
  name: string;
  logoUrl?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  tagline?: string;
  serviceTimes?: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
    allowCrawl: boolean;
  };
}

export interface SiteSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
}

export interface SiteSection {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
}

export interface PublicTestimony {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  isFeatured: boolean;
  createdAt: string;
  testimonyCategory?: { name: string } | null;
}

export interface PublicEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  capacity?: number | null;
  registrationCount?: number;
  isAllDay?: boolean;
  isPast?: boolean;
}

export interface PublicEventDetail extends PublicEvent {
  spotsLeft: number | null;
  branchName: string;
  canRegister: boolean;
}

export interface PublicOutreach {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  state?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status: string;
  peopleReached?: number | null;
  souls?: number | null;
  outcome?: string | null;
  typeName?: string | null;
  branchName: string;
  coverImage?: string | null;
  imageCount: number;
  images?: Array<{ id: string; url: string; caption?: string | null; sortOrder: number }>;
}

export interface GalleryImage {
  id: string;
  title: string;
  caption?: string | null;
  imageUrl: string;
  sortOrder: number;
}

export interface PublicSermon {
  id: string;
  title: string;
  speaker?: string | null;
  scripture?: string | null;
  summary?: string | null;
  notes?: string | null;
  preachedAt?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  tags?: string | null;
  seriesName?: string | null;
  branchName?: string | null;
}

export interface PublicHomeData {
  branding: {
    name: string;
    logoUrl?: string | null;
    email: string;
    phone: string;
    address: string;
    tagline: string;
    serviceTimes: string;
  };
  slides: SiteSlide[];
  sections: SiteSection[];
  testimonies: PublicTestimony[];
  events: PublicEvent[];
  sermons: PublicSermon[];
  outreaches: PublicOutreach[];
}

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  body: string;
  metaDescription?: string | null;
}

export interface PublicAboutData {
  page: SitePage | null;
  sections: SiteSection[];
  church: {
    name: string;
    address: string;
    phone: string;
    email: string;
    tagline: string;
    serviceTimes: string;
  };
  pastor: {
    name: string;
    title: string;
    bio: string;
    photoUrl: string | null;
  };
  assistantPastor: {
    name: string;
    title: string;
    photoUrl: string | null;
  } | null;
  founded: string;
  story: string;
  beliefs: string[];
  values: string[];
}

export interface GivingData {
  intro: string;
  instructions: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  paystackEnabled: boolean;
  paystackPublicKey: string;
  currency: string;
  page?: SitePage | null;
}

async function siteFetch<T>(path: string, init?: RequestInit & { revalidate?: number | false }): Promise<T | null> {
  const res = await fetchWithTimeout(`${API_URL}/site/public${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    revalidate: init?.revalidate,
  });
  if (!res?.ok) return null;
  return res.json();
}

export const fetchPublicHome = () => siteFetch<PublicHomeData>('/home');
export const fetchPublicPage = (slug: string) => siteFetch<SitePage>(`/pages/${slug}`);
export const fetchPublicAbout = () => siteFetch<PublicAboutData>('/about');
export const fetchPublicTestimonies = () => siteFetch<PublicTestimony[]>('/testimonies');
export const fetchPublicGiving = () => siteFetch<GivingData>('/giving');
export const fetchPublicEvents = () => siteFetch<PublicEvent[]>('/events');
export const fetchPublicEvent = (id: string) => siteFetch<PublicEventDetail>(`/events/${id}`);
export const fetchPublicSermons = () => siteFetch<PublicSermon[]>('/sermons');
export const fetchPublicSermon = (id: string) => siteFetch<PublicSermon>(`/sermons/${id}`);
export const fetchPublicOutreaches = () => siteFetch<PublicOutreach[]>('/outreaches');
export const fetchPublicOutreach = (id: string) =>
  siteFetch<PublicOutreach>(`/outreaches/${id}`, { revalidate: false });
export const fetchPublicGallery = () => siteFetch<GalleryImage[]>('/gallery');

export async function verifyGivingPayment(data: {
  reference: string;
  amount: number;
  donorName: string;
  email?: string;
}) {
  const res = await fetch(`${API_URL}/site/public/giving/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Payment verification failed');
  }
  return res.json() as Promise<{
    success: boolean;
    duplicate?: boolean;
    receiptNumber?: string;
    amount: number;
  }>;
}

export async function submitContact(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}) {
  const res = await fetch(`${API_URL}/site/public/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to send message');
  }
  return res.json();
}

export async function registerPublicEvent(
  eventId: string,
  data: { guestName: string; guestPhone?: string },
) {
  const res = await fetch(`${API_URL}/site/public/events/${eventId}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Registration failed');
  }
  return res.json();
}

export async function submitPublicTestimony(data: {
  authorName: string;
  title: string;
  body: string;
}) {
  const res = await fetch(`${API_URL}/site/public/testimonies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to submit testimony');
  }
  return res.json();
}
