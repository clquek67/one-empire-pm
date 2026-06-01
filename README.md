# ProDesk PM — One Empire
### Deploy to pm.one-empire.com in 4 steps

---

## What's in this folder

| File | Purpose |
|------|---------|
| `index.html` | The full PM app — all 7 pain points solved |
| `vercel.json` | Vercel deployment config |
| `README.md` | This guide |

---

## Step 1 — Get your Anthropic API key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)
5. Open `index.html` and find this line near the top of the `<script>` tag:

```js
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
```

Add your key as a header (see Step 3 — Vercel handles this securely via environment variables).

---

## Step 2 — Push to GitHub

1. Go to https://github.com and create a new repository called `pm-one-empire`
2. Upload both files (`index.html` and `vercel.json`) to the repo
3. Or use the command line:

```bash
git init
git add .
git commit -m "initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/pm-one-empire.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to https://vercel.com and sign up (free)
2. Click **Add New Project** → Import your GitHub repo
3. Click **Deploy** — Vercel builds it in ~30 seconds
4. You'll get a URL like `pm-one-empire.vercel.app` — this works immediately

**Add your API key as an environment variable:**
- In Vercel dashboard → your project → **Settings** → **Environment Variables**
- Name: `ANTHROPIC_API_KEY`
- Value: your `sk-ant-...` key
- Click Save, then **Redeploy**

> Note: For a purely static HTML app, you'll need a small serverless function
> to proxy the API call (so your key isn't exposed in the browser).
> See the "Secure API" section below.

---

## Step 4 — Connect pm.one-empire.com

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Click **Add Domain** → type `pm.one-empire.com`
3. Vercel will show you a DNS record to add
4. Go to your domain registrar (where one-empire.com is registered)
5. Add a **CNAME record**:
   - Name: `pm`
   - Value: `cname.vercel-dns.com`
6. Wait 5–30 minutes for DNS to propagate
7. Done — `pm.one-empire.com` is live!

---

## Secure API calls (recommended before going public)

To keep your Anthropic API key safe, create a `/api/chat.js` serverless function in Vercel:

```js
// api/chat.js
export default async function handler(req, res) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
}
```

Then in `index.html`, change:
```js
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
```
to:
```js
const ANTHROPIC_API = '/api/chat';
```

This keeps your key on the server — users never see it.

---

## Add login (optional, for paying users)

Use **Supabase Auth** (free):
1. Go to https://supabase.com → create a project
2. Enable Email auth under Authentication settings
3. Add the Supabase JS SDK to `index.html`
4. Wrap the app in a login check

---

## Cost estimate

| Stage | Monthly cost |
|-------|-------------|
| Vercel hosting | Free (Hobby plan) |
| Supabase DB | Free (up to 50k rows) |
| Anthropic API (light usage) | ~$5–20 |
| Anthropic API (10 active users) | ~$30–80 |
| **Total at MVP** | **~$5–80/month** |

At $79/user × 10 users = **$790 MRR** — very healthy margins.

---

## Support

Built with Claude at claude.ai
Questions? Visit one-empire.com
