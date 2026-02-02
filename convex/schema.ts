import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Prisms table - list of available prism types
  prisms: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),

  // Spell-Prism mappings - maps spell names to one or more prisms
  spellMappings: defineTable({
    spellName: v.string(),
    // Can be a single prism or multiple prisms
    prisms: v.union(v.string(), v.array(v.string())),
  }).index("by_spellName", ["spellName"]),

  // Players table
  players: defineTable({
    playerId: v.string(), // Original ID format for compatibility
    name: v.string(),
    maxSpellLevel: v.number(),
    prisms: v.array(v.string()),
    playerClass: v.optional(v.string()), // Class name (e.g., "Arcanist", "Divine Paladin")
    classInfo: v.optional(v.string()), // Custom class info/notes for the AI to reference
  })
    .index("by_playerId", ["playerId"])
    .index("by_name", ["name"]),

  // Custom spells
  customSpells: defineTable({
    name: v.string(),
    level: v.number(),
    school: v.string(),
    castingTime: v.string(),
    range: v.string(),
    components: v.string(),
    duration: v.string(),
    description: v.string(),
    prism: v.optional(v.union(v.string(), v.array(v.string()))),
  }).index("by_name", ["name"]),

  // Custom classes
  customClasses: defineTable({
    classId: v.string(), // Original ID format
    name: v.string(),
    hitDie: v.number(),
    primaryAbilities: v.array(v.string()),
    savingThrows: v.array(v.string()),
    statPriority: v.array(v.string()),
    description: v.string(),
    prism: v.optional(v.string()),
    type: v.optional(v.string()),
    spellList: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  })
    .index("by_classId", ["classId"])
    .index("by_name", ["name"]),

  // Cached spells from D&D API
  cachedSpells: defineTable({
    name: v.string(),
    level: v.number(),
    school: v.string(),
    castingTime: v.string(),
    range: v.string(),
    components: v.string(),
    duration: v.string(),
    description: v.string(),
  }).index("by_name", ["name"]),

  // Cache metadata - stores timestamps for cache invalidation
  cacheMetadata: defineTable({
    key: v.string(),
    timestamp: v.number(),
  }).index("by_key", ["key"]),
});
