import { API_URL } from './api';

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
}

export interface PublicSermon {
  id: string;
  title: string;
  speaker?: string | null;
  summary?: string | null;
  preachedAt?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
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
}

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  body: string;
  metaDescription?: string | null;
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

async function siteFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/site/public${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      next: init?.method ? undefined : { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const fetchPublicHome = () => siteFetch<PublicHomeData>('/home');
export const fetchPublicPage = (slug: string) => siteFetch<SitePage>(`/pages/${slug}`);
export const fetchPublicTestimonies = () => siteFetch<PublicTestimony[]>('/testimonies');
export const fetchPublicGiving = () => siteFetch<GivingData>('/giving');

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
