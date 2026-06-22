const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { runVerification } = require('./cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// ── SUPABASE CLIENTS ─────────────────────────────────────────
const supabaseAnon = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

const supabaseService = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// ── INJECT CONFIG INTO HTML ──────────────────────────────────
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const config = `<script>window.__GA_CONFIG = ${JSON.stringify({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  })};</script>`;
  html = html.replace(
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n' + config
  );
  res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── ADMIN AUTH ────────────────────────────────────────────────
app.post('/api/admin-auth', (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'ADMIN_PASSWORD not configured' });
  }
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.json({ ok: false });
  }
});

// ── RATE LOOKUP ───────────────────────────────────────────────
app.get('/api/counties/:stateCode', async (req, res) => {
  if (!supabaseAnon) return res.json({ counties: [] });
  const { data, error } = await supabaseAnon
    .from('counties')
    .select('id, name')
    .eq('state_code', req.params.stateCode.toUpperCase())
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ counties: data });
});

app.get('/api/utilities/:countyId', async (req, res) => {
  if (!supabaseAnon) return res.json({ utilities: [] });
  const { data, error } = await supabaseAnon
    .from('utility_counties')
    .select('utility_id, utilities(id, name, type, last_verified_at, verification_status)')
    .eq('county_id', req.params.countyId);
  if (error) return res.status(500).json({ error: error.message });
  const utilities = data.map(d => d.utilities).filter(Boolean);
  res.json({ utilities });
});

app.get('/api/rates/:utilityId', async (req, res) => {
  if (!supabaseAnon) return res.json({ rates: [] });
  const { data, error } = await supabaseAnon
    .from('rate_schedules')
    .select('*')
    .eq('utility_id', req.params.utilityId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rates: data });
});

// ── AUDIT ENDPOINT ────────────────────────────────────────────
app.post('/api/audit', async (req, res) => {
  const { messages, utilityId, stateCode, facilityType } = req.body;

  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY not configured' });
  }

  let rateContext = '';
  if (utilityId && supabaseAnon) {
    try {
      const [ratesRes, utilityRes, exemptionsRes] = await Promise.all([
        supabaseAnon.from('rate_schedules').select('*').eq('utility_id', utilityId),
        supabaseAnon.from('utilities').select('name, type, last_verified_at, verification_status').eq('id', utilityId).single(),
        stateCode && facilityType
          ? supabaseAnon.from('facility_exemptions').select('*').eq('state_code', stateCode).eq('facility_type', facilityType)
          : Promise.resolve({ data: [] })
      ]);
      if (ratesRes.data?.length > 0) {
        rateContext = buildRateContext(utilityRes.data, ratesRes.data, exemptionsRes.data);
      }
    } catch (e) {
      console.error('Error fetching rate context:', e);
    }
  }

  const enrichedMessages = injectRateContext(messages, rateContext);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: enrichedMessages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(response.status).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function buildRateContext(utility, rates, exemptions) {
  const verifiedDate = utility?.last_verified_at
    ? new Date(utility.last_verified_at).toLocaleDateString()
    : 'not yet verified';

  let ctx = `\n\n=== AUTHORITATIVE RATE SCHEDULE DATA ===\n`;
  ctx += `Utility: ${utility?.name}\nLast verified: ${verifiedDate}\nStatus: ${utility?.verification_status}\n\n`;
  ctx += `PUBLISHED RATE SCHEDULES:\n`;

  for (const r of rates) {
    ctx += `\n[${r.schedule_code}] ${r.schedule_name}\n`;
    ctx += `  Eligible: ${(r.customer_classes||[]).join(', ')}\n`;
    if (r.energy_rate_per_kwh) ctx += `  Energy: $${r.energy_rate_per_kwh}/kWh\n`;
    if (r.energy_rate_per_therm) ctx += `  Energy: $${r.energy_rate_per_therm}/therm\n`;
    if (r.energy_rate_per_ccf) ctx += `  Energy: $${r.energy_rate_per_ccf}/CCF\n`;
    if (r.demand_rate_per_kw) ctx += `  Demand: $${r.demand_rate_per_kw}/kW\n`;
    if (r.demand_ratchet_pct) ctx += `  Ratchet: ${r.demand_ratchet_pct}% / ${r.demand_ratchet_months||12}mo\n`;
    if (r.customer_charge_monthly) ctx += `  Customer charge: $${r.customer_charge_monthly}/mo\n`;
    if (r.sales_tax_rate) ctx += `  Sales tax: ${r.sales_tax_rate}%\n`;
    if (r.sales_tax_exempt_classes?.length) ctx += `  Tax exempt for: ${r.sales_tax_exempt_classes.join(', ')}\n`;
    if (r.fuel_adjustment_rate) ctx += `  Fuel adj: $${r.fuel_adjustment_rate} (${r.fuel_adjustment_method})\n`;
    if (r.effective_date) ctx += `  Effective: ${r.effective_date}\n`;
  }

  if (exemptions?.length > 0) {
    ctx += `\nEXEMPTIONS FOR THIS FACILITY TYPE:\n`;
    for (const ex of exemptions) {
      ctx += `- ${ex.exemption_type}: ${ex.exemption_pct}% exempt`;
      if (ex.requires_certificate) ctx += ` (requires form ${ex.certificate_form})`;
      if (ex.notes) ctx += ` — ${ex.notes}`;
      ctx += '\n';
    }
  }

  ctx += `\n=== END RATE DATA ===\n`;
  ctx += `Use the above authoritative data when analyzing the bill. Flag any discrepancy between what was billed and the published rates above, with the exact dollar difference.\n`;
  return ctx;
}

function injectRateContext(messages, rateContext) {
  if (!rateContext) return messages;
  return messages.map((msg, i) => {
    if (i === messages.length - 1 && msg.role === 'user') {
      const content = Array.isArray(msg.content)
        ? [...msg.content, { type: 'text', text: rateContext }]
        : msg.content + rateContext;
      return { ...msg, content };
    }
    return msg;
  });
}

// ── CRON ENDPOINT ─────────────────────────────────────────────
app.post('/api/cron/verify-rates', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ status: 'started' });
  runVerification().catch(e => console.error('Cron error:', e));
});

// ── FALLBACK ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GridAudit running on port ${PORT}`);
});
