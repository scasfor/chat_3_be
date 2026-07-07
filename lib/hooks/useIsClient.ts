"use client";

import { useEffect, useState } from "react";

/** Avoid SSR/client mismatches for modals, selects, and other browser-only UI. */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
