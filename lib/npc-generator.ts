// NPC Generator utility functions

export interface CharacterClass {
  id: string;
  name: string;
  hitDie: number;
  primaryAbilities: string[];
  savingThrows: string[];
  statPriority: string[];
  description: string;
  isCustom?: boolean;
  prism?: string;
  type?: string;
  spellList?: string;
  features?: string[];
}

export interface NPC {
  id: string;
  name: string;
  class: CharacterClass;
  level: number;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  hp: number;
  maxHP: number;
  currentHP: number;
  ac: number;
  dc: number;
  maxStrain: number;
  createdAt: string;
}

export type StatName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

// Roll 4d6, drop lowest
export function roll4d6DropLowest(): number {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => b - a); // Sort descending
  return rolls[0] + rolls[1] + rolls[2]; // Sum top 3
}

// Roll standard array
export function getStandardArray(): number[] {
  return [15, 14, 13, 12, 10, 8];
}

// Roll point buy (27 points)
export function getPointBuyBase(): number[] {
  return [8, 8, 8, 8, 8, 8]; // Base stats for point buy
}

// Generate 6 stats using 4d6 drop lowest
export function rollStats(): number[] {
  return Array.from({ length: 6 }, () => roll4d6DropLowest());
}

// Assign stats based on class priority
export function assignStatsByPriority(
  stats: number[],
  priority: string[]
): Record<StatName, number> {
  // Sort stats from highest to lowest
  const sortedStats = [...stats].sort((a, b) => b - a);
  
  const assigned: Record<StatName, number> = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };

  // Assign highest stats to highest priority abilities
  priority.forEach((stat, index) => {
    if (sortedStats[index] !== undefined) {
      assigned[stat as StatName] = sortedStats[index];
    }
  });

  return assigned;
}

// Calculate ability modifier
export function getModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

// Calculate HP at a given level
export function calculateHP(
  hitDie: number,
  constitutionMod: number,
  level: number
): number {
  // First level: max hit die + CON mod
  let hp = hitDie + constitutionMod;
  
  // Subsequent levels: average hit die + CON mod
  const averageRoll = Math.floor(hitDie / 2) + 1;
  for (let i = 1; i < level; i++) {
    hp += averageRoll + constitutionMod;
  }
  
  return Math.max(1, hp); // Minimum 1 HP
}

// Calculate base AC (10 + DEX mod, no armor)
export function calculateBaseAC(dexterityMod: number): number {
  return 10 + dexterityMod;
}

// Calculate max Strain (Prism of Magic system)
export function calculateMaxStrain(constitutionMod: number, level: number): number {
  return constitutionMod + level;
}

// Calculate spell DC (8 + proficiency bonus + primary ability modifier)
export function calculateDC(level: number, primaryAbilityMod: number): number {
  const proficiencyBonus = Math.ceil(level / 4) + 1; // 2 at lvl 1-4, 3 at 5-8, etc.
  return 8 + proficiencyBonus + primaryAbilityMod;
}

// Generate a complete NPC
export function generateNPC(
  name: string,
  characterClass: CharacterClass,
  level: number = 1,
  method: 'roll' | 'standard' | 'pointbuy' = 'roll'
): NPC {
  let baseStats: number[];
  
  switch (method) {
    case 'standard':
      baseStats = getStandardArray();
      break;
    case 'pointbuy':
      baseStats = getPointBuyBase();
      break;
    case 'roll':
    default:
      baseStats = rollStats();
      break;
  }

  const stats = assignStatsByPriority(baseStats, characterClass.statPriority);
  const constitutionMod = getModifier(stats.constitution);
  const dexterityMod = getModifier(stats.dexterity);
  
  // Get primary ability modifier for DC calculation
  const primaryAbility = characterClass.primaryAbilities[0] || 'intelligence';
  const primaryAbilityMod = getModifier(stats[primaryAbility as StatName]);
  
  const maxHP = calculateHP(characterClass.hitDie, constitutionMod, level);

  return {
    id: `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    class: characterClass,
    level,
    stats,
    hp: maxHP, // Keep for backwards compatibility
    maxHP: maxHP,
    currentHP: maxHP, // Start at full health
    ac: calculateBaseAC(dexterityMod),
    dc: calculateDC(level, primaryAbilityMod),
    maxStrain: calculateMaxStrain(constitutionMod, level),
    createdAt: new Date().toISOString(),
  };
}

// Format modifier for display (+2, -1, etc)
export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// NPC name generator (simple random names)
const firstNames = [
  "Aldric", "Brynn", "Corwin", "Dahlia", "Elric", "Freya", "Gareth", "Helena",
  "Isolde", "Jasper", "Kira", "Leander", "Mira", "Nolan", "Ophelia", "Pierce",
  "Quinn", "Rowan", "Sera", "Theron", "Una", "Vance", "Wren", "Xander",
  "Yara", "Zephyr", "Aria", "Bram", "Celia", "Darius", "Elena", "Finn",
  "Gwen", "Hugo", "Ivy", "Jace", "Kai", "Luna", "Marcus", "Nina",
  "Orion", "Piper", "Reed", "Sage", "Talia", "Uri", "Vera", "Wade"
];

const lastNames = [
  "Blackwood", "Brightwater", "Coldforge", "Darkhollow", "Everhart", "Frostborne",
  "Goldleaf", "Hawthorne", "Ironwood", "Jadestone", "Kingsley", "Lightfoot",
  "Moonshadow", "Nightingale", "Oakenshield", "Proudfoot", "Quicksilver", "Ravencrest",
  "Silvermane", "Thornwood", "Underhill", "Valorian", "Windwalker", "Youngblood",
  "Ashford", "Briarwood", "Copperfield", "Driftwood", "Emberstone", "Fairweather",
  "Grimshaw", "Holloway", "Ironside", "Jadewind", "Kerrigan", "Longstrider"
];

export function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

