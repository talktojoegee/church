import { fetchPublicBranding } from '@/lib/branding';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader } from '@/components/public/PublicHeader';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const branding = await fetchPublicBranding();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader name={branding?.name} logoUrl={branding?.logoUrl} />
      <main className="flex-1">{children}</main>
      <PublicFooter
        name={branding?.name}
        logoUrl={branding?.logoUrl}
        tagline={branding?.tagline}
        email={branding?.email}
        phone={branding?.phone}
        address={branding?.address}
        serviceTimes={branding?.serviceTimes}
      />
    </div>
  );
}
