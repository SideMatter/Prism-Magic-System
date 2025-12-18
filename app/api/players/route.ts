import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Player } from "@/lib/player-utils";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const PLAYERS_KEY = "prism:players";
const DATA_DIR = path.join(process.cwd(), "data");
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");

// Check if we should use Redis/KV
const USE_KV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File-based storage functions (fallback for local dev)
function readPlayersFromFile(): Player[] {
  try {
    if (fs.existsSync(PLAYERS_FILE)) {
      const data = fs.readFileSync(PLAYERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading players file:", error);
  }
  return [];
}

function writePlayersToFile(players: Player[]): void {
  try {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing players file:", error);
  }
}

// Get KV client (lazy load)
async function getKVClient() {
  if (!USE_KV) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch (error) {
    console.warn("Failed to load @vercel/kv, using file storage:", error);
    return null;
  }
}

// Get players from storage (KV or file)
async function getPlayers(): Promise<Player[]> {
  if (USE_KV) {
    try {
      const kvClient = await getKVClient();
      if (kvClient) {
        const players = await kvClient.get<Player[]>(PLAYERS_KEY);
        return players || [];
      }
    } catch (error) {
      console.warn("KV get failed, falling back to file storage:", error);
    }
  }
  return readPlayersFromFile();
}

// Save players to storage (KV or file)
async function savePlayers(players: Player[]): Promise<void> {
  if (USE_KV) {
    try {
      const kvClient = await getKVClient();
      if (kvClient) {
        await kvClient.set(PLAYERS_KEY, players);
        return;
      }
    } catch (error) {
      console.warn("KV set failed, falling back to file storage:", error);
    }
  }
  writePlayersToFile(players);
}

// GET - Fetch all players
export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
  }
}

// POST - Create a new player
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, maxSpellLevel, prisms } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    if (typeof maxSpellLevel !== "number" || maxSpellLevel < 0 || maxSpellLevel > 9) {
      return NextResponse.json({ error: "Max spell level must be between 0 and 9" }, { status: 400 });
    }

    if (!Array.isArray(prisms)) {
      return NextResponse.json({ error: "Prisms must be an array" }, { status: 400 });
    }

    const players = await getPlayers();

    // Check for duplicate name
    if (players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: "A player with this name already exists" }, { status: 400 });
    }

    const newPlayer: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      maxSpellLevel,
      prisms: prisms.filter((p: any) => typeof p === "string" && p.trim().length > 0),
    };

    players.push(newPlayer);
    await savePlayers(players);

    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    console.error("Error creating player:", error);
    return NextResponse.json({ error: "Failed to create player" }, { status: 500 });
  }
}

// PUT - Update an existing player
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, maxSpellLevel, prisms } = body;
    
    console.log("PUT /api/players - Received update request:", { id, name, maxSpellLevel, prisms });

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
    }

    const players = await getPlayers();
    const playerIndex = players.findIndex(p => p.id === id);

    if (playerIndex === -1) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    
    console.log("Found player at index:", playerIndex, "Current value:", players[playerIndex]);

    // Validate updates
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Player name cannot be empty" }, { status: 400 });
      }
      // Check for duplicate name (excluding current player)
      if (players.some((p, idx) => idx !== playerIndex && p.name.toLowerCase() === name.trim().toLowerCase())) {
        return NextResponse.json({ error: "A player with this name already exists" }, { status: 400 });
      }
      players[playerIndex].name = name.trim();
    }

    if (maxSpellLevel !== undefined) {
      if (typeof maxSpellLevel !== "number" || maxSpellLevel < 0 || maxSpellLevel > 9) {
        return NextResponse.json({ error: "Max spell level must be between 0 and 9" }, { status: 400 });
      }
      players[playerIndex].maxSpellLevel = maxSpellLevel;
    }

    if (prisms !== undefined) {
      if (!Array.isArray(prisms)) {
        return NextResponse.json({ error: "Prisms must be an array" }, { status: 400 });
      }
      players[playerIndex].prisms = prisms.filter((p: any) => typeof p === "string" && p.trim().length > 0);
    }

    console.log("Updated player:", players[playerIndex]);
    await savePlayers(players);
    console.log("Saved players to storage");

    return NextResponse.json(players[playerIndex]);
  } catch (error) {
    console.error("Error updating player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
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

    const players = await getPlayers();
    const filteredPlayers = players.filter(p => p.id !== id);

    if (filteredPlayers.length === players.length) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    await savePlayers(filteredPlayers);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return NextResponse.json({ error: "Failed to delete player" }, { status: 500 });
  }
}

