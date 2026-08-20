import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Digital Life Timeline" },
      {
        name: "description",
        content: "Set a new password to regain access to your synchronized activity account.",
      },
      { property: "og:title", content: "Reset password — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Set a new password for your Digital Life Timeline account.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit() {
    if (password.length < 6) {
      toast.error("Use at least 6 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      navigate({ to: "/dashboard", replace: true });
    }
  }

  return (
    <div className="grid-backdrop flex min-h-screen items-center justify-center px-5">
      <div className="panel w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your cloud activity history is untouched and will be waiting.
        </p>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button className="mt-4 w-full" onClick={submit} disabled={busy}>
          Update password
        </Button>
      </div>
    </div>
  );
}
