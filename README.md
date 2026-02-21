# Contextify — Prompt Security Scanner

Scan text for secrets and sensitive data before sending it to AI. Uses regex pattern detection and optional AI-powered analysis.

**→ [Architecture diagram & how it works](docs/ARCHITECTURE.md)** (Mermaid flow + sequence diagrams)

## Run locally (frontend only)

Regex scanning works fully offline. No API keys needed for the scanner.

```bash
npm install
npm run dev
```

Open http://localhost:8080 and paste text into the input, then click **Scan**.

## Optional: AI analysis (Supabase Edge Function)

To enable the “AI Security Analysis” panel:

1. **Supabase project**  
   Create a project at [supabase.com](https://supabase.com) and get your project URL and anon key.

2. **Environment**  
   In the app root, create `.env`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   ```

3. **Edge function secrets**  
   In Supabase: Project → Edge Functions → `scan-analyze` → Secrets. Add:

   - **AI_API_KEY** or **OPENAI_API_KEY** – your OpenAI (or compatible) API key.

   Optional:

   - **AI_GATEWAY_URL** – override the AI endpoint (default: `https://api.openai.com/v1/chat/completions`).
   - **AI_MODEL** – model name (default: `gpt-4o-mini`).

4. **Deploy the function**  
   From the repo root:

   ```bash
   supabase functions deploy scan-analyze
   ```

5. **Enable AI in the app**  
   In your `.env`, add:

   ```env
   VITE_AI_ANALYSIS_ENABLED=true
   ```

   Then restart the dev server. Without this, the app only runs the regex scanner and shows a short message in the AI panel instead of calling the API.

## Tech stack

- Vite, TypeScript, React
- shadcn-ui, Tailwind CSS
- Supabase (optional, for AI edge function)
