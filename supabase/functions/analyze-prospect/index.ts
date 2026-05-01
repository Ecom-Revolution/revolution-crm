// Analyse les besoins digitaux d'un prospect via Lovable AI.
// Renvoie : pain points, services recommandés, score affiné, note synthèse.
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

    const { prospect_id } = await req.json() as { prospect_id: string };
    if (!prospect_id) return jsonResponse({ error: "prospect_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: prospect, error } = await admin.from("prospects").select("*").eq("id", prospect_id).single();
    if (error || !prospect) return jsonResponse({ error: "Prospect not found" }, 404);

    const context = `
Entreprise : ${prospect.name}
Secteur : ${prospect.sector ?? "inconnu"}
Catégorie : ${prospect.category ?? "—"}
Ville : ${prospect.city ?? "—"} (${prospect.country ?? "France"})
Site web : ${prospect.website ?? "AUCUN SITE"}
Téléphone : ${prospect.phone ?? "—"}
Email : ${prospect.email ?? "—"}
Instagram : ${prospect.instagram_handle ?? "—"}
LinkedIn : ${prospect.linkedin_url ?? "—"}
Note Google : ${prospect.rating ?? "—"} (${prospect.reviews_count ?? 0} avis)
Effectif : ${prospect.employees_count ?? "?"} employés
CA estimé : ${prospect.revenue_estimate ?? "?"} €
Dirigeant : ${prospect.dirigeant ?? "—"}
`.trim();

    const systemPrompt = `Tu es un consultant senior en transformation digitale pour une SMMA (agence sociale & marketing).
Tu analyses des prospects pour identifier précisément leurs besoins digitaux et les services que ton agence peut leur vendre.
Tu connais : sites web, SEO, Google Ads, Meta Ads, gestion réseaux sociaux, création contenu, email marketing, automation,
chatbots IA, agents IA SDR, agents IA support client, audits, branding, identité visuelle, vidéo, photographie.
Tu es DIRECT, concret, factuel. Pas de blabla. Tu identifies les vraies opportunités business.
Tu raisonnes comme un directeur commercial SMMA : budget réaliste, probabilité de closing, urgence, service d'entrée à vendre et prochaine action terrain.`;

    const tool = {
      type: "function",
      function: {
        name: "analyze_prospect",
        description: "Renvoie l'analyse digitale structurée du prospect",
        parameters: {
          type: "object",
          properties: {
            score: { type: "integer", minimum: 0, maximum: 100, description: "Score de qualité du lead 0-100 basé sur le potentiel business" },
            ai_note: { type: "string", description: "Note synthèse de 3-5 phrases sur le prospect, ses signaux faibles, son potentiel" },
            pain_points: {
              type: "array",
              items: { type: "string" },
              description: "Liste des problèmes/manques digitaux identifiés (ex: 'pas de site web', 'avis Google faibles', 'pas de présence Insta')",
            },
            recommended_services: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  service: { type: "string", description: "Nom du service à proposer" },
                  why: { type: "string", description: "Justification courte" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  estimated_budget: { type: "string", description: "Fourchette tarifaire mensuelle estimée en € (ex: '800-1500€/mois')" },
                },
                required: ["service", "why", "priority"],
                additionalProperties: false,
              },
            },
            best_channels: {
              type: "array",
              items: { type: "string", enum: ["email", "whatsapp", "linkedin", "instagram", "tiktok", "phone"] },
              description: "Canaux d'outreach les plus pertinents pour ce prospect, par ordre de priorité",
            },
            angle: { type: "string", description: "Angle d'attaque commercial recommandé (1 phrase)" },
            estimated_budget: { type: "string", description: "Budget mensuel réaliste que le prospect pourrait accepter, ex: 800-1500€/mois" },
            closing_probability: { type: "integer", minimum: 0, maximum: 100, description: "Probabilité estimée de closing si le lead est contacté correctement" },
            urgency: { type: "string", enum: ["high", "medium", "low"], description: "Niveau d'urgence commerciale" },
            primary_service_to_sell: { type: "string", description: "Service principal à vendre en premier" },
            next_best_action: { type: "string", description: "Action commerciale suivante, concrète et immédiate" },
            score_reason: { type: "string", description: "Pourquoi ce score a été donné, en 1-2 phrases" },
            buying_triggers: { type: "array", items: { type: "string" }, description: "Signaux déclencheurs d'achat observables" },
          },
          required: ["score", "ai_note", "pain_points", "recommended_services", "best_channels", "angle", "estimated_budget", "closing_probability", "urgency", "primary_service_to_sell", "next_best_action", "score_reason", "buying_triggers"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyse ce prospect et identifie tous ses besoins digitaux :\n\n${context}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "analyze_prospect" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) return jsonResponse({ error: "Rate limit IA atteint, réessaie dans quelques secondes." }, 429);
      if (aiResp.status === 402) return jsonResponse({ error: "Crédits IA épuisés. Recharge dans Settings → Workspace → Usage." }, 402);
      return jsonResponse({ error: `IA error: ${t}` }, 500);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return jsonResponse({ error: "No tool call from AI" }, 500);
    const analysis = JSON.parse(toolCall.function.arguments);

    const { error: upErr } = await admin.from("prospects").update({
      digital_analysis: analysis,
      analysis_score: analysis.score,
      ai_note: analysis.ai_note,
      pain_points: analysis.pain_points,
      recommended_services: (analysis.recommended_services ?? []).map((s: any) => s.service),
      score: analysis.score,
      analyzed_at: new Date().toISOString(),
    }).eq("id", prospect_id);

    if (upErr) return jsonResponse({ error: upErr.message }, 500);

    await admin.from("activity_log").insert({
      action: "prospect_analyzed",
      entity_type: "prospect",
      entity_id: prospect_id,
      user_id: user.id,
      details: { score: analysis.score, services_count: analysis.recommended_services?.length ?? 0 },
    });

    return jsonResponse({ ok: true, analysis });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
