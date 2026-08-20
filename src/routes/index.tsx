import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CloudCog,
  Cpu,
  Lock,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup, BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Digital Life Timeline — Your cross-device activity, restored anywhere" },
      {
        name: "description",
        content:
          "A privacy-first unified timeline for your Windows, Android and web activity. Cloud-persisted history, device authorization and analytics that survive reinstalls.",
      },
      { property: "og:title", content: "Digital Life Timeline" },
      {
        property: "og:description",
        content:
          "Unified cross-device activity timeline with cloud persistence, device authorization and usage analytics.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CloudCog,
    title: "Cloud-persistent history",
    body: "Every event, report, preference and privacy setting lives in the cloud under your account — not on one device.",
  },
  {
    icon: RefreshCw,
    title: "Account recovery by design",
    body: "Reinstall, reset or switch devices. Sign in and your timeline, devices, analytics and settings come back.",
  },
  {
    icon: MonitorSmartphone,
    title: "Authorized devices only",
    body: "Each install registers as its own device instance and waits for approval when your security settings require it.",
  },
  {
    icon: Lock,
    title: "Encrypted local cache",
    body: "Offline events are queued in an encrypted device-local cache, then flushed to the cloud on reconnect.",
  },
  {
    icon: Sparkles,
    title: "Insights, not surveillance",
    body: "Metadata and analytics only. No keylogging, no message capture, no hidden monitoring — ever.",
  },
  {
    icon: ShieldCheck,
    title: "You own deletion",
    body: "Delete single events, a day, a device's history, reports or the whole account. Uninstalling never deletes cloud data.",
  },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <BrandLockup size={36} />
        <Button asChild size="sm">
          <Link to="/auth">{user ? "Open dashboard" : "Sign in"}</Link>
        </Button>
      </header>

      <section className="grid-backdrop border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <BrandMark
            size={128}
            className="mx-auto mb-6 size-24 shadow-[0_0_80px_-20px_var(--primary)] sm:size-32"
          />
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Cpu className="size-3.5" /> Windows agent · Android · Web dashboard
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold sm:text-6xl">
            One timeline for every device you own
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground sm:text-lg">
            See what you did today across your PC, phone and browser. Your activity history, device
            list and settings are stored in the cloud, so they survive a new phone, a reset laptop
            or a fresh install.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Sign in with Google</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article key={title} className="panel p-5">
            <Icon className="mb-3 size-5 text-primary" />
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="panel p-6">
          <h2 className="text-lg font-semibold">How restoration works</h2>
          <ol className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {[
              "Old device syncs activity to the cloud database.",
              "You install the app on a new or reset device and sign in.",
              "Identity verified — timeline, devices, reports, analytics and privacy settings restore.",
            ].map((step, i) => (
              <li key={step} className="rounded-lg border border-border bg-surface-2 p-4">
                <span className="font-display text-primary">0{i + 1}</span>
                <p className="mt-2">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        For devices you own or are explicitly authorized to monitor. Metadata and analytics only.
      </footer>
    </div>
  );
}
