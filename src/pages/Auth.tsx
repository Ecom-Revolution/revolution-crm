import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, Sparkles, Radar, BarChart3, Bot, Zap } from "lucide-react";
import { Logo } from "@/components/Logo";

const features = [
  { icon: Radar, label: "Scraping multi-sources", desc: "Google Maps, LinkedIn, Pappers, Hunter — en un clic." },
  { icon: Bot, label: "Agents IA dédiés", desc: "Audit de sites, scoring, génération de messages." },
  { icon: BarChart3, label: "Reporting unifié", desc: "Google Ads, Meta, TikTok consolidés." },
  { icon: Zap, label: "Séquences automatiques", desc: "Relances multi-canaux, pilotées par l'IA." },
];

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === "true";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  if (authLoading) return null;
  if (session) return <Navigate to="/" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Connecté !");
    navigate("/");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim();
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé. Vérifiez votre email pour confirmer.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[40rem] w-[40rem] rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[40rem] w-[40rem] rounded-full bg-primary-glow/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--primary)/0.15),transparent_60%)]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-2 lg:items-center lg:px-12">
        {/* LEFT — Branding */}
        <div className="flex flex-col justify-between gap-12 animate-fade-in">
          <Logo size="h-20" glow />

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
              <Sparkles className="h-3 w-3" />
              CRM nouvelle génération
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Pilotez votre agence,{" "}
              <span className="gradient-text">accélérez la croissance.</span>
            </h1>
            <p className="max-w-md text-base text-muted-foreground md:text-lg">
              Prospection automatisée, audits IA et reporting publicitaire — tout votre stack
              commercial dans un seul outil signé Revolution.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-lg">
            {features.map((f, i) => (
              <div
                key={f.label}
                className="group rounded-xl border border-border/50 bg-card/40 p-3 backdrop-blur transition-all hover:border-primary/40 hover:bg-card/70 hover:shadow-elegant animate-fade-in"
                style={{ animationDelay: `${100 + i * 80}ms`, animationFillMode: "backwards" }}
              >
                <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow">
                  <f.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="flex w-full justify-center lg:justify-end">
          <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: "150ms", animationFillMode: "backwards" }}>
            <Card className="border-border/60 glass p-6 shadow-elegant md:p-8">
              <div className="mb-6 space-y-1">
                <h2 className="text-2xl font-bold">Bienvenue 👋</h2>
                <p className="text-sm text-muted-foreground">
                  Connectez-vous ou créez votre espace en quelques secondes.
                </p>
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@revolution-agence.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Input id="password" type="password" required value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={loading} variant="hero" size="lg" className="w-full">
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input id="name" required value={fullName}
                        onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-up">Email</Label>
                      <Input id="email-up" type="email" required value={email}
                        onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-up">Mot de passe</Label>
                      <Input id="password-up" type="password" required minLength={6} value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={loading} variant="hero" size="lg" className="w-full">
                      {loading ? "Création..." : "Créer mon compte"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {demoEnabled && (
                <div className="mt-6 space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      localStorage.setItem("demo_mode", "1");
                      toast.success("Mode démo activé");
                      navigate("/");
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Explorer en mode démo
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Le premier compte créé devient admin automatiquement.
                  </p>
                </div>
              )}
              {!demoEnabled && (
                <p className="text-center text-xs text-muted-foreground">
                  Le premier compte créé devient admin automatiquement.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
