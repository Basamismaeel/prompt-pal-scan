

# PromptGuard — Prompt Security Scanner

## Overview
A developer-focused security dashboard that scans user text for sensitive secrets, credentials, and confidential information before it's sent to an AI model. Features a dark, terminal-inspired UI with dashboard-style layout, regex-based pattern detection, risk scoring, and real-time AI-powered analysis via Lovable AI.

---

## Pages & Layout

### Single-Page Dashboard (dark theme, dev-tool aesthetic)
- **Top bar**: PromptGuard branding with a shield icon, dark background
- **Left panel**: Large text input area (code-editor style with monospace font, line numbers) where users paste text to scan
- **Right panel**: Results dashboard with:
  - **Risk Score Gauge** (0–100) with color coding: green (safe 0–30), yellow (warning 31–60), red (high risk 61–100)
  - **Detected Items List** — each match shown as a card with: pattern type, matched value (partially masked), line/character location, and severity badge
  - **Highlighted Preview** — the original text re-rendered with sensitive parts highlighted in red/yellow/green based on severity
  - **AI Analysis Section** — a streaming AI explanation of the risks found, in a terminal-style output box

### Scan Button
- Prominent "Scan" button triggers both regex analysis and AI analysis simultaneously

---

## Core Features

### 1. Regex Pattern Scanner
Detects the following patterns with categorized severity:

**High Risk (adds 20–30 points each):**
- AWS Access Keys (`AKIA...`)
- AWS Secret Keys
- GitHub tokens (`ghp_`, `gho_`, `ghs_`, `ghu_`, `ghr_`)
- Stripe secret keys (`sk_live_...`)
- Generic API keys / secret patterns
- Database connection strings (PostgreSQL, MySQL, MongoDB URIs)
- Private SSH/PGP keys
- JWT tokens

**Medium Risk (adds 5–15 points each):**
- Email addresses
- Internal/private domain URLs (e.g., `*.internal`, `*.local`, `10.x.x.x`, `192.168.x.x`)
- IP addresses
- Bearer tokens in headers

### 2. Risk Scoring System
- Each detected pattern contributes to a cumulative score (capped at 100)
- Final score categorized as: **Safe** (0–30), **Warning** (31–60), **High Risk** (61–100)
- Visual gauge/meter reflects the score with color transitions

### 3. AI-Powered Analysis (via Lovable AI)
- After regex scan, the text + detected findings are sent to an edge function
- The LLM provides a human-readable explanation of:
  - Which parts are sensitive and why
  - Contextual risks (e.g., "This looks like a production database URL")
  - Recommendations (e.g., "Replace with environment variable references")
- Streamed response displayed in a terminal-style output panel

### 4. Highlighted Text Preview
- Original text displayed with inline highlighting:
  - Red highlights for high-risk matches
  - Yellow for medium-risk
  - Tooltips on hover showing the pattern type and risk level

---

## Backend (Lovable Cloud)

### Edge Function: `scan-analyze`
- Receives the text and regex findings
- Calls Lovable AI gateway with a security-analysis prompt
- Streams the AI explanation back to the frontend
- Handles rate limits (429) and payment errors (402) gracefully

---

## Test Examples (built into the UI)
- Three pre-loaded example inputs accessible via buttons:
  1. **Clean text** — no secrets → Safe score
  2. **Mixed** — contains an email and internal URL → Warning score
  3. **Dangerous** — contains AWS keys, GitHub token, DB connection string → High Risk score

---

## Design
- Dark theme with monospace fonts (terminal aesthetic)
- Accent colors: green for safe, amber for warning, red for danger
- Card-based layout for detected items
- Animated risk gauge
- Subtle glow effects on risk indicators

