// Contextify Regex Scanner
// Complete Detection Specification: HIGH (75–100), MEDIUM (30–60), LOW (0–25)

export type Severity = "high" | "medium";

export interface ScanMatch {
  id: string;
  pattern: string;
  label: string;
  matched: string;
  masked: string;
  severity: Severity;
  score: number;
  line: number;
  column: number;
  startIndex: number;
  endIndex: number;
}

export interface ScanResult {
  matches: ScanMatch[];
  totalScore: number;
  riskLevel: "safe" | "warning" | "high-risk";
  /** True if any HIGH-risk pattern was detected (triggers minimum score 75). */
  hasHighRiskMatch: boolean;
}

interface PatternDef {
  label: string;
  regex: RegExp;
  severity: Severity;
  score: number;
}

const HIGH_MIN_SCORE = 75;

// --- HIGH RISK — Credentials / Secrets / Immediate Exploitability (75–100) ---
const highPatterns: PatternDef[] = [
  // 1. Cloud — AWS
  { label: "AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/g, severity: "high", score: 30 },
  { label: "AWS Secret Access Key", regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*[A-Za-z0-9/+=]{40}/g, severity: "high", score: 35 },
  { label: "AWS Session Token", regex: /(?:AWS_SESSION_TOKEN|session_token)\s*[=:]\s*[A-Za-z0-9/+=_-]{100,}/gi, severity: "high", score: 30 },
  { label: "S3 Signed URL", regex: /(?:X-Amz-Algorithm|Signature)=[A-Za-z0-9%_-]+/g, severity: "high", score: 25 },
  // 2. Cloud — Google
  { label: "Google API Key", regex: /AIza[0-9A-Za-z_-]{35}/g, severity: "high", score: 30 },
  { label: "Google Service Account", regex: /"type"\s*:\s*"service_account"/g, severity: "high", score: 30 },
  // 3. Cloud — Azure
  { label: "Azure Account Key", regex: /AccountKey=[A-Za-z0-9+/=]{20,}/gi, severity: "high", score: 30 },
  { label: "Azure SAS Token", regex: /[?&]sig=[A-Za-z0-9%_-]{20,}/gi, severity: "high", score: 25 },
  { label: "Azure Connection String", regex: /AccountKey=[^;\s]{20,}/gi, severity: "high", score: 30 },
  // 4. Payment & Financial
  { label: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/g, severity: "high", score: 35 },
  { label: "Stripe Restricted Key", regex: /rk_live_[0-9a-zA-Z]{24,}/g, severity: "high", score: 30 },
  { label: "PayPal Token", regex: /(?:paypal|paypal_api)[^a-z0-9]*(?:secret|token|key)\s*[=:]\s*['"]?[A-Za-z0-9_-]{20,}/gi, severity: "high", score: 25 },
  { label: "Square Access Token", regex: /sq0atp-[A-Za-z0-9_-]{20,}/g, severity: "high", score: 25 },
  { label: "Braintree Token", regex: /(?:access_token|private_key)\s*[=:]\s*['"]?[a-z0-9]{32,}/gi, severity: "high", score: 25 },
  // 5. Developer platforms
  { label: "GitHub Token", regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g, severity: "high", score: 30 },
  { label: "GitLab Token", regex: /glpat-[A-Za-z0-9_-]{20,}/g, severity: "high", score: 30 },
  { label: "Bitbucket Token", regex: /(?:x-token-auth|BITBUCKET)[^a-z0-9]*[=:]\s*[A-Za-z0-9_-]{20,}/gi, severity: "high", score: 25 },
  { label: "NPM Token", regex: /npm_[A-Za-z0-9_-]{36,}/g, severity: "high", score: 25 },
  { label: "Docker Hub / Registry", regex: /(?:docker_password|DOCKER_HUB)[^a-z0-9]*[=:]\s*['"]?[^\s'"]{12,}/gi, severity: "high", score: 25 },
  // 6. Auth & API keys
  { label: "API Key Assignment", regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{24,}['"]?/gi, severity: "high", score: 30 },
  { label: "Secret/Password Assignment", regex: /(?:secret|password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{10,}['"]?/gi, severity: "high", score: 28 },
  { label: "Access Token Assignment", regex: /access_token\s*[=:]\s*['"]?[A-Za-z0-9_\-.]{20,}['"]?/gi, severity: "high", score: 28 },
  { label: "Authorization Bearer", regex: /[Aa]uthorization\s*:\s*[Bb]earer\s+[A-Za-z0-9_\-.~+/=]{20,}/g, severity: "high", score: 28 },
  { label: "Bearer Token", regex: /[Bb]earer\s+[A-Za-z0-9_\-.~+/=]{24,}/g, severity: "high", score: 25 },
  // 7. Database credentials (full connection strings)
  { label: "PostgreSQL Connection String", regex: /postgres(?:ql)?:\/\/[^\s]{15,}/gi, severity: "high", score: 35 },
  { label: "MySQL Connection String", regex: /mysql:\/\/[^\s]{15,}/gi, severity: "high", score: 35 },
  { label: "MongoDB Connection String", regex: /mongodb(?:\+srv)?:\/\/[^\s]{15,}/gi, severity: "high", score: 35 },
  { label: "Redis URL with auth", regex: /redis:\/\/[^@\s]+@[^\s]+/gi, severity: "high", score: 30 },
  // 8. Private keys / certificates
  { label: "Private Key PEM", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: "high", score: 40 },
  { label: "PGP Private Key", regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g, severity: "high", score: 40 },
  { label: "PFX/Certificate", regex: /-----BEGIN (?:PKCS|CERTIFICATE|ENCRYPTED)/g, severity: "high", score: 35 },
  // 9. Full JWT (3 segments)
  { label: "Full JWT", regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: "high", score: 30 },
  // 10. OAuth / app tokens
  { label: "Google OAuth", regex: /ya29\.[A-Za-z0-9_-]+/g, severity: "high", score: 28 },
  { label: "Slack Token", regex: /xox[bporas]-[0-9]{10,}-[A-Za-z0-9-]+/g, severity: "high", score: 28 },
  { label: "Discord Bot Token", regex: /[MN][A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/g, severity: "high", score: 25 },
  { label: "Facebook Access Token", regex: /EAAC[A-Za-z0-9]{20,}/g, severity: "high", score: 25 },
  // 11. Hardcoded secrets in code
  { label: "Hardcoded Password/Secret", regex: /(?:const|let|var)\s+(?:PASSWORD|SECRET|API_KEY|TOKEN)\s*=\s*['"][^'"]{8,}['"]/gi, severity: "high", score: 30 },
];

// --- MEDIUM RISK — Contextual / Internal Exposure (30–60) ---
const mediumPatterns: PatternDef[] = [
  // Internal domains
  { label: "Internal Domain", regex: /[^\s]*\.(?:internal|local|corp|lan)(?:\s|[:/]|$)/gi, severity: "medium", score: 15 },
  { label: "Internal URL", regex: /https?:\/\/[^\s]*\.(?:internal|local|localhost|corp|private)(?:[:/][^\s]*)?/gi, severity: "medium", score: 18 },
  // Infrastructure
  { label: "Private IP", regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g, severity: "medium", score: 12 },
  { label: "S3 Bucket Name", regex: /s3:\/\/[a-z0-9][a-z0-9.-]{2,62}|[a-z0-9][a-z0-9.-]{2,62}\.s3\.amazonaws\.com/gi, severity: "medium", score: 10 },
  { label: "Internal API Endpoint", regex: /(?:api|service)[^\s]*\.(?:internal|local|corp)|(?:staging|prod)-api[^\s]*/gi, severity: "medium", score: 12 },
  { label: "Kubernetes/Cluster", regex: /(?:k8s|kubernetes|cluster)[^\s]*(?:\.internal|\.local|\.svc)/gi, severity: "medium", score: 12 },
  // Partial config / env
  { label: "Env/Config Variable Name", regex: /(?:ENV|env)\s*[=\(]\s*['"]?[A-Z_][A-Z0-9_]*['"]?|process\.env\.\w+/g, severity: "medium", score: 5 },
  // Partial JWT (2 segments only)
  { label: "Partial JWT (2 segments)", regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}(?!\.[A-Za-z0-9_-])/g, severity: "medium", score: 15 },
  // Internal email
  { label: "Internal Email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.(?:internal|local|corp)\b/gi, severity: "medium", score: 15 },
  // Access control mentions (without credentials)
  { label: "Admin/Root Mention", regex: /\b(?:admin\s+dashboard|root\s+access|privileged\s+api|admin\s+panel)\b/gi, severity: "medium", score: 10 },
  // Generic email (lower than internal)
  { label: "Email Address", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, severity: "medium", score: 6 },
  // Public IP (low end of medium)
  { label: "IP Address", regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g, severity: "medium", score: 5 },
];

const patterns: PatternDef[] = [...highPatterns, ...mediumPatterns];

// Mask sensitive value
function maskValue(val: string): string {
  if (val.length <= 8) return val.slice(0, 2) + "•".repeat(val.length - 2);
  return val.slice(0, 4) + "•".repeat(Math.min(val.length - 6, 20)) + val.slice(-2);
}

function indexToLineCol(text: string, index: number): { line: number; column: number } {
  const lines = text.slice(0, index).split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

let matchCounter = 0;

export function scanText(text: string): ScanResult {
  const matches: ScanMatch[] = [];
  const coveredRanges: Array<[number, number]> = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      const overlaps = coveredRanges.some(([s, e]) => start < e && end > s);
      if (overlaps) continue;

      coveredRanges.push([start, end]);
      const { line, column } = indexToLineCol(text, start);

      matches.push({
        id: `match-${++matchCounter}`,
        pattern: pattern.label,
        label: pattern.label,
        matched: match[0],
        masked: maskValue(match[0]),
        severity: pattern.severity,
        score: pattern.score,
        line,
        column,
        startIndex: start,
        endIndex: end,
      });
    }
  }

  matches.sort((a, b) => a.startIndex - b.startIndex);

  const rawScore = matches.reduce((sum, m) => sum + m.score, 0);
  const hasHighRiskMatch = matches.some((m) => m.severity === "high");
  const totalScore = Math.min(
    100,
    hasHighRiskMatch ? Math.max(rawScore, HIGH_MIN_SCORE) : rawScore
  );

  const riskLevel: ScanResult["riskLevel"] =
    totalScore <= 30 ? "safe" : totalScore <= 60 ? "warning" : "high-risk";

  return { matches, totalScore, riskLevel, hasHighRiskMatch };
}

/** Replace all detected secrets in text with their masked values. Works offline, no API. */
export function redactDetectedSecrets(text: string): string {
  const { matches } = scanText(text);
  if (matches.length === 0) return text;
  const sorted = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  let out = text;
  for (const m of sorted) {
    out = out.slice(0, m.startIndex) + m.masked + out.slice(m.endIndex);
  }
  return out;
}

export const EXAMPLES = {
  clean: `Hello, I'd like to discuss our Q4 marketing strategy.
We should focus on increasing user engagement by 15% through
better onboarding flows and improved documentation.
Let me know your thoughts on the timeline.`,

  mixed: `Hi team, please review the staging environment at
http://api.staging.internal:3000/v2/health
and send feedback to alice.johnson@acme-corp.com
The deployment is on 192.168.1.42 and should be
ready by Friday.`,

  dangerous: `Here are the production credentials:
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

GitHub deploy token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn

Database: postgresql://admin:s3cretP@ss@prod-db.us-east-1.rds.amazonaws.com:5432/maindb

Stripe key: sk_live_4eC39HqLyjWDarjtT1zdp7dc

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U`,
};
