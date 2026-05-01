import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, Bot, FileSearch,
  Megaphone, Receipt, Calendar, Settings, LogOut, Radar,
  Menu, Search, Activity as ActivityIcon, TrendingUp, PhoneCall, Target,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationsBell } from "@/components/NotificationsBell";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/funnel", label: "Funnel", icon: Target },
  { to: "/prospects", label: "Prospects", icon: Users },
  { to: "/scraping", label: "Scraping", icon: Radar },
  { to: "/clients", label: "Clients", icon: Briefcase },
  { to: "/agents", label: "Agents IA", icon: Bot },
  { to: "/audits", label: "Audits site", icon: FileSearch },
  { to: "/campagnes", label: "Campagnes", icon: Megaphone },
  { to: "/performance", label: "Performance", icon: TrendingUp },
  { to: "/scripts", label: "Scripts d'appel", icon: PhoneCall },
  { to: "/activite", label: "Journal IA", icon: ActivityIcon },
  { to: "/factures", label: "Factures", icon: Receipt },
  { to: "/agenda", label: "Agenda", icon: Calendar },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {nav.map((item, i) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          style={{ animationDelay: `${i * 30}ms`, animationFillMode: "backwards" }}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all animate-fade-in",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-0.5",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-x-1 -translate-y-1/2 rounded-r-full gradient-primary shadow-glow" />
              )}
              <item.icon className={cn("h-4 w-4 transition-transform", isActive && "text-primary")} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name?: string | null; avatar_url?: string | null } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initials = (profile?.full_name || user?.email || "?")
    .split(/\s|@/)[0]
    .slice(0, 2)
    .toUpperCase();

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-5">
        <Logo size="h-12" glow />
      </div>

      <NavLinks onNavigate={onNavigate} />

      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/parametres"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50",
            )
          }
        >
          <Settings className="h-4 w-4" />
          Paramètres
        </NavLink>
        <div className="mt-3 flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground shadow-glow">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{profile?.full_name || user?.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Se déconnecter">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 flex flex-col">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md md:h-16 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="md:hidden">
            <Logo size="h-8" glow />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaletteOpen(true)}
              className="hidden gap-2 md:inline-flex"
            >
              <Search className="h-4 w-4" />
              <span className="text-muted-foreground">Rechercher...</span>
              <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPaletteOpen(true)}
              className="md:hidden"
              aria-label="Rechercher"
            >
              <Search className="h-5 w-5" />
            </Button>
            <NotificationsBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-safe">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
