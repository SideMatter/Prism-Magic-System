/**
 * Dice rolling utility for D&D-style dice notation
 * Supports: 1d20, 2d6, 1d20+5, 2d4+2d6, 2d4-1d6, etc.
 */

export interface DieRoll {
  count: number;
  sides: number;
  rolls: number[];
  total: number;
  operator: '+' | '-';
}

export interface DiceResult {
  expression: string;
  rolls: DieRoll[];
  total: number;
  breakdown: string;
}

/**
 * Roll a single die with the given number of sides
 */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice of the same type
 */
function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  return rolls;
}

/**
 * Parse and execute a dice expression
 * Supports formats like: 1d20, 2d6, 1d20+5, 2d4+2d6, 3d8-1d4
 */
export function parseDiceExpression(expression: string): DiceResult | null {
  // Clean up the expression
  const cleaned = expression.toLowerCase().replace(/\s+/g, '');
  
  // Match dice patterns: 1d20, 2d6, etc.
  // Also match flat modifiers: +5, -3
  const dicePattern = /([+-])?(\d+)d(\d+)/g;
  const modifierPattern = /([+-])(\d+)(?!d)/g;
  
  const rolls: DieRoll[] = [];
  let hasValidDice = false;
  
  // Parse all dice groups
  let match;
  while ((match = dicePattern.exec(cleaned)) !== null) {
    hasValidDice = true;
    const operator = match[1] === '-' ? '-' : '+';
    const count = parseInt(match[2], 10);
    const sides = parseInt(match[3], 10);
    
    // Validate reasonable bounds
    if (count < 1 || count > 100 || sides < 1 || sides > 1000) {
      return null;
    }
    
    const diceRolls = rollDice(count, sides);
    const total = diceRolls.reduce((sum, roll) => sum + roll, 0);
    
    rolls.push({
      count,
      sides,
      rolls: diceRolls,
      total,
      operator,
    });
  }
  
  // Parse flat modifiers (like +5 or -3)
  let modifierMatch;
  // Reset the search to find modifiers that aren't part of dice notation
  const withoutDice = cleaned.replace(dicePattern, '');
  while ((modifierMatch = modifierPattern.exec(withoutDice)) !== null) {
    const operator = modifierMatch[1] === '-' ? '-' : '+';
    const value = parseInt(modifierMatch[2], 10);
    
    if (value > 1000) {
      return null;
    }
    
    rolls.push({
      count: 1,
      sides: 0, // 0 sides indicates a flat modifier
      rolls: [value],
      total: value,
      operator,
    });
  }
  
  if (!hasValidDice || rolls.length === 0) {
    return null;
  }
  
  // Calculate grand total
  let grandTotal = 0;
  rolls.forEach((roll, index) => {
    if (index === 0) {
      grandTotal = roll.total;
    } else if (roll.operator === '+') {
      grandTotal += roll.total;
    } else {
      grandTotal -= roll.total;
    }
  });
  
  // Build breakdown string
  const breakdownParts: string[] = [];
  rolls.forEach((roll, index) => {
    const prefix = index === 0 ? '' : ` ${roll.operator} `;
    if (roll.sides === 0) {
      // Flat modifier
      breakdownParts.push(`${prefix}${roll.total}`);
    } else if (roll.count === 1) {
      breakdownParts.push(`${prefix}[${roll.rolls[0]}]`);
    } else {
      breakdownParts.push(`${prefix}(${roll.rolls.join(' + ')} = ${roll.total})`);
    }
  });
  
  return {
    expression: expression.trim(),
    rolls,
    total: grandTotal,
    breakdown: breakdownParts.join(''),
  };
}

/**
 * Check if a string looks like it could be a dice roll command
 */
export function isDiceCommand(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith('roll ') || trimmed.startsWith('/roll ');
}

/**
 * Extract the dice expression from a roll command
 */
export function extractDiceExpression(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith('/roll ')) {
    return trimmed.slice(6).trim();
  }
  if (trimmed.startsWith('roll ')) {
    return trimmed.slice(5).trim();
  }
  return trimmed;
}
