// Helper unifié pour appeler une IA gratuite (Lovable AI Gateway par défaut, Groq optionnel).
// Si GROQ_API_KEY est défini ET provider === "groq", on bascule sur Groq (Llama 3.3 70B gratuit).
// Sinon on utilise Lovable AI Gateway (Gemini Flash gratuit).

export type AIProvider = "lovable" | "groq" | "auto";

interface CallAIOpts {
  systemPrompt: string;
  userPrompt: string;
  provider?: AIProvider;
  model?: string;
  tool?: any;
  toolName?: string;
}

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function pickProvider(provider: AIProvider = "auto"): "lovable" | "groq" {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (provider === "groq" && groqKey) return "groq";
  if (provider === "auto" && groqKey) return "groq"; // si Groq dispo, on préfère pour économiser le quota
  return "lovable";
}

export async function callAI({ systemPrompt, userPrompt, provider = "lovable", model, tool, toolName }: CallAIOpts) {
  const finalProvider = pickProvider(provider);

  const url = finalProvider === "groq" ? GROQ_URL : LOVABLE_URL;
  const apiKey = finalProvider === "groq"
    ? Deno.env.get("GROQ_API_KEY")!
    : Deno.env.get("LOVABLE_API_KEY")!;
  const finalModel = model
    ?? (finalProvider === "groq" ? "llama-3.3-70b-versatile" : "google/gemini-2.5-flash");

  const body: any = {
    model: finalModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (tool && toolName) {
    body.tools = [tool];
    body.tool_choice = { type: "function", function: { name: toolName } };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit IA atteint, réessaie dans quelques secondes.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés. Recharge dans Settings → Workspace → Usage.");
    throw new Error(`IA error (${finalProvider} ${resp.status}): ${t}`);
  }

  const data = await resp.json();
  const msg = data.choices?.[0]?.message;
  if (tool && toolName) {
    const toolCall = msg?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call from AI");
    return { provider: finalProvider, parsed: JSON.parse(toolCall.function.arguments), raw: data };
  }
  return { provider: finalProvider, content: msg?.content ?? "", raw: data };
}
