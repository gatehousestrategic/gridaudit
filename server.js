const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Inject config into index.html — Supabase anon key is safe to expose,
// Claude API key stays server-side only
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const config = `<script>window.__GA_CONFIG = ${JSON.stringify({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  })};</script>`;
  html = html.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', 
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n' + config);
  res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));

// Health check — used by the loading page to detect when server is warm
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy endpoint — keeps CLAUDE_API_KEY server-side, never exposed to browser
app.post('/api/audit', async (req, res) => {
  const { messages } = req.body;

  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY not configured' });
  }

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
        messages
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

// Fallback — serve index.html for any unknown route (SPA behaviour)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GridAudit running on port ${PORT}`);
});
