import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { assertJobOwner, requireUser } from "../_shared/auth.ts";
import { scoreLead } from "../_shared/scoring.ts";

interface Filters {
  domain?: string;
  company?: string;
  department?: string;       // 'executive', 'sales', 'marketing'
  seniority?: string;        // 'senior', 'executive'
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const HUNTER_API_KEY = Deno.env.get("HUNTER_API_KEY");
    if (!HUNTER_API_KEY) return jsonResponse({ error: "HUNTER_API_KEY not set" }, 500);

    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { job_id, filters } = await req.json() as { job_id: string; filters: Filters };
    if (!job_id || (!filters.domain && !filters.company)) {
      return jsonResponse({ error: "job_id + (domain or company) required" }, 400);
    }
    const limit = Math.min(filters.limit ?? 25, 100);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const ownership = await assertJobOwner(admin, job_id, auth.user.id);
    if (!ownership.ok) return jsonResponse({ error: ownership.error }, ownership.status);

    await admin.from("scraping_jobs").update({ status: "running", started_at: new Date().toISOString(), progress: 20 }).eq("id", job_id);
    const t0 = Date.now();

    const params = new URLSearchParams({ api_key: HUNTER_API_KEY, limit: String(limit) });
    if (filters.domain) params.set("domain", filters.domain);
    if (filters.company) params.set("company", filters.company);
    if (filters.department) params.set("department", filters.department);
    if (filters.seniority) params.set("seniority", filters.seniority);

    const r = await fetch(`https://api.hunter.io/v2/domain-search?${params}`);
    const data = await r.json();
    if (!r.ok) {
      await admin.from("scraping_jobs").update({ status: "failed", error_message: data?.errors?.[0]?.details || `Hunter ${r.status}`, completed_at: new Date().toISOString() }).eq("id", job_id);
      return jsonResponse({ error: data?.errors?.[0]?.details || "Hunter error" }, 502);
    }

    const company = data.data?.organization || filters.company || filters.domain;
    const emails = (data.data?.emails || []) as any[];

    const rows = emails.map((e) => ({
      job_id,
      name: company,
      contact_name: [e.first_name, e.last_name].filter(Boolean).join(" ") || null,
      email: e.value,
      phone: e.phone_number ?? null,
      website: filters.domain ? `https://${filters.domain}` : null,
      sector: data.data?.industry ?? null,
      linkedin_url: e.linkedin ?? null,
      source: "hunter" as const,
      source_url: filters.domain ? `https://${filters.domain}` : null,
      raw_data: e,
      ai_score: scoreLead({ email: e.value, sector: data.data?.industry }),
    }));

    if (rows.length) await admin.from("scraping_results").insert(rows);

    await admin.from("scraping_jobs").update({
      status: "completed",
      progress: 100,
      results_count: rows.length,
      duration_ms: Date.now() - t0,
      completed_at: new Date().toISOString(),
    }).eq("id", job_id);

    return jsonResponse({ ok: true, count: rows.length });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
