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
    const { text } = await req.json();
    const input = typeof text === "string" ? text : "";

    const apiKey = Deno.env.get("AI_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("AI_API_KEY or OPENAI_API_KEY must be set in Supabase Edge Function secrets");
    }

    const gatewayUrl = Deno.env.get("AI_GATEWAY_URL") ?? "https://api.openai.com/v1/chat/completions";

    const systemPrompt = `You are a security hardening assistant. Your job is to take a prompt or text that may contain secrets or be vulnerable to abuse, and return a SAFE, sanitized version.

Rules:
1. REMOVE or REDACT all secrets and credentials: API keys, AWS/cloud keys, passwords, connection strings, private keys, tokens, JWTs, OAuth tokens, bearer tokens. Replace each with a short placeholder like [REDACTED], [API_KEY], [PASSWORD], etc., so the structure of the text is preserved but no real secret remains.
2. HARDEN against injection: if the text includes user-controlled or external input that could be used for prompt injection, escape or neutralize it (e.g. wrap in delimiters, or replace with a placeholder like [USER_INPUT]).
3. PRESERVE the rest of the content: intent, instructions, and non-sensitive wording. Do not add explanations or change meaning beyond security fixes.
4. Return ONLY the fixed prompt text. No preamble, no "Here is the fixed version", no markdown code blocks. Just the sanitized text.`;

    const userPrompt = `Sanitize and harden this prompt. Return only the fixed text, nothing else.\n\n${input.slice(0, 8000)}`;

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
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("fix-prompt AI error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Fix failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await response.json();
    const fixedText = json.choices?.[0]?.message?.content?.trim() ?? input;

    return new Response(
      JSON.stringify({ fixedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fix-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
