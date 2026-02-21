# Contextify — Complete Detection Specification

This is the **authoritative detection doctrine** for Contextify. Regex engine and AI analysis both follow these bands and rules.

---

## Risk Bands

| Band | Score | Meaning |
|------|--------|--------|
| 🔴 HIGH | 75–100 | Credentials / secrets / immediate exploitability |
| 🟡 MEDIUM | 30–60 | Confidential context / internal exposure (no direct exploit) |
| 🟢 LOW | 0–25 | Public / educational / generic — do not inflate |

---

## 🔴 HIGH RISK (minimum 75 when detected)

- **Cloud**: AWS (Access Key, Secret, Session Token, S3 signed URLs), GCP (API key, service account JSON), Azure (AccountKey, SAS, connection strings)
- **Payment**: Stripe `sk_live_` / restricted keys, PayPal, Square, Braintree
- **Developer**: GitHub `ghp_`, GitLab, Bitbucket, NPM, DockerHub
- **Auth**: `api_key=`, `secret=`, `access_token=`, `Authorization: Bearer`, long tokens in key fields
- **Database**: Full connection strings (postgres/mysql/mongodb with user:pass@host)
- **Keys**: PEM private keys, PGP, PFX/certificate dumps
- **Full JWT** (3 segments) → HIGH; **partial JWT** (2 segments) → MEDIUM
- **OAuth**: Google `ya29.`, Slack `xoxb-`, Discord, Facebook
- **Code**: Hardcoded `PASSWORD = "..."` / `SECRET = "..."` when value looks like a credential
- **Infra**: VPN credentials, admin panel URLs + credentials, production/root credentials

---

## 🟡 MEDIUM RISK (30–60)

- **Internal domains**: `.internal`, `.local`, `.corp`, `.lan`, private hostnames
- **Infrastructure**: Production server names, DB hostnames, S3 bucket names, internal API endpoints, K8s, internal IPs (10.x, 192.168.x, 172.16–31.x)
- **Partial config**: Host without password, env var names, CI/CD secret names (no value)
- **Business/strategy**: Roadmaps, pivot strategies, revenue, user metrics, fundraising, acquisition, KPIs, competitive weaknesses
- **Proprietary technical**: Custom algorithms, model architecture, fraud/risk logic, internal weighting — but generic descriptions → LOW
- **Partial JWT** (2 segments only)
- **Internal emails**: e.g. `ceo@company.internal`
- **Access control mentions**: “Admin dashboard”, “Root access”, “Privileged API” without credentials

---

## 🟢 LOW RISK (0–25)

Do **not** inflate score for: programming Qs, public product text, generic architecture, open-source refs, docs, public cloud mentions, educational content, code examples without secrets.

---

## AI Classification Rules

1. Assign **HIGH (75–100)** only if credentials or exploit-ready info exists.
2. Assign **MEDIUM (30–60)** for contextual, non-exploitable exposure.
3. Assign **LOW (0–25)** for general descriptions and public content.
4. **Never exceed 30** if no sensitive elements exist.
5. AI outputs first line: `RISK_SCORE: N` (0–100), then RISK SUMMARY, FINDINGS, RECOMMENDATIONS.

---

## Final Score Logic

```
if (regexHighDetected) {
  finalScore = min(100, max(regexScore, 75))
} else {
  finalScore = min(100, contextualRiskScore)  // AI + regex medium
}
```

Cap at 100.

---

## Implementation

- **Scanner** (`src/lib/scanner.ts`): All HIGH/MEDIUM regex patterns; `hasHighRiskMatch`; if any HIGH match, `totalScore = max(rawScore, 75)`.
- **Backend** (`supabase/functions/scan-analyze/index.ts`): System prompt enforces bands and rules above; first line `RISK_SCORE: N`.
- **Frontend** (`RiskGauge`): If `result.hasHighRiskMatch` → display `max(regexScore, 75)`; else display `max(regexScore, aiRiskScore)`.

---

## Enterprise Expansion (Optional Future)

Twilio, SendGrid, Firebase, Supabase keys, Notion, Airtable, Shopify, Heroku, Vercel, Terraform state, `.env` dumps, K8s secrets YAML, Docker/Helm secrets, GitHub Actions secrets, base64/encoded secrets in JSON.
