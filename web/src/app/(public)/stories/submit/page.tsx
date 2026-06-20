'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHero } from '@/components/public/PageHero';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { submitPublicTestimony } from '@/lib/site-api';
import { toast } from '@/lib/toast-context';

export default function SubmitTestimonyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ authorName: '', title: '', body: '' });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitPublicTestimony(form);
      setDone(true);
      toast.success('Thank you! Your testimony has been submitted for review.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        title="Share Your Testimony"
        subtitle="Your story could encourage someone today"
      />
      <section className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <h2 className="text-lg font-semibold text-emerald-900">Thank you!</h2>
            <p className="mt-2 text-sm text-emerald-800">
              Your testimony has been received and will be reviewed by our team before publishing.
            </p>
            <Link href="/stories" className="mt-4 inline-block text-sm font-semibold text-brand-700">
              ← Back to testimonies
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Input
              label="Your name"
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              required
            />
            <Input
              label="Testimony title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Textarea
              label="Your story"
              rows={8}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
              minLength={20}
              placeholder="Tell us what God has done in your life…"
            />
            <p className="text-xs text-slate-500">
              Submissions are reviewed before appearing on the website.
            </p>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit Testimony'}
            </Button>
          </form>
        )}
      </section>
    </>
  );
}
