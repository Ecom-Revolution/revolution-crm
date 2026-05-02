// Helper unifié pour appeler une IA.
// Priorité: settings CRM (si configurés) > variables d'environnement > fallback Gateway/Lovable.

import { createClient } from "jsr:@supabase/supabase-js@2";

export type AIProvider = "lovable" | "groq" | "openai" | "claude" | "gemini" | "auto";

interface CallAIOpts {
  systemPrompt: string;
  userPrompt: string;
  provider?: AIProvider;
  model?: string;
  tool?: any;
  toolName?: string;
}

type IntegrationSetting = {
  provider: string;
  label: string;
  enabled: boolean;
  api_key: string | null;
  base_url: string | null;
  model: string | null;
  priority: number;
};

const DEFAULT_MODELS: Record<Exclude<AIProvider, "auto">, string> = {
  lovable: "google/gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
  claude: "claude-3-5-sonnet-latest",
  gemini: "gemini-2.5-flash",
};

const DEFAULT_ENDPOINTS: Record<Exclude<AIProvider, "auto">, string> = {
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  claude: "https://api.anthropic.com/v1/messages",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
};

async function loadSettings(): Promise<IntegrationSetting[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !serviceRole || !publishableKey) return [];

  try {
    const admin = createClient(url, serviceRole);
    const { data } = await admin
      .from("integration_settings")
      .select("provider,label,enabled,api_key,base_url,model,priority")
      .eq("enabled", true)
      .order("priority", { ascending: true })
      .order("updated_at", { ascending: false });
    return (data ?? []) as IntegrationSetting[];
  } catch {
    return [];
  }
}

function normalizeProvider(provider: AIProvider, settings: IntegrationSetting[]) {
  if (provider !== "auto") return provider;

  const preferred = ["claude", "gemini", "openai", "groq", "lovable"] as const;
  for (const candidate of preferred) {
    const setting = settings.find((s) => s.provider === candidate && s.enabled && s.api_key);
    if (setting) return candidate;
  }
  if (Deno.env.get("GROQ_API_KEY")) return "groq";
  if (Deno.env.get("ANTHROPIC_API_KEY")) return "claude";
  if (Deno.env.get("OPENAI_API_KEY")) return "openai";
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
  if (Deno.env.get("LOVABLE_API_KEY")) return "lovable";
  return "lovable";
}

function getSetting(provider: Exclude<AIProvider, "auto">, settings: IntegrationSetting[]) {
  return settings.find((s) => s.provider === provider && s.enabled && s.api_key);
}

function jsonInstruction(toolName?: string, tool?: any) {
  if (!tool || !toolName) return "";
  const schema = tool.function?.parameters ?? tool.parameters ?? null;
  return [
    `Tu dois répondre avec un unique objet JSON valide.`,
    `Aucune explication, aucun markdown, aucun bloc de code.`,
    toolName ? `Le JSON doit correspondre à l'objet attendu par "${toolName}".` : "",
    schema ? `Schéma attendu: ${JSON.stringify(schema)}` : "",
  ].filter(Boolean).join("\n");
}

function extractJson(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Invalid JSON response from AI");
  }
}

async function callOpenAICompatible({
  endpoint,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}: {
  endpoint: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit IA atteint, réessaie dans quelques secondes.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés. Recharge dans Settings → Workspace → Usage.");
    throw new Error(`IA error (${resp.status}): ${t}`);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return { content: text, raw: data };
}

async function callAnthropic({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const resp = await fetch(DEFAULT_ENDPOINTS.claude, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit IA atteint, réessaie dans quelques secondes.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés. Recharge dans Settings → Workspace → Usage.");
    throw new Error(`IA error (claude ${resp.status}): ${t}`);
  }

  const data = await resp.json();
  const text = (data.content ?? []).map((chunk: { text?: string }) => chunk.text ?? "").join("");
  return { content: text, raw: data };
}

async function callGemini({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const endpoint = `${DEFAULT_ENDPOINTS.gemini}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error("Rate limit IA atteint, réessaie dans quelques secondes.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés. Recharge dans Settings → Workspace → Usage.");
    throw new Error(`IA error (gemini ${resp.status}): ${t}`);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
  return { content: text, raw: data };
}

export async function callAI({ systemPrompt, userPrompt, provider = "lovable", model, tool, toolName }: CallAIOpts) {
  const settings = await loadSettings();
  const selected = normalizeProvider(provider, settings);
  const setting = selected === "auto" ? null : getSetting(selected, settings);
  const finalModel = model ?? setting?.model ?? DEFAULT_MODELS[selected as Exclude<AIProvider, "auto">];
  const endpoint = setting?.base_url ?? DEFAULT_ENDPOINTS[selected as Exclude<AIProvider, "auto">];
  const apiKey = setting?.api_key ?? Deno.env.get(
    selected === "lovable" ? "LOVABLE_API_KEY"
      : selected === "groq" ? "GROQ_API_KEY"
      : selected === "openai" ? "OPENAI_API_KEY"
      : selected === "claude" ? "ANTHROPIC_API_KEY"
      : "GEMINI_API_KEY",
  ) ?? "";

  const promptSuffix = jsonInstruction(toolName, tool);
  const finalSystemPrompt = promptSuffix ? `${systemPrompt}\n\n${promptSuffix}` : systemPrompt;
  const finalUserPrompt = promptSuffix ? `${userPrompt}\n\n${promptSuffix}` : userPrompt;

  let result: { content: string; raw: unknown };
  if (selected === "claude") {
    result = await callAnthropic({ apiKey, model: finalModel, systemPrompt: finalSystemPrompt, userPrompt: finalUserPrompt });
  } else if (selected === "gemini") {
    result = await callGemini({ apiKey, model: finalModel, systemPrompt: finalSystemPrompt, userPrompt: finalUserPrompt });
  } else {
    result = await callOpenAICompatible({ endpoint, apiKey, model: finalModel, systemPrompt: finalSystemPrompt, userPrompt: finalUserPrompt });
  }

  if (!result.content) throw new Error("Empty AI response");

  if (tool && toolName) {
    return {
      provider: selected,
      parsed: extractJson(result.content),
      raw: result.raw,
    };
  }

  return {
    provider: selected,
    content: result.content,
    raw: result.raw,
  };
}
