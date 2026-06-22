#!/usr/bin/env node
/**
 * API end-to-end smoke tests — hits public + authenticated endpoints as super admin.
 * Usage: node scripts/e2e-api.mjs
 */
const BASE = process.env.API_URL ?? 'http://localhost:4000/api';
const EMAIL = process.env.E2E_EMAIL ?? 'admin@church.local';
const PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe123!';

const results = { pass: 0, fail: 0, skip: 0, errors: [] };

function firstId(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0]?.id ?? null;
  if (Array.isArray(data.items)) return data.items[0]?.id ?? null;
  if (Array.isArray(data.data)) return data.data[0]?.id ?? null;
  return null;
}

async function req(method, path, { token, body, formData, expect = [200, 201, 204], label } = {}) {
  const url = `${BASE}${path}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  const ok = expect.includes(res.status);
  const name = label ?? `${method} ${path}`;
  if (ok) {
    results.pass++;
    console.log(`  ✓ ${name} (${res.status})`);
  } else {
    results.fail++;
    const msg = typeof json === 'object' ? JSON.stringify(json).slice(0, 200) : String(json).slice(0, 200);
    results.errors.push({ name, status: res.status, body: msg });
    console.log(`  ✗ ${name} (${res.status}) ${msg}`);
  }
  return { res, json, ok };
}

async function section(title, fn) {
  console.log(`\n## ${title}`);
  await fn();
}

