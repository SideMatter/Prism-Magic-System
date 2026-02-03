import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export const dynamic = 'force-dynamic';

// GET - Fetch all players
export async function GET() {
  try {
    console.log("GET /api/players - Fetching players");
    const convex = getConvexClient();
    const players = await convex.query(api.players.list, {});
    console.log(`GET /api/players - Retrieved ${players.length} players`);
    return NextResponse.json(players);
  } catch (error) {
    console.error("GET /api/players - Error fetching players:", error);
    return NextResponse.json({ 
      error: "Failed to fetch players", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// POST - Create a new player
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, maxSpellLevel, prisms, playerClass, classInfo } = body;
    
    console.log("POST /api/players - Creating player:", { name, maxSpellLevel, prisms, playerClass, classInfo });

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    if (typeof maxSpellLevel !== "number" || maxSpellLevel < 0 || maxSpellLevel > 9) {
      return NextResponse.json({ error: "Max spell level must be between 0 and 9" }, { status: 400 });
    }

    if (!Array.isArray(prisms)) {
      return NextResponse.json({ error: "Prisms must be an array" }, { status: 400 });
    }

    const convex = getConvexClient();
    const newPlayer = await convex.mutation(api.players.create, {
      name: name.trim(),
      maxSpellLevel,
      prisms: prisms.filter((p: any) => typeof p === "string" && p.trim().length > 0),
      playerClass: playerClass?.trim() || undefined,
      classInfo: classInfo?.trim() || undefined,
    });

    console.log("POST /api/players - Player created successfully:", newPlayer.id);
    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/players - Error creating player:", error);
    const message = error?.message || "Failed to create player";
    if (message.includes("already exists")) {
      return NextResponse.json({ error: "A player with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ 
      error: "Failed to create player", 
      details: message 
    }, { status: 500 });
  }
}

// PUT - Update an existing player
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, maxSpellLevel, prisms, playerClass, classInfo } = body;
    
    console.log("PUT /api/players - Received update request:", { id, name, maxSpellLevel, prisms, playerClass, classInfo });

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
    }

    // Validate updates
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Player name cannot be empty" }, { status: 400 });
    }

    if (maxSpellLevel !== undefined && (typeof maxSpellLevel !== "number" || maxSpellLevel < 0 || maxSpellLevel > 9)) {
      return NextResponse.json({ error: "Max spell level must be between 0 and 9" }, { status: 400 });
    }

    if (prisms !== undefined && !Array.isArray(prisms)) {
      return NextResponse.json({ error: "Prisms must be an array" }, { status: 400 });
    }

    const convex = getConvexClient();
    const mutationArgs: Record<string, unknown> = { id };
    if (name !== undefined) mutationArgs.name = name.trim();
    if (maxSpellLevel !== undefined) mutationArgs.maxSpellLevel = maxSpellLevel;
    if (prisms !== undefined) mutationArgs.prisms = prisms.filter((p: any) => typeof p === "string" && p.trim().length > 0);
    if (playerClass !== undefined) mutationArgs.playerClass = typeof playerClass === "string" ? playerClass.trim() : "";
    if (classInfo !== undefined) mutationArgs.classInfo = typeof classInfo === "string" ? classInfo.trim() : "";

    const updatedPlayer = await convex.mutation(api.players.update, mutationArgs as any);

    console.log("PUT /api/players - Player updated:", updatedPlayer);
    return NextResponse.json(updatedPlayer);
  } catch (error: any) {
    console.error("Error updating player:", error);
    const message = error?.message || "Failed to update player";
    const details = error?.data || error?.cause?.message || "";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (message.includes("already exists")) {
      return NextResponse.json({ error: "A player with this name already exists" }, { status: 400 });
    }
    return NextResponse.json(
      { error: message, details: details || undefined },
      { status: 500 }
    );
  }
}

// DELETE - Delete a player
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
    }

    const convex = getConvexClient();
    await convex.mutation(api.players.remove, { id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting player:", error);
    const message = error?.message || "Failed to delete player";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
