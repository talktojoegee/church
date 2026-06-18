'use client';

import { useState } from 'react';
import { Calendar, MapPin, Users, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { registerPublicEvent } from '@/lib/site-api';
import { toast } from '@/lib/toast-context';
import type { PublicEventDetail } from '@/lib/site-api';

interface EventRegisterFormProps {
  eventId: string;
  canRegister: boolean;
}

export function EventRegisterForm({ eventId, canRegister }: EventRegisterFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!canRegister) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        Registration is closed for this event.
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle className="mx-auto mb-2 text-emerald-600" size={40} />
        <h3 className="font-semibold text-emerald-900">You&apos;re registered!</h3>
        <p className="mt-1 text-sm text-emerald-800">We look forward to seeing you.</p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registerPublicEvent(eventId, { guestName: name, guestPhone: phone || undefined });
      setDone(true);
      toast.success('Successfully registered!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-6">
      <h3 className="font-bold text-brand-900">Register for this event</h3>
      <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        label="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Registering…' : 'Register Now'}
      </Button>
    </form>
  );
}

export function EventDetailInfo({ event }: { event: PublicEventDetail }) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-NG', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-brand-700">
        <Calendar size={18} className="text-gold" />
        {formatDate(event.startAt)}
      </p>
      {event.location && (
        <p className="flex items-center gap-2 text-slate-600">
          <MapPin size={18} />
          {event.location}
        </p>
      )}
      {event.branchName && (
        <p className="text-sm text-slate-500">Campus: {event.branchName}</p>
      )}
      {event.capacity != null && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Users size={16} />
          {event.registrationCount} registered
          {event.spotsLeft != null && ` · ${event.spotsLeft} spots left`}
        </p>
      )}
      {event.description && (
        <p className="mt-4 leading-relaxed text-slate-700">{event.description}</p>
      )}
    </div>
  );
}
