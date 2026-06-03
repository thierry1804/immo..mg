"use client";

import { useState } from "react";

export default function ModerationPhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="ph absolute inset-0 grid place-items-center">
        immo·mg
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
