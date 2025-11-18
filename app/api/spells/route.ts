import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { storage, getMappingsTimestamp, getCustomSpellsTimestamp, CustomSpell } from "@/lib/storage";

const DATA_DIR = path.join(process.cwd(), "data");
const SPELLS_FILE = path.join(DATA_DIR, "spells.json");
const MAPPINGS_FILE = path.join(DATA_DIR, "spell-prism-mappings.json");

// Cache for spells (refresh every hour, or when invalidated)
let spellsCache: any[] | null = null;
let cacheTimestamp = 0;
let lastMappingsTimestamp = 0; // Track the last known mappings timestamp
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Normalize spell name for matching (case-insensitive, handle variations)
function normalizeSpellName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[''"]/g, "'") // Normalize different apostrophe types
    .replace(/[–—]/g, '-') // Normalize different dash types
    .replace(/[^\w\s'\-]/g, ''); // Remove special characters but keep apostrophes and hyphens
}

// Load spell-prism mappings with normalized keys for better matching
async function loadMappings(): Promise<{ original: Record<string, string | string[]>; normalized: Map<string, string | string[]> }> {
  try {
    let original = await storage.loadMappings();
    console.log(`Loaded ${Object.keys(original).length} mappings from storage`);
    
    // If no mappings exist in storage, try to migrate from file system
    if (Object.keys(original).length === 0 && fs.existsSync(MAPPINGS_FILE)) {
      try {
        const fileMappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, "utf-8"));
        const fileCount = Object.keys(fileMappings).length;
        if (fileCount > 0) {
          console.log(`⚠ No mappings in storage. Migrating ${fileCount} spell mappings from file system to storage`);
          await storage.saveMappings(fileMappings);
          original = fileMappings;
          console.log(`✓ Successfully migrated ${fileCount} mappings`);
        }
      } catch (error) {
        console.error("Error loading mappings from file:", error);
      }
    }
    
    if (Object.keys(original).length === 0) {
      console.warn("⚠ No spell mappings found in storage or file system!");
    }
    
    const normalized = new Map<string, string | string[]>();

    // Create normalized lookup map
    for (const [spellName, prism] of Object.entries(original)) {
      const normalizedName = normalizeSpellName(spellName);
      normalized.set(normalizedName, prism);
    }
    
    console.log(`Created normalized lookup map with ${normalized.size} entries`);
    return { original, normalized };
  } catch (error) {
    console.error("Error loading mappings:", error);
    return { original: {}, normalized: new Map() };
  }
}

// Find prism for a spell name using fuzzy matching
function findPrismForSpell(spellName: string, mappings: { original: Record<string, string | string[]>; normalized: Map<string, string | string[]> }): string | string[] | undefined {
  // First try exact match (case-insensitive)
  const normalized = normalizeSpellName(spellName);
  const prism = mappings.normalized.get(normalized);
  if (prism) return prism;
  
  // Try exact match in original (case-insensitive)
  for (const [key, value] of Object.entries(mappings.original)) {
    if (normalizeSpellName(key) === normalized) {
      return value;
    }
  }
  
  // Try partial match (for cases like "Protection from Evil and Good" vs "Protection From Evil And Good")
  for (const [key, value] of Object.entries(mappings.original)) {
    const keyNormalized = normalizeSpellName(key);
    if (keyNormalized === normalized || 
        keyNormalized.replace(/[^a-z0-9]/g, '') === normalized.replace(/[^a-z0-9]/g, '')) {
      return value;
    }
  }
  
  return undefined;
}

