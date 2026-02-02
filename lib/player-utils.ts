export interface Player {
  id: string;
  name: string;
  maxSpellLevel: number; // 0-9 (0 = cantrips only, 9 = all spell levels)
  prisms: string[];
  playerClass?: string; // Class name (e.g., "Arcanist", "Divine Paladin")
  classInfo?: string; // Custom class info/notes for the AI to reference
}

// Get available spell levels for a player (0 = cantrips, 1-9 = spell levels)
export function getAvailableSpellLevels(maxSpellLevel: number): number[] {
  const levels: number[] = [0]; // Always include cantrips
  for (let i = 1; i <= maxSpellLevel && i <= 9; i++) {
    levels.push(i);
  }
  return levels;
}

