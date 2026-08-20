import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/icon-512.png"
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
        <span className="font-display font-semibold">
          Digital Life Timeline
        </span>

        {subtitle ? (
          <span className="text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
