import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  Boxes,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { DeviceSwitcher } from "@/components/device-switcher";
import { DeviceConsentPrompt } from "@/components/device-consent-prompt";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { useEvents, useNotifications, useSettings, useSync } from "@/lib/api";
import { useAccountAlerts } from "@/hooks/use-account-alerts";
import { useScreenTimeLimit } from "@/hooks/use-screen-time-limit";
import { filterToday, totalScreenSeconds } from "@/lib/analytics";
import { relativeTime } from "@/lib/format";
import { secureClear } from "@/lib/local-cache";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timeline", label: "Timeline", icon: Activity },
  { to: "/devices", label: "Devices", icon: MonitorSmartphone },
  { to: "/applications", label: "Applications", icon: Boxes },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/insights", label: "AI Insights", icon: BrainCircuit },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/export", label: "Download data", icon: Download },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/privacy", label: "Privacy", icon: Shield },
  { to: "/security", label: "Security", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/delete-data", label: "Delete data", icon: Trash2 },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { device } = useCurrentDevice();
  const notifications = useNotifications();
  const sync = useSync(device?.id);
  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;

  // Account-wide alerts pop on every signed-in device, and today's active time
  // is checked against the user's screen-time reminder (notify only).
  useAccountAlerts();
  const settings = useSettings();
  const prefs = (settings.data?.preferences ?? {}) as Record<string, unknown>;
  const todayEvents = useEvents({ days: 1 });
  useScreenTimeLimit({
    totalSeconds: totalScreenSeconds(filterToday(todayEvents.data ?? [])),
    limitMinutes: Number(prefs["screen_time_limit_minutes"] ?? 0),
    enabled: prefs["notify_screen_time_limit"] !== false,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    secureClear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <BrandMark size={32} className="size-8" />
          <span className="font-display text-sm leading-tight font-semibold">
            Digital Life
            <br />
            Timeline
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === to && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
              {to === "/notifications" && unread > 0 && (
                <Badge className="ml-auto h-5 px-1.5" variant="default">
                  {unread}
                </Badge>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-4 space-y-2 rounded-lg border border-sidebar-border p-3">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground">
            This device: {device ? `${device.name} · synced` : "not synced yet"}
            <br />
            Last sync {relativeTime(device?.last_sync_at)}
          </p>

          <Button variant="ghost" size="sm" className="w-full justify-start px-2" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/80 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
          </div>
          <DeviceSwitcher />
          {actions}
          <Button
            variant="secondary"
            size="sm"
            disabled={sync.isPending || !device}
            onClick={() =>
              sync.mutate(undefined, {
                onSuccess: (count) =>
                  toast.success(`Synchronized — ${count} queued event(s) uploaded`),
                onError: (e) => toast.error((e as Error).message),
              })
            }
          >
            <RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} />
            Sync now
          </Button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 lg:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground",
                pathname === to && "bg-secondary text-secondary-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main
          key={pathname}
          className="flex-1 animate-in px-5 py-6 duration-300 fade-in slide-in-from-bottom-1"
        >
          <DeviceConsentPrompt />
          {children}
        </main>
      </div>
    </div>
  );
}
