import { Laptop, MonitorSmartphone, Smartphone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDevices } from "@/lib/api";
import { useCurrentDevice } from "@/hooks/use-current-device";
import { setDeviceScope, useDeviceScope } from "@/lib/device-scope";
import { cn } from "@/lib/utils";

/**
 * Top-bar device selector. Scopes every activity view in the app to a single
 * device (or all of them) and shows which install is the live/active one.
 */
export function DeviceSwitcher() {
  const devices = useDevices();
  const { device: current, live } = useCurrentDevice();
  const scope = useDeviceScope();
  const rows = (devices.data ?? []).filter((d) => d.status !== "revoked");

  const activeName =
    scope === "all" ? "All devices" : (rows.find((d) => d.id === scope)?.name ?? "All devices");

  return (
    <Select value={scope} onValueChange={setDeviceScope}>
      <SelectTrigger className="h-9 w-auto min-w-[11rem] gap-2" aria-label="Active device">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              live?.active ? "animate-pulse bg-primary" : "bg-muted-foreground",
            )}
          />
          <SelectValue placeholder={activeName} />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <MonitorSmartphone className="size-3.5" /> All devices
          </span>
        </SelectItem>
        {rows.map((d) => {
          const isThis = current?.id === d.id;
          const Icon = d.device_type === "phone" ? Smartphone : Laptop;
          return (
            <SelectItem key={d.id} value={d.id}>
              <span className="flex items-center gap-2">
                <Icon className="size-3.5" />
                {d.name}
                <span className="text-xs text-muted-foreground">
                  {isThis ? "· this device, active" : `· ${d.status}`}
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
