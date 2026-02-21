// PromptGuard Regex Scanner
// Detects sensitive secrets, credentials, and confidential information

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
}

interface PatternDef {
  label: string;
  regex: RegExp;
  severity: Severity;
  score: number;
}

// --- Pattern definitions ---
// Each pattern uses global flag to find all occurrences

const patterns: PatternDef[] = [
  // HIGH RISK — 20-30 points each
  {
    label: "AWS Access Key",
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: "high",
    score: 25,
  },
  {
    label: "AWS Secret Key",
    regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*[A-Za-z0-9/+=]{40}/g,
    severity: "high",
    score: 30,
  },
  {
    label: "GitHub Token",
    regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: "high",
    score: 25,
  },
  {
    label: "Stripe Secret Key",
    regex: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: "high",
    score: 30,
  },
  {
    label: "Stripe Restricted Key",
    regex: /rk_live_[0-9a-zA-Z]{24,}/g,
    severity: "high",
    score: 25,
  },
  {
    label: "Generic API Key",
    regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}['"]?/gi,
    severity: "high",
    score: 20,
  },
  {
    label: "Generic Secret",
    regex: /(?:secret|password|passwd|pwd)\s*[=:]\s*['"]?[^\s'"]{8,}['"]?/gi,
    severity: "high",
    score: 20,
  },
  {
    label: "PostgreSQL Connection String",
    regex: /postgres(?:ql)?:\/\/[^\s]{10,}/gi,
    severity: "high",
    score: 30,
  },
  {
    label: "MySQL Connection String",
    regex: /mysql:\/\/[^\s]{10,}/gi,
    severity: "high",
    score: 30,
  },
  {
    label: "MongoDB Connection String",
    regex: /mongodb(?:\+srv)?:\/\/[^\s]{10,}/gi,
    severity: "high",
    score: 30,
  },
  {
    label: "Private SSH Key",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: "high",
    score: 30,
  },
  {
    label: "PGP Private Key",
    regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    severity: "high",
    score: 30,
  },
  {
    label: "JWT Token",
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    severity: "high",
    score: 20,
  },
  {
    label: "Slack Token",
    regex: /xox[bporas]-[0-9]{10,}-[A-Za-z0-9-]+/g,
    severity: "high",
    score: 25,
  },

  // MEDIUM RISK — 5-15 points each
  {
    label: "Email Address",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    severity: "medium",
    score: 8,
  },
  {
    label: "Private IP Address",
    regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
    severity: "medium",
    score: 10,
  },
  {
    label: "Internal Domain",
    regex: /https?:\/\/[^\s]*\.(?:internal|local|localhost|corp|private)(?:[:/][^\s]*)?/gi,
    severity: "medium",
    score: 10,
  },
  {
    label: "Bearer Token",
    regex: /[Bb]earer\s+[A-Za-z0-9_\-.~+/]+=*/g,
    severity: "medium",
    score: 15,
  },
  {
    label: "IP Address",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    severity: "medium",
    score: 5,
  },
];

// Mask sensitive value: show first 4 and last 2 chars
function maskValue(val: string): string {
  if (val.length <= 8) return val.slice(0, 2) + "•".repeat(val.length - 2);
  return val.slice(0, 4) + "•".repeat(Math.min(val.length - 6, 20)) + val.slice(-2);
}

// Convert character index to line/column
function indexToLineCol(text: string, index: number): { line: number; column: number } {
  const lines = text.slice(0, index).split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

let matchCounter = 0;

export function scanText(text: string): ScanResult {
  const matches: ScanMatch[] = [];
  const coveredRanges: Array<[number, number]> = [];

  for (const pattern of patterns) {
    // Reset regex lastIndex
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Skip if this range overlaps with a higher-priority match
      const overlaps = coveredRanges.some(
        ([s, e]) => start < e && end > s
      );
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

  // Sort by position in text
  matches.sort((a, b) => a.startIndex - b.startIndex);

  // Calculate total score (capped at 100)
  const totalScore = Math.min(100, matches.reduce((sum, m) => sum + m.score, 0));

  const riskLevel: ScanResult["riskLevel"] =
    totalScore <= 30 ? "safe" : totalScore <= 60 ? "warning" : "high-risk";

  return { matches, totalScore, riskLevel };
}

// Pre-loaded test examples
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
