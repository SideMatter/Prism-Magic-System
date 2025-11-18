/**
 * Storage abstraction layer
 * Supports:
 * - File system (local dev)
 * - Direct Redis connection (REDIS_URL)
 * - Upstash Redis/Vercel KV REST API (UPSTASH_REDIS_REST_URL or KV_REST_API_URL)
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const MAPPINGS_FILE = path.join(DATA_DIR, "spell-prism-mappings.json");
const PRISMS_FILE = path.join(DATA_DIR, "prisms.json");
const CUSTOM_SPELLS_FILE = path.join(DATA_DIR, "custom-spells.json");

// Check which storage method to use
const USE_REDIS_DIRECT = !!process.env.REDIS_URL;
const USE_REDIS_REST = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
                      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const USE_REDIS = USE_REDIS_DIRECT || USE_REDIS_REST;

// Redis clients (lazy loaded)
let redisClient: any = null;
let kvClient: any = null;

// Get direct Redis client (ioredis)
async function getRedisClient() {
  if (!USE_REDIS_DIRECT || !process.env.REDIS_URL) return null;
  
  if (!redisClient) {
    try {
      const Redis = (await import("ioredis")).default;
      redisClient = new Redis(process.env.REDIS_URL as string);
      console.log("Connected to Redis via REDIS_URL");
    } catch (error) {
      console.warn("Redis connection failed, falling back to file system:", error);
      return null;
    }
  }
  
  return redisClient;
}

// Get REST API Redis client (@vercel/kv)
async function getKVClient() {
  if (!USE_REDIS_REST) return null;
  
  if (!kvClient) {
    try {
      const { kv } = await import("@vercel/kv");
      kvClient = kv;
      console.log("Connected to Redis via REST API");
    } catch (error) {
      console.warn("Vercel KV/Upstash Redis REST API not available:", error);
      return null;
    }
  }
  
  return kvClient;
}

// Type for spell-prism mappings (can be single or multiple prisms)
export type SpellPrismMappings = Record<string, string | string[]>;

// Type for custom spell
export interface CustomSpell {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prism?: string | string[];
}

// File system storage (local dev)
export const fileStorage = {
  async loadMappings(): Promise<SpellPrismMappings> {
    if (!fs.existsSync(MAPPINGS_FILE)) {
      return {};
    }
    try {
      const data = fs.readFileSync(MAPPINGS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading mappings from file:", error);
      return {};
    }
  },

  async saveMappings(mappings: SpellPrismMappings): Promise<boolean> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      const tempFile = MAPPINGS_FILE + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(mappings, null, 2), 'utf-8');
      fs.renameSync(tempFile, MAPPINGS_FILE);
      
      return true;
    } catch (error) {
      console.error("Error saving mappings to file:", error);
      throw error;
    }
  },

  async loadPrisms(): Promise<string[]> {
    if (!fs.existsSync(PRISMS_FILE)) {
      return [];
    }
    try {
      const data = fs.readFileSync(PRISMS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading prisms from file:", error);
      return [];
    }
  },

  async savePrisms(prisms: string[]): Promise<boolean> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PRISMS_FILE, JSON.stringify(prisms, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error("Error saving prisms to file:", error);
      throw error;
    }
  },

  async loadCustomSpells(): Promise<CustomSpell[]> {
    if (!fs.existsSync(CUSTOM_SPELLS_FILE)) {
      return [];
    }
    try {
      const data = fs.readFileSync(CUSTOM_SPELLS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading custom spells from file:", error);
      return [];
    }
  },

  async saveCustomSpells(spells: CustomSpell[]): Promise<boolean> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = CUSTOM_SPELLS_FILE + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(spells, null, 2), 'utf-8');
      fs.renameSync(tempFile, CUSTOM_SPELLS_FILE);
      console.log(`Saved ${spells.length} custom spells to file system`);
      return true;
    } catch (error) {
      console.error("Error saving custom spells to file:", error);
      throw error;
    }
  },
};

// Direct Redis storage (ioredis)
export const redisStorage = {
  async loadMappings(): Promise<SpellPrismMappings> {
    const redis = await getRedisClient();
    if (!redis) return {};
    
    try {
      const data = await redis.get("spell-prism-mappings");
      if (!data) return {};
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading mappings from Redis:", error);
      return {};
    }
  },

  async saveMappings(mappings: SpellPrismMappings): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return false;
    
    try {
      await redis.set("spell-prism-mappings", JSON.stringify(mappings));
      // Update cache timestamp for invalidation
      await redis.set("spell-prism-mappings-timestamp", Date.now().toString());
      return true;
    } catch (error) {
      console.error("Error saving mappings to Redis:", error);
      throw error;
    }
  },

  async loadPrisms(): Promise<string[]> {
    const redis = await getRedisClient();
    if (!redis) return [];
    
    try {
      const data = await redis.get("prisms");
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading prisms from Redis:", error);
      return [];
    }
  },

  async savePrisms(prisms: string[]): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return false;
    
    try {
      await redis.set("prisms", JSON.stringify(prisms));
      // Update cache timestamp for invalidation
      await redis.set("prisms-timestamp", Date.now().toString());
      return true;
    } catch (error) {
      console.error("Error saving prisms to Redis:", error);
      throw error;
    }
  },

  async loadCustomSpells(): Promise<CustomSpell[]> {
    const redis = await getRedisClient();
    if (!redis) return [];
    
    try {
      const data = await redis.get("custom-spells");
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading custom spells from Redis:", error);
      return [];
    }
  },

  async saveCustomSpells(spells: CustomSpell[]): Promise<boolean> {
    const redis = await getRedisClient();
    if (!redis) return false;
    
    try {
      await redis.set("custom-spells", JSON.stringify(spells));
      // Update cache timestamp for invalidation
      await redis.set("custom-spells-timestamp", Date.now().toString());
      return true;
    } catch (error) {
      console.error("Error saving custom spells to Redis:", error);
      throw error;
    }
  },
};

// REST API Redis storage (Vercel KV / Upstash)
export const kvStorage = {
  async loadMappings(): Promise<SpellPrismMappings> {
    const kv = await getKVClient();
    if (!kv) return {};
    
    try {
      const data = await kv.get("spell-prism-mappings") as SpellPrismMappings | null;
      return data || {};
    } catch (error) {
      console.error("Error loading mappings from KV:", error);
      return {};
    }
  },

  async saveMappings(mappings: SpellPrismMappings): Promise<boolean> {
    const kv = await getKVClient();
    if (!kv) return false;
    
    try {
      await kv.set("spell-prism-mappings", mappings);
      // Update cache timestamp for invalidation
      await kv.set("spell-prism-mappings-timestamp", Date.now());
      return true;
    } catch (error) {
      console.error("Error saving mappings to KV:", error);
      throw error;
    }
  },

  async loadPrisms(): Promise<string[]> {
    const kv = await getKVClient();
    if (!kv) return [];
    
    try {
      const data = await kv.get("prisms") as string[] | null;
      return data || [];
    } catch (error) {
      console.error("Error loading prisms from KV:", error);
      return [];
    }
  },

  async savePrisms(prisms: string[]): Promise<boolean> {
    const kv = await getKVClient();
    if (!kv) return false;
    
    try {
      await kv.set("prisms", prisms);
      // Update cache timestamp for invalidation
      await kv.set("prisms-timestamp", Date.now());
      return true;
    } catch (error) {
      console.error("Error saving prisms to KV:", error);
      throw error;
    }
  },

  async loadCustomSpells(): Promise<CustomSpell[]> {
    const kv = await getKVClient();
    if (!kv) return [];
    
    try {
      const data = await kv.get("custom-spells") as CustomSpell[] | null;
      return data || [];
    } catch (error) {
      console.error("Error loading custom spells from KV:", error);
      return [];
    }
  },

  async saveCustomSpells(spells: CustomSpell[]): Promise<boolean> {
    const kv = await getKVClient();
    if (!kv) return false;
    
    try {
      await kv.set("custom-spells", spells);
      // Update cache timestamp for invalidation
      await kv.set("custom-spells-timestamp", Date.now());
      return true;
    } catch (error) {
      console.error("Error saving custom spells to KV:", error);
      throw error;
    }
  },
};

// Get cache timestamp for Redis (for cache invalidation)
export async function getMappingsTimestamp(): Promise<number> {
  if (!USE_REDIS) {
    // For file system, return file modification time
    if (fs.existsSync(MAPPINGS_FILE)) {
      return fs.statSync(MAPPINGS_FILE).mtimeMs;
    }
    return 0;
  }
  
  try {
    if (USE_REDIS_DIRECT) {
      const redis = await getRedisClient();
      if (!redis) return 0;
      const timestamp = await redis.get("spell-prism-mappings-timestamp");
      return timestamp ? parseInt(timestamp, 10) : 0;
    } else {
      const kv = await getKVClient();
      if (!kv) return 0;
      const timestamp = await kv.get("spell-prism-mappings-timestamp") as number | null;
      return timestamp || 0;
    }
  } catch {
    return 0;
  }
}

// Get cache timestamp for custom spells (for cache invalidation)
export async function getCustomSpellsTimestamp(): Promise<number> {
  if (!USE_REDIS) {
    // For file system, return file modification time
    if (fs.existsSync(CUSTOM_SPELLS_FILE)) {
      return fs.statSync(CUSTOM_SPELLS_FILE).mtimeMs;
    }
    return 0;
  }
  
  try {
    if (USE_REDIS_DIRECT) {
      const redis = await getRedisClient();
      if (!redis) return 0;
      const timestamp = await redis.get("custom-spells-timestamp");
      return timestamp ? parseInt(timestamp, 10) : 0;
    } else {
      const kv = await getKVClient();
      if (!kv) return 0;
      const timestamp = await kv.get("custom-spells-timestamp") as number | null;
      return timestamp || 0;
    }
  } catch {
    return 0;
  }
}

// Unified storage interface (auto-selects based on environment)
export const storage = {
  async loadMappings(): Promise<SpellPrismMappings> {
    if (USE_REDIS_DIRECT) {
      return redisStorage.loadMappings();
    } else if (USE_REDIS_REST) {
      return kvStorage.loadMappings();
    }
    return fileStorage.loadMappings();
  },

  async saveMappings(mappings: SpellPrismMappings): Promise<boolean> {
    if (USE_REDIS_DIRECT) {
      return redisStorage.saveMappings(mappings);
    } else if (USE_REDIS_REST) {
      return kvStorage.saveMappings(mappings);
    }
    return fileStorage.saveMappings(mappings);
  },

  async loadPrisms(): Promise<string[]> {
    if (USE_REDIS_DIRECT) {
      return redisStorage.loadPrisms();
    } else if (USE_REDIS_REST) {
      return kvStorage.loadPrisms();
    }
    return fileStorage.loadPrisms();
  },

  async savePrisms(prisms: string[]): Promise<boolean> {
    if (USE_REDIS_DIRECT) {
      return redisStorage.savePrisms(prisms);
    } else if (USE_REDIS_REST) {
      return kvStorage.savePrisms(prisms);
    }
    return fileStorage.savePrisms(prisms);
  },

  async loadCustomSpells(): Promise<CustomSpell[]> {
    if (USE_REDIS_DIRECT) {
      return redisStorage.loadCustomSpells();
    } else if (USE_REDIS_REST) {
      return kvStorage.loadCustomSpells();
    }
    return fileStorage.loadCustomSpells();
  },

  async saveCustomSpells(spells: CustomSpell[]): Promise<boolean> {
    if (USE_REDIS_DIRECT) {
      return redisStorage.saveCustomSpells(spells);
    } else if (USE_REDIS_REST) {
      return kvStorage.saveCustomSpells(spells);
    }
    return fileStorage.saveCustomSpells(spells);
  },

  // Cache all spells from D&D API (to avoid timeouts on Vercel)
  async loadCachedSpells(): Promise<any[] | null> {
    if (USE_REDIS_DIRECT) {
      const redis = await getRedisClient();
      if (!redis) return null;
      try {
        const data = await redis.get("dnd-api-spells-cache");
        if (!data) return null;
        return JSON.parse(data);
      } catch (error) {
        console.error("Error loading cached spells from Redis:", error);
        return null;
      }
    } else if (USE_REDIS_REST) {
      const kv = await getKVClient();
      if (!kv) return null;
      try {
        const data = await kv.get("dnd-api-spells-cache") as any[] | null;
        return data;
      } catch (error) {
        console.error("Error loading cached spells from KV:", error);
        return null;
      }
    }
    // No caching for file storage (local dev can fetch from API)
    return null;
  },

  async saveCachedSpells(spells: any[]): Promise<boolean> {
    if (USE_REDIS_DIRECT) {
      const redis = await getRedisClient();
      if (!redis) return false;
      try {
        await redis.set("dnd-api-spells-cache", JSON.stringify(spells));
        // Also save timestamp
        await redis.set("dnd-api-spells-cache-timestamp", Date.now().toString());
        return true;
      } catch (error) {
        console.error("Error saving cached spells to Redis:", error);
        return false;
      }
    } else if (USE_REDIS_REST) {
      const kv = await getKVClient();
      if (!kv) return false;
      try {
        await kv.set("dnd-api-spells-cache", spells);
        await kv.set("dnd-api-spells-cache-timestamp", Date.now().toString());
        return true;
      } catch (error) {
        console.error("Error saving cached spells to KV:", error);
        return false;
      }
    }
    return false;
  },

  async getCachedSpellsTimestamp(): Promise<number> {
    if (USE_REDIS_DIRECT) {
      const redis = await getRedisClient();
      if (!redis) return 0;
      try {
        const timestamp = await redis.get("dnd-api-spells-cache-timestamp");
        return timestamp ? parseInt(timestamp, 10) : 0;
      } catch (error) {
        return 0;
      }
    } else if (USE_REDIS_REST) {
      const kv = await getKVClient();
      if (!kv) return 0;
      try {
        const timestamp = await kv.get("dnd-api-spells-cache-timestamp") as string | null;
        return timestamp ? parseInt(timestamp, 10) : 0;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  },
};
