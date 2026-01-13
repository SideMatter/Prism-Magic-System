"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

// Get the Convex URL, with a fallback for build time
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    // During static generation, the URL might be empty - return null
    if (!convexUrl) {
      return null;
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  // During static generation or if URL is missing, render children without Convex
  if (!convex) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
