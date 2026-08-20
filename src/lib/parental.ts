import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  generateRecoveryCodes,
  hashSecret,
  normalizeCode,
  randomSalt,
  verifySecret,
} from "@/lib/security";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ParentalLock {
  user_id: string;
  enabled: boolean;
  pin_hash: string | null;
  pin_salt: string | null;
  lock_delete: boolean;
  lock_export: boolean;
  lock_access: boolean;
  recovery_email: string | null;
  failed_attempts: number;
  locked_until: string | null;
}

export type GuardedAction = "delete" | "export" | "access";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function useParentalLock() {
  return useQuery({
    queryKey: ["parental-lock"],
    queryFn: async (): Promise<ParentalLock | null> => {
      const userId = await uid();
      const { data, error } = await db
        .from("parental_locks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as ParentalLock) ?? null;
    },
  });
}

export function isGuarded(lock: ParentalLock | null | undefined, action: GuardedAction): boolean {
  if (!lock?.enabled || !lock.pin_hash) return false;
  if (action === "delete") return lock.lock_delete;
  if (action === "export") return lock.lock_export;
  return lock.lock_access;
}

/** Creates or replaces the PIN and issues a fresh set of one-time recovery codes. */
export function useSetParentalPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pin: string; recoveryEmail?: string | null }) => {
      const userId = await uid();
      if (!/^\d{4,8}$/.test(input.pin)) throw new Error("Use a 4–8 digit PIN");
      const salt = randomSalt();
      const pin_hash = await hashSecret(input.pin, salt);
      const { error } = await db.from("parental_locks").upsert(
        {
          user_id: userId,
          enabled: true,
          pin_hash,
          pin_salt: salt,
          recovery_email: input.recoveryEmail ?? null,
          failed_attempts: 0,
          locked_until: null,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;

      const codes = generateRecoveryCodes();
      await db.from("recovery_codes").delete().eq("user_id", userId);
      const hashed = await Promise.all(
        codes.map(async (c) => ({
          user_id: userId,
          code_hash: await hashSecret(normalizeCode(c), salt),
        })),
      );
      const { error: codeError } = await db.from("recovery_codes").insert(hashed);
      if (codeError) throw codeError;
      return codes;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parental-lock"] });
      qc.invalidateQueries({ queryKey: ["recovery-codes"] });
    },
  });
}

export function useUpdateParentalLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<ParentalLock>) => {
      const userId = await uid();
      const { error } = await db.from("parental_locks").update(values).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parental-lock"] }),
  });
}

export function useRecoveryCodes() {
  return useQuery({
    queryKey: ["recovery-codes"],
    queryFn: async () => {
      const { data, error } = await db
        .from("recovery_codes")
        .select("id, used_at, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; used_at: string | null; created_at: string }>;
    },
  });
}

const LOCKOUT_AFTER = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Verifies a PIN or an unused recovery code. Failed attempts are counted in the
 * cloud so a lockout cannot be bypassed by reinstalling or switching devices.
 */
export function useVerifyParental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (secret: string) => {
      const userId = await uid();
      const { data } = await db
        .from("parental_locks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const lock = data as ParentalLock | null;
      if (!lock?.pin_hash || !lock.pin_salt) throw new Error("No parental lock configured");
      if (lock.locked_until && new Date(lock.locked_until) > new Date()) {
        throw new Error(
          "Too many attempts — locked until " + new Date(lock.locked_until).toLocaleTimeString(),
        );
      }

      const value = secret.trim();
      let ok = await verifySecret(value, lock.pin_salt, lock.pin_hash);

      if (!ok && value.includes("-")) {
        const codeHash = await hashSecret(normalizeCode(value), lock.pin_salt);
        const { data: match } = await db
          .from("recovery_codes")
          .select("id")
          .eq("user_id", userId)
          .eq("code_hash", codeHash)
          .is("used_at", null)
          .maybeSingle();
        if (match) {
          await db
            .from("recovery_codes")
            .update({ used_at: new Date().toISOString() })
            .eq("id", (match as { id: string }).id);
          ok = true;
        }
      }

      if (!ok) {
        const attempts = (lock.failed_attempts ?? 0) + 1;
        await db
          .from("parental_locks")
          .update({
            failed_attempts: attempts,
            locked_until:
              attempts >= LOCKOUT_AFTER
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
                : null,
          })
          .eq("user_id", userId);
        await db.from("notifications").insert({
          user_id: userId,
          title: "Incorrect parental PIN entered",
          body: `Failed attempt ${attempts} of ${LOCKOUT_AFTER} on a protected action.`,
          kind: "security",
        });
        throw new Error(
          attempts >= LOCKOUT_AFTER
            ? `Locked for ${LOCKOUT_MINUTES} minutes after ${attempts} failed attempts`
            : "Incorrect PIN or recovery code",
        );
      }

      await db
        .from("parental_locks")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("user_id", userId);
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parental-lock"] });
      qc.invalidateQueries({ queryKey: ["recovery-codes"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
