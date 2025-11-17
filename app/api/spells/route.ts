import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SPELLS_FILE = path.join(DATA_DIR, "spells.json");
const MAPPINGS_FILE = path.join(DATA_DIR, "spell-prism-mappings.json");

// Cache for spells (refresh every hour)
let spellsCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load spell-prism mappings
function loadMappings(): Record<string, string> {
  if (!fs.existsSync(MAPPINGS_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(MAPPINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Load spells from D&D 5e API
async function loadSpells() {
  try {
    // Fetch all spells from D&D 5e API
    const response = await fetch("https://www.dnd5eapi.co/api/spells");
    const data = await response.json();
    
    // Fetch details for all spells (all ~320 spells)
    const spellPromises = data.results.map(async (spell: { index: string; url: string }) => {
      try {
        const spellResponse = await fetch(`https://www.dnd5eapi.co${spell.url}`);
        const spellData = await spellResponse.json();
        
        // Format components
        const components = spellData.components?.join(", ") || "";
        const material = spellData.material ? `, M (${spellData.material})` : "";
        const componentsStr = components + material;
        
        // Format description
        const description = Array.isArray(spellData.desc)
          ? spellData.desc.join("\n\n")
          : spellData.desc || "";
        
        // Format higher level description if available
        const higherLevel = spellData.higher_level
          ? (Array.isArray(spellData.higher_level)
              ? spellData.higher_level.join("\n\n")
              : spellData.higher_level)
          : "";
        
        const fullDescription = higherLevel
          ? `${description}\n\n${higherLevel}`
          : description;
        
        return {
          name: spellData.name,
          level: spellData.level,
          school: spellData.school?.name || "Unknown",
          casting_time: spellData.casting_time || "Unknown",
          range: spellData.range || "Unknown",
          components: componentsStr || "Unknown",
          duration: spellData.duration || "Unknown",
          description: fullDescription,
        };
      } catch (error) {
        console.error(`Error fetching spell ${spell.index}:`, error);
        return null;
      }
    });
    
    const spells = await Promise.all(spellPromises);
    const validSpells = spells.filter((spell) => spell !== null);
    console.log(`Loaded ${validSpells.length} spells from D&D 5e API`);
    return validSpells;
  } catch (error) {
    console.error("Error loading spells from API, falling back to sample:", error);
    // Fallback to sample spells if API fails
    return getSampleSpells();
  }
}

// Sample spells as fallback
function getSampleSpells() {
  return [
    {
      name: "Fireball",
      level: 3,
      school: "Evocation",
      casting_time: "1 action",
      range: "150 feet",
      components: "V, S, M (a tiny ball of bat guano and sulfur)",
      duration: "Instantaneous",
      description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.",
    },
    {
      name: "Magic Missile",
      level: 1,
      school: "Evocation",
      casting_time: "1 action",
      range: "120 feet",
      components: "V, S",
      duration: "Instantaneous",
      description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4+1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.",
    },
    {
      name: "Cure Wounds",
      level: 1,
      school: "Evocation",
      casting_time: "1 action",
      range: "Touch",
      components: "V, S",
      duration: "Instantaneous",
      description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.",
    },
    {
      name: "Shield",
      level: 1,
      school: "Abjuration",
      casting_time: "1 reaction",
      range: "Self",
      components: "V, S",
      duration: "1 round",
      description: "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.",
    },
    {
      name: "Mage Armor",
      level: 1,
      school: "Abjuration",
      casting_time: "1 action",
      range: "Touch",
      components: "V, S, M (a piece of cured leather)",
      duration: "8 hours",
      description: "You touch a willing creature who isn't wearing armor, and a protective magical force surrounds it until the spell ends. The target's base AC becomes 13 + its Dexterity modifier. The spell ends if the target dons armor or if you dismiss the spell as an action.",
    },
  ];
}

export async function GET() {
  try {
    // Check cache first
    const now = Date.now();
    let spells: any[];
    
    if (spellsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      spells = spellsCache;
    } else {
      spells = await loadSpells();
      spellsCache = spells;
      cacheTimestamp = now;
    }
    
    const mappings = loadMappings();

    // Merge spells with their prism assignments
    const spellsWithPrisms = spells.map((spell) => ({
      ...spell,
      prism: mappings[spell.name] || undefined,
    }));

    return NextResponse.json(spellsWithPrisms);
  } catch (error) {
    console.error("Error loading spells:", error);
    return NextResponse.json({ error: "Failed to load spells" }, { status: 500 });
  }
}

