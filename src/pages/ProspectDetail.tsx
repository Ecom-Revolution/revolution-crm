import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Sparkles, ExternalLink, Phone, Mail, MapPin, Globe, Building2,
  Star, Users, TrendingUp, AlertTriangle, CheckCircle2, Loader2, Copy,
  Send, MessageCircle, Linkedin, Instagram, PhoneCall, Swords, X, Euro,
  Repeat2, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logFunnelEvent } from "@/lib/funnelEvents";
import { functionErrorMessage } from "@/lib/functionErrors";

const CHANNELS = [
  { id: "email", label: "Email", icon: Mail, color: "text-blue-400" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-400" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-sky-400" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400" },
  { id: "tiktok", label: "TikTok", icon: Send, color: "text-fuchsia-400" },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground",
};

export default function ProspectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState("email");
  const [draftContent, setDraftContent] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [outreachExtras, setOutreachExtras] = useState<any>(null);
  const [callScript, setCallScript] = useState<any>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [competitors, setCompetitors] = useState<any>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [offer, setOffer] = useState<any>(null);
  const [offerLoading, setOfferLoading] = useState(false);
  const [sequenceLoading, setSequenceLoading] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const [{ data: p }, { data: m }, { data: seqs }] = await Promise.all([
      supabase.from("prospects").select("*").eq("id", id).single(),
      supabase.from("outreach_messages").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
      supabase.from("outreach_sequences").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
    ]);
    setProspect(p);
    setMessages(m ?? []);
    setSequences(seqs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // Charge le dernier brouillon du canal actif dans l'éditeur
  useEffect(() => {
    const last = messages.find((m) => m.channel === activeChannel && m.status === "draft");
    if (last) {
      setDraftContent(last.content);
      setDraftSubject(last.subject ?? "");
    } else {
      setDraftContent("");
      setDraftSubject("");
    }
  }, [activeChannel, messages]);

  const analyze = async () => {
    setAnalyzing(true);
    const { data, error } = await supabase.functions.invoke("analyze-prospect", { body: { prospect_id: id } });
    setAnalyzing(false);
    if (error || data?.error) { toast.error(data?.error ?? await functionErrorMessage(error)); return; }
    await logFunnelEvent({
      event_type: "lead_analyzed",
      entity_type: "prospect",
      entity_id: id,
      prospect_id: id,
      source: prospect?.source,
      metadata: { score: data?.analysis?.score, primary_service_to_sell: data?.analysis?.primary_service_to_sell },
    });
    toast.success("Analyse IA terminée 🚀");
    load();
  };

  const generate = async (channel: string) => {
    setGenerating(channel);
    const { data, error } = await supabase.functions.invoke("generate-outreach", {
      body: { prospect_id: id, channel },
    });
    setGenerating(null);
    if (error || data?.error) { toast.error(data?.error ?? await functionErrorMessage(error)); return; }
    await logFunnelEvent({
      event_type: "message_generated",
      entity_type: "outreach_message",
      entity_id: data?.message?.id,
      prospect_id: id,
      source: prospect?.source,
      channel,
      metadata: { variants_count: data?.variants?.length ?? 0 },
    });
    toast.success(`Message ${channel} généré`);
    setOutreachExtras({ channel, variants: data?.variants ?? [], follow_ups: data?.follow_ups ?? [], personalization_notes: data?.personalization_notes ?? [] });
    setActiveChannel(channel);
    load();
  };

  const startSequence = async (channel: string) => {
    setSequenceLoading(channel);
    const { data, error } = await supabase.functions.invoke("sequence-create", {
      body: {
        prospect_id: id,
        channel,
        max_steps: 3,
        run_first_now: true,
      },
    });
    setSequenceLoading(null);
    if (error || data?.error) { toast.error(data?.error ?? await functionErrorMessage(error)); return; }

    await logFunnelEvent({
      event_type: "sequence_created",
      entity_type: "outreach_sequence",
      entity_id: data?.sequence?.id,
      prospect_id: id,
      source: prospect?.source,
      channel,
      metadata: { existing: Boolean(data?.existing), first_message_id: data?.first_message?.id },
    });

    if (data?.first_message) {
      setActiveChannel(channel);
      setDraftSubject(data.first_message.subject ?? "");
      setDraftContent(data.first_message.content ?? "");
      toast.success("Séquence démarrée, premier message généré");
    } else if (data?.existing) {
      toast.info("Une séquence active existe déjà pour ce canal");
    } else {
      toast.success("Séquence programmée");
    }
    load();
  };

  const runCloser = async () => {
    setCallLoading(true);
    const { data, error } = await supabase.functions.invoke("agent-closer", { body: { prospect_id: id } });
    setCallLoading(false);
    if (error || data?.error) { toast.error(data?.error ?? await functionErrorMessage(error)); return; }
    setCallScript(data?.script);
    await logFunnelEvent({
      event_type: "call_script_generated",
      entity_type: "call_script",
      entity_id: data?.script_id,
      prospect_id: id,
      source: prospect?.source,
    });
    toast.success("Script d'appel prêt 📞");
  };

  const runCompetitors = async () => {
    setCompLoading(true);
    const { data, error } = await supabase.functions.invoke("agent-competitors", { body: { prospect_id: id } });
    setCompLoading(false);
    if (error || data?.error) { toast.error(data?.error ?? await functionErrorMessage(error)); return; }
    setCompetitors(data?.analysis);
    await logFunnelEvent({
      event_type: "competitors_analyzed",
      entity_type: "prospect",
      entity_id: id,
      prospect_id: id,
      source: prospect?.source,
      metadata: { opportunity_score: data?.analysis?.opportunity_score },
    });
    toast.success("Analyse concurrence prête ⚔️");
  };

  const runOfferBuilder = async () => {
    setOfferLoading(true);
    const { data, error } = await supabase.functions.invoke("agent-offer-builder", { body: { prospect_id: id } });
    setOfferLoading(false);
    if (error || data?.error) { toast.error(data?.error ?? await functionErrorMessage(error)); return; }
    setOffer(data?.offer);
    await logFunnelEvent({
      event_type: "offer_generated",
      entity_type: "prospect",
      entity_id: id,
      prospect_id: id,
      source: prospect?.source,
      metadata: { offer_name: data?.offer?.offer_name, recommended_package: data?.offer?.recommended_package },
    });
    toast.success("Proposition commerciale prête");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier");
  };

  const openExternal = (channel: string) => {
    if (!prospect) return;
    const text = encodeURIComponent(draftContent);
    let url = "";
    switch (channel) {
      case "email":
        if (!prospect.email) return toast.error("Pas d'email pour ce prospect");
        url = `mailto:${prospect.email}?subject=${encodeURIComponent(draftSubject)}&body=${text}`;
        break;
      case "whatsapp":
        if (!prospect.phone) return toast.error("Pas de téléphone");
        url = `https://wa.me/${prospect.phone.replace(/[^\d]/g, "")}?text=${text}`;
        break;
      case "linkedin":
        url = prospect.linkedin_url || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospect.contact_name ?? prospect.name)}`;
        copyToClipboard(draftContent);
        break;
      case "instagram":
        url = prospect.instagram_handle ? `https://instagram.com/${prospect.instagram_handle.replace("@", "")}` : "https://instagram.com";
        copyToClipboard(draftContent);
        break;
      case "tiktok":
        url = "https://tiktok.com";
        copyToClipboard(draftContent);
        break;
    }
    window.open(url, "_blank");
  };

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!prospect) {
    return <div className="p-6 text-center text-muted-foreground">Prospect introuvable</div>;
  }

  const analysis = prospect.digital_analysis;

  return (
    <div>
      <PageHeader title={prospect.name} description={[prospect.sector, prospect.city].filter(Boolean).join(" • ") || "—"}>
        <Button variant="ghost" onClick={() => navigate("/prospects")}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <Button variant="outline" size="sm" onClick={runCompetitors} disabled={compLoading}>
          {compLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          Concurrents
        </Button>
        <Button variant="outline" size="sm" onClick={runCloser} disabled={callLoading}>
          {callLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
          Script d'appel
        </Button>
        <Button variant="outline" size="sm" onClick={runOfferBuilder} disabled={offerLoading}>
          {offerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Euro className="h-4 w-4" />}
          Offre
        </Button>
        <Button variant="hero" onClick={analyze} disabled={analyzing}>
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analysis ? "Re-analyser" : "Analyser besoins IA"}
        </Button>
      </PageHeader>

      {/* Modales agents */}
      {callScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCallScript(null)}>
          <Card className="max-w-2xl w-full max-h-[85vh] overflow-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><PhoneCall className="h-4 w-4 text-primary" /> Script d'appel — {prospect.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setCallScript(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3 text-sm">
              <div><div className="text-xs uppercase font-semibold text-primary">Ouverture</div><p className="mt-1">{callScript.opening}</p></div>
              <div><div className="text-xs uppercase font-semibold text-primary">Questions de découverte</div><ul className="mt-1 list-disc pl-5 space-y-1">{(callScript.discovery_questions ?? []).map((q: string, i: number) => <li key={i}>{q}</li>)}</ul></div>
              <div><div className="text-xs uppercase font-semibold text-primary">Propositions de valeur</div><ul className="mt-1 list-disc pl-5 space-y-1">{(callScript.value_props ?? []).map((v: string, i: number) => <li key={i}>{v}</li>)}</ul></div>
              {callScript.call_plan?.length > 0 && <div><div className="text-xs uppercase font-semibold text-primary">Plan d'appel</div><ol className="mt-1 list-decimal pl-5 space-y-1">{callScript.call_plan.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol></div>}
              {callScript.discovery_diagnosis && <div className="rounded-lg border border-border p-3"><div className="text-xs uppercase font-semibold text-primary">Diagnostic à creuser</div><p className="mt-1 text-muted-foreground">{callScript.discovery_diagnosis}</p></div>}
              <div><div className="text-xs uppercase font-semibold text-primary">Objections & réponses</div>
                <div className="mt-2 space-y-2">{(callScript.objections ?? []).map((o: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border p-3"><div className="font-medium">❓ {o.objection}</div><p className="mt-1 text-muted-foreground">→ {o.response}</p></div>
                ))}</div>
              </div>
              <div><div className="text-xs uppercase font-semibold text-primary">Closing</div><p className="mt-1">{callScript.closing}</p></div>
              {callScript.simulation?.length > 0 && <div><div className="text-xs uppercase font-semibold text-primary">Simulation</div><div className="mt-2 space-y-2">{callScript.simulation.map((s: any, i: number) => <div key={i} className="rounded-lg border border-border p-3"><p><span className="font-medium">Prospect :</span> {s.prospect_says}</p><p className="mt-1 text-muted-foreground"><span className="font-medium text-foreground">Closer :</span> {s.closer_replies}</p></div>)}</div></div>}
              {callScript.proposal_angle && <div className="rounded-lg bg-success/10 border border-success/20 p-3"><div className="text-xs uppercase font-semibold text-success">Angle proposition</div><p className="mt-1">{callScript.proposal_angle}</p></div>}
              {callScript.post_call_summary_template && <div><div className="text-xs uppercase font-semibold text-primary">Résumé après appel</div><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{callScript.post_call_summary_template}</p></div>}
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3"><div className="text-xs uppercase font-semibold text-primary">Tonalité</div><p className="mt-1">{callScript.tone_advice}</p></div>
            </div>
          </Card>
        </div>
      )}

      {competitors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setCompetitors(null)}>
          <Card className="max-w-2xl w-full max-h-[85vh] overflow-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Swords className="h-4 w-4 text-primary" /> Analyse concurrence — {prospect.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setCompetitors(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3"><div className="text-xs uppercase font-semibold text-primary">Marché local</div><p className="mt-1">{competitors.market_summary}</p></div>
              {competitors.recommended_positioning && <div className="rounded-lg bg-success/10 border border-success/20 p-3"><div className="text-xs uppercase font-semibold text-success">Positionnement recommandé</div><p className="mt-1">{competitors.recommended_positioning}</p></div>}
              <div><div className="text-xs uppercase font-semibold text-primary mb-2">Concurrents identifiés</div>
                <div className="space-y-2">{(competitors.competitors ?? []).map((c: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="font-medium">{c.name}</div>
                    {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{c.url}</a>}
                    {c.likely_offer && <p className="mt-1 text-xs text-muted-foreground">Offre probable : {c.likely_offer}</p>}
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                      <div><div className="font-semibold text-success">Forces</div><ul className="list-disc pl-4 mt-1">{(c.strengths ?? []).map((s: string, j: number) => <li key={j}>{s}</li>)}</ul></div>
                      <div><div className="font-semibold text-warning">Faiblesses</div><ul className="list-disc pl-4 mt-1">{(c.weaknesses ?? []).map((s: string, j: number) => <li key={j}>{s}</li>)}</ul></div>
                    </div>
                    {c.content_gaps?.length > 0 && <div className="mt-2 text-xs"><div className="font-semibold text-primary">Gaps contenu</div><ul className="list-disc pl-4 mt-1">{c.content_gaps.map((s: string, j: number) => <li key={j}>{s}</li>)}</ul></div>}
                  </div>
                ))}</div>
              </div>
              <div><div className="text-xs uppercase font-semibold text-primary mb-2">Angles de différenciation</div>
                <ul className="list-disc pl-5 space-y-1">{(competitors.differentiation_angles ?? []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
              </div>
              {competitors.outbound_angles?.length > 0 && <div><div className="text-xs uppercase font-semibold text-primary mb-2">Angles outbound</div><ul className="list-disc pl-5 space-y-1">{competitors.outbound_angles.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>}
              {competitors.quick_wins?.length > 0 && <div><div className="text-xs uppercase font-semibold text-primary mb-2">Quick wins</div><ul className="list-disc pl-5 space-y-1">{competitors.quick_wins.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>}
            </div>
          </Card>
        </div>
      )}

      {offer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setOffer(null)}>
          <Card className="max-w-3xl w-full max-h-[85vh] overflow-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Euro className="h-4 w-4 text-primary" /> Offre — {offer.offer_name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setOffer(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="text-xs uppercase font-semibold text-primary">Positionnement</div>
                <p className="mt-1">{offer.positioning}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3"><div className="text-xs uppercase font-semibold text-muted-foreground">Douleur</div><p className="mt-1">{offer.pain_summary}</p></div>
                <div className="rounded-lg border border-border p-3"><div className="text-xs uppercase font-semibold text-muted-foreground">Promesse</div><p className="mt-1">{offer.promise}</p></div>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase font-semibold text-primary">Packs</div>
                <div className="grid gap-3 md:grid-cols-3">
                  {(offer.packages ?? []).map((pack: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{pack.name}</p>
                        {pack.name === offer.recommended_package && <Badge>Recommandé</Badge>}
                      </div>
                      <p className="mt-1 text-primary font-medium">{pack.price}</p>
                      <p className="text-xs text-muted-foreground">Setup : {pack.setup_fee} · {pack.timeline}</p>
                      <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">{(pack.deliverables ?? []).map((d: string, j: number) => <li key={j}>{d}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
              {offer.implementation_plan_30_days?.length > 0 && <div><div className="text-xs uppercase font-semibold text-primary">Plan 30 jours</div><ol className="mt-1 list-decimal pl-5 space-y-1">{offer.implementation_plan_30_days.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol></div>}
              {offer.invoice_services?.length > 0 && <div><div className="text-xs uppercase font-semibold text-primary">Lignes facturables</div><div className="mt-2 space-y-2">{offer.invoice_services.map((s: any, i: number) => <div key={i} className="rounded border border-border p-2"><p className="font-medium">{s.name} · {Number(s.amount).toLocaleString("fr-FR")} €</p><p className="text-xs text-muted-foreground">{s.detail}</p></div>)}</div></div>}
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase font-semibold text-primary">Message d'envoi</div>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{offer.proposal_message}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        {/* Infos contact */}
        <Card className="p-5 space-y-3 lg:col-span-1">
          <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Coordonnées</h3>
          <div className="space-y-2 text-sm">
            {prospect.contact_name && <p><span className="text-muted-foreground">Contact : </span>{prospect.contact_name}</p>}
            {prospect.dirigeant && <p><span className="text-muted-foreground">Dirigeant : </span>{prospect.dirigeant}</p>}
            {prospect.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><a href={`mailto:${prospect.email}`} className="text-primary hover:underline">{prospect.email}</a></p>}
            {prospect.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><a href={`tel:${prospect.phone}`} className="text-primary hover:underline">{prospect.phone}</a></p>}
            {prospect.website && <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-foreground" /><a href={prospect.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{prospect.website}</a></p>}
            {(prospect.address || prospect.city) && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{[prospect.address, prospect.zip, prospect.city].filter(Boolean).join(", ")}</p>}
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {prospect.rating != null && prospect.rating > 0 && (
              <Badge variant="outline" className="gap-1"><Star className="h-3 w-3 text-warning" />{prospect.rating} ({prospect.reviews_count})</Badge>
            )}
            {prospect.employees_count && <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{prospect.employees_count}</Badge>}
            {prospect.revenue_estimate && <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3" />{(prospect.revenue_estimate / 1000).toFixed(0)}k€</Badge>}
            {prospect.siren && <Badge variant="outline">SIREN {prospect.siren}</Badge>}
          </div>
        </Card>

        {/* Analyse IA */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Analyse digitale IA</h3>
            {analysis && (
              <Badge variant="outline" className="text-base px-3 py-1">
                Score : <span className={cn("ml-1 font-bold", analysis.score >= 70 ? "text-success" : analysis.score >= 40 ? "text-warning" : "text-muted-foreground")}>{analysis.score}/100</span>
              </Badge>
            )}
          </div>

          {!analysis ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="mb-4">Aucune analyse pour ce prospect.</p>
              <Button variant="hero" onClick={analyze} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Lancer l'analyse IA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Note synthèse</p>
                <p className="text-sm">{analysis.ai_note}</p>
              </div>

              {analysis.angle && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs uppercase font-semibold text-primary mb-1">Angle commercial</p>
                  <p className="text-sm">{analysis.angle}</p>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                {analysis.primary_service_to_sell && <div className="rounded-lg border border-border p-3"><p className="text-xs uppercase font-semibold text-muted-foreground">Service à vendre</p><p className="mt-1 text-sm font-medium">{analysis.primary_service_to_sell}</p></div>}
                {analysis.estimated_budget && <div className="rounded-lg border border-border p-3"><p className="text-xs uppercase font-semibold text-muted-foreground">Budget estimé</p><p className="mt-1 text-sm font-medium text-primary">{analysis.estimated_budget}</p></div>}
                {analysis.closing_probability != null && <div className="rounded-lg border border-border p-3"><p className="text-xs uppercase font-semibold text-muted-foreground">Probabilité closing</p><p className="mt-1 text-sm font-medium">{analysis.closing_probability}% · {analysis.urgency ?? "—"}</p></div>}
              </div>

              {analysis.next_best_action && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-xs uppercase font-semibold text-success mb-1">Prochaine action</p>
                  <p className="text-sm">{analysis.next_best_action}</p>
                </div>
              )}

              {analysis.score_reason && <p className="text-xs text-muted-foreground">{analysis.score_reason}</p>}

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warning" /> Pain points détectés</p>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis.pain_points ?? []).map((p: string, i: number) => (
                    <Badge key={i} variant="outline" className="bg-warning/5 text-warning-foreground border-warning/30">{p}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Services recommandés</p>
                <div className="space-y-2">
                  {(analysis.recommended_services ?? []).map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Badge className={cn("shrink-0", PRIORITY_COLOR[s.priority])}>{s.priority}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{s.service}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.why}</p>
                        {s.estimated_budget && <p className="text-xs text-primary mt-1">{s.estimated_budget}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.best_channels?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Canaux à privilégier</p>
                  <div className="flex gap-2">
                    {analysis.best_channels.map((c: string) => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.buying_triggers?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Signaux d'achat</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.buying_triggers.map((trigger: string, i: number) => <Badge key={i} variant="secondary">{trigger}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Outreach multi-canal */}
        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Outreach multi-canal</h3>
              {!analysis && <p className="mt-1 text-xs text-muted-foreground">Lance d'abord l'analyse IA pour des messages mieux ciblés.</p>}
            </div>
            <Button variant="outline" size="sm" onClick={() => startSequence(activeChannel)} disabled={sequenceLoading === activeChannel}>
              {sequenceLoading === activeChannel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat2 className="h-3.5 w-3.5" />}
              Séquence auto 3 étapes
            </Button>
          </div>

          {sequences.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs">
              {sequences.slice(0, 5).map((seq) => (
                <div key={seq.id} className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5">
                  <Repeat2 className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{seq.channel}</span>
                  <Badge variant={seq.status === "active" ? "secondary" : "outline"}>{seq.status}</Badge>
                  <span className="text-muted-foreground">étape {seq.current_step}/{seq.max_steps}</span>
                  {seq.next_run_at && (
                    <span className="hidden items-center gap-1 text-muted-foreground sm:inline-flex">
                      <CalendarClock className="h-3 w-3" />
                      {new Date(seq.next_run_at).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Tabs value={activeChannel} onValueChange={setActiveChannel}>
            <TabsList className="grid w-full grid-cols-5">
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                const hasMsg = messages.some((m) => m.channel === c.id);
                return (
                  <TabsTrigger key={c.id} value={c.id} className="gap-2">
                    <Icon className={cn("h-4 w-4", c.color)} /> {c.label}
                    {hasMsg && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CHANNELS.map((c) => (
              <TabsContent key={c.id} value={c.id} className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Brouillon {c.label}</p>
                  <Button variant="soft" size="sm" onClick={() => generate(c.id)} disabled={generating === c.id}>
                    {generating === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Générer avec l'IA
                  </Button>
                </div>

                {c.id === "email" && (
                  <input
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                    placeholder="Objet de l'email"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                  />
                )}

                <Textarea
                  rows={c.id === "linkedin" || c.id === "tiktok" ? 4 : 8}
                  placeholder={`Le brouillon ${c.label} apparaîtra ici. Clique sur "Générer avec l'IA" pour en créer un.`}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(draftContent)} disabled={!draftContent}>
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </Button>
                  <Button variant="hero" size="sm" onClick={() => openExternal(c.id)} disabled={!draftContent}>
                    <c.icon className="h-3.5 w-3.5" /> Ouvrir dans {c.label}
                  </Button>
                </div>

                {outreachExtras?.channel === c.id && (outreachExtras.variants?.length > 0 || outreachExtras.follow_ups?.length > 0 || outreachExtras.personalization_notes?.length > 0) && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                    {outreachExtras.personalization_notes?.length > 0 && <p className="mb-2 text-muted-foreground">Personnalisation : {outreachExtras.personalization_notes.join(" · ")}</p>}
                    {outreachExtras.variants?.length > 0 && <div className="space-y-2"><p className="font-semibold">Variantes A/B</p>{outreachExtras.variants.map((v: any, i: number) => <div key={i} className="rounded border border-border p-2"><p className="font-medium">{v.angle}</p><p className="mt-1 text-muted-foreground">{v.content}</p></div>)}</div>}
                    {outreachExtras.follow_ups?.length > 0 && <div className="mt-3 space-y-2"><p className="font-semibold">Relances</p>{outreachExtras.follow_ups.map((f: string, i: number) => <p key={i} className="rounded border border-border p-2 text-muted-foreground">{f}</p>)}</div>}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {messages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm font-medium mb-3">Historique ({messages.length})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className="text-xs p-2 rounded border border-border flex justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[10px]">{m.channel}</Badge>
                        <span className="text-muted-foreground">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                      </div>
                      <p className="truncate text-muted-foreground">{m.subject ? `${m.subject} — ` : ""}{m.content.slice(0, 120)}…</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
