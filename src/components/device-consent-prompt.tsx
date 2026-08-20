import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Check,
  ExternalLink,
  MonitorSmartphone,
  ShieldQuestion,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { useRegisterDevice } from "@/lib/api";
import { detectDevice } from "@/lib/device";
import { setDeviceConsent, useDeviceConsent } from "@/lib/device-consent";
import { useDeviceNotifications } from "@/lib/notify";
import {
  markPermission,
  openDeepLink,
  readPermissions,
  requiredPermissions,
  type PermissionKind,
} from "@/lib/permissions";

/**
 * Asked once per install: may this device sync its activity to the account, and
 * under what name? Registration is a two-step flow — name the device, then grant
 * the permissions that platform requires (notifications everywhere, Usage
 * Access on Android). Once answered, the decision is remembered locally so
 * signing in again never re-asks for the same device.
 */
export function DeviceConsentPrompt() {
  const { device, loading } = useCurrentDevice();
  const consent = useDeviceConsent();
  const register = useRegisterDevice();
  const detected = detectDevice();
  const notifications = useDeviceNotifications();
  const [name, setName] = useState(detected.name);
  const [step, setStep] = useState<"name" | "permissions">("name");
  const [granted, setGranted] = useState<PermissionKind[]>(() => readPermissions());

  const perms = useMemo(() => requiredPermissions(detected.platform), [detected.platform]);

  // Already registered — remember it so the prompt never appears again.
  useEffect(() => {
    if (device && consent !== "granted") setDeviceConsent("granted");
  }, [device, consent]);

  useEffect(() => {
    if (notifications.optedIn && notifications.permission === "granted") {
      markPermission("notifications");
      setGranted(readPermissions());
    }
  }, [notifications.optedIn, notifications.permission]);

  if (loading || device) return null;

  const isGranted = (k: PermissionKind) => granted.includes(k);
  const blocking = perms.filter((p) => p.mandatory && !isGranted(p.kind));

  if (consent === "denied") {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/50 p-4">
        <ShieldQuestion className="size-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 text-sm text-muted-foreground">
          This device is <strong className="text-foreground">not synced</strong>. Its activity stays
          off your account and nothing is recorded here.
        </p>
        <Button size="sm" variant="secondary" onClick={() => setDeviceConsent("unknown")}>
          Add this device
        </Button>
      </div>
    );
  }

  function confirm(kind: PermissionKind, deepLink?: string) {
    if (deepLink) openDeepLink(deepLink);
    markPermission(kind);
    setGranted(readPermissions());
  }

  function finish() {
    register.mutate(
      { name },
      {
        onSuccess: (d) => {
          setDeviceConsent("granted");
          toast.success(`${d.name} added — this device is now synced`);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="animate-in w-full max-w-lg rounded-2xl border border-primary/40 bg-card p-4 shadow-2xl duration-200 fade-in zoom-in-95">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2">
            <MonitorSmartphone className="size-4 text-primary" />
          </span>
        <div className="min-w-0 flex-1">
          {step === "name" ? (
            <>
              <p className="text-sm font-medium">Add this device to your account?</p>
              <p className="text-xs text-muted-foreground">
                Give it a name you’ll recognise — like “Dad’s laptop” or “Pixel 8”. Allow it once and
                it keeps syncing silently; you won’t be asked again on this device.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Label htmlFor="device-name" className="sr-only">
                  Device name
                </Label>
                <Input
                  id="device-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={detected.name}
                  maxLength={40}
                  className="h-9 w-full sm:w-64"
                />
                <Button size="sm" disabled={!name.trim()} onClick={() => setStep("permissions")}>
                  <Check className="size-4" /> Continue
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeviceConsent("denied");
                    toast.info("Device not added — nothing will be recorded here");
                  }}
                >
                  <X className="size-4" /> Deny
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Permissions required for “{name.trim()}”</p>
              <p className="text-xs text-muted-foreground">
                These are needed before this device can record and sync activity. Nothing private is
                read — only app names, durations and device events.
              </p>
              <ul className="mt-3 space-y-2">
                {perms.map((p) => {
                  const ok = isGranted(p.kind);
                  return (
                    <li
                      key={p.kind}
                      className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface-2/50 p-3"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-3">
                        {ok ? (
                          <Check className="size-3.5 text-primary" />
                        ) : (
                          <BellRing className="size-3.5 text-muted-foreground" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">
                          {p.title}{" "}
                          <span className="text-muted-foreground">
                            {p.mandatory ? "· required" : "· recommended"}
                          </span>
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {p.detail}
                        </p>
                      </div>
                      {ok ? (
                        <span className="text-[11px] font-medium text-primary">Granted</span>
                      ) : p.mode === "request" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            await notifications.enable();
                            if (
                              typeof Notification !== "undefined" &&
                              Notification.permission === "granted"
                            ) {
                              confirm(p.kind);
                            } else {
                              toast.error("Allow notifications in your browser to continue");
                            }
                          }}
                        >
                          Allow
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => p.deepLink && openDeepLink(p.deepLink)}
                          >
                            <ExternalLink className="size-3.5" /> Open settings
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => confirm(p.kind)}>
                            I’ve enabled it
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setStep("name")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={register.isPending || blocking.length > 0}
                  onClick={finish}
                >
                  <Check className="size-4" /> Add device
                </Button>
                {blocking.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    Grant {blocking.map((p) => p.title).join(" and ")} to continue.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
