'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useBranches, useDepartments } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import { Checkbox } from '@/components/ui/Checkbox';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import {
  GENDERS,
  MARITAL_STATUSES,
  MEMBER_STATUSES,
  PASTORAL_ROLES,
  humanize,
} from '@/lib/constants';

export interface MemberFormValues {
  id?: string;
  firstName: string;
  lastName: string;
  middleName: string;
  branchId: string;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  status: string;
  pastoralRole: string;
  email: string;
  phone: string;
  altPhone: string;
  address: string;
  city: string;
  state: string;
  occupation: string;
  employer: string;
  emergencyName: string;
  emergencyPhone: string;
  notes: string;
  photoUrl: string;
  isBaptizedWater: boolean;
  isBaptizedSpirit: boolean;
  baptismDate: string;
  departmentIds: string[];
}

export const emptyMember: MemberFormValues = {
  firstName: '',
  lastName: '',
  middleName: '',
  branchId: '',
  gender: '',
  dateOfBirth: '',
  maritalStatus: '',
  status: 'MEMBER',
  pastoralRole: 'NONE',
  email: '',
  phone: '',
  altPhone: '',
  address: '',
  city: '',
  state: '',
  occupation: '',
  employer: '',
  emergencyName: '',
  emergencyPhone: '',
  notes: '',
  photoUrl: '',
  isBaptizedWater: false,
  isBaptizedSpirit: false,
  baptismDate: '',
  departmentIds: [],
};

export function MemberForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: MemberFormValues;
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const branches = useBranches();
  const [form, setForm] = useState<MemberFormValues>(initial);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const departments = useDepartments(form.branchId || undefined);

  const set = (k: keyof MemberFormValues, v: string | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      if (form.id) {
        delete payload.id;
        delete payload.branchId;
        return api.patch(`/members/${form.id}`, payload);
      }
      return api.post('/members', payload);
    },
    meta: {
      successMessage: form.id ? 'Member updated' : 'Member created',
      errorMessage: 'Failed to save member',
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['member-stats'] });
      if (form.id) qc.invalidateQueries({ queryKey: ['member', form.id] });
      onDone();
    },
  });

  // Default branch selection
  if (!form.branchId && branches.data?.length) {
    const main = branches.data.find((b) => b.isMain) ?? branches.data[0];
    set('branchId', main.id);
  }

  const toggleDept = (id: string) =>
    set(
      'departmentIds',
      form.departmentIds.includes(id)
        ? form.departmentIds.filter((d) => d !== id)
        : [...form.departmentIds, id],
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-5"
    >
      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Personal</h4>
        <div className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center">
          <MemberAvatar
            photoUrl={photoPreview || form.photoUrl}
            firstName={form.firstName || 'New'}
            lastName={form.lastName || 'Member'}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <FileUpload
              label="Profile photo"
              accept="image/*"
              value={form.photoUrl}
              onChange={(url) => set('photoUrl', url)}
              onPreviewChange={setPhotoPreview}
              hint="JPEG, PNG or WebP. Max 50 MB. Preview updates as soon as you pick a file."
              preview={false}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="First name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          <Input label="Middle name" value={form.middleName} onChange={(e) => set('middleName', e.target.value)} />
          <Input label="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          <Select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {humanize(g)}
              </option>
            ))}
          </Select>
          <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          <Select label="Marital status" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
            <option value="">—</option>
            {MARITAL_STATUSES.map((m) => (
              <option key={m} value={m}>
                {humanize(m)}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Membership</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Branch" value={form.branchId} onChange={(e) => set('branchId', e.target.value)} disabled={!!form.id} required>
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {MEMBER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
          <Select label="Pastoral role" value={form.pastoralRole} onChange={(e) => set('pastoralRole', e.target.value)}>
            {PASTORAL_ROLES.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Contact</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input label="Alt phone" value={form.altPhone} onChange={(e) => set('altPhone', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
          <Input label="Occupation" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
          <Input label="Employer" value={form.employer} onChange={(e) => set('employer', e.target.value)} />
        </div>
        <div className="mt-4">
          <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Spiritual</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Baptism date" type="date" value={form.baptismDate} onChange={(e) => set('baptismDate', e.target.value)} />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            <Checkbox
              checked={form.isBaptizedWater}
              onChange={(e) => setForm((f) => ({ ...f, isBaptizedWater: e.target.checked }))}
            />
            Water baptism
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            <Checkbox
              checked={form.isBaptizedSpirit}
              onChange={(e) => setForm((f) => ({ ...f, isBaptizedSpirit: e.target.checked }))}
            />
            Holy Spirit baptism
          </label>
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Emergency contact</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Contact name" value={form.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} />
          <Input label="Emergency phone" value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} />
        </div>
      </section>

      {departments.data && departments.data.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-700">Departments</h4>
          <div className="flex flex-wrap gap-2">
            {departments.data.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => toggleDept(d.id)}
                className={
                  form.departmentIds.includes(d.id)
                    ? 'rounded-full bg-brand-600 px-3 py-1 text-sm text-white'
                    : 'rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200'
                }
              >
                {d.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {form.id ? 'Save changes' : 'Add member'}
        </Button>
      </div>
    </form>
  );
}
