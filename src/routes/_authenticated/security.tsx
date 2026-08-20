import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, LifeBuoy, Lock, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { useDeviceAuthorizations, useDeviceMutation, useDevices } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { resetFingerprint } from "@/lib/device";
import { secureClear } from "@/lib/local-cache";
import { useParentalGate } from "@/components/parental-gate";
import {
  useParentalLock,
  useRecoveryCodes,
  useSetParentalPin,
  useUpdateParentalLock,
} from "@/lib/parental";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Security & recovery — Digital Life Timeline" },
      {
        name: "description",
        content:
          "Change your password, set a parental PIN, generate recovery codes, revoke devices and clear the encrypted local cache.",
      },
      { property: "og:title", content: "Security & recovery — Digital Life Timeline" },
      {
        property: "og:description",
        content: "Parental lock, recovery codes, device revocation and local cache controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Security,
});

function Security() {
  const { user } = useAuth();
  const devices = useDevices();
  const { device } = useCurrentDevice();
  const mutate = useDeviceMutation();
  const audit = useDeviceAuthorizations();
  const [password, setPassword] = useState("");

  const lock = useParentalLock();
  const setPin = useSetParentalPin();
  const updateLock = useUpdateParentalLock();
  const codes = useRecoveryCodes();
  const { guard, gate } = useParentalGate();
  const [pin, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [issued, setIssued] = useState<string[] | null>(null);

  const lockData = lock.data;
  const configured = Boolean(lockData?.pin_hash);
  const unusedCodes = (codes.data ?? []).filter((c) => !c.used_at).length;

  async function changePassword() {
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("Password updated");
    }
  }

  async function sendRecoveryEmail() {
    const target = recoveryEmail || user?.email;
    if (!target) return;
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Recovery link sent to ${target}`);
  }

  async function signOutEverywhere() {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) toast.error(error.message);
    else toast.success("Signed out on every device — sign in again to continue");
  }

  function savePin() {
    if (pin !== pin2) {
      toast.error("The two PINs do not match");
      return;
    }
    setPin.mutate(
      { pin, recoveryEmail: recoveryEmail || user?.email || null },
      {
        onSuccess: (newCodes) => {
          setIssued(newCodes);
          setPin1("");
          setPin2("");
          toast.success("Parental lock enabled — save your recovery codes");
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  function revokeOthers() {
    guard("delete", () => {
      (devices.data ?? [])
        .filter((d) => d.id !== device?.id && d.status === "authorized")
        .forEach((d) => mutate.mutate({ id: d.id, patch: { status: "revoked" } }));
      toast.success("All other devices revoked");
    });
  }

  return (
    <AppShell title="Security & recovery" description="Credentials, parental lock and device trust">
      {gate}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Credentials</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user?.email}</span>. Your account is the
            recovery key: sign in on any new device to restore your full history.
          </p>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={changePassword}>Update password</Button>
            <Button variant="outline" onClick={signOutEverywhere}>
              Sign out everywhere
            </Button>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <LifeBuoy className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Account recovery</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a recovery address and keep backup codes offline. Recovery codes also unlock the
            parental lock if the PIN is forgotten.
          </p>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="recovery-email">Recovery email</Label>
            <Input
              id="recovery-email"
              type="email"
              placeholder={lockData?.recovery_email ?? user?.email ?? "you@example.com"}
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={sendRecoveryEmail}>
              Send recovery link
            </Button>
            {configured && (
              <Button
                variant="outline"
                onClick={() =>
                  updateLock.mutate(
                    { recovery_email: recoveryEmail || user?.email || null },
                    { onSuccess: () => toast.success("Recovery email saved") },
                  )
                }
              >
                Save address
              </Button>
            )}
            <Badge variant="outline">{unusedCodes} unused recovery code(s)</Badge>
          </div>
        </section>
      </div>

      <section className="panel mt-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Lock className="size-4 text-primary" />
          <h2 className="flex-1 text-sm font-semibold">Parental lock</h2>
          {configured && (
            <Badge variant={lockData?.enabled ? "default" : "secondary"}>
              {lockData?.enabled ? "Active" : "Paused"}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A PIN that protects the account from a child or anyone borrowing the device. Five wrong
          attempts lock protected actions for 15 minutes and raise a security notification.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pin">{configured ? "New PIN" : "PIN"} (4–8 digits)</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin1(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pin2">Confirm PIN</Label>
              <Input
                id="pin2"
                type="password"
                inputMode="numeric"
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
            </div>
            <Button onClick={savePin} disabled={setPin.isPending || pin.length < 4}>
              {configured ? "Replace PIN and codes" : "Enable parental lock"}
            </Button>
          </div>

          <ul className="space-y-4">
            <li className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="lock-enabled">Parental lock enabled</Label>
                <p className="text-xs text-muted-foreground">Turn protection on or off.</p>
              </div>
              <Switch
                id="lock-enabled"
                disabled={!configured}
                checked={Boolean(lockData?.enabled)}
                onCheckedChange={(v) => updateLock.mutate({ enabled: v })}
              />
            </li>
            <li className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="lock-delete">Require PIN to delete information</Label>
                <p className="text-xs text-muted-foreground">
                  Deleting history, devices or the whole archive asks for the PIN first.
                </p>
              </div>
              <Switch
                id="lock-delete"
                disabled={!configured}
                checked={Boolean(lockData?.lock_delete)}
                onCheckedChange={(v) => updateLock.mutate({ lock_delete: v })}
              />
            </li>
            <li className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="lock-export">Require PIN to download data</Label>
                <p className="text-xs text-muted-foreground">
                  Excel, PDF, CSV and JSON exports are protected.
                </p>
              </div>
              <Switch
                id="lock-export"
                disabled={!configured}
                checked={Boolean(lockData?.lock_export)}
                onCheckedChange={(v) => updateLock.mutate({ lock_export: v })}
              />
            </li>
            <li className="flex items-start gap-4">
              <div className="flex-1">
                <Label htmlFor="lock-access">Require PIN to view detailed activity</Label>
                <p className="text-xs text-muted-foreground">
                  The timeline stays blurred until the PIN is entered.
                </p>
              </div>
              <Switch
                id="lock-access"
                disabled={!configured}
                checked={Boolean(lockData?.lock_access)}
                onCheckedChange={(v) => updateLock.mutate({ lock_access: v })}
              />
            </li>
          </ul>
        </div>

        {issued && (
          <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm font-medium">Recovery codes — shown once</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
              {issued.map((c) => (
                <li key={c} className="rounded-md bg-surface-2 px-2 py-1 text-center">
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(issued.join("\n"));
                  toast.success("Codes copied");
                }}
              >
                Copy codes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIssued(null)}>
                I have saved them
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="panel mt-4 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Device trust</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(devices.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <Smartphone className="size-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{d.name}</span>
              <Badge variant={d.status === "authorized" ? "default" : "secondary"}>
                {d.status}
              </Badge>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={revokeOthers}>
            Revoke all other devices
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() =>
              guard("delete", () => {
                secureClear();
                toast.success("Encrypted local cache cleared — cloud data untouched");
              })
            }
          >
            <Trash2 className="size-4" /> Clear local cache
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              guard("delete", () => {
                resetFingerprint();
                toast.success("This install will register as a new device on next sign-in");
              })
            }
          >
            Reset device identity
          </Button>
        </div>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">Authorization history</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(audit.data ?? []).map((a) => {
            const row = a as Record<string, string>;
            return (
              <li key={row["id"]} className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{row["action"]}</Badge>
                <span className="flex-1 truncate text-muted-foreground">
                  {row["device_name"] ?? "Device"} — {row["note"] ?? "no note"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(row["created_at"])}
                </span>
              </li>
            );
          })}
          {(audit.data ?? []).length === 0 && (
            <li className="text-muted-foreground">No authorization events recorded.</li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}
