import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ExternalLink, Phone, Mail, MapPin, LayoutGrid, List, Sparkles, ArrowRight, Loader2, Zap, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KanbanBoard, KanbanStatus } from "@/components/prospects/KanbanBoard";
import { exportToCSV } from "@/lib/export";
import { logFunnelEvent } from "@/lib/funnelEvents";

type Status = "a_contacter" | "contacte" | "rdv_pris" | "rdv_effectue" | "proposition" | "negociation" | "client" | "perdu" | "injoignable";
type Source = "google_maps" | "linkedin" | "instagram" | "tiktok" | "pages_jaunes" | "societe_com" | "manual" | "referral" | "website";

const STATUS: Record<Status, { label: string; color: string }> = {
  a_contacter: { label: "À contacter", color: "bg-muted text-foreground" },
  contacte: { label: "Contacté", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  rdv_pris: { label: "RDV pris", color: "bg-warning/15 text-warning border-warning/30" },
  rdv_effectue: { label: "RDV effectué", color: "bg-warning/15 text-warning border-warning/30" },
  proposition: { label: "Proposition", color: "bg-primary/15 text-primary border-primary/30" },
  negociation: { label: "Négociation", color: "bg-primary/15 text-primary border-primary/30" },
  client: { label: "Client 🎉", color: "bg-success/15 text-success border-success/30" },
  perdu: { label: "Perdu", color: "bg-destructive/15 text-destructive border-destructive/30" },
  injoignable: { label: "Injoignable", color: "bg-muted text-muted-foreground" },
};

const SOURCE_LABELS: Record<Source, string> = {
  google_maps: "Google Maps", linkedin: "LinkedIn", instagram: "Instagram", tiktok: "TikTok",
  pages_jaunes: "Pages Jaunes", societe_com: "Societe.com", manual: "Manuel", referral: "Recommandation", website: "Site web",
};

const PAGE_SIZE = 200;

export default function Prospects() {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkAnalyze = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const { data, error } = await supabase.functions.invoke("bulk-analyze-prospects", {
      body: { prospect_ids: Array.from(selectedIds) },
    });
    setBulkLoading(false);
    if (error || data?.error) { toast.error(error?.message || data.error); return; }
    toast.success(`Analyse IA : ${data.success}/${data.total} prospects analysés`);
    setSelectedIds(new Set());
    fetch();
  };

  const fetch = async () => {
    setLoading(true);
    let query = supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (statusFilter !== "all") query = query.eq("status", statusFilter as Status);
    if (sourceFilter !== "all") query = query.eq("source", sourceFilter as Source);
    if (search.trim()) {
      const term = search.trim().replace(/[%_]/g, "\\$&");
      const like = `%${term}%`;
      query = query.or(`name.ilike.${like},city.ilike.${like},sector.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) toast.error(error.message);
    setProspects(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [search, statusFilter, sourceFilter]);

  const filtered = prospects;

  const updateStatus = async (id: string, newStatus: Status) => {
    // Optimistic update
    const previous = prospects;
    const current = prospects.find((p) => p.id === id);
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    const { error } = await supabase.from("prospects").update({ status: newStatus }).eq("id", id);
    if (error) {
      setProspects(previous);
      toast.error(error.message);
      return;
    }
    await logFunnelEvent({
      event_type: "status_changed",
      entity_type: "prospect",
      entity_id: id,
      prospect_id: id,
      source: current?.source,
      status_from: current?.status,
      status_to: newStatus,
      metadata: { prospect_name: current?.name },
    });
    toast.success(`Déplacé vers "${STATUS[newStatus].label}"`);
  };

  return (
    <div>
      <PageHeader title="Prospects" description={`${filtered.length} prospect${filtered.length > 1 ? "s" : ""} affiché${filtered.length > 1 ? "s" : ""}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(filtered, "prospects", [
            { key: "name", label: "Entreprise" },
            { key: "contact_name", label: "Contact" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Téléphone" },
            { key: "city", label: "Ville" },
            { key: "sector", label: "Secteur" },
            { key: "status", label: "Statut" },
            { key: "source", label: "Source" },
            { key: "website", label: "Site" },
            { key: "analysis_score", label: "Score IA" },
            { key: "created_at", label: "Créé le" },
          ])}
          disabled={filtered.length === 0}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <div className="flex items-center gap-2 rounded-lg border border-border p-1">
          <Button variant={view === "table" ? "soft" : "ghost"} size="sm" onClick={() => setView("table")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={view === "kanban" ? "soft" : "ghost"} size="sm" onClick={() => setView("kanban")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
        <NewProspectDialog open={open} onOpenChange={setOpen} onCreated={fetch} />
      </PageHeader>

      <div className="space-y-4 p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, ville, secteur..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sources</SelectItem>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <Card className="flex items-center justify-between gap-3 border-primary/40 bg-primary/5 p-3">
            <p className="text-sm">
              <span className="font-semibold">{selectedIds.size}</span> prospect{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Annuler</Button>
              <Button variant="hero" size="sm" onClick={bulkAnalyze} disabled={bulkLoading}>
                {bulkLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse IA...</> : <><Zap className="h-4 w-4" /> Analyser avec l'IA</>}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <Card className="py-20 text-center">
            <p className="text-muted-foreground">Aucun prospect — ajoutez-en un manuellement ou importez votre base.</p>
            <Button variant="hero" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Ajouter un prospect
            </Button>
          </Card>
        ) : view === "table" ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="w-10 px-4 py-3">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))}
                        onCheckedChange={(c) => {
                          if (c) setSelectedIds(new Set(filtered.map((p) => p.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Entreprise</th>
                    <th className="px-4 py-3 font-medium">Localisation</th>
                    <th className="px-4 py-3 font-medium">Secteur</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-border transition-colors hover:bg-accent/30 cursor-pointer"
                      onClick={() => navigate(`/prospects/${p.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{p.name}</p>
                          {p.analysis_score != null && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Sparkles className="h-2.5 w-2.5 text-primary" />{p.analysis_score}
                            </Badge>
                          )}
                        </div>
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Site
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.sector || "—"}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{SOURCE_LABELS[p.source as Source]}</Badge></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {p.phone && <a href={`tel:${p.phone}`} className="text-muted-foreground hover:text-primary"><Phone className="h-3.5 w-3.5" /></a>}
                          {p.email && <a href={`mailto:${p.email}`} className="text-muted-foreground hover:text-primary"><Mail className="h-3.5 w-3.5" /></a>}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v as Status)}>
                          <SelectTrigger className={cn("h-8 w-[150px] border-0", STATUS[p.status as Status]?.color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" title="Ouvrir la fiche">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <KanbanBoard
            prospects={filtered}
            sourceLabels={SOURCE_LABELS}
            onCardClick={(id) => navigate(`/prospects/${id}`)}
            onStatusChange={(id, s) => updateStatus(id, s as Status)}
          />
        )}
      </div>
    </div>
  );
}

function NewProspectDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", website: "", city: "", sector: "", source: "manual" as Source, notes: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("prospects").insert({ ...form, created_by: user?.id }).select("id, source").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data) {
      await logFunnelEvent({
        event_type: "prospect_created",
        entity_type: "prospect",
        entity_id: data.id,
        prospect_id: data.id,
        source: data.source,
        metadata: { name: form.name, sector: form.sector, city: form.city },
      });
    }
    toast.success("Prospect ajouté");
    setForm({ name: "", email: "", phone: "", website: "", city: "", sector: "", source: "manual", notes: "" });
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="hero"><Plus className="h-4 w-4" /> Nouveau prospect</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouveau prospect</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nom de l'entreprise *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Site web</Label>
              <Input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Secteur</Label>
              <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Restauration, BTP..." />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as Source })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <Button type="submit" variant="hero" disabled={saving} className="w-full">
            {saving ? "Création..." : "Ajouter le prospect"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
