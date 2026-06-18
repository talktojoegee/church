'use client';

import { useState } from 'react';
import { PageHero } from '@/components/public/PageHero';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { submitContact } from '@/lib/site-api';
import { toast } from '@/lib/toast-context';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useChurchBranding } from '@/lib/hooks';

export default function ContactPage() {
  const branding = useChurchBranding();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitContact(form);
      toast.success('Message sent! We will get back to you soon.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  const b = branding.data;

  return (
    <>
      <PageHero title="Contact Us" subtitle="We would love to hear from you" />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Get in Touch</h2>
          <p className="mt-2 text-sm text-slate-600">
            Send us a message, prayer request, or plan your visit. Our team will respond as soon as
            possible.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-slate-700">
            {b?.address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 shrink-0 text-brand-600" size={18} />
                {b.address}
              </li>
            )}
            {b?.phone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 shrink-0 text-brand-600" size={18} />
                <a href={`tel:${b.phone}`} className="hover:text-brand-700">
                  {b.phone}
                </a>
              </li>
            )}
            {b?.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 shrink-0 text-brand-600" size={18} />
                <a href={`mailto:${b.email}`} className="hover:text-brand-700">
                  {b.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Subject (optional)"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <Textarea
            label="Message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
            minLength={10}
          />
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Sending…' : 'Send Message'}
          </Button>
        </form>
      </section>
    </>
  );
}
