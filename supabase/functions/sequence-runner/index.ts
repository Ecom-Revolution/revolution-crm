// Cron runner : exécute toutes les séquences dont next_run_at <= now.
// - Génère un message via generate-outreach (étape 1) ou un message de relance (étapes 2+)
// - Programme la prochaine relance (J+3, J+7)
// - Stop si réponse reçue ou max atteint
// Appelé par pg_cron toutes les 15 minutes (peut aussi être appelé manuellement).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { requireAdminOrCron } from "../_shared/auth.ts";

const RELAY_DELAYS_DAYS = [3, 4, 7]; // entre étape n et n+1

const CHANNEL_RULES: Record<string, string> = {
  email: "Email pro 90-150 mots. Objet (max 50 char). Personnalisé. CTA call 15min.",
  whatsapp: "Message WhatsApp 40-70 mots, ton humain. 1-2 emojis max.",
  linkedin: "Note LinkedIn 280 caractères MAX.",
  instagram: "DM Insta 30-60 mots, casual pro.",
  tiktok: "DM TikTok 20-40 mots, très court.",
  sms: "SMS 160 caractères MAX.",
};

async function generateMessage(prospect: any, channel: string, step: number, tone?: string, custom_angle?: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const isFollowUp = step > 0;
  const followUpHint = step === 1 ? "C'est la 1ère RELANCE (le 1er message n'a pas eu de réponse). Référence brièvement le 1er échange sans réexpliquer tout. Plus court, plus direct, nouvel angle."
    : step === 2 ? "C'est la 2ème RELANCE. Très court. Tente le 'breakup email' : dernière tentative, demande poliment si on doit clore le sujet."
    : "";
  const analysis = prospect.digital_analysis ?? null;
  const summary = analysis ? `Analyse : score ${analysis.score}/100 ; pain points : ${(analysis.pain_points ?? []).join(", ")} ; angle : ${analysis.angle ?? "—"}` : "";

  const tool = {
    type: "function",
    function: {
      name: "generate_message",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string" },
          content: { type: "string" },
        },
        required: ["subject", "content"],
        additionalProperties: false,
      },
    },
  };
  const systemPrompt = `Tu es copywriter outbound expert SMMA. Règles canal "${channel}" : ${CHANNEL_RULES[channel] ?? ""}. Ton : ${tone ?? "pro humain direct"}. Pas de formules bateau. Personnalise avec UN détail concret.`;
  const userPrompt = `Prospect : ${prospect.name} (${prospect.sector ?? "—"}, ${prospect.city ?? "—"})
Site : ${prospect.website ?? "—"} | Note Google : ${prospect.rating ?? "—"} (${prospect.reviews_count ?? 0} avis)
${summary}
${custom_angle ? `Angle : ${custom_angle}` : ""}
${isFollowUp ? `\n!! ${followUpHint} !!` : ""}
Génère le message ${channel} ${isFollowUp ? `de relance n°${step}` : "d'ouverture"}.`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "generate_message" } },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const tc = j.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) throw new Error("No tool call");
  return JSON.parse(tc.function.arguments) as { subject: string; content: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const access = await requireAdminOrCron(req);
    if (access instanceof Response) return access;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const now = new Date().toISOString();
    const { data: due, error } = await admin
      .from("outreach_sequences")
      .select("*, prospects(*)")
      .eq("status", "active")
      .lte("next_run_at", now)
      .limit(20);
    if (error) return jsonResponse({ error: error.message }, 500);

    const processed: any[] = [];
    for (const seq of due ?? []) {
      const prospect = seq.prospects;
      if (!prospect) {
        await admin.from("outreach_sequences").update({ status: "stopped", stopped_reason: "prospect missing" }).eq("id", seq.id);
        continue;
      }
      // Stop si prospect a répondu (statut > contacte)
      if (["rdv_pris", "rdv_effectue", "client", "perdu"].includes(prospect.status)) {
        await admin.from("outreach_sequences").update({ status: "stopped", stopped_reason: `prospect status: ${prospect.status}` }).eq("id", seq.id);
        continue;
      }
      // Stop si replies déjà reçues sur ce canal
      const { count: replyCount } = await admin.from("outreach_messages").select("id", { head: true, count: "exact" })
        .eq("prospect_id", prospect.id).in("status", ["replied"]);
      if ((replyCount ?? 0) > 0) {
        await admin.from("outreach_sequences").update({ status: "stopped", stopped_reason: "reply received" }).eq("id", seq.id);
        continue;
      }

      try {
        const msg = await generateMessage(prospect, seq.channel, seq.current_step, seq.tone, seq.custom_angle);
        await admin.from("outreach_messages").insert({
          prospect_id: prospect.id,
          channel: seq.channel,
          subject: msg.subject || null,
          content: msg.content,
          status: "draft",
          generated_by_ai: true,
          created_by: seq.created_by,
        });

        const nextStep = seq.current_step + 1;
        if (nextStep >= seq.max_steps) {
          await admin.from("outreach_sequences").update({ status: "completed", current_step: nextStep, next_run_at: null }).eq("id", seq.id);
        } else {
          const delay = RELAY_DELAYS_DAYS[Math.min(nextStep - 1, RELAY_DELAYS_DAYS.length - 1)];
          const nextRun = new Date(Date.now() + delay * 86_400_000).toISOString();
          await admin.from("outreach_sequences").update({ current_step: nextStep, next_run_at: nextRun }).eq("id", seq.id);
        }
        processed.push({ id: seq.id, prospect: prospect.name, step: seq.current_step });
      } catch (e) {
        console.error("seq error", seq.id, e);
        await admin.from("outreach_sequences").update({ next_run_at: new Date(Date.now() + 3600_000).toISOString() }).eq("id", seq.id);
      }
    }

    return jsonResponse({ ok: true, processed_count: processed.length, processed });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
