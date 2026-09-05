"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Database,
  Leaf,
  MapPin,
  Moon,
  Radar,
  RefreshCw,
  Sprout,
  Sun,
  TriangleAlert,
  Trash2,
} from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client/api";
import { useFields } from "@/hooks/useAgriData";
import { LandingView } from "@/components/agri/LandingView";
import { MapView } from "@/components/agri/MapView";
import { FieldDashboardView } from "@/components/agri/FieldDashboard";
import { ImpactView } from "@/components/agri/ImpactView";
import { AlertsView } from "@/components/agri/AlertsView";
import { AboutView } from "@/components/agri/AboutView";

const NAV: { id: ViewId; label: string; icon: typeof Leaf }[] = [
  { id: "landing", label: "Home", icon: Leaf },
  { id: "map", label: "Fields", icon: MapPin },
  { id: "dashboard", label: "Monitor", icon: Radar },
  { id: "impact", label: "Impact", icon: BarChart3 },
  { id: "alerts", label: "Alerts", icon: TriangleAlert },
  { id: "about", label: "Method", icon: Sprout },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9"
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  );
}

export default function Page() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const selectedFieldId = useAppStore((s) => s.selectedFieldId);
  const { fields } = useFields();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);

  const hasData = (fields?.length ?? 0) > 0;

  const seed = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await api.seed();
      bumpRefresh();
      toast({
        title: "Demo dataset loaded",
        description: `${res.message} Advisories auto-decided to populate the impact ledger.`,
      });
      setView("impact");
    } catch (e) {
      toast({
        title: "Seeding failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const reset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      const res = await api.reset();
      bumpRefresh();
      toast({ title: "All data cleared", description: res.message });
    } catch (e) {
      toast({
        title: "Reset failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto max-w-7xl px-3 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-2">
            <button
              className="flex items-center gap-2 min-w-0"
              onClick={() => setView("landing")}
              aria-label="AgriImpact home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2E7F25] text-[#F4FCF1]">
                <Leaf className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-bold tracking-tight truncate">
                agri<span className="text-[#2E7F25] dark:text-[#55B54A]">impact</span>
                <span className="text-muted-foreground">_</span>
              </span>
            </button>

            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {NAV.map((n) => (
                <Button
                  key={n.id}
                  variant={view === n.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView(n.id)}
                  className="text-[11px] gap-1.5 h-8"
                  aria-current={view === n.id ? "page" : undefined}
                >
                  <n.icon className="h-3.5 w-3.5" aria-hidden /> {n.label}
                </Button>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              {!hasData ? (
                <Button size="sm" onClick={seed} disabled={seeding} className="hidden sm:inline-flex">
                  <Database className={`h-4 w-4 mr-1 ${seeding ? "animate-pulse" : ""}`} aria-hidden />
                  {seeding ? "Seeding…" : "Load demo data"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reset}
                  disabled={resetting}
                  className="hidden sm:inline-flex text-[#B3491F] dark:text-[#E0703F]"
                >
                  <Trash2 className="h-4 w-4 mr-1" aria-hidden />
                  {resetting ? "Clearing…" : "Clear data"}
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* mobile nav */}
          <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 -mb-px" aria-label="Mobile navigation">
            {NAV.map((n) => (
              <Button
                key={n.id}
                variant={view === n.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView(n.id)}
                className="text-[11px] gap-1 h-8 shrink-0"
                aria-current={view === n.id ? "page" : undefined}
              >
                <n.icon className="h-3.5 w-3.5" aria-hidden /> {n.label}
              </Button>
            ))}
            {!hasData ? (
              <Button size="sm" onClick={seed} disabled={seeding} className="text-[11px] h-8 shrink-0">
                <Database className="h-3.5 w-3.5 mr-1" aria-hidden />
                {seeding ? "Seeding…" : "Demo data"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={reset}
                disabled={resetting}
                className="text-[11px] h-8 shrink-0 text-[#B3491F] dark:text-[#E0703F]"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden />
                {resetting ? "Clearing…" : "Clear"}
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* main */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        {view === "landing" ? <LandingView /> : null}
        {view === "map" ? <MapView /> : null}
        {view === "dashboard" ? <FieldDashboardView key={selectedFieldId ?? "none"} /> : null}
        {view === "impact" ? <ImpactView /> : null}
        {view === "alerts" ? <AlertsView /> : null}
        {view === "about" ? <AboutView /> : null}
      </main>

      {/* footer */}
      <footer className="mt-auto border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <p>
            agriimpact_ · precision irrigation with measured impact · weather by Open-Meteo · satellite
            imagery by Esri World Imagery (Maxar, Earthstar Geographics) · model fao56-dualbucket-v1
          </p>
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => setView("about")}
          >
            <RefreshCw className="h-3 w-3" aria-hidden /> read the methodology
          </button>
        </div>
      </footer>
    </div>
  );
}