async function main() {
  console.log(`API E2E → ${BASE}`);
  let token;
  const ids = {};

  await section('Public', async () => {
    await req('GET', '/health', { label: 'health' });
    await req('GET', '/settings/public', { label: 'settings public' });
    await req('GET', '/site/public/home', { label: 'site home' });
    await req('GET', '/site/public/about', { label: 'site about' });
    await req('GET', '/site/public/events', { label: 'site events' });
    await req('GET', '/site/public/sermons', { label: 'site sermons' });
    await req('GET', '/site/public/testimonies', { label: 'site testimonies' });
    await req('GET', '/site/public/outreaches', { label: 'site outreaches' });
    await req('GET', '/site/public/gallery', { label: 'site gallery' });
    await req('GET', '/site/public/giving', { label: 'site giving' });
    await req('GET', '/site/public/pages/about', { label: 'site page about' });
  });

  await section('Auth', async () => {
    const login = await req('POST', '/auth/login', {
      body: { email: EMAIL, password: PASSWORD },
      label: 'login',
    });
    token = login.json?.accessToken;
    if (!token) throw new Error('Login failed — no access token');
    await req('GET', '/auth/me', { token, label: 'auth me' });
    await req('GET', '/auth/me/profile', { token, label: 'auth profile' });
    await req('GET', '/notifications', { token, label: 'notifications' });
    await req('GET', '/notifications/unread-count', { token, label: 'notifications unread' });
  });

  await section('Org & access', async () => {
    const branches = await req('GET', '/branches', { token });
    ids.branch = firstId(branches.json);
    if (ids.branch) await req('GET', `/branches/${ids.branch}`, { token });
    if (ids.branch) await req('GET', `/branches/${ids.branch}/details`, { token });

    await req('GET', '/departments', { token });
    await req('GET', '/roles', { token });
    await req('GET', '/roles/permissions', { token });
    await req('GET', '/users', { token });
    await req('GET', '/settings/church', { token });
    await req('GET', '/settings', { token });
    await req('GET', '/audit', { token });
  });

  await section('Membership', async () => {
    const members = await req('GET', '/members', { token });
    ids.member = firstId(members.json);
    await req('GET', '/members/stats', { token });
    if (ids.member) await req('GET', `/members/${ids.member}`, { token });

    const groups = await req('GET', '/groups', { token });
    ids.group = firstId(groups.json);
    if (ids.group) await req('GET', `/groups/${ids.group}`, { token });
    if (ids.group) await req('GET', `/groups/${ids.group}/activity`, { token });

    await req('GET', '/follow-ups', { token });
    await req('GET', '/follow-ups/stats', { token });
    await req('GET', '/follow-ups/campaigns', { token });
  });

  await section('Engagement', async () => {
    await req('GET', '/attendance', { token });
    await req('GET', '/attendance/stats', { token });
    const events = await req('GET', '/events', { token });
    ids.event = firstId(events.json);
    await req('GET', '/events/stats', { token });
    if (ids.event) await req('GET', `/events/${ids.event}`, { token });
  });

  await section('Content', async () => {
    const sermons = await req('GET', '/sermons', { token });
    ids.sermon = firstId(sermons.json);
    await req('GET', '/sermons/stats', { token });
    if (ids.sermon) await req('GET', `/sermons/${ids.sermon}`, { token });

    await req('GET', '/sermon-series', { token });
    await req('GET', '/sermon-series/playlists', { token });

    const testimonies = await req('GET', '/testimonies', { token });
    ids.testimony = firstId(testimonies.json);
    await req('GET', '/testimonies/stats', { token });
    await req('GET', '/testimony-categories', { token });

    const outreaches = await req('GET', '/outreaches', { token });
    ids.outreach = firstId(outreaches.json);
    await req('GET', '/outreaches/stats', { token });
    await req('GET', '/outreach-types', { token });
  });

  await section('Finance', async () => {
    const funds = await req('GET', '/finance/funds', { token });
    ids.fund = firstId(funds.json);
    await req('GET', '/finance/funds/stats', { token });
    await req('GET', '/finance/contributions', { token });
    await req('GET', '/finance/contributions/stats', { token });
    await req('GET', '/finance/expenses', { token });
    await req('GET', '/finance/expenses/stats', { token });
    await req('GET', '/finance/pledges', { token });
    await req('GET', '/finance/pledges/stats', { token });
    await req('GET', '/finance/summary', { token });
    await req('GET', '/finance/giving-types', { token });
    await req('GET', '/finance/expense-categories', { token });
    await req('GET', '/finance/import/template', { token, expect: [200] });
  });

  await section('HR & payroll', async () => {
    await req('GET', '/hr/employees', { token });
    await req('GET', '/hr/employees/stats', { token });
    await req('GET', '/hr/leave', { token });
    await req('GET', '/hr/leave/stats', { token });
    await req('GET', '/hr/payroll', { token });
    await req('GET', '/hr/payroll/stats', { token });
    if (ids.branch) {
      const period = new Date().toISOString().slice(0, 7);
      await req('GET', `/hr/payroll/period-adjustments?branchId=${ids.branch}&period=${period}`, { token });
    }
  });

  await section('Comms & SMS', async () => {
    await req('GET', '/comms/templates', { token });
    await req('GET', '/comms/messages', { token });
    await req('GET', '/bulksms/wallet', { token });
    await req('GET', '/bulksms/wallet/transactions', { token });
    await req('GET', '/bulksms/phone-groups', { token });
    await req('GET', '/bulksms/sender-ids', { token });
    await req('GET', '/bulksms/schedules', { token });
    await req('GET', '/bulksms/history', { token });
  });

  await section('Reports & site admin', async () => {
    await req('GET', '/reports/overview', { token });
    await req('GET', '/reports/membership-growth', { token });
    await req('GET', '/reports/finance', { token });
    await req('GET', '/reports/data?type=members', { token });
    await req('GET', '/site/slides', { token });
    await req('GET', '/site/sections', { token });
    await req('GET', '/site/pages', { token });
    await req('GET', '/site/gallery', { token });
    await req('GET', '/site/giving', { token });
    await req('GET', '/site/about', { token });
    await req('GET', '/site/contact-messages', { token });
  });

  await section('Uploads', async () => {
    const form = new FormData();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    form.append('file', new Blob([png], { type: 'image/png' }), 'e2e-test.png');
    const upload = await req('POST', '/uploads', { token, formData: form, expect: [200, 201] });
    const filename = upload.json?.filename;
    if (filename) {
      await req('GET', `/uploads/files/${filename}`, { label: 'serve uploaded file', expect: [200] });
    }
  });

  await section('Write smoke (create + delete)', async () => {
    if (!ids.branch) {
      results.skip++;
      console.log('  ~ skip write smoke — no branch id');
      return;
    }
    const created = await req('POST', '/members', {
      token,
      body: {
        firstName: 'E2E',
        lastName: 'Test',
        email: `e2e-${Date.now()}@test.local`,
        branchId: ids.branch,
        status: 'MEMBER',
      },
      expect: [200, 201],
    });
    const newId = created.json?.id;
    if (newId) {
      await req('GET', `/members/${newId}`, { token });
      await req('DELETE', `/members/${newId}`, { token, expect: [200, 204] });
    }
  });

  console.log('\n========================================');
  console.log(`PASS: ${results.pass}  FAIL: ${results.fail}  SKIP: ${results.skip}`);
  if (results.errors.length) {
    console.log('\nFailures:');
    for (const e of results.errors) {
      console.log(`  - ${e.name}: HTTP ${e.status} — ${e.body}`);
    }
    process.exit(1);
  }
  console.log('All API E2E checks passed.');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
