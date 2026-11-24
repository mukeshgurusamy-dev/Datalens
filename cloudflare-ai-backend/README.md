# DataLens Cloudflare Workers AI Backend

Zero-cost, serverless LLM backend for DataLens using **Cloudflare Workers AI**.
Runs `@cf/meta/llama-3.1-8b-instruct` (or Llama 3.3 70B) directly at Cloudflare's edge.

- **No OpenAI or Gemini API Keys Required**
- **10,000 free AI requests/day** on Cloudflare's free plan
- **Sub-second edge inference**

---

## 🚀 Quick 2-Minute Deployment

### 1. Log in to Cloudflare from terminal
```bash
npx wrangler login
```
*(This opens your browser. Just click **Allow** on your new Cloudflare account.)*

### 2. Deploy the Worker
```bash
npx wrangler deploy
```

Once deployed, Cloudflare gives you a URL like:
`https://datalens-ai-backend.<your-subdomain>.workers.dev`

### 3. Connect to DataLens
In your DataLens project root `.env`:
```env
VITE_CLOUDFLARE_AI_URL=https://datalens-ai-backend.<your-subdomain>.workers.dev
```
Or paste your Worker URL directly into the AI Settings drawer in the app!
