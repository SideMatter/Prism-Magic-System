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
};
