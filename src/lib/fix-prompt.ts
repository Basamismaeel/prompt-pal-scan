const FIX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-prompt`;

export async function fixPromptWithAI(text: string): Promise<string> {
  const resp = await fetch(FIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Fix failed" }));
    throw new Error(data.error || `Error ${resp.status}`);
  }

  const data = (await resp.json()) as { fixedText: string };
  return typeof data.fixedText === "string" ? data.fixedText : text;
}
