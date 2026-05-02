import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai.ts";

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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json().catch(() => ({})) as { provider?: string };

    let query = admin.from("integration_settings").select("*").eq("kind", "ai");
    if (body.provider) query = query.eq("provider", body.provider);
    const { data: rows, error } = await query.order("priority", { ascending: true });
    if (error) return jsonResponse({ error: error.message }, 500);

    const results: { provider: string; ok: boolean; message: string }[] = [];

    for (const row of rows ?? []) {
      try {
        const { parsed } = await callAI({
          provider: row.provider as any,
          systemPrompt: "Tu es un assistant de test. Réponds uniquement en JSON valide.",
          userPrompt: `Teste cette configuration IA et renvoie {"status":"ok","provider":"${row.provider}","model":"${row.model ?? ""}"}`,
          tool: {
            type: "function",
            function: {
              name: "integration_test",
              parameters: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  provider: { type: "string" },
                  model: { type: "string" },
                },
                required: ["status", "provider", "model"],
                additionalProperties: false,
              },
            },
          },
          toolName: "integration_test",
        });

        const message = `OK - ${parsed.provider} / ${parsed.model}`;
        await admin.from("integration_settings").update({
          last_test_status: "success",
          last_test_message: message,
          last_test_at: new Date().toISOString(),
        }).eq("provider", row.provider);
        results.push({ provider: row.provider, ok: true, message });
      } catch (e) {
        const message = (e as Error).message;
        await admin.from("integration_settings").update({
          last_test_status: "error",
          last_test_message: message,
          last_test_at: new Date().toISOString(),
        }).eq("provider", row.provider);
        results.push({ provider: row.provider, ok: false, message });
      }
    }

    await admin.from("activity_log").insert({
      action: "integration_test",
      entity_type: "integration_settings",
      entity_id: null,
      user_id: user.id,
      details: { count: results.length, provider: body.provider ?? "all" },
    });

    return jsonResponse({ ok: true, results });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
