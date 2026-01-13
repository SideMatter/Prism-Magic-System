"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState, useEffect } from "react";

// Singleton client to avoid recreating on re-renders
let globalClient: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient | null {
  if (typeof window === "undefined") {
    // Server-side or static generation - don't create client
    return null;
  }
  
  if (globalClient) {
    return globalClient;
  }
  
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return null;
  }
  
  globalClient = new ConvexReactClient(url);
  return globalClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [client, setClient] = useState<ConvexReactClient | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setClient(getConvexClient());
  }, []);

  // During static generation or before mount, render children without Convex
  if (!mounted || !client) {
    return <>{children}</>;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
