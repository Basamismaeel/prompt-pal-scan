import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, findings } = await req.json();

    const apiKey = Deno.env.get("AI_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("AI_API_KEY or OPENAI_API_KEY must be set in Supabase Edge Function secrets");
    }

    const gatewayUrl = Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1/chat/completions";

    const findingsSummary = findings
      .map(
        (f: { label: string; severity: string; masked: string; line: number }) =>
          `- [${f.severity.toUpperCase()}] ${f.label}: "${f.masked}" (line ${f.line})`
      )
      .join("\n");

    const systemPrompt = `You are a security analyst for Contextify. Classify sensitivity per this doctrine:

SCORE BANDS (contextualRiskScore):
- LOW (0-25): No sensitive elements. Public content, generic descriptions, educational, open-source, docs, no credentials or internal specifics. Never exceed 30 if no sensitive elements exist.
- MEDIUM (30-60): Contextual exposure only. Internal domains (.internal, .corp), infrastructure disclosure (hostnames, S3 buckets, internal APIs), partial configs, roadmap/strategy/revenue/KPIs, proprietary technical details (algorithms, model architecture, fraud/risk logic), partial JWT, internal emails, admin/root mentions. No direct exploitability.
- HIGH (75-100): Only when credentials or immediately exploitable secrets exist: API keys, passwords, connection strings, private keys, full JWT, OAuth tokens, hardcoded secrets. If regex already found these, your score should reflect severity; do not under-score.

RULES:
1. Assign HIGH (75-100) only if credentials or exploit-ready secrets exist.
2. Assign MEDIUM (30-60) for contextual but non-exploitable exposure (internal domains, roadmaps, partial configs, proprietary logic).
3. Assign LOW (0-25) for general descriptions, public content, code examples without secrets.
4. Never exceed 30 if no sensitive elements exist.

Output plain text only. No markdown: no #, no **, no *, no bullets, no backticks.

CRITICAL: Your very first line of the response must be exactly: RISK_SCORE: N
where N is an integer 0-100. You MUST output this line before any other text. If you identify Internal Infrastructure Exposure (IIE), internal naming, domain structure, passive reconnaissance, or similar contextual risk, N must be 30-60 (medium). Only use 0-25 when there is no sensitive or contextual exposure. After that line, a blank line, then:

RISK SUMMARY
One short paragraph: what was found and the main risk.

FINDINGS
One line per finding. Item, then dash, then risk and action. No bullets.

RECOMMENDATIONS
One line per step. 3 to 5 concrete steps. No numbers or bullets.

Use blank lines between sections. Be concise.`;

    const userPrompt = `## Text to analyze:
\`\`\`
${text.slice(0, 4000)}
\`\`\`

## Regex scanner findings:
${findingsSummary || "No patterns detected by regex scanner."}

Analyze this text for confidentiality and security risks.`;

    const response = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("AI_MODEL") ?? "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI API quota or billing issue. Check your API key and usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("scan-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
