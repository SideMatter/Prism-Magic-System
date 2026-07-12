import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("demerits").collect();
  },
});

export const scoreboard = query({
  args: {},
  handler: async (ctx) => {
    const allDemerits = await ctx.db.query("demerits").collect();

    const counts: Record<string, { playerName: string; playerId: string; count: number }> = {};
    for (const d of allDemerits) {
      if (!counts[d.playerId]) {
        counts[d.playerId] = { playerName: d.playerName, playerId: d.playerId, count: 0 };
      }
      counts[d.playerId].count++;
    }

    return Object.values(counts).sort((a, b) => b.count - a.count);
  },
});

export const getByPlayer = query({
  args: { playerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("demerits")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();
  },
});

export const add = mutation({
  args: {
    playerId: v.string(),
    playerName: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("demerits", {
      playerId: args.playerId,
      playerName: args.playerName,
      reason: args.reason?.trim() || undefined,
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

export const update = mutation({
  args: {
    id: v.id("demerits"),
    reason: v.optional(v.string()),
    playerId: v.optional(v.string()),
    playerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Demerit not found");

    const updates: Partial<{ reason: string | undefined; playerId: string; playerName: string }> = {};
    if (args.reason !== undefined) updates.reason = args.reason?.trim() || undefined;
    if (args.playerId !== undefined) updates.playerId = args.playerId;
    if (args.playerName !== undefined) updates.playerName = args.playerName;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates);
    }
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("demerits") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("demerits").collect();
    for (const d of all) {
      await ctx.db.delete(d._id);
    }
    return { cleared: all.length };
  },
});
