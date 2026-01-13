"use client";

import { useState, useEffect } from "react";

export interface Spell {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prism?: string | string[];
  isCustom?: boolean;
}

export interface Player {
  id: string;
  name: string;
  maxSpellLevel: number;
  prisms: string[];
}

// Safe hook wrapper that only uses Convex after mount
function useConvexQuery<T>(queryFn: () => T | undefined, fallback: T): { data: T; isLoading: boolean } {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<T>(fallback);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // This will be populated by the actual Convex hook in ConvexQueryWrapper
  return { data, isLoading: !mounted || isLoading };
}

// Hook for getting all spell data with real-time updates
export function useSpellData() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{
    spells: Spell[];
    prisms: string[];
    spellCount: number;
    cachedCount: number;
    customCount: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamically import and use Convex only on client
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function fetchData() {
      try {
        const { useQuery } = await import("convex/react");
        const { api } = await import("@/convex/_generated/api");
        
        // We need to use the query through the ConvexProvider
        // Since we can't use hooks inside useEffect, fetch via API instead
        const response = await fetch("/api/spells");
        if (!response.ok) throw new Error("Failed to fetch spells");
        const spells = await response.json();
        
        const prismResponse = await fetch("/api/prisms");
        const prisms = prismResponse.ok ? await prismResponse.json() : [];
        
        if (!cancelled) {
          setData({
            spells: spells as Spell[],
            prisms: prisms as string[],
            spellCount: spells.length,
            cachedCount: spells.filter((s: Spell) => !s.isCustom).length,
            customCount: spells.filter((s: Spell) => s.isCustom).length,
          });
        }
      } catch (error) {
        console.error("Error fetching spell data:", error);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  return {
    spells: data?.spells ?? [],
    prisms: data?.prisms ?? [],
    isLoading: !mounted || data === null,
    spellCount: data?.spellCount ?? 0,
    cachedCount: data?.cachedCount ?? 0,
    customCount: data?.customCount ?? 0,
  };
}

// Hook for getting players with real-time updates
export function usePlayers() {
  const [mounted, setMounted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function fetchPlayers() {
      try {
        const response = await fetch("/api/players");
        if (!response.ok) throw new Error("Failed to fetch players");
        const data = await response.json();
        
        if (!cancelled) {
          setPlayers(data as Player[]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching players:", error);
        setIsLoading(false);
      }
    }

    fetchPlayers();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  return {
    players,
    isLoading: !mounted || isLoading,
  };
}

// Hook for getting just prisms (lighter weight)
export function usePrisms() {
  const [mounted, setMounted] = useState(false);
  const [prisms, setPrisms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function fetchPrisms() {
      try {
        const response = await fetch("/api/prisms");
        if (!response.ok) throw new Error("Failed to fetch prisms");
        const data = await response.json();
        
        if (!cancelled) {
          setPrisms(data as string[]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching prisms:", error);
        setIsLoading(false);
      }
    }

    fetchPrisms();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  return {
    prisms,
    isLoading: !mounted || isLoading,
  };
}
