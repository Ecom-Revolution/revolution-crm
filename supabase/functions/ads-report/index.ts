// Génère un rapport ads brandé Revolution avec recommandations IA chiffrées.
// L'utilisateur fournit les données (saisie ou collées depuis Google Ads/Meta/TikTok), l'IA structure et conseille.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY missing" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { client_id, period_start, period_end, platforms, raw_data } = await req.json() as {
      client_id?: string; period_start: string; period_end: string; platforms: string[]; raw_data: any;
    };
    if (!period_start || !period_end || !platforms?.length || !raw_data) {
      return jsonResponse({ error: "period_start, period_end, platforms[], raw_data requis" }, 400);
    }

    const tool = {
      type: "function",
      function: {
        name: "generate_ads_report",
        parameters: {
          type: "object",
          properties: {
            executive_summary: { type: "string", description: "Synthèse 3-4 phrases pour le client (français, ton expert)" },
            kpis: {
              type: "object",
              properties: {
                spend_total: { type: "string" },
                impressions_total: { type: "string" },
                clicks_total: { type: "string" },
                conversions_total: { type: "string" },
                cpa_avg: { type: "string" },
                roas_avg: { type: "string" },
                ctr_avg: { type: "string" },
              },
              additionalProperties: true,
            },
            highlights: { type: "array", items: { type: "string" }, description: "Bonnes nouvelles à mettre en avant" },
            warnings: { type: "array", items: { type: "string" }, description: "Points d'alerte / sous-perfs" },
            anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string" },
                  issue: { type: "string" },
                  likely_cause: { type: "string" },
                  fix: { type: "string" },
                },
                required: ["metric", "issue", "likely_cause", "fix"],
                additionalProperties: false,
              },
              description: "Anomalies détectées dans les performances",
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  platform: { type: "string" },
                  expected_impact: { type: "string", description: "Impact chiffré attendu" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["action", "platform", "expected_impact", "priority"],
                additionalProperties: false,
              },
            },
            next_month_focus: { type: "string", description: "Le focus principal pour le mois suivant en 1 phrase" },
            client_whatsapp_summary: { type: "string", description: "Message WhatsApp court prêt à envoyer au client" },
            media_buyer_backlog: { type: "array", items: { type: "string" }, description: "Actions opérationnelles pour le media buyer" },
          },
          required: ["executive_summary", "kpis", "recommendations", "next_month_focus", "highlights", "warnings", "anomalies", "client_whatsapp_summary", "media_buyer_backlog"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un Media Buyer senior pour SMMA. Tu produis des rapports ads clairs, chiffrés et actionnables, en français. Tu détectes les anomalies, écris un résumé WhatsApp client et un backlog opérationnel pour le media buyer." },
          { role: "user", content: `Période : ${period_start} → ${period_end}
Plateformes : ${platforms.join(", ")}
Données brutes :
${JSON.stringify(raw_data, null, 2)}

Génère le rapport complet pour le client.` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "generate_ads_report" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return jsonResponse({ error: "Rate limit IA" }, 429);
      if (aiResp.status === 402) return jsonResponse({ error: "Crédits IA épuisés" }, 402);
      return jsonResponse({ error: await aiResp.text() }, 500);
    }
    const aiData = await aiResp.json();
    const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) return jsonResponse({ error: "No tool call" }, 500);
    const report = JSON.parse(tc.function.arguments);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await admin.from("ads_reports").insert({
      client_id: client_id ?? null,
      period_start,
      period_end,
      platforms,
      raw_data,
      ai_summary: report.executive_summary,
      recommendations: report.recommendations,
      kpis: { ...report.kpis, highlights: report.highlights, warnings: report.warnings, anomalies: report.anomalies, next_month_focus: report.next_month_focus, client_whatsapp_summary: report.client_whatsapp_summary, media_buyer_backlog: report.media_buyer_backlog },
      status: "ready",
      created_by: user.id,
    }).select("*").single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true, report: data, full: report });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
