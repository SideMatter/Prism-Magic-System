import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");
    const convex = getConvexClient();

    if (mode === "all") {
      const all = await convex.query(api.demerits.list, {});
      return NextResponse.json(all);
    }

    const scoreboard = await convex.query(api.demerits.scoreboard, {});
    return NextResponse.json(scoreboard);
  } catch (error) {
    console.error("GET /api/demerits - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch demerits", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, playerName, reason } = body;

    if (!playerId || !playerName) {
      return NextResponse.json({ error: "playerId and playerName are required" }, { status: 400 });
    }

    const convex = getConvexClient();
    await convex.mutation(api.demerits.add, {
      playerId,
      playerName,
      reason: reason || undefined,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/demerits - Error:", error);
    return NextResponse.json(
      { error: "Failed to add demerit", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, reason, playerId, playerName } = body;

    if (!id) {
      return NextResponse.json({ error: "Demerit ID is required" }, { status: 400 });
    }

    const convex = getConvexClient();
    await convex.mutation(api.demerits.update, {
      id,
      reason: reason !== undefined ? reason : undefined,
      playerId: playerId || undefined,
      playerName: playerName || undefined,
    } as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/demerits - Error:", error);
    return NextResponse.json(
      { error: "Failed to update demerit", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { action, id } = body;

    const convex = getConvexClient();

    if (action === "clear-all") {
      const result = await convex.mutation(api.demerits.clearAll, {});
      return NextResponse.json(result);
    }

    if (id) {
      await convex.mutation(api.demerits.remove, { id });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Provide 'id' or action 'clear-all'" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/demerits - Error:", error);
    return NextResponse.json(
      { error: "Failed to delete demerit", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
