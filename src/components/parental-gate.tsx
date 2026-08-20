import { useCallback, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isGuarded, useParentalLock, useVerifyParental, type GuardedAction } from "@/lib/parental";

/**
 * Wraps a sensitive action behind the account PIN. Render `gate` once in the
 * page and call `guard(action, run)` instead of running the action directly.
 */
export function useParentalGate() {
  const lock = useParentalLock();
  const verify = useVerifyParental();
  const [pending, setPending] = useState<null | { action: GuardedAction; run: () => void }>(null);
  const [secret, setSecret] = useState("");

  const guard = useCallback(
    (action: GuardedAction, run: () => void) => {
      if (!isGuarded(lock.data, action)) {
        run();
        return;
      }
      setSecret("");
      setPending({ action, run });
    },
    [lock.data],
  );

  function submit() {
    if (!pending) return;
    verify.mutate(secret, {
      onSuccess: () => {
        const run = pending.run;
        setPending(null);
        setSecret("");
        run();
      },
      onError: (e) => toast.error((e as Error).message),
    });
  }

  const gate: ReactNode = (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4 text-primary" /> Parental lock
          </DialogTitle>
          <DialogDescription>
            {pending?.action === "delete"
              ? "Enter the PIN to delete data from this account."
              : pending?.action === "export"
                ? "Enter the PIN to export or download data."
                : "Enter the PIN to view this protected information."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="parental-pin">PIN or recovery code</Label>
          <Input
            id="parental-pin"
            autoFocus
            type="password"
            inputMode="text"
            value={secret}
            placeholder="••••"
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <p className="text-xs text-muted-foreground">
            A recovery code (like 4KQ7-M2XP) also works and is consumed once used.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={verify.isPending || secret.length < 4}>
            Unlock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { guard, gate, lock: lock.data ?? null };
}
