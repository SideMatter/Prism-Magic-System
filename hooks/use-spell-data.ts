"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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

// Hook for getting all spell data with real-time updates
export function useSpellData() {
  const data = useQuery(api.spells.getAllSpellData);
  
  return {
    spells: (data?.spells ?? []) as Spell[],
    prisms: data?.prisms ?? [],
    isLoading: data === undefined,
    spellCount: data?.spellCount ?? 0,
    cachedCount: data?.cachedCount ?? 0,
    customCount: data?.customCount ?? 0,
  };
}

// Hook for getting players with real-time updates
export function usePlayers() {
  const players = useQuery(api.players.list);
  
  return {
    players: (players ?? []) as Player[],
    isLoading: players === undefined,
  };
}

// Hook for getting just prisms (lighter weight)
export function usePrisms() {
  const prisms = useQuery(api.spells.getPrisms);
  
  return {
    prisms: prisms ?? [],
    isLoading: prisms === undefined,
  };
}
