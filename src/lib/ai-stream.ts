import type { ScanMatch } from "./scanner";

/** Parse RISK_SCORE: N from AI stream content (0-100). Returns null if not found or invalid. */
export function parseAiRiskScore(content: string): number | null {
  const m = content.match(/RISK_SCORE:\s*(\d+)/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
  }
  if (content.length < 150) return null;
  const lower = content.toLowerCase();
  const hasContextualRisk =
    /internal\s+infrastructure|IIE|passive\s+reconnaissance|internal\s+(naming|domain|exposure)|contextual\s+(risk|exposure)|organizational\s+domain|network\s+entry\s+points/.test(lower) ||
    (/\b(internal|exposure|infrastructure|reconnaissance)\b/.test(lower) && /\b(risk|domain|naming|structure)\b/.test(lower));
  if (hasContextualRisk) return 45;
  return null;
}

/** Remove the leading RISK_SCORE line from content so it is not shown in the UI. */
export function stripRiskScoreLine(content: string): string {
  return content.replace(/^\s*RISK_SCORE:\s*\d+\s*\n?/i, "").trimStart();
}

const SCAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-analyze`;

export async function streamAnalysis({
  text,
  findings,
  onDelta,
  onDone,
  onError,
}: {
  text: string;
  findings: ScanMatch[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(SCAN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        text,
        findings: findings.map((f) => ({
          label: f.label,
          severity: f.severity,
          masked: f.masked,
          line: f.line,
        })),
      }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({ error: "AI analysis failed" }));
      onError(data.error || `Error ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("No response body");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Network error");
  }
}
