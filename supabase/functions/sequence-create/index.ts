// Crée une séquence de relance automatique pour un prospect.
// Le runner (cron) s'occupera ensuite de générer + envoyer le 1er message puis les relances.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { prospect_id, channel, max_steps = 3, tone, custom_angle, start_in_minutes = 0 } = await req.json() as {
      prospect_id: string; channel: string; max_steps?: number; tone?: string; custom_angle?: string; start_in_minutes?: number;
    };
    if (!prospect_id || !channel) return jsonResponse({ error: "prospect_id & channel required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const next = new Date(Date.now() + start_in_minutes * 60_000).toISOString();

    const { data, error } = await admin.from("outreach_sequences").insert({
      prospect_id, channel, max_steps, tone, custom_angle,
      next_run_at: next, current_step: 0, status: "active", created_by: user.id,
    }).select("*").single();
    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ ok: true, sequence: data });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
