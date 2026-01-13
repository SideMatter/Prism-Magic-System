import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

// Force dynamic rendering (not static)
export const dynamic = 'force-dynamic';

// Normalize spell name for matching (case-insensitive, handle variations)
function normalizeSpellName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[''"]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\w\s'\-]/g, '');
}

// Find prism for a spell name using fuzzy matching
function findPrismForSpell(
  spellName: string, 
  mappings: Record<string, string | string[]>
): string | string[] | undefined {
  const normalized = normalizeSpellName(spellName);
  
  // First try exact match
  if (mappings[spellName]) {
    return mappings[spellName];
  }
  
  // Try case-insensitive match
  for (const [key, value] of Object.entries(mappings)) {
    if (normalizeSpellName(key) === normalized) {
      return value;
    }
  }
  
  // Try partial match (for cases like "Protection from Evil and Good" vs "Protection From Evil And Good")
  for (const [key, value] of Object.entries(mappings)) {
    const keyNormalized = normalizeSpellName(key);
    if (keyNormalized === normalized || 
        keyNormalized.replace(/[^a-z0-9]/g, '') === normalized.replace(/[^a-z0-9]/g, '')) {
      return value;
    }
  }
  
  return undefined;
}

// Fetch single spell with retry logic for rate limiting
async function fetchSpellWithRetry(spell: { index: string; url: string }, maxRetries = 3): Promise<any | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const spellResponse = await fetch(`https://www.dnd5eapi.co${spell.url}`, {
        redirect: 'follow',
      });
      
      if (spellResponse.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
        console.log(`Rate limited on ${spell.index}, waiting ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!spellResponse.ok) {
        console.error(`Failed to fetch spell ${spell.index}: ${spellResponse.status}`);
        return null;
      }
      
      const spellData = await spellResponse.json();
      
      const components = spellData.components?.join(", ") || "";
      const material = spellData.material ? `, M (${spellData.material})` : "";
      const componentsStr = components + material;
      
      const description = Array.isArray(spellData.desc)
        ? spellData.desc.join("\n\n")
        : spellData.desc || "";
      
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
      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(500 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  console.error(`Failed to fetch spell ${spell.index} after ${maxRetries} attempts`);
  return null;
}

// Load spells from D&D 5e API
async function loadSpellsFromAPI() {
  try {
    // D&D 5e API now uses /api/2014/ prefix
    const response = await fetch("https://www.dnd5eapi.co/api/2014/spells", {
      redirect: 'follow',
    });
    const data = await response.json();
    
    console.log(`Fetching ${data.results.length} spells from D&D 5e API...`);
    
    // Fetch spells sequentially to avoid rate limits
    const allSpells: any[] = [];
    
    for (let i = 0; i < data.results.length; i++) {
      const spell = data.results[i];
      const spellData = await fetchSpellWithRetry(spell);
      
      if (spellData) {
        allSpells.push(spellData);
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < data.results.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Log progress every 50 spells
      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${data.results.length} spells fetched...`);
      }
    }
    
    console.log(`✓ Successfully loaded ${allSpells.length} spells from D&D 5e API`);
    
    // If we're missing some spells, log a warning
    if (allSpells.length < data.results.length) {
      console.warn(`⚠ Only loaded ${allSpells.length}/${data.results.length} spells - some requests may have failed`);
    }
    
    return allSpells;
  } catch (error) {
    console.error("Error loading spells from API:", error);
    return null;
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
      description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.",
    },
    {
      name: "Magic Missile",
      level: 1,
      school: "Evocation",
      casting_time: "1 action",
      range: "120 feet",
      components: "V, S",
      duration: "Instantaneous",
      description: "You create three glowing darts of magical force.",
    },
  ];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    const convex = getConvexClient();
    
    // Load mappings from Convex (returns array to avoid special char issues)
    const mappingsArray = await convex.query(api.spellMappings.getAll, {});
    const mappings: Record<string, string | string[]> = {};
    for (const m of mappingsArray) {
      mappings[m.spellName] = m.prisms;
    }
    console.log(`Loaded ${Object.keys(mappings).length} mappings from Convex`);
    
    // Check if cached spells are valid
    let spells: any[];
    const isCacheValid = await convex.query(api.cachedSpells.isCacheValid, {});
    
    if (isCacheValid && !forceRefresh) {
      // Use cached spells
      spells = await convex.query(api.cachedSpells.list, {});
      console.log(`✓ Using cached spells: ${spells.length} spells`);
    } else {
      // Fetch from D&D API
      console.log(`⟳ Fetching fresh spells from D&D 5e API...`);
      const apiSpells = await loadSpellsFromAPI();
      
      if (apiSpells && apiSpells.length > 0) {
        spells = apiSpells;
        
        // Cache to Convex
        try {
          await convex.mutation(api.cachedSpells.bulkImport, {
            spells: spells.map(s => ({
              name: s.name,
              level: s.level,
              school: s.school,
              casting_time: s.casting_time,
              range: s.range,
              components: s.components,
              duration: s.duration,
              description: s.description,
            })),
            clearExisting: true,
          });
          console.log(`✓ Cached ${spells.length} spells to Convex`);
        } catch (cacheError) {
          console.error("Error caching spells:", cacheError);
        }
      } else {
        // Try to use cached spells even if expired
        const cachedSpells = await convex.query(api.cachedSpells.list, {});
        if (cachedSpells.length > 0) {
          spells = cachedSpells;
          console.log(`⚠ Using expired cache: ${spells.length} spells`);
        } else {
          spells = getSampleSpells();
          console.log(`⚠ Using sample spells: ${spells.length} spells`);
        }
      }
    }
    
    // Merge with prism mappings
    const spellsWithPrisms = spells.map((spell) => {
      const prism = findPrismForSpell(spell.name, mappings);
      return {
        ...spell,
        prism: prism || undefined,
        isCustom: false,
      };
    });

    // Load custom spells and merge them
    const customSpells = await convex.query(api.customSpells.list, {});
    const customSpellsWithPrisms = customSpells.map((spell: any) => {
      const prismFromMappings = findPrismForSpell(spell.name, mappings);
      return {
        ...spell,
        prism: spell.prism || prismFromMappings || undefined,
        isCustom: true,
      };
    });

    // Combine regular and custom spells
    const allSpells = [...spellsWithPrisms, ...customSpellsWithPrisms];

    const withPrisms = allSpells.filter(s => s.prism).length;
    console.log(`Returning ${allSpells.length} spells (${spellsWithPrisms.length} regular, ${customSpells.length} custom, ${withPrisms} with prism assignments)`);
    
    return NextResponse.json(allSpells, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Error loading spells:", error);
    return NextResponse.json({ error: "Failed to load spells" }, { status: 500 });
  }
}
