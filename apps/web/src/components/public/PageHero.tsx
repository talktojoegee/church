interface PageHeroProps {
  title: string;
  subtitle?: string | null;
}

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-lg text-white/85">{subtitle}</p>}
      </div>
    </section>
  );
}
