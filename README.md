# GridAudit

Utility bill auditing platform for SNFs, multifamily, manufacturing, and commercial facilities.

---

## Stack

- **Frontend**: Single-page HTML/JS app (no framework needed)
- **Backend**: Node.js / Express — serves static files and proxies Claude API calls
- **Database + Auth**: Supabase
- **Hosting**: Render
- **AI**: Claude (Anthropic)

---

## Setup: Step by step

### 1. Git — push this project to GitHub

```bash
# In the gridaudit folder:
git init
git add .
git commit -m "Initial commit"

# Create a new repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/gridaudit.git
git branch -M main
git push -u origin main
```

---

### 2. Supabase — set up your database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once it's ready, go to **SQL Editor** in the left sidebar
3. Paste the entire contents of `supabase/migrations/001_initial_schema.sql` and click **Run**
4. Go to **Settings > API** and copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **anon public** key → this is your `SUPABASE_ANON_KEY`

---

### 3. Anthropic — get your API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Under **API Keys**, create a new key
3. Copy it — this is your `CLAUDE_API_KEY`

---

### 4. Render — deploy the app

1. Go to [render.com](https://render.com) and click **New > Web Service**
2. Connect your GitHub repo
3. Configure the service:
   - **Name**: gridaudit (or whatever you like)
   - **Environment**: Node
   - **Build command**: `npm install`
   - **Start command**: `npm start`
4. Under **Environment Variables**, add all three:
   ```
   SUPABASE_URL        = https://your-project-id.supabase.co
   SUPABASE_ANON_KEY   = your-anon-key
   CLAUDE_API_KEY      = sk-ant-your-key
   ```
5. Click **Create Web Service** — Render will build and deploy automatically

---

### 5. Custom subdomain

1. In Render, go to your service > **Settings > Custom Domains**
2. Add `billsentry.gatehousestrategic.com` (or your chosen name)
3. Render will give you a CNAME value — log into your DNS provider and add:
   ```
   Type:  CNAME
   Name:  billsentry
   Value: your-render-app.onrender.com
   ```
4. SSL is automatic — takes ~5 minutes to propagate

---

## Local development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/gridaudit.git
cd gridaudit

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your real keys

# Run locally
npm start
# → http://localhost:3000
```

---

## Project structure

```
gridaudit/
├── public/
│   └── index.html          # Full frontend app
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # DB schema + RLS policies
├── server.js               # Express server + Claude API proxy
├── package.json
├── .env.example            # Environment variable template
├── .gitignore
└── README.md
```

---

## Environment variables

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase > Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Supabase > Settings > API > anon public |
| `CLAUDE_API_KEY` | console.anthropic.com > API Keys |
| `PORT` | Optional — Render sets this automatically |

---

## Roadmap

- [ ] Dispute letter PDF generation
- [ ] Multi-bill upload (batch auditing)
- [ ] Stripe integration for paid tiers
- [ ] Historical savings tracking charts
- [ ] Email report delivery
- [ ] API access for Enterprise tier
