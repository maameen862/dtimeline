import logoAsset from "@/assets/dlt-logo.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Official Digital Life Timeline logo. Used for in-app branding, auth screens
 * and the landing page; the same artwork backs the favicon, PWA icons and
 * store/social listings in `public/`.
 */
export function BrandMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      src={logoAsset.url}
      alt="Digital Life Timeline logo"
      width={size}
      height={size}
      className={cn("rounded-xl object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}

export function BrandLockup({
  className,
  size = 32,
  subtitle,
}: {
  className?: string;
  size?: number;
  subtitle?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-tight">
        <span className="font-display font-semibold">Digital Life Timeline</span>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
    </span>
  );
}
