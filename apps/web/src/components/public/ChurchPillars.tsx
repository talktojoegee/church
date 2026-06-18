import { BookOpen, Flame, Heart, Users } from 'lucide-react';

const PILLARS = [
  {
    icon: Flame,
    title: 'Worship',
    body: 'Spirit-led praise that ushers us into the presence of God.',
    gradient: 'from-brand-700 to-brand-500',
  },
  {
    icon: BookOpen,
    title: 'Word',
    body: 'Biblical teaching that builds faith and transforms lives.',
    gradient: 'from-flame to-flame-orange',
  },
  {
    icon: Heart,
    title: 'Witness',
    body: 'Evangelism and outreach to our city and beyond.',
    gradient: 'from-gold to-gold-light',
  },
  {
    icon: Users,
    title: 'Community',
    body: 'A family where everyone belongs, grows, and serves.',
    gradient: 'from-brand-800 to-brand-600',
  },
];

export function ChurchPillars() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-flame">Who We Are</p>
          <h2 className="mt-2 text-3xl font-bold text-brand-900">Built on Four Pillars</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <article
              key={p.title}
              className="group overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`bg-gradient-to-br ${p.gradient} p-5 text-white`}>
                <p.icon size={32} className="mb-2 opacity-90" />
                <h3 className="text-lg font-bold">{p.title}</h3>
              </div>
              <p className="p-5 text-sm leading-relaxed text-slate-600">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