// Load spells from D&D 5e API with batching to avoid rate limits
async function loadSpells() {
  try {
    // Fetch all spells from D&D 5e API
    const response = await fetch("https://www.dnd5eapi.co/api/spells");
    const data = await response.json();
    
    console.log(`Fetching ${data.results.length} spells from D&D 5e API...`);
    
    // Batch requests to avoid overwhelming the API (20 at a time with delays)
    const BATCH_SIZE = 20;
    const BATCH_DELAY = 100; // ms between batches
    const allSpells: any[] = [];
    
    for (let i = 0; i < data.results.length; i += BATCH_SIZE) {
      const batch = data.results.slice(i, i + BATCH_SIZE);
      
      const spellPromises = batch.map(async (spell: { index: string; url: string }) => {
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
      
      const batchSpells = await Promise.all(spellPromises);
      allSpells.push(...batchSpells.filter(spell => spell !== null));
      
      console.log(`Loaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.results.length / BATCH_SIZE)} (${allSpells.length} spells so far)`);
      
      // Add delay between batches to be nice to the API
      if (i + BATCH_SIZE < data.results.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    console.log(`✓ Successfully loaded ${allSpells.length} spells from D&D 5e API`);
    return allSpells;
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

export async function GET(request: Request) {
  try {
    // Load mappings (async now) - always load fresh mappings
    const mappings = await loadMappings();
    
    // Check if cache should be invalidated
    // Works for both file system and KV/Upstash Redis
    const mappingsModified = await getMappingsTimestamp();
    const customSpellsModified = await getCustomSpellsTimestamp();
    
    // Combine both timestamps for cache key
    const combinedTimestamp = Math.max(mappingsModified, customSpellsModified);
    
    // Check cache first
    const now = Date.now();
    let spells: any[];
    
    // Invalidate cache if:
    // 1. Mappings timestamp changed (someone saved in admin)
    // 2. Custom spells timestamp changed (someone added/removed a custom spell)
    // 3. Cache is older than 1 hour
    // 4. No cache exists yet
    const timestampChanged = combinedTimestamp !== lastMappingsTimestamp && lastMappingsTimestamp !== 0;
    const cacheExpired = spellsCache && (now - cacheTimestamp) >= CACHE_DURATION;
    const shouldInvalidate = !spellsCache || timestampChanged || cacheExpired;
    
    if (spellsCache && !shouldInvalidate) {
      spells = spellsCache;
      console.log(`✓ Using cached ${spellsCache.length} spells (cache age: ${Math.round((now - cacheTimestamp) / 1000)}s, timestamp unchanged)`);
    } else {
      const reason = !spellsCache ? 'no cache' : timestampChanged ? 'data changed' : 'cache expired';
      console.log(`⟳ Loading fresh spells from API (reason: ${reason}, old timestamp: ${lastMappingsTimestamp}, new: ${combinedTimestamp})`);
      spells = await loadSpells();
      spellsCache = spells;
      cacheTimestamp = now;
      lastMappingsTimestamp = combinedTimestamp;
      console.log(`✓ Cached ${spells.length} spells for future requests`);
    }
    
    // ALWAYS merge with fresh mappings (mappings can change independently of spell data)
    const spellsWithPrisms = spells.map((spell) => {
      const prism = findPrismForSpell(spell.name, mappings);
      return {
        ...spell,
        prism: prism || undefined, // Explicitly set to undefined if no match
        isCustom: false, // Mark regular spells
      };
    });

    // Load custom spells and merge them
    const customSpells = await storage.loadCustomSpells();
    const customSpellsWithPrisms = customSpells.map((spell: CustomSpell) => {
      // Custom spells may already have prism in their data, but also check mappings
      const prismFromMappings = findPrismForSpell(spell.name, mappings);
      return {
        ...spell,
        prism: spell.prism || prismFromMappings || undefined,
        isCustom: true, // Mark custom spells
      };
    });

    // Combine regular and custom spells
    const allSpells = [...spellsWithPrisms, ...customSpellsWithPrisms];

    const withPrisms = allSpells.filter(s => s.prism).length;
    console.log(`Returning ${allSpells.length} spells (${spellsWithPrisms.length} regular, ${customSpells.length} custom, ${withPrisms} with prism assignments, ${Object.keys(mappings.original).length} mappings in DB)`);
    
    // Add cache control headers to help clients know when to refresh
    // Use combined timestamp (mappings + custom spells) as cache key
    return NextResponse.json(allSpells, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Cache-Timestamp': combinedTimestamp.toString(),
      },
    });
  } catch (error) {
    console.error("Error loading spells:", error);
    return NextResponse.json({ error: "Failed to load spells" }, { status: 500 });
  }
}

