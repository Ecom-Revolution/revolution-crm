import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, FileSearch, BarChart3, Search, Sparkles, Mail, Linkedin, Globe, Zap, PhoneCall, Swords, Palette, RotateCcw, Upload, Euro } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: string;
  features: string[];
  route: string;
  cta: string;
  badge?: "new" | "free";
}

const AGENTS: Agent[] = [
  {
    id: "audit",
    name: "Agent Audit Site",
    description: "Audit SEO + perf + UX automatique d'un site, avec recommandations IA chiffrées prêtes à pitcher.",
    icon: FileSearch,
    category: "Lead magnet",
    features: ["Score Lighthouse mobile + desktop", "Plan 7j/30j", "Offre packagée à pitcher"],
    route: "/audits",
    cta: "Lancer un audit",
  },
  {
    id: "sdr",
    name: "Agent SDR",
    description: "Génère des messages de prospection ultra-personnalisés depuis l'analyse IA du prospect (email, LinkedIn, WhatsApp, etc.).",
    icon: MessageSquare,
    category: "Prospection",
    features: ["6 canaux disponibles", "Variantes A/B", "Relances J+2/J+5"],
    route: "/prospects",
    cta: "Aller aux prospects",
  },
  {
    id: "follow-up",
    name: "Agent Relance",
    description: "Séquences de relance automatiques. Stop si réponse, max 3 relances, timing intelligent (J+3, J+7).",
    icon: Mail,
    category: "Prospection",
    features: ["Cron auto toutes les 15 min", "3 relances max, stop si réponse", "Génération IA de chaque relance"],
    route: "/prospects",
    cta: "Démarrer une séquence",
  },
  {
    id: "ads-reporter",
    name: "Reporter Ads",
    description: "Rapport mensuel automatique pour vos clients (Google/Meta/TikTok) avec recommandations IA chiffrées.",
    icon: BarChart3,
    category: "Delivery client",
    features: ["Multi-plateformes", "Recos chiffrées", "Synthèse exécutive prête à envoyer"],
    route: "/clients",
    cta: "Créer un rapport",
  },
  {
    id: "analyzer",
    name: "Agent Analyse",
    description: "Analyse en masse vos prospects : score, pain points, services à proposer, angle commercial.",
    icon: Sparkles,
    category: "Qualification",
    features: ["Budget + closing probability", "Prochaine action", "Service à vendre"],
    route: "/prospects",
    cta: "Analyser des prospects",
  },
  {
    id: "web-search",
    name: "Recherche Web",
    description: "Recherche web gratuite (DuckDuckGo) pour enrichir vos prospects avec infos fraîches.",
    icon: Globe,
    category: "Enrichissement",
    features: ["DuckDuckGo gratuit illimité", "Cache 7 jours", "Utilisable depuis fiche prospect"],
    route: "/prospects",
    cta: "Voir les prospects",
    badge: "free",
  },
  {
    id: "scraper-maps",
    name: "Scraper Google Maps",
    description: "Aspire les commerces locaux par ville et secteur, enrichit avec emails Hunter.io.",
    icon: Search,
    category: "Acquisition",
    features: ["Recherche géographique", "Enrichissement email", "Dédoublonnage auto"],
    route: "/scraping",
    cta: "Lancer un scrape",
  },
  {
    id: "scraper-linkedin",
    name: "Scraper LinkedIn",
    description: "Identifie les décideurs B2B sur LinkedIn via Apify ou import CSV depuis Sales Navigator.",
    icon: Linkedin,
    category: "Acquisition",
    features: ["Mode Apify ou CSV manuel", "Décideurs ciblés", "Email pro vérifié"],
    route: "/scraping",
    cta: "Scraper LinkedIn",
  },
  {
    id: "scraper-insta",
    name: "Scraper Instagram/TikTok",
    description: "Détecte les comptes locaux à faible engagement = prospects SMMA idéaux.",
    icon: Sparkles,
    category: "Acquisition",
    features: ["Score engagement", "Apify ou import CSV", "Détection besoins SMMA"],
    route: "/scraping",
    cta: "Scraper Insta/TikTok",
  },
  {
    id: "csv-import",
    name: "Import CSV",
    description: "Importe une base de prospects depuis n'importe quel CSV (Sales Nav, Apify export, Phantombuster…).",
    icon: Upload,
    category: "Acquisition",
    features: ["100% gratuit", "Mapping auto des colonnes", "Aperçu avant import"],
    route: "/scraping",
    cta: "Importer un CSV",
    badge: "free",
  },
  {
    id: "closer",
    name: "Agent Closer",
    description: "Génère un script d'appel personnalisé : pitch, questions de découverte, top 5 objections + réponses, closing.",
    icon: PhoneCall,
    category: "Closing",
    features: ["Plan d'appel", "Simulation", "Angle proposition"],
    route: "/prospects",
    cta: "Préparer un appel",
    badge: "new",
  },
  {
    id: "offer-builder",
    name: "Agent Offer Builder",
    description: "Transforme un prospect analysé en proposition commerciale packagée avec pricing, plan 30 jours et lignes facturables.",
    icon: Euro,
    category: "Closing",
    features: ["3 packs maximum", "Pack recommandé", "Lignes facture prêtes"],
    route: "/prospects",
    cta: "Créer une offre",
    badge: "new",
  },
  {
    id: "competitors",
    name: "Agent Concurrents",
    description: "Analyse la concurrence locale du prospect, identifie les forces/faiblesses et propose des angles de différenciation.",
    icon: Swords,
    category: "Stratégie",
    features: ["Positionnement", "Angles outbound", "Quick wins concurrents"],
    route: "/prospects",
    cta: "Analyser la concurrence",
    badge: "new",
  },
  {
    id: "creative-brief",
    name: "Agent Brief Créa",
    description: "Génère un brief créatif complet (audience, hooks, visuels, copy A/B) prêt pour le studio.",
    icon: Palette,
    category: "Delivery client",
    features: ["Scripts UGC", "Storyboard", "Brief designer"],
    route: "/campagnes",
    cta: "Créer un brief",
    badge: "new",
  },
  {
    id: "reactivation",
    name: "Agent Reactivation",
    description: "Détecte les clients dormants (60j+) et génère un message personnalisé de réactivation pour chacun.",
    icon: RotateCcw,
    category: "Retention",
    features: ["Segmentation froid/tiède/chaud", "Offre winback", "Relances J+3/J+7"],
    route: "/clients",
    cta: "Réactiver des clients",
    badge: "new",
  },
];

