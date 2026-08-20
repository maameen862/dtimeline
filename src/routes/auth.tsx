import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/brand-mark";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Sign in with Google or email to restore your cross-device activity timeline, devices and settings from the cloud.",
      },
      { property: "og:title", content: "Sign in — Digital Life Timeline" },
      {
        property: "og:description",
        content:
          "Authenticate to restore your synchronized activity history and authorized devices.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/dashboard", replace: true });
  }

  async function signUp() {
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSentConfirmation(true);
      toast.success("Check your email to confirm your account");
    }
  }

  async function google() {
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithOAuth("google", {
      redirectTo: window.location.origin,
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  }

  async function resetPassword() {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent");
  }

  return (
    <div className="grid-backdrop flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex flex-col items-center justify-center gap-3">
          <BrandMark size={72} className="size-16 shadow-[0_0_40px_-12px_var(--primary)]" />
          <span className="font-display text-lg font-semibold">Digital Life Timeline</span>
        </Link>

        <div className="panel p-6">
          <p className="mb-5 text-center text-sm text-muted-foreground">
            Authenticate to restore your synchronized activity, devices and settings from the cloud.
          </p>

          <Button className="w-full" variant="secondary" onClick={google} disabled={busy}>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or use email{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          {sentConfirmation ? (
            <p className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
              We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Confirm it, then sign in — your cloud data will be waiting.
            </p>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="signin">
                  Sign in
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="signup">
                  Create account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={signIn} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Sign in
                </Button>
                <button
                  type="button"
                  onClick={resetPassword}
                  className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </button>
              </TabsContent>

              <TabsContent value="signup" className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input
                    id="email2"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Password</Label>
                  <Input
                    id="password2"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={signUp} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Create account
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Only for devices you own or are explicitly authorized to monitor.
        </p>
      </div>
    </div>
  );
}
