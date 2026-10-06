import { useState } from "react";

export function ProductImage({
  name,
  src,
}: {
  name: string;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className="product-image"
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className="product-placeholder"
      role="img"
      aria-label={`No image available for ${name}`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path
          d="M50 72C18 72 17 40 23 24c27 0 35 18 27 48Z"
          fill="currentColor"
          opacity=".55"
        />
        <path
          d="M50 72C83 72 86 40 80 20 50 22 41 45 50 72Z"
          fill="currentColor"
        />
        <path
          d="M50 84V53"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <span>Good things from Grove</span>
    </div>
  );
}
