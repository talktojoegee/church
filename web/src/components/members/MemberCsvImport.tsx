'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast-context';
import { Button } from '@/components/ui/Button';

const CSV_TEMPLATE = `firstName,lastName,middleName,email,phone,gender,status,pastoralRole,city,state,address,occupation,branchCode
John,Doe,,john@example.com,08012345678,MALE,MEMBER,NONE,Lagos,Lagos,12 Main St,Engineer,HQ
Jane,Smith,,jane@example.com,08098765432,FEMALE,WORKER,PASTOR,Abuja,FCT,,Teacher,HQ`;

export function MemberCsvImport({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post('/members/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;
    },
    meta: { skipSuccessToast: true, errorMessage: 'Failed to import members' },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Imported ${data.created} member(s), ${data.skipped} skipped`);
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['member-stats'] });
    },
  });

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <FileSpreadsheet className="mx-auto mb-3 text-slate-400" size={36} />
        <p className="text-sm text-slate-600">
          Upload a CSV file with member details. Use the template for the correct column headers.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Required: firstName, lastName. Optional: email, phone, gender, status, pastoralRole (PASTOR / ASSISTANT_PASTOR), branchCode
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download size={14} /> Download template
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setResult(null);
                importMut.mutate(f);
              }
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            size="sm"
            loading={importMut.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} /> Choose CSV file
          </Button>
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium text-slate-900">
            Import complete: {result.created} created, {result.skipped} skipped
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-rose-600">
              {result.errors.map((e, i: number) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          {result ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </div>
  );
}