export default function Agents() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Agents IA" description="Vos collaborateurs autonomes — prospection, audit, reporting, relance, closing" />

      <div className="space-y-6 p-6">
        <Card className="relative overflow-hidden border-primary/30 gradient-card p-6">
          <div className="gradient-radial absolute inset-0 opacity-50" />
          <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow animate-pulse-glow">
                <Bot className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{AGENTS.length} agents IA opérationnels</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  Tous propulsés par <strong>Lovable AI</strong> (Gemini gratuit) + <strong>Groq</strong> (Llama 3.3 70B, optionnel) + APIs gratuites
                  (Google PageSpeed, DuckDuckGo, Hunter free tier). Aucun coût caché.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/15 text-success border-success/30 gap-1">
              <Zap className="h-3 w-3" /> {AGENTS.length}/{AGENTS.length} actifs
            </Badge>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((a, i) => (
            <Card
              key={a.id}
              className="group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-elegant hover:border-primary/40 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-all group-hover:gradient-primary group-hover:text-primary-foreground group-hover:shadow-glow">
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="flex gap-1">
                  {a.badge === "new" && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">NEW</Badge>
                  )}
                  {a.badge === "free" && (
                    <Badge className="bg-success/15 text-success border-success/30 text-[10px]">100% gratuit</Badge>
                  )}
                  <Badge className="bg-success/15 text-success border-success/30 text-[10px]">Actif</Badge>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">{a.category}</p>
              <h3 className="mt-1 font-semibold">{a.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{a.description}</p>
              <ul className="mt-3 space-y-1">
                {a.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="hero" className="mt-4 w-full" onClick={() => navigate(a.route)}>
                {a.cta}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
