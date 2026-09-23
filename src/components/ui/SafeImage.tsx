"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

type Props = Omit<ImageProps, "onError"> & {
  placeholderLabel?: string;
  placeholderVariant?: "default" | "alt" | "sun";
};

// Wrapper de next/image que cai para PhotoPlaceholder se o arquivo não
// existir (comum hoje: várias fotos reais ainda não foram enviadas pelo
// cliente) — evita ícone de imagem quebrada.
export function SafeImage({ placeholderLabel, placeholderVariant, className, alt, ...props }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <PhotoPlaceholder label={placeholderLabel} variant={placeholderVariant} className={className} />;
  }

  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
