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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const findingsSummary = findings
      .map(
        (f: { label: string; severity: string; masked: string; line: number }) =>
          `- [${f.severity.toUpperCase()}] ${f.label}: "${f.masked}" (line ${f.line})`
      )
      .join("\n");

    const systemPrompt = `You are a security analyst specializing in detecting sensitive information in text that users are about to send to AI models. You provide clear, actionable analysis.

Your task: Analyze the provided text for confidentiality risks. The regex scanner has already found some matches — confirm, expand, or correct them. Also look for risks the regex missed (e.g., contextual secrets, internal project names, proprietary data).

Format your response as:
1. **Risk Summary** — one paragraph overview
2. **Detailed Findings** — bullet list of each sensitive item, why it's risky, and what to do
3. **Recommendations** — practical steps to sanitize the text before sending to an AI

Be concise, direct, and security-focused. Use terminal-style language.`;

    const userPrompt = `## Text to analyze:
\`\`\`
${text.slice(0, 4000)}
\`\`\`

## Regex scanner findings:
${findingsSummary || "No patterns detected by regex scanner."}

Analyze this text for confidentiality and security risks.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
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
