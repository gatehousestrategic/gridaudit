// cron.js — Automated rate schedule verification
// Runs on a schedule via Render cron job or can be triggered via /api/cron endpoint
// Loops through all utilities, scrapes their rate pages, compares to stored data

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key for writes
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'admin@gatehousestrategic.com';

// How many days before a utility's rates are considered stale
const STALE_THRESHOLD_DAYS = 90;
// How many utilities to check per cron run (avoid timeouts)
const BATCH_SIZE = 20;

async function runVerification() {
  console.log(`[${new Date().toISOString()}] Starting rate verification run`);

  const sb = initSupabase();

  // Get utilities due for verification (oldest first, up to BATCH_SIZE)
  const { data: utilities, error } = await sb
    .from('utilities')
    .select('id, name, state_code, type, rate_page_url, puc_filing_url, last_verified_at')
    .not('rate_page_url', 'is', null)
    .order('last_verified_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('Error fetching utilities:', error);
    return;
  }

  console.log(`Checking ${utilities.length} utilities`);

  const results = { updated: 0, current: 0, flagged: 0, errors: 0 };

  for (const utility of utilities) {
    try {
      const result = await verifyUtilityRates(sb, utility);
      results[result]++;
      // Small delay between utilities to avoid rate limiting
      await sleep(2000);
    } catch (e) {
      console.error(`Error verifying ${utility.name}:`, e.message);
      results.errors++;
    }
  }

  console.log(`Verification complete:`, results);

  // Send alert email if anything was flagged
  if (results.flagged > 0) {
    await sendFlagAlert(results.flagged);
  }

  return results;
}

async function verifyUtilityRates(sb, utility) {
  console.log(`Checking ${utility.name} (${utility.state_code})`);

  // Get current stored rate schedules for this utility
  const { data: storedRates } = await sb
    .from('rate_schedules')
    .select('*')
    .eq('utility_id', utility.id);

  // Fetch the utility's rate page
  let pageContent;
  try {
    const res = await fetch(utility.rate_page_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GridAudit rate monitor)' },
      signal: AbortSignal.timeout(15000)
    });
    pageContent = await res.text();
    // Strip HTML tags for cleaner Claude input
    pageContent = pageContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
  } catch (e) {
    await logVerification(sb, utility.id, 'error', null, 'low', null, `Failed to fetch rate page: ${e.message}`);
    return 'errors';
  }

  if (!pageContent || pageContent.length < 100) {
    await logVerification(sb, utility.id, 'error', null, 'low', pageContent, 'Rate page returned insufficient content');
    return 'errors';
  }

  // Ask Claude to compare scraped content to stored rates
  const prompt = buildVerificationPrompt(utility, storedRates, pageContent);
  const claudeResponse = await callClaude(prompt);

  if (!claudeResponse) {
    await logVerification(sb, utility.id, 'error', null, 'low', pageContent, 'Claude API error');
    return 'errors';
  }

  let analysis;
  try {
    const clean = claudeResponse.replace(/```json|```/g, '').trim();
    analysis = JSON.parse(clean);
  } catch (e) {
    await logVerification(sb, utility.id, 'flagged', null, 'low', pageContent, 'Could not parse Claude response');
    return 'flagged';
  }

  if (analysis.status === 'current') {
    // Rates match — update last_verified_at
    await sb.from('utilities').update({
      last_verified_at: new Date().toISOString(),
      verification_status: 'current'
    }).eq('id', utility.id);

    await logVerification(sb, utility.id, 'current', null, analysis.confidence, pageContent, 'No changes detected');
    return 'current';

  } else if (analysis.status === 'updated' && analysis.confidence === 'high') {
    // High confidence changes — auto-update
    await applyRateChanges(sb, utility.id, analysis.changes);

    await sb.from('utilities').update({
      last_verified_at: new Date().toISOString(),
      verification_status: 'current'
    }).eq('id', utility.id);

    await logVerification(sb, utility.id, 'updated', analysis.changes, analysis.confidence, pageContent, 'Rates auto-updated');
    console.log(`Auto-updated rates for ${utility.name}:`, analysis.changes);
    return 'updated';

  } else {
    // Low/medium confidence or uncertain — flag for review
    await sb.from('utilities').update({ verification_status: 'flagged' }).eq('id', utility.id);
    await logVerification(sb, utility.id, 'flagged', analysis.changes, analysis.confidence, pageContent, analysis.notes);
    console.log(`Flagged for review: ${utility.name} — ${analysis.notes}`);
    return 'flagged';
  }
}

function buildVerificationPrompt(utility, storedRates, pageContent) {
  const ratesSummary = storedRates?.length > 0
    ? storedRates.map(r => `- ${r.schedule_code} (${r.schedule_name}): energy=${r.energy_rate_per_kwh || r.energy_rate_per_therm || r.energy_rate_per_ccf}, demand=${r.demand_rate_per_kw || 'N/A'}, customer_charge=${r.customer_charge_monthly}`).join('\n')
    : 'No rates currently stored — this is a new utility entry.';

  return `You are a utility rate analyst. Compare the scraped content from a utility's rate page against our stored rate data.

UTILITY: ${utility.name} (${utility.state_code}) — ${utility.type}
RATE PAGE URL: ${utility.rate_page_url}

CURRENTLY STORED RATES:
${ratesSummary}

SCRAPED PAGE CONTENT:
${pageContent}

Analyze whether the rates on the page match our stored data. Respond ONLY with valid JSON, no markdown:

{
  "status": "current" | "updated" | "uncertain",
  "confidence": "high" | "medium" | "low",
  "changes": [
    {
      "schedule_code": "string",
      "field": "energy_rate_per_kwh | demand_rate_per_kw | customer_charge_monthly | etc",
      "old_value": number or null,
      "new_value": number,
      "effective_date": "YYYY-MM-DD or null"
    }
  ],
  "notes": "Brief explanation of what you found or why you're uncertain"
}

Rules:
- If rates match stored data → status: "current"
- If you found clear rate changes with specific numbers → status: "updated", confidence: "high"  
- If page is unclear, behind a login, PDF-only, or you can't extract specific numbers → status: "uncertain", confidence: "low"
- Only include changes array if status is "updated"
- Be conservative — only flag as "updated" with high confidence if you see explicit rate tables with clear numbers`;
}

async function applyRateChanges(sb, utilityId, changes) {
  for (const change of changes) {
    const updateData = { [change.field]: change.new_value, updated_at: new Date().toISOString() };
    if (change.effective_date) updateData.effective_date = change.effective_date;

    await sb.from('rate_schedules')
      .update(updateData)
      .eq('utility_id', utilityId)
      .eq('schedule_code', change.schedule_code);
  }
}

async function logVerification(sb, utilityId, status, changes, confidence, rawContent, notes) {
  await sb.from('rate_verifications').insert({
    utility_id: utilityId,
    status,
    changes_detected: changes,
    claude_confidence: confidence,
    raw_scraped_content: rawContent?.slice(0, 5000),
    notes
  });
}

async function sendFlagAlert(flagCount) {
  // In production, send via SendGrid, Resend, or similar
  // For now, just log — wire up email service when ready
  console.log(`ALERT: ${flagCount} utilities flagged for manual rate review. Check admin panel.`);
  // TODO: integrate email service
  // await sendEmail(ALERT_EMAIL, `GridAudit: ${flagCount} utilities need rate review`, ...)
}

async function callClaude(prompt) {
  try {
    const response = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch (e) {
    console.error('Claude API error:', e);
    return null;
  }
}

function initSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { runVerification };

// Run directly if called as script
if (require.main === module) {
  runVerification().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
