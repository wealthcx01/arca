import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface CardImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
}

/** Card artwork with a consistent muted/ImageOff placeholder for missing or broken images. */
export function CardImage({ src, alt, className, iconSize = 32 }: CardImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-[var(--color-muted)]", className)}>
        <ImageOff size={iconSize} className="text-[var(--color-muted-foreground)]" />
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  );
}
