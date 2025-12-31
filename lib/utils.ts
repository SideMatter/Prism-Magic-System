import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate strain cost based on spell level
 * Cantrips (0): 0
 * 1st–2nd: 1
 * 3rd–4th: 2
 * 5th–6th: 4
 * 7th: 7
 * 8th: 10
 * 9th: 14
 */
export function getStrainCost(spellLevel: number): number {
  switch (spellLevel) {
    case 0: return 0;  // Cantrips
    case 1:
    case 2: return 1;  // 1st-2nd
    case 3:
    case 4: return 2;  // 3rd-4th
    case 5:
    case 6: return 4;  // 5th-6th
    case 7: return 7;
    case 8: return 10;
    case 9: return 14;
    default: return 0;
  }
}

