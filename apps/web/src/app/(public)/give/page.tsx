import { fetchPublicGiving } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';
import { CmsHtml } from '@/components/public/CmsHtml';
import { GiveOnlineClient } from '@/components/public/GiveOnlineClient';

export default async function GivePage() {
  const giving = await fetchPublicGiving();

  return (
    <>
      <PageHero
        title={giving?.page?.title ?? 'Online Giving'}
        subtitle={giving?.page?.subtitle ?? 'Give cheerfully and support the work of the ministry'}
      />
      <section className="mx-auto max-w-3xl space-y-10 px-4 py-14 sm:px-6">
        {giving?.intro && (
          <p className="text-lg text-slate-700">{giving.intro}</p>
        )}
        {giving?.page?.body && <CmsHtml html={giving.page.body} />}

        {(giving?.bankName || giving?.accountNumber) && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <h2 className="text-lg font-bold text-slate-900">Bank Transfer</h2>
            {giving.instructions && (
              <p className="mt-2 text-sm text-slate-600">{giving.instructions}</p>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              {giving.bankName && (
                <div className="flex justify-between gap-4 border-b border-brand-100 py-2">
                  <dt className="text-slate-500">Bank</dt>
                  <dd className="font-medium text-slate-900">{giving.bankName}</dd>
                </div>
              )}
              {giving.accountName && (
                <div className="flex justify-between gap-4 border-b border-brand-100 py-2">
                  <dt className="text-slate-500">Account name</dt>
                  <dd className="font-medium text-slate-900">{giving.accountName}</dd>
                </div>
              )}
              {giving.accountNumber && (
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">Account number</dt>
                  <dd className="font-mono font-semibold text-brand-800">{giving.accountNumber}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {giving?.paystackEnabled && giving.paystackPublicKey && (
          <GiveOnlineClient
            publicKey={giving.paystackPublicKey}
            currency={giving.currency}
          />
        )}
      </section>
    </>
  );
}
