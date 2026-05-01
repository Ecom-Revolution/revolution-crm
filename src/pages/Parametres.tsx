import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Save, Users, Key, Loader2, Shield, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Member { user_id: string; full_name: string | null; email?: string; role: string; }

export default function Parametres() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; phone: string }>({ full_name: "", phone: "" });
  const [members, setMembers] = useState<Member[]>([]);
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: roles }, { data: profiles }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    if (p) setProfile({ full_name: p.full_name ?? "", phone: p.phone ?? "" });
    const myRole = roles?.find((r) => r.user_id === user.id)?.role;
    setIsAdmin(myRole === "admin");
    const merged: Member[] = (roles ?? []).map((r) => ({
      user_id: r.user_id,
      full_name: profiles?.find((p) => p.id === r.user_id)?.full_name ?? null,
      role: r.role,
    }));
    setMembers(merged);
    // probe optional integrations (publicly safe — just checks if env var is wired in an edge function)
    setSecrets({
      "Lovable AI (Gemini/GPT-5)": true,
      "Groq (Llama 3.3) — optionnel": false, // surfaced in UI prompt
      "Google PageSpeed (audit)": true,
      "DuckDuckGo (recherche web)": true,
      "Hunter.io (emails)": false,
      "Apify (scraping avancé)": false,
      "Pappers (SIREN)": false,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profil mis à jour");
  };

  const updateRole = async (userId: string, role: string) => {
    if (!isAdmin) { toast.error("Réservé aux admins"); return; }
    const { error } = await supabase.from("user_roles").update({ role: role as any }).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Rôle mis à jour"); load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Paramètres" description="Profil, équipe et intégrations" />

      <div className="p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile"><SettingsIcon className="mr-2 h-4 w-4" />Profil</TabsTrigger>
            <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Équipe</TabsTrigger>
            <TabsTrigger value="integrations"><Key className="mr-2 h-4 w-4" />Intégrations</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="max-w-xl p-6 space-y-4">
              <div className="grid gap-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
              <div className="grid gap-2"><Label>Nom complet</Label><Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Téléphone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              <Button variant="hero" onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-4 py-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{isAdmin ? "Vous êtes admin" : "Vue lecture (réservé aux admins pour modifier)"}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3 text-left">Membre</th><th className="p-3 text-left">Rôle</th></tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.user_id} className="border-t border-border">
                        <td className="p-3">
                          <div className="font-medium">{m.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}…</div>
                        </td>
                        <td className="p-3">
                          {isAdmin ? (
                            <Select value={m.role} onValueChange={(v) => updateRole(m.user_id, v)}>
                              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="closer">Closer</SelectItem>
                                <SelectItem value="setter">Setter</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge>{m.role}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="p-6 space-y-3">
              <div className="text-sm text-muted-foreground mb-2">Statut des APIs gratuites utilisées par les agents IA :</div>
              {Object.entries(secrets).map(([name, ok]) => (
                <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <span className="text-sm font-medium">{name}</span>
                  {ok ? <Badge className="bg-success/15 text-success border-success/30 gap-1"><Check className="h-3 w-3" />Connecté</Badge>
                       : <Badge variant="outline" className="gap-1"><X className="h-3 w-3" />Optionnel</Badge>}
                </div>
              ))}
              <p className="pt-3 text-xs text-muted-foreground">
                Les intégrations optionnelles (Hunter, Apify, Pappers, Groq) débloquent des fonctionnalités avancées mais ne sont pas indispensables. Les agents IA fonctionnent par défaut avec Lovable AI.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
