import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all players
export const list = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return players.map((p) => ({
      id: p.playerId,
      name: p.name,
      maxSpellLevel: p.maxSpellLevel,
      prisms: p.prisms,
    }));
  },
});

// Get player by ID
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.id))
      .first();

    if (!player) return null;

    return {
      id: player.playerId,
      name: player.name,
      maxSpellLevel: player.maxSpellLevel,
      prisms: player.prisms,
    };
  },
});

// Create a new player
export const create = mutation({
  args: {
    name: v.string(),
    maxSpellLevel: v.number(),
    prisms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { name, maxSpellLevel, prisms } = args;

    if (!name || !name.trim()) {
      throw new Error("Player name is required");
    }

    if (maxSpellLevel < 0 || maxSpellLevel > 9) {
      throw new Error("Max spell level must be between 0 and 9");
    }

    // Check for duplicate name
    const existing = await ctx.db
      .query("players")
      .withIndex("by_name", (q) => q.eq("name", name.trim().toLowerCase()))
      .first();

    // Also check with case-insensitive search
    const allPlayers = await ctx.db.query("players").collect();
    const duplicate = allPlayers.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (duplicate) {
      throw new Error("A player with this name already exists");
    }

    const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await ctx.db.insert("players", {
      playerId,
      name: name.trim(),
      maxSpellLevel,
      prisms: prisms.filter((p) => typeof p === "string" && p.trim().length > 0),
    });

    return {
      id: playerId,
      name: name.trim(),
      maxSpellLevel,
      prisms,
    };
  },
});

// Update a player
export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    maxSpellLevel: v.optional(v.number()),
    prisms: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, name, maxSpellLevel, prisms } = args;

    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", id))
      .first();

    if (!player) {
      throw new Error("Player not found");
    }

    const updates: Partial<{
      name: string;
      maxSpellLevel: number;
      prisms: string[];
    }> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new Error("Player name cannot be empty");
      }
      // Check for duplicate name (excluding current player)
      const allPlayers = await ctx.db.query("players").collect();
      const duplicate = allPlayers.find(
        (p) =>
          p._id !== player._id &&
          p.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error("A player with this name already exists");
      }
      updates.name = name.trim();
    }

    if (maxSpellLevel !== undefined) {
      if (maxSpellLevel < 0 || maxSpellLevel > 9) {
        throw new Error("Max spell level must be between 0 and 9");
      }
      updates.maxSpellLevel = maxSpellLevel;
    }

    if (prisms !== undefined) {
      updates.prisms = prisms.filter(
        (p) => typeof p === "string" && p.trim().length > 0
      );
    }

    await ctx.db.patch(player._id, updates);

    return {
      id: player.playerId,
      name: updates.name ?? player.name,
      maxSpellLevel: updates.maxSpellLevel ?? player.maxSpellLevel,
      prisms: updates.prisms ?? player.prisms,
    };
  },
});

// Delete a player
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.id))
      .first();

    if (!player) {
      throw new Error("Player not found");
    }

    await ctx.db.delete(player._id);
    return { success: true };
  },
});

// Bulk import players (for migration)
export const bulkImport = mutation({
  args: {
    players: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        maxSpellLevel: v.number(),
        prisms: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const player of args.players) {
      const existing = await ctx.db
        .query("players")
        .withIndex("by_playerId", (q) => q.eq("playerId", player.id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("players", {
        playerId: player.id,
        name: player.name,
        maxSpellLevel: player.maxSpellLevel,
        prisms: player.prisms,
      });
      imported++;
    }

    return { imported, skipped, total: args.players.length };
  },
});
